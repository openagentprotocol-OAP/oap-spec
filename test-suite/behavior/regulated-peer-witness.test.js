/**
 * @oap-test
 * @levels L5-FINANCE
 * @rfcs RFC-0028 (Model Risk and Symbiotic Autonomy), RFC-0019 (Conformance) section 8
 * @category behavior
 * @description Verifies that L5-FINANCE peer witnesses include at least one
 *   regulated entity (declared `entity_type` of `bank`, `broker_dealer`,
 *   `investment_firm`, or `e_money_institution`) so that the witness set
 *   carries the institutional accountability that MiFID II / SR 11-7 expect.
 */

'use strict';

const { fetchManifest, fetchReceipt, claimsAny } = require('./_helpers');

const REGULATED_TYPES = new Set([
  'bank',
  'broker_dealer',
  'investment_firm',
  'e_money_institution',
  'central_securities_depositary',
  'qualified_auditor',
]);

async function run({ target }) {
  const RESULTS = [];
  const rec = (name, passed, reason) => RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
  const base = target.replace(/\/$/, '');

  const manifest = await fetchManifest(base);
  if (!manifest) return RESULTS;
  const receipt = await fetchReceipt(base, manifest);

  if (!claimsAny(receipt, ['L5-FINANCE'])) {
    rec('regulated-peer-witness-not-applicable', true, 'Implementation does not claim L5-FINANCE.');
    return RESULTS;
  }

  const witnesses = Array.isArray(receipt.peer_witnesses) ? receipt.peer_witnesses : [];
  const regulated = witnesses.filter((w) => w && REGULATED_TYPES.has(w.entity_type));
  rec('regulated-peer-witness-min-1', regulated.length >= 1,
    `L5-FINANCE peer_witnesses MUST include at least one regulated entity (bank|broker_dealer|investment_firm|e_money_institution|central_securities_depositary|qualified_auditor); found ${regulated.length}`);

  const lei = regulated.filter((w) => w && typeof w.legal_entity_identifier === 'string' && /^[A-Z0-9]{20}$/.test(w.legal_entity_identifier));
  rec('regulated-peer-witness-lei',
    regulated.length === 0 || lei.length === regulated.length,
    'every regulated peer witness MUST declare a 20-character ISO 17442 Legal Entity Identifier');

  return RESULTS;
}

module.exports = { run };
