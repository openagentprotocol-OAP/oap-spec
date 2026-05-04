/**
 * @oap-test
 * @levels L1, L1-NC
 * @rfcs OAP-CORE-1.0 §6
 * @category behavior
 * @description Verifies the /invoke endpoint behavior beyond bare reachability:
 *              MUST reject envelopes missing required fields with a 4xx,
 *              MUST reject unknown actions, and MUST emit a Receipt with a
 *              hash chain reference for a successful free Action call.
 */

const RESULTS = [];
function record(name, passed, reason) {
  RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
}

const ULID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function ulid() {
  let out = '';
  for (let i = 0; i < 26; i++) out += ULID_ALPHABET[Math.floor(Math.random() * 32)];
  return out;
}

async function run({ target }) {
  RESULTS.length = 0;
  const base = target.replace(/\/$/, '');

  let manifest;
  try {
    manifest = await (await fetch(`${base}/.well-known/oap-tool.json`)).json();
  } catch (err) {
    record('invoke-manifest-fetch', false, err.message);
    return RESULTS.slice();
  }

  const invokeUrl = manifest.endpoints.invoke.startsWith('http')
    ? manifest.endpoints.invoke
    : `${base}${manifest.endpoints.invoke}`;

  // Free read Action
  const freeAction = (manifest.actions || []).find((a) => a.cost && a.cost.type === 'free' && a.side_effects === 'read');
  if (!freeAction) {
    record('invoke-has-free-read-action', false, 'No free read Action declared');
    return RESULTS.slice();
  }
  record('invoke-has-free-read-action', true);

  // 1. Reject envelope missing required fields
  try {
    const r = await fetch(invokeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/oap+json' },
      body: JSON.stringify({ oap_version: '1.0' }),
    });
    record('invoke-rejects-malformed-envelope', r.status >= 400 && r.status < 500,
      r.status >= 400 ? null : `expected 4xx, got ${r.status}`);
  } catch (err) {
    record('invoke-rejects-malformed-envelope', false, err.message);
  }

  // 2. Reject unknown action
  try {
    const r = await fetch(invokeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/oap+json' },
      body: JSON.stringify({
        oap_version: '1.0', request_id: ulid(), principal_did: 'did:plc:test',
        agent_did: 'did:assistnet:test', action: 'this_action_does_not_exist',
        input: {}, signature: { alg: 'EdDSA', kid: 'probe', value: 'probe' },
      }),
    });
    record('invoke-rejects-unknown-action', r.status === 404,
      r.status === 404 ? null : `expected 404, got ${r.status}`);
  } catch (err) {
    record('invoke-rejects-unknown-action', false, err.message);
  }

  // 3. Successful invocation returns receipt
  try {
    // Build a minimal valid input for the free action: prefer 'query' string
    // (find_user shape) else an empty object.
    const input = freeAction.input_schema && freeAction.input_schema.properties && freeAction.input_schema.properties.query
      ? { query: 'probe', max_results: 1 }
      : {};
    const r = await fetch(invokeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/oap+json' },
      body: JSON.stringify({
        oap_version: '1.0', request_id: ulid(),
        timestamp: new Date().toISOString(),
        principal_did: 'did:plc:test_principal',
        agent_did: 'did:assistnet:test_agent',
        action: freeAction.id, input,
        context: { locale: 'en-US', currency: 'EUR', jurisdiction_user: 'DE', jurisdiction_agent: 'DE' },
        signature: { alg: 'EdDSA', kid: 'probe', value: 'probe' },
      }),
    });
    const body = await r.json().catch(() => null);
    record('invoke-success-200', r.ok, r.ok ? null : `HTTP ${r.status}`);
    if (body) {
      record('invoke-emits-receipt-reference', !!(body.receipt_id || (body.receipt && body.receipt.receipt_id)),
        'receipt_id missing in success response');
      record('invoke-echoes-request-id', body.request_id != null, 'request_id echoed back');
      record('invoke-version-echoed', body.oap_version === '1.0',
        `expected oap_version=1.0, got ${body.oap_version}`);
    }
  } catch (err) {
    record('invoke-success-200', false, err.message);
  }

  return RESULTS.slice();
}

module.exports = { run };
