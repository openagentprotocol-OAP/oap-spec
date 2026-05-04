/**
 * @oap-test
 * @levels L5
 * @rfcs RFC-0019 (Conformance Receipt), RFC-0023 (Peer Witness)
 * @category behavior
 * @description Verifies that L5 implementations have at least three peer
 *   witness signatures on their Conformance Receipt. Skipped when the
 *   implementation does not claim L5.
 */

'use strict';

const { fetchManifest, fetchReceipt, claimsAny } = require('./_helpers');

function isWitnessShapeOk(w) {
  return w
    && typeof w.witness_did === 'string'
    && typeof w.witness_receipt_uri === 'string'
    && typeof w.alg === 'string'
    && typeof w.signature === 'string'
    && typeof w.witnessed_at === 'string';
}

async function run({ target }) {
  const RESULTS = [];
  const rec = (name, passed, reason) => RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
  const base = target.replace(/\/$/, '');

  const manifest = await fetchManifest(base);
  if (!manifest) return RESULTS;
  const receipt = await fetchReceipt(base, manifest);

  if (!claimsAny(receipt, ['L5'])) {
    rec('peer-witness-min-3-not-applicable', true, 'Implementation does not claim L5.');
    return RESULTS;
  }

  const witnesses = Array.isArray(receipt.peer_witnesses) ? receipt.peer_witnesses : [];
  rec('peer-witness-min-3-count', witnesses.length >= 3,
    `expected >=3 peer witnesses, found ${witnesses.length}`);

  const malformed = witnesses.filter((w) => !isWitnessShapeOk(w));
  rec('peer-witness-min-3-shape', malformed.length === 0,
    malformed.length ? `${malformed.length} witness entries missing required fields` : null);

  return RESULTS;
}

module.exports = { run };
