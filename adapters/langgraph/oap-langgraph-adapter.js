/**
 * OAP to LangGraph Adapter
 *
 * Provides LangGraph compatible node wrappers that consume OAP Tools natively.
 * Each OAP Action becomes a LangGraph ToolNode that handles receipts, policy
 * assertions, and subscription tokens transparently.
 *
 * Requires: @langchain/langgraph, @langchain/core
 *
 * @license Apache-2.0
 */

// ---------------------------------------------------------------------------
// OAP Tool as LangChain Tool
// ---------------------------------------------------------------------------

/**
 * Create a LangChain Tool descriptor from an OAP Action.
 *
 * This produces an object compatible with LangChain's DynamicStructuredTool
 * constructor. The `func` implementation proxies calls to the OAP invoke endpoint.
 *
 * @param {object} options
 * @param {object} options.manifest - OAP Manifest.
 * @param {object} options.action - OAP Action descriptor.
 * @param {object} options.identity - Principal and agent DID.
 * @param {string} [options.subscriptionToken] - Active subscription token.
 * @param {function} [options.fetch] - Custom fetch.
 * @returns {object} LangChain tool descriptor.
 */
function oapActionToLangChainTool({ manifest, action, identity, subscriptionToken, fetch: fetchFn }) {
  const httpFetch = fetchFn || globalThis.fetch;

  return {
    name: action.id,
    description: action.description_for_agents || action.summary,
    schema: action.input_schema,
    func: async (input) => {
      const requestId = Date.now().toString(36).toUpperCase().padStart(26, '0');

      const envelope = {
        oap_version: '1.0',
        request_id: requestId,
        timestamp: new Date().toISOString(),
        principal_did: identity.principalDid,
        agent_did: identity.agentDid,
        action: action.id,
        input,
        context: { locale: 'en-US', currency: 'EUR', jurisdiction_user: 'DE', jurisdiction_agent: 'DE' },
        signature: { alg: 'EdDSA', kid: `${identity.agentDid}#key-1`, value: '' },
      };

      if (subscriptionToken) {
        envelope.subscription_token = subscriptionToken;
      }

      const response = await httpFetch(manifest.endpoints.invoke, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/oap+json',
          'OAP-Version': '1.0',
          'OAP-Request-Id': requestId,
        },
        body: JSON.stringify(envelope),
      });

      const oapResponse = await response.json();

      if (oapResponse.status === 'error') {
        throw new Error(oapResponse.error?.message || 'OAP invocation failed');
      }

      return JSON.stringify(oapResponse.output || oapResponse);
    },
  };
}

/**
 * Create LangChain tools from all Actions in an OAP Manifest.
 *
 * @param {object} options
 * @param {object} options.manifest - OAP Manifest.
 * @param {object} options.identity - Principal and agent DID.
 * @param {string} [options.subscriptionToken]
 * @param {function} [options.fetch]
 * @returns {object[]} Array of LangChain tool descriptors.
 */
function oapManifestToLangChainTools({ manifest, identity, subscriptionToken, fetch: fetchFn }) {
  if (!manifest || !Array.isArray(manifest.actions)) {
    throw new Error('Invalid OAP Manifest: actions array required.');
  }
  return manifest.actions.map(action =>
    oapActionToLangChainTool({ manifest, action, identity, subscriptionToken, fetch: fetchFn })
  );
}

// ---------------------------------------------------------------------------
// LangGraph Node wrapper
// ---------------------------------------------------------------------------

/**
 * Create a LangGraph node function that invokes an OAP Tool and returns
 * the result as a state update.
 *
 * Usage with LangGraph:
 * ```
 * const weatherNode = createOapNode({ manifest, actionId: 'get_forecast', identity });
 * graph.addNode('weather', weatherNode);
 * ```
 *
 * @param {object} options
 * @param {object} options.manifest - OAP Manifest.
 * @param {string} options.actionId - Action id to invoke.
 * @param {object} options.identity - Principal and agent DID.
 * @param {string} [options.subscriptionToken]
 * @param {string} [options.stateKey] - Key in state to write result. Defaults to actionId.
 * @param {string} [options.inputKey] - Key in state to read input. Defaults to 'input'.
 * @param {function} [options.fetch]
 * @returns {function} Async function compatible with LangGraph addNode.
 */
function createOapNode({ manifest, actionId, identity, subscriptionToken, stateKey, inputKey, fetch: fetchFn }) {
  const action = manifest.actions.find(a => a.id === actionId);
  if (!action) {
    throw new Error(`Action ${actionId} not found in manifest.`);
  }

  const tool = oapActionToLangChainTool({ manifest, action, identity, subscriptionToken, fetch: fetchFn });
  const resultKey = stateKey || actionId;
  const srcKey = inputKey || 'input';

  return async (state) => {
    const input = state[srcKey] || {};
    const result = await tool.func(input);
    return { ...state, [resultKey]: JSON.parse(result) };
  };
}

// ---------------------------------------------------------------------------
// Discovery helper
// ---------------------------------------------------------------------------

/**
 * Discover OAP Tools by intent and return LangChain tool descriptors for matches.
 *
 * @param {object} options
 * @param {string} options.manifestUrl - URL to the OAP Manifest.
 * @param {string} options.intent - Natural language intent.
 * @param {object} options.identity - Principal and agent DID.
 * @param {function} [options.fetch]
 * @returns {Promise<object[]>} Matching LangChain tool descriptors.
 */
async function discoverOapTools({ manifestUrl, intent, identity, fetch: fetchFn }) {
  const httpFetch = fetchFn || globalThis.fetch;

  const manifestRes = await httpFetch(manifestUrl);
  const manifest = await manifestRes.json();

  if (!manifest.endpoints.discover) {
    return oapManifestToLangChainTools({ manifest, identity, fetch: fetchFn });
  }

  const discoverRes = await httpFetch(manifest.endpoints.discover, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intent, principal_did: identity.principalDid }),
  });

  const discovery = await discoverRes.json();
  const matchedIds = new Set((discovery.matching_actions || []).map(a => a.id || a.action_id));

  const filteredManifest = {
    ...manifest,
    actions: manifest.actions.filter(a => matchedIds.has(a.id)),
  };

  return oapManifestToLangChainTools({ manifest: filteredManifest, identity, fetch: fetchFn });
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  oapActionToLangChainTool,
  oapManifestToLangChainTools,
  createOapNode,
  discoverOapTools,
};
