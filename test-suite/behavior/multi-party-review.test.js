/**
 * @oap-test
 * @levels L3
 * @rfcs RFC-0016 (High-Risk Action Governance)
 * @category behavior
 * @description Verifies that L3 implementations require multi-party review
 *   for every Action whose risk_class is 'high' or 'critical'. Skipped when
 *   the implementation does not claim L3 or higher. Vacuously satisfied if
 *   no high or critical Actions are declared.
 */

'use strict';

const { fetchManifest, fetchReceipt, claimsAny } = require('./_helpers');

async function run({ target }) {
  const RESULTS = [];
  const rec = (name, passed, reason) => RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
  const base = target.replace(/\/$/, '');

  const manifest = await fetchManifest(base);
  if (!manifest) return RESULTS;
  const receipt = await fetchReceipt(base, manifest);

  if (!claimsAny(receipt, ['L3', 'L4', 'L5'])) {
    rec('multi-party-review-not-applicable', true, 'Implementation does not claim L3 or higher.');
    return RESULTS;
  }

  const actions = Array.isArray(manifest.actions) ? manifest.actions : [];
  const highRisk = actions.filter((a) => a.risk_class === 'high' || a.risk_class === 'critical');

  if (highRisk.length === 0) {
    rec('multi-party-review-vacuously-satisfied', true, 'Manifest declares no Actions with risk_class high or critical.');
    return RESULTS;
  }

  const offenders = highRisk.filter((a) => {
    const declared = a.requires_multi_party_review === true
      || (a.review_quorum && typeof a.review_quorum === 'object' && Number(a.review_quorum.required) >= 2);
    return !declared;
  });

  rec('multi-party-review-required-for-high-risk', offenders.length === 0,
    offenders.length
      ? `High/critical actions missing requires_multi_party_review or review_quorum.required>=2: ${offenders.map((a) => a.id).join(', ')}`
      : null);

  return RESULTS;
}

module.exports = { run };
