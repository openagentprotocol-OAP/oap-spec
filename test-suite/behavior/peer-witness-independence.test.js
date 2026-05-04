/**
 * @oap-test
 * @levels L5
 * @rfcs RFC-0019 (Conformance Receipt), RFC-0023 (Peer Witness)
 * @category behavior
 * @description Verifies that L5 peer witnesses are independent: at least
 *   three distinct witness DIDs AND at least three distinct DID method
 *   identifiers (proxy for distinct controlling organisations). Skipped
 *   when the implementation does not claim L5.
 */

'use strict';

const { fetchManifest, fetchReceipt, claimsAny } = require('./_helpers');

function controllerKey(witnessDid) {
  // did:web:example.com:tenants:foo -> example.com
  // did:key:zABC -> did:key
  if (typeof witnessDid !== 'string') return '';
  const parts = witnessDid.split(':');
  if (parts.length < 3) return witnessDid;
  if (parts[1] === 'web') return parts[2];
  return `${parts[0]}:${parts[1]}`;
}

async function run({ target }) {
  const RESULTS = [];
  const rec = (name, passed, reason) => RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
  const base = target.replace(/\/$/, '');

  const manifest = await fetchManifest(base);
  if (!manifest) return RESULTS;
  const receipt = await fetchReceipt(base, manifest);

  if (!claimsAny(receipt, ['L5'])) {
    rec('peer-witness-independence-not-applicable', true, 'Implementation does not claim L5.');
    return RESULTS;
  }

  const witnesses = Array.isArray(receipt.peer_witnesses) ? receipt.peer_witnesses : [];
  if (witnesses.length < 3) {
    rec('peer-witness-independence-precondition', false,
      `independence check requires >=3 witnesses, found ${witnesses.length}`);
    return RESULTS;
  }

  const dids = new Set(witnesses.map((w) => w && w.witness_did).filter(Boolean));
  rec('peer-witness-independence-distinct-dids', dids.size >= 3,
    `expected >=3 distinct witness_did, found ${dids.size}`);

  const controllers = new Set(witnesses.map((w) => controllerKey(w && w.witness_did)).filter(Boolean));
  rec('peer-witness-independence-distinct-controllers', controllers.size >= 3,
    `expected >=3 distinct controller domains/methods, found ${controllers.size} (${[...controllers].join(', ')})`);

  return RESULTS;
}

module.exports = { run };
