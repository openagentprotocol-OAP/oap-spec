/**
 * @oap-test
 * @levels L1, L1-NC
 * @rfcs OAP-CORE-1.0 §5
 * @category behavior
 * @description Verifies the OAP discovery surface: the .well-known manifest
 *              MUST be served, MUST be valid JSON, MUST declare a tool DID
 *              and a non-empty Action catalog, and the corresponding
 *              .well-known/did.json MUST resolve and contain a verification
 *              method whose controller equals the tool DID.
 */

const RESULTS = [];
function record(name, passed, reason) {
  RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
}

async function run({ target }) {
  RESULTS.length = 0;
  const base = target.replace(/\/$/, '');

  let manifest = null;
  try {
    const res = await fetch(`${base}/.well-known/oap-tool.json`);
    if (!res.ok) {
      record('discover-manifest-served', false, `HTTP ${res.status}`);
      return RESULTS.slice();
    }
    manifest = await res.json();
    record('discover-manifest-served', true);
  } catch (err) {
    record('discover-manifest-served', false, err.message);
    return RESULTS.slice();
  }

  const did = manifest.tool && manifest.tool.did;
  record('discover-tool-did-declared', typeof did === 'string' && /^did:(web|key):/.test(did),
    did ? null : 'manifest.tool.did missing or malformed');

  const actions = Array.isArray(manifest.actions) ? manifest.actions : [];
  record('discover-actions-non-empty', actions.length > 0,
    actions.length ? null : 'manifest.actions must contain at least one Action');

  // Each Action must declare id, side_effects, input_schema, output_schema
  let actionShapeOk = true;
  let actionShapeReason = null;
  for (const a of actions) {
    const missing = ['id', 'side_effects', 'input_schema', 'output_schema'].filter((k) => a[k] === undefined);
    if (missing.length) {
      actionShapeOk = false;
      actionShapeReason = `Action '${a.id || '?'}' missing fields: ${missing.join(', ')}`;
      break;
    }
  }
  record('discover-actions-well-shaped', actionShapeOk, actionShapeReason);

  // did.json must be resolvable and consistent
  try {
    const didRes = await fetch(`${base}/.well-known/did.json`);
    if (!didRes.ok) {
      record('discover-did-document-served', false, `HTTP ${didRes.status}`);
    } else {
      const didDoc = await didRes.json();
      const idOk = didDoc.id === did;
      record('discover-did-document-served', true);
      record('discover-did-document-matches-manifest', idOk,
        idOk ? null : `did.json id (${didDoc.id}) does not match manifest tool.did (${did})`);
      const vm = Array.isArray(didDoc.verificationMethod) ? didDoc.verificationMethod : [];
      const hasEd = vm.some((v) => (v.type === 'JsonWebKey2020' || v.type === 'Ed25519VerificationKey2020') && v.controller === did);
      record('discover-did-document-has-key', hasEd,
        hasEd ? null : 'did.json must contain a verificationMethod with controller=tool DID');
    }
  } catch (err) {
    record('discover-did-document-served', false, err.message);
  }

  return RESULTS.slice();
}

module.exports = { run };
