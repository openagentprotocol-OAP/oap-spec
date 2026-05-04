/**
 * @oap-test
 * @levels L0, L1, L2
 * @rfcs RFC-0001, OAP-CORE-1.0
 * @category behavior
 * @description Verifies the basic discoverability and invocation lifecycle of
 *              an OAP server. The server MUST publish a manifest at the
 *              well known location, MUST accept an invocation against a
 *              declared free Action, and MUST return a structurally valid
 *              receipt.
 */

const RESULTS = [];

function record(name, passed, reason) {
  RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
}

async function run({ target }) {
  RESULTS.length = 0;

  let manifest = null;
  try {
    const res = await fetch(`${target.replace(/\/$/, '')}/.well-known/oap-tool.json`);
    if (!res.ok) {
      record('manifest-discovery', false, `Manifest endpoint returned HTTP ${res.status}.`);
      return RESULTS.slice();
    }
    manifest = await res.json();
    record('manifest-discovery', true);
  } catch (err) {
    record('manifest-discovery', false, `Could not fetch manifest: ${err.message}`);
    return RESULTS.slice();
  }

  const requiredFields = ['oap_version', 'tool', 'endpoints', 'actions'];
  const missing = requiredFields.filter((f) => manifest[f] === undefined);
  record('manifest-required-fields', missing.length === 0, missing.length ? `Missing fields: ${missing.join(', ')}` : null);

  const requiredEndpoints = ['invoke', 'audit', 'data_delete', 'incident'];
  const missingEndpoints = requiredEndpoints.filter((e) => !manifest.endpoints || !manifest.endpoints[e]);
  record('manifest-mandatory-endpoints', missingEndpoints.length === 0, missingEndpoints.length ? `Missing endpoints: ${missingEndpoints.join(', ')}` : null);

  const freeAction = (manifest.actions || []).find((a) => a.cost && a.cost.type === 'free');
  if (!freeAction) {
    record('free-action-available', false, 'No free Action declared. Reference servers MUST expose at least one free Action for connectivity testing.');
    return RESULTS.slice();
  }
  record('free-action-available', true);

  const invokeUrl = manifest.endpoints.invoke.startsWith('http')
    ? manifest.endpoints.invoke
    : `${target.replace(/\/$/, '')}${manifest.endpoints.invoke}`;

  // Crockford Base32, 26 chars (ULID shape) per oap-request-envelope.schema.json
  const ULID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  function makeUlidLike() {
    let out = '';
    for (let i = 0; i < 26; i++) out += ULID_ALPHABET[Math.floor(Math.random() * 32)];
    return out;
  }

  let invokeRes;
  let invokeBody;
  try {
    invokeRes = await fetch(invokeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/oap+json' },
      body: JSON.stringify({
        oap_version: '1.0',
        request_id: makeUlidLike(),
        timestamp: new Date().toISOString(),
        principal_did: 'did:plc:test_principal',
        agent_did: 'did:assistnet:test_agent',
        action: freeAction.id,
        input: {},
        context: {
          locale: 'en-US',
          currency: 'EUR',
          jurisdiction_user: 'DE',
          jurisdiction_agent: 'DE',
        },
        signature: {
          alg: 'EdDSA',
          kid: 'test-suite-probe',
          value: 'probe',
        },
      }),
    });
    invokeBody = await invokeRes.json().catch(() => null);
    record('invoke-accepts-call', invokeRes.ok, invokeRes.ok ? null : `HTTP ${invokeRes.status}`);
  } catch (err) {
    record('invoke-accepts-call', false, err.message);
    return RESULTS.slice();
  }

  if (invokeRes.ok && invokeBody) {
    const hasReceipt = invokeBody.receipt || invokeBody.receipt_id;
    record('invoke-returns-receipt-reference', !!hasReceipt, hasReceipt ? null : 'Response did not include a receipt or receipt_id.');
  }

  return RESULTS.slice();
}

module.exports = { run };
