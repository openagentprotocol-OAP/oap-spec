/**
 * OAP to OpenAI Functions Adapter
 *
 * One way transformation from OAP Action Schemas to OpenAI function calling
 * definitions. Used when integrating OAP Tools into OpenAI API calls
 * (Chat Completions, Assistants API).
 *
 * Note: the inverse transformation (OpenAI -> OAP) is provided on a best
 * effort basis given the coarser semantics of OpenAI function definitions.
 *
 * @license Apache-2.0
 */

// ---------------------------------------------------------------------------
// OAP Action -> OpenAI Function
// ---------------------------------------------------------------------------

/**
 * Convert an OAP Action to an OpenAI function definition.
 *
 * @param {object} oapAction - OAP Action descriptor.
 * @returns {object} OpenAI function definition (tools array format).
 */
function oapActionToOpenAiFunction(oapAction) {
  return {
    type: 'function',
    function: {
      name: oapAction.id,
      description: oapAction.description_for_agents || oapAction.summary,
      parameters: oapAction.input_schema || { type: 'object', properties: {} },
      strict: true,
    },
  };
}

/**
 * Convert all Actions from an OAP Manifest to OpenAI tools array.
 *
 * @param {object} manifest - OAP Manifest.
 * @returns {object[]} OpenAI tools array ready for Chat Completions API.
 */
function oapManifestToOpenAiTools(manifest) {
  if (!manifest || !Array.isArray(manifest.actions)) {
    throw new Error('Invalid OAP Manifest: actions array is required.');
  }
  return manifest.actions.map(oapActionToOpenAiFunction);
}

// ---------------------------------------------------------------------------
// OpenAI Function -> OAP Action (best effort inverse)
// ---------------------------------------------------------------------------

/**
 * Convert an OpenAI function definition to an OAP Action (best effort).
 *
 * @param {object} openAiFn - OpenAI function definition (from tools array).
 * @returns {object} OAP Action descriptor with conservative defaults.
 */
function openAiFunctionToOapAction(openAiFn) {
  const fn = openAiFn.function || openAiFn;
  return {
    id: fn.name.replace(/[^a-z0-9_]/g, '_').substring(0, 63),
    version: '1.0.0',
    summary: (fn.description || fn.name).substring(0, 240),
    description_for_agents: fn.description || `Invokes ${fn.name}.`,
    input_schema: fn.parameters || { type: 'object' },
    output_schema: { type: 'object' },
    side_effects: 'external',
    idempotent: false,
    rate_limit: { rpm: 60, concurrent: 5 },
    data_classes_in: [],
    data_classes_out: [],
    examples: [
      { input: {}, output: {}, description: 'Placeholder. Replace with validated example.' },
    ],
  };
}

/**
 * Convert an OpenAI tools array to an array of OAP Actions.
 *
 * @param {object[]} openAiTools - OpenAI tools array.
 * @returns {object[]} Array of OAP Action descriptors.
 */
function openAiToolsToOapActions(openAiTools) {
  return openAiTools.filter(t => t.type === 'function').map(openAiFunctionToOapAction);
}

// ---------------------------------------------------------------------------
// OpenAI tool_call handler -> OAP invoke proxy
// ---------------------------------------------------------------------------

/**
 * Handle an OpenAI tool_call by proxying it to an OAP invoke endpoint.
 *
 * @param {object} options
 * @param {object} options.manifest - OAP Manifest.
 * @param {object} options.toolCall - OpenAI tool_call from chat completion.
 * @param {object} options.identity - Principal and agent DID.
 * @param {function} [options.fetch] - Custom fetch.
 * @returns {Promise<object>} Result formatted for OpenAI tool message.
 */
async function handleOpenAiToolCall({ manifest, toolCall, identity, fetch: fetchFn }) {
  const httpFetch = fetchFn || globalThis.fetch;
  const invokeUrl = manifest.endpoints.invoke;

  let input;
  try {
    input = typeof toolCall.function.arguments === 'string'
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;
  } catch {
    input = {};
  }

  const requestId = Date.now().toString(36).toUpperCase().padStart(26, '0');

  const envelope = {
    oap_version: '1.0',
    request_id: requestId,
    timestamp: new Date().toISOString(),
    principal_did: identity.principalDid,
    agent_did: identity.agentDid,
    action: toolCall.function.name,
    input,
    context: { locale: 'en-US', currency: 'EUR', jurisdiction_user: 'DE', jurisdiction_agent: 'DE' },
    signature: { alg: 'EdDSA', kid: `${identity.agentDid}#key-1`, value: '' },
  };

  const response = await httpFetch(invokeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/oap+json', 'OAP-Version': '1.0', 'OAP-Request-Id': requestId },
    body: JSON.stringify(envelope),
  });

  const oapResponse = await response.json();

  return {
    role: 'tool',
    tool_call_id: toolCall.id,
    content: JSON.stringify(oapResponse.output || oapResponse),
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  oapActionToOpenAiFunction,
  oapManifestToOpenAiTools,
  openAiFunctionToOapAction,
  openAiToolsToOapActions,
  handleOpenAiToolCall,
};
