/**
 * OAP to A2A Adapter
 *
 * Bidirectional bridge between the Agent2Agent Protocol (Google, 2025) and
 * the Open Agent Protocol.
 *
 * Direction 1 (OAP -> A2A Agent Card): Generates an A2A Agent Card from an
 * OAP Manifest so that A2A clients can discover and invoke OAP Tools.
 *
 * Direction 2 (A2A Task -> OAP): Translates incoming A2A Task submissions
 * into OAP Invocations and maps OAP Receipts back to A2A Artifacts.
 *
 * Direction 3 (OAP -> A2A Task): Enables an OAP Agent to submit Tasks to
 * external A2A agents.
 *
 * @license Apache-2.0
 */

const crypto = require('crypto');

const OAP_VERSION = '1.0';

// ---------------------------------------------------------------------------
// Direction 1: OAP Manifest -> A2A Agent Card
// ---------------------------------------------------------------------------

/**
 * Generate an A2A Agent Card from an OAP Manifest.
 *
 * @param {object} manifest - OAP Manifest.
 * @param {string} a2aEndpoint - The URL where the A2A gateway is hosted.
 * @returns {object} A2A Agent Card (v0.2).
 */
function oapManifestToAgentCard(manifest, a2aEndpoint) {
  const tool = manifest.tool;
  return {
    name: tool.name,
    description: tool.description_for_agents,
    url: a2aEndpoint,
    version: tool.version,
    provider: {
      organization: tool.publisher.legal_name,
      url: `https://${tool.did.replace('did:web:', '')}`,
    },
    capabilities: {
      streaming: manifest.sla.supports_streaming || false,
      pushNotifications: !!manifest.endpoints.subscribe,
    },
    authentication: manifest.auth.map(a => ({
      type: a.method === 'oauth2_1' ? 'oauth2' : a.method === 'api_key' ? 'apiKey' : a.method,
    })),
    skills: manifest.actions.map(action => ({
      id: action.id,
      name: action.summary,
      description: action.description_for_agents,
      inputSchema: action.input_schema,
      outputSchema: action.output_schema,
    })),
    defaultInputModes: ['application/json'],
    defaultOutputModes: ['application/json'],
  };
}

// ---------------------------------------------------------------------------
// Direction 2: A2A Task -> OAP Invocation
// ---------------------------------------------------------------------------

/**
 * Translate an A2A Task submission into an OAP Request Envelope.
 *
 * @param {object} a2aTask - Incoming A2A Task.
 * @param {object} identity - Agent identity (principalDid, agentDid).
 * @param {string} actionId - Target OAP Action id.
 * @returns {object} OAP Request Envelope.
 */
function a2aTaskToOapRequest(a2aTask, identity, actionId) {
  const requestId = generateUlid();
  return {
    oap_version: OAP_VERSION,
    request_id: requestId,
    timestamp: new Date().toISOString(),
    principal_did: identity.principalDid,
    agent_did: identity.agentDid,
    action: actionId || a2aTask.skill || a2aTask.id,
    input: extractA2aInput(a2aTask),
    context: {
      locale: 'en-US',
      currency: 'EUR',
      jurisdiction_user: 'DE',
      jurisdiction_agent: 'DE',
    },
    signature: { alg: 'EdDSA', kid: `${identity.agentDid}#key-1`, value: '' },
  };
}

/**
 * Translate an OAP Response Envelope into an A2A Task result.
 *
 * @param {object} oapResponse - OAP Response Envelope.
 * @param {string} a2aTaskId - Original A2A Task id.
 * @returns {object} A2A Task with status and artifacts.
 */
function oapResponseToA2aTask(oapResponse, a2aTaskId) {
  const status = oapResponse.status === 'ok' ? 'completed'
    : oapResponse.status === 'accepted' ? 'working'
    : 'failed';

  const result = {
    id: a2aTaskId,
    status: { state: status, timestamp: oapResponse.timestamp },
  };

  if (status === 'completed' && oapResponse.output) {
    result.artifacts = [
      {
        name: 'result',
        parts: [{ type: 'application/json', data: oapResponse.output }],
      },
    ];
  }

  if (status === 'failed' && oapResponse.error) {
    result.status.message = oapResponse.error.message || 'Unknown error';
  }

  return result;
}

// ---------------------------------------------------------------------------
// Direction 3: OAP Agent -> A2A Task submission
// ---------------------------------------------------------------------------

/**
 * Submit a Task to an external A2A agent from an OAP context.
 *
 * @param {object} options
 * @param {string} options.agentCardUrl - URL of the A2A Agent Card.
 * @param {object} options.input - Structured input.
 * @param {string} [options.skill] - Skill id to invoke.
 * @param {function} [options.fetch] - Custom fetch.
 * @returns {Promise<object>} A2A Task result.
 */
async function submitA2aTask({ agentCardUrl, input, skill, fetch: fetchFn }) {
  const httpFetch = fetchFn || globalThis.fetch;

  // Resolve Agent Card
  const cardResponse = await httpFetch(agentCardUrl);
  const card = await cardResponse.json();

  const taskId = generateUlid();
  const taskUrl = card.url;

  const task = {
    jsonrpc: '2.0',
    method: 'tasks/send',
    id: taskId,
    params: {
      id: taskId,
      message: {
        role: 'user',
        parts: [{ type: 'application/json', data: input }],
      },
    },
  };

  if (skill) {
    task.params.skill = skill;
  }

  const response = await httpFetch(taskUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });

  return response.json();
}

// ---------------------------------------------------------------------------
// A2A Gateway (Express middleware)
// ---------------------------------------------------------------------------

/**
 * Create Express middleware that serves as an A2A gateway for an OAP Tool.
 *
 * Routes:
 *   GET  /.well-known/agent.json -> Agent Card
 *   POST / -> A2A JSON-RPC (tasks/send, tasks/get, tasks/cancel)
 *
 * @param {object} manifest - OAP Manifest.
 * @param {object} identity - Agent identity.
 * @param {function} invokeOap - Function that accepts an OAP request and returns a response.
 * @returns {function} Express middleware.
 */
function createA2aGateway(manifest, identity, invokeOap) {
  const agentCard = oapManifestToAgentCard(manifest, '');

  return async function a2aGateway(req, res, next) {
    // Agent Card discovery
    if (req.method === 'GET' && req.path === '/.well-known/agent.json') {
      agentCard.url = `${req.protocol}://${req.get('host')}`;
      return res.json(agentCard);
    }

    // JSON-RPC handler
    if (req.method === 'POST') {
      const rpc = req.body;

      if (rpc.method === 'tasks/send') {
        const actionId = rpc.params.skill || manifest.actions[0].id;
        const oapReq = a2aTaskToOapRequest(rpc.params, identity, actionId);
        try {
          const oapRes = await invokeOap(oapReq);
          const a2aResult = oapResponseToA2aTask(oapRes, rpc.params.id || rpc.id);
          return res.json({ jsonrpc: '2.0', id: rpc.id, result: a2aResult });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', id: rpc.id, error: { code: -32000, message: err.message } });
        }
      }

      return res.json({ jsonrpc: '2.0', id: rpc.id, error: { code: -32601, message: 'Method not found' } });
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function extractA2aInput(task) {
  if (task.message && Array.isArray(task.message.parts)) {
    const jsonPart = task.message.parts.find(p => p.type === 'application/json');
    if (jsonPart) return jsonPart.data;
    const textPart = task.message.parts.find(p => p.type === 'text/plain' || typeof p.text === 'string');
    if (textPart) return { text: textPart.text || textPart.data };
  }
  return task.input || {};
}

function generateUlid() {
  const t = Date.now().toString(36).toUpperCase().padStart(10, '0');
  const r = crypto.randomBytes(10).toString('hex').toUpperCase().substring(0, 16);
  return (t + r).substring(0, 26);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  oapManifestToAgentCard,
  a2aTaskToOapRequest,
  oapResponseToA2aTask,
  submitA2aTask,
  createA2aGateway,
};
