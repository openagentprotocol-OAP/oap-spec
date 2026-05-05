/**
 * @oap-test
 * @levels L5-FINANCE
 * @rfcs RFC-0028 (Model Risk and Symbiotic Autonomy) section 3.7
 * @category behavior
 * @description Verifies that L5-FINANCE Decision Records carry a
 *   `counterfactual_explanation` block with the required `method`,
 *   `minimal_changes`, `actionability_class`, and the immutable feature
 *   exclusion guarantee (RFC 0028 section 3.7).
 */

'use strict';

const { fetchManifest, fetchReceipt, claimsAny, endpointUrl, fetchJson } = require('./_helpers');

const VALID_METHODS = new Set([
  'wachter_unconditional_counterfactual',
  'dice_diverse_counterfactual',
  'inherent_rule_counterfactual',
  'lime_local_surrogate',
  'shap_value_attribution',
]);

const VALID_ACTIONABILITY = new Set(['actionable', 'context_only']);

async function run({ target }) {
  const RESULTS = [];
  const rec = (name, passed, reason) => RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
  const base = target.replace(/\/$/, '');

  const manifest = await fetchManifest(base);
  if (!manifest) return RESULTS;
  const receipt = await fetchReceipt(base, manifest);

  if (!claimsAny(receipt, ['L5-FINANCE'])) {
    rec('counterfactual-explanation-not-applicable', true, 'Implementation does not claim L5-FINANCE.');
    return RESULTS;
  }

  const sampleUrl = endpointUrl(base, manifest, 'decision_record_sample');
  if (!sampleUrl) {
    rec('counterfactual-explanation-sample-endpoint',
      false,
      'manifest.endpoints.decision_record_sample MUST be declared so the probe can verify counterfactual content');
    return RESULTS;
  }

  const sample = await fetchJson(sampleUrl);
  if (!sample) {
    rec('counterfactual-explanation-sample-resolvable', false, 'decision_record_sample endpoint returned no JSON');
    return RESULTS;
  }

  const cf = sample.counterfactual_explanation;
  rec('counterfactual-explanation-present', !!cf,
    'Decision Record MUST carry counterfactual_explanation per RFC 0028 section 3.7');
  if (!cf) return RESULTS;

  rec('counterfactual-explanation-method-valid', VALID_METHODS.has(cf.method),
    `counterfactual_explanation.method must be one of ${Array.from(VALID_METHODS).join('|')}, got ${cf.method}`);

  rec('counterfactual-explanation-minimal-changes',
    Array.isArray(cf.minimal_changes),
    'counterfactual_explanation.minimal_changes MUST be an array');

  rec('counterfactual-explanation-actionability',
    VALID_ACTIONABILITY.has(cf.actionability_class),
    `actionability_class must be one of ${Array.from(VALID_ACTIONABILITY).join('|')}`);

  const immutable = Array.isArray(cf.immutable_features) ? cf.immutable_features : [];
  const changedKeys = Array.isArray(cf.minimal_changes) ? cf.minimal_changes.map((c) => c && c.feature) : [];
  const violation = changedKeys.filter((k) => immutable.includes(k));
  if (cf.actionability_class === 'actionable') {
    rec('counterfactual-explanation-immutable-exclusion', violation.length === 0,
      violation.length ? `actionable counterfactual MUST NOT change immutable features: ${violation.join(',')}` : null);
  } else {
    rec('counterfactual-explanation-immutable-exclusion-context-only', true,
      'context_only counterfactuals are exempt from immutable feature exclusion');
  }

  return RESULTS;
}

module.exports = { run };
