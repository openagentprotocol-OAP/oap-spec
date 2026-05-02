/**
 * OAP to MCP Adapter
 *
 * Bidirectional bridge between the Model Context Protocol and the Open Agent Protocol.
 *
 * Direction 1 (OAP as MCP Server): Exposes OAP Tools as MCP tool definitions so that
 * any MCP client (Claude Desktop, Cursor, Continue) can invoke them.
 *
 * Direction 2 (MCP as OAP Tool): Wraps an existing MCP server and publishes it as a
 * conformant OAP Manifest, enabling OAP agents to consume legacy MCP tools with full
 * receipts, billing, and policy enforcement.
 *
 * @license Apache-2.0
 */

const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OAP_VERSION = '1.0';

// ---------------------------------------------------------------------------
// Direction 1: OAP Tool -> MCP Tool definition
// ---------------------------------------------------------------------------

/**
 * Convert an OAP Action to an MCP tool definition.
 *
 * @param {object} oapAction - Conformant OAP Action descriptor.
 * @returns {object} MCP tool definition.
 */
function oapActionToMcpTool(oapAction) {
  return {
    name: oapAction.id,
    description: oapAction.description_for_agents || oapAction.summary,
    inputSchema: oapAction.input_schema,
  };
}

/**
 * Convert a full OAP Manifest to an array of MCP tool definitions.
 *
 * @param {object} manifest - Conformant OAP Manifest.
 * @returns {object[]} Array of MCP tool definitions.
 */
function oapManifestToMcpTools(manifest) {
  if (!manifest || !Array.isArray(manifest.actions)) {
    throw new Error('Invalid OAP Manifest: actions array is required.');
  }
  return manifest.actions.map(oapActionToMcpTool);
}

/**
 * Handle an MCP tool call by proxying it to the OAP invoke endpoint.
 *
 * @param {object} options
 * @param {object} options.manifest - OAP Manifest of the target Tool.
 * @param {string} options.actionId - Action id being called.
 * @param {object} options.input - Tool call arguments from MCP.
 * @param {object} options.identity - Object with principalDid, agentDid, signingKey.
 * @param {string} [options.subscriptionToken] - Active subscription token.
 * @param {function} [options.fetch] - Custom fetch implementation.
 * @returns {Promise<object>} OAP response envelope.
 */
async function handleMcpToolCall({ manifest, actionId, input, identity, subscriptionToken, fetch: fetchFn }) {
  const httpFetch = fetchFn || globalThis.fetch;
  const invokeUrl = manifest.endpoints.invoke;
  const requestId = generateUlid();
  const timestamp = new Date().toISOString();

  const envelope = {
    oap_version: OAP_VERSION,
    request_id: requestId,
    timestamp,
    principal_did: identity.principalDid,
    agent_did: identity.agentDid,
    action: actionId,
    input,
    context: {
      locale: 'en-US',
      currency: 'EUR',
      jurisdiction_user: 'DE',
      jurisdiction_agent: 'DE',
    },
    signature: {
      alg: 'EdDSA',
      kid: `${identity.agentDid}#key-1`,
      value: '', // Placeholder: real implementation signs canonicalized JSON
    },
  };

  if (subscriptionToken) {
    envelope.subscription_token = subscriptionToken;
  }

  const response = await httpFetch(invokeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/oap+json',
      'OAP-Version': OAP_VERSION,
      'OAP-Request-Id': requestId,
    },
    body: JSON.stringify(envelope),
  });

  return response.json();
}

// ---------------------------------------------------------------------------
// Direction 2: MCP Server -> OAP Manifest
// ---------------------------------------------------------------------------

/**
 * Convert an MCP tool definition to an OAP Action descriptor.
 *
 * Because MCP does not carry cost, side effect, or rate limit metadata, the
 * resulting Action uses conservative defaults. Publishers SHOULD refine these
 * after generation.
 *
 * @param {object} mcpTool - MCP tool definition.
 * @returns {object} OAP Action descriptor.
 */
function mcpToolToOapAction(mcpTool) {
  return {
    id: mcpTool.name.replace(/[^a-z0-9_]/g, '_').substring(0, 63),
    version: '1.0.0',
    summary: (mcpTool.description || mcpTool.name).substring(0, 240),
    description_for_agents: mcpTool.description || `Invokes the ${mcpTool.name} tool.`,
    input_schema: mcpTool.inputSchema || { type: 'object' },
    output_schema: { type: 'object' },
    side_effects: 'external',
    idempotent: false,
    rate_limit: { rpm: 60, concurrent: 5 },
    data_classes_in: [],
    data_classes_out: [],
    examples: [
      { input: {}, output: {}, description: 'Placeholder example. Replace with real data.' },
    ],
  };
}

/**
 * Generate a minimal OAP Manifest from MCP tools and publisher metadata.
 *
 * @param {object} options
 * @param {object[]} options.mcpTools - Array of MCP tool definitions.
 * @param {string} options.toolId - Desired OAP tool id.
 * @param {string} options.toolName - Human readable tool name.
 * @param {string} options.publisherDid - DID of the publisher.
 * @param {string} options.publisherLegalName - Legal name.
 * @param {string} options.baseUrl - Base URL where OAP endpoints will be hosted.
 * @param {string[]} [options.jurisdictions] - ISO 3166 codes. Defaults to ['DE'].
 * @returns {object} OAP Manifest.
 */
function mcpToolsToOapManifest({ mcpTools, toolId, toolName, publisherDid, publisherLegalName, baseUrl, jurisdictions }) {
  const base = baseUrl.replace(/\/$/, '');
  return {
    oap_version: OAP_VERSION,
    tool: {
      id: toolId,
      did: publisherDid,
      name: toolName,
      version: '1.0.0',
      publisher: {
        did: publisherDid,
        legal_name: publisherLegalName,
        verified: false,
      },
      categories: ['general'],
      description_for_humans: `OAP wrapped MCP tool: ${toolName}`,
      description_for_agents: `Provides OAP conformant access to the MCP tool ${toolName}. Actions correspond to MCP tool definitions.`,
    },
    endpoints: {
      invoke: `${base}/oap/invoke`,
      audit: `${base}/oap/audit`,
      data_delete: `${base}/oap/data/delete`,
      incident: `${base}/oap/incident`,
    },
    auth: [{ method: 'api_key' }],
    actions: mcpTools.map(mcpToolToOapAction),
    sla: {
      uptime_target: 0.99,
      latency_p95_ms: 5000,
      max_call_duration_ms: 60000,
      regions: ['eu-west'],
      incident_disclosure_within_hours: 72,
    },
    trust: {
      publisher_verified: false,
      data_residency: ['EU'],
      gdpr_compliant: false,
    },
    data_policy: {
      stores_principal_data: false,
      retention_days: 0,
      shares_with_third_parties: false,
      training_on_principal_data: 'never',
      deletion_endpoint: '/oap/data/delete',
      lawful_bases: ['contract'],
    },
    risk_class: 'limited',
    jurisdictions: jurisdictions || ['DE'],
    governance: {
      dispute_resolution_url: `${base}/legal/disputes`,
      contact_email: `compliance@${new URL(base).hostname}`,
    },
  };
}

// ---------------------------------------------------------------------------
// MCP Server Wrapper (stdio transport)
// ---------------------------------------------------------------------------

/**
 * Create a minimal MCP server (stdio transport) that exposes OAP Tools.
 *
 * This function reads JSON RPC messages from stdin and writes responses to
 * stdout, following the MCP stdio transport convention.
 *
 * @param {object} manifest - OAP Manifest.
 * @param {object} identity - Agent identity for proxying calls.
 */
function createMcpServer(manifest, identity) {
  const tools = oapManifestToMcpTools(manifest);
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, terminal: false });

  function send(msg) {
    process.stdout.write(JSON.stringify(msg) + '\n');
  }

  rl.on('line', async (line) => {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }

    if (msg.method === 'tools/list') {
      send({ jsonrpc: '2.0', id: msg.id, result: { tools } });
      return;
    }

    if (msg.method === 'tools/call') {
      const { name, arguments: args } = msg.params || {};
      try {
        const oapResponse = await handleMcpToolCall({
          manifest,
          actionId: name,
          input: args || {},
          identity,
        });
        send({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(oapResponse.output || oapResponse) }],
          },
        });
      } catch (err) {
        send({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: err.message } });
      }
      return;
    }

    if (msg.method === 'initialize') {
      send({
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: manifest.tool.name, version: manifest.tool.version },
        },
      });
      return;
    }

    send({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'Method not found' } });
  });
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function generateUlid() {
  const t = Date.now().toString(36).toUpperCase().padStart(10, '0');
  const r = crypto.randomBytes(10).toString('hex').toUpperCase().substring(0, 16);
  return (t + r).substring(0, 26);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  oapActionToMcpTool,
  oapManifestToMcpTools,
  handleMcpToolCall,
  mcpToolToOapAction,
  mcpToolsToOapManifest,
  createMcpServer,
};
