/**
 * @oap-test
 * @levels L5-FINANCE
 * @rfcs RFC-0028 (Model Risk and Symbiotic Autonomy), SR 11-7 (Federal Reserve)
 * @category behavior
 * @description Verifies that L5-FINANCE implementations declare a Champion
 *   Challenger pairing for every Model used in a covered decision class
 *   (SR 11-7), publish the divergence-test cadence, and report the most
 *   recent divergence-rate metric.
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

  if (!claimsAny(receipt, ['L5-FINANCE'])) {
    rec('champion-challenger-not-applicable', true, 'Implementation does not claim L5-FINANCE.');
    return RESULTS;
  }

  const models = manifest && manifest.model_risk && Array.isArray(manifest.model_risk.models)
    ? manifest.model_risk.models : [];
  const covered = models.filter((m) => m && m.used_in_covered_decision_class === true);

  if (covered.length === 0) {
    rec('champion-challenger-no-covered-models', true, 'No models declared used_in_covered_decision_class=true');
    return RESULTS;
  }

  const missing = covered.filter((m) => !m.champion_challenger
    || typeof m.champion_challenger.challenger_model_id !== 'string'
    || typeof m.champion_challenger.divergence_test_cadence_days !== 'number'
    || typeof m.champion_challenger.last_divergence_rate !== 'number');
  rec('champion-challenger-shape', missing.length === 0,
    missing.length ? `${missing.length} covered models missing champion_challenger {challenger_model_id, divergence_test_cadence_days, last_divergence_rate}` : null);

  const stale = covered.filter((m) => m.champion_challenger && typeof m.champion_challenger.divergence_test_cadence_days === 'number'
    && m.champion_challenger.divergence_test_cadence_days > 90);
  rec('champion-challenger-cadence-bound', stale.length === 0,
    stale.length ? `${stale.length} covered models declare divergence_test_cadence_days > 90 (SR 11-7 expects at least quarterly)` : null);

  return RESULTS;
}

module.exports = { run };
