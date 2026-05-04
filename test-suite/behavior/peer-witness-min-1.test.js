/**
 * @oap-test
 * @levels L4
 * @rfcs RFC-0019 (Conformance Receipt), RFC-0023 (Peer Witness)
 * @category behavior
 * @description Verifies that an implementation claiming L4 has at least
 *   one peer witness signature on its Conformance Receipt. Skipped when
 *   the implementation does not claim L4 or higher.
 */

'use strict';

const { fetchManifest, fetchReceipt, claimsAny } = require('./_helpers');

function isWitnessShapeOk(w) {
  return w
    && typeof w.witness_did === 'string' && w.witness_did.length > 0
    && typeof w.witness_receipt_uri === 'string' && w.witness_receipt_uri.length > 0
    && typeof w.alg === 'string' && w.alg.length > 0
    && typeof w.signature === 'string' && w.signature.length > 0
    && typeof w.witnessed_at === 'string' && w.witnessed_at.length > 0;
}

async function run({ target }) {
  const RESULTS = [];
  const rec = (name, passed, reason) => RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
  const base = target.replace(/\/$/, '');

  const manifest = await fetchManifest(base);
  if (!manifest) return RESULTS;
  const receipt = await fetchReceipt(base, manifest);

  if (!claimsAny(receipt, ['L4', 'L5'])) {
    rec('peer-witness-min-1-not-applicable', true, 'Implementation does not claim L4 or higher.');
    return RESULTS;
  }

  const witnesses = Array.isArray(receipt.peer_witnesses) ? receipt.peer_witnesses : [];
  rec('peer-witness-min-1-count', witnesses.length >= 1,
    witnesses.length >= 1 ? null : `expected >=1 peer witness, found ${witnesses.length}`);

  const malformed = witnesses.filter((w) => !isWitnessShapeOk(w));
  rec('peer-witness-min-1-shape', malformed.length === 0,
    malformed.length ? `${malformed.length} witness entries missing required fields` : null);

  return RESULTS;
}

module.exports = { run };
