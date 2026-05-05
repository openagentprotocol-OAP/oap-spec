/**
 * @oap-test
 * @levels L5-FINANCE
 * @rfcs RFC-0028 (Model Risk and Symbiotic Autonomy) section 3.4
 * @category behavior
 * @description Verifies that L5-FINANCE Decision Records emitted under a
 *   covered decision class carry an `adverse_action_notice` block with the
 *   specific factors that drove the negative decision (ECOA Regulation B,
 *   FCRA, MiFID II Article 24).
 */

'use strict';

const { fetchManifest, fetchReceipt, claimsAny, endpointUrl, fetchJson } = require('./_helpers');

async function run({ target }) {
  const RESULTS = [];
  const rec = (name, passed, reason) => RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
  const base = target.replace(/\/$/, '');

  const manifest = await fetchManifest(base);
  if (!manifest) return RESULTS;
  const receipt = await fetchReceipt(base, manifest);

  if (!claimsAny(receipt, ['L5-FINANCE'])) {
    rec('adverse-action-notice-not-applicable', true, 'Implementation does not claim L5-FINANCE.');
    return RESULTS;
  }

  const policy = manifest && manifest.model_risk && manifest.model_risk.adverse_action_notice;
  rec('adverse-action-policy-declared', !!policy,
    'L5-FINANCE manifests MUST declare model_risk.adverse_action_notice per RFC 0028 section 3.4');

  const sampleUrl = endpointUrl(base, manifest, 'adverse_decision_sample');
  if (sampleUrl) {
    const sample = await fetchJson(sampleUrl);
    if (sample) {
      const notice = sample.adverse_action_notice;
      rec('adverse-action-notice-shape', !!notice
        && Array.isArray(notice.principal_reasons)
        && notice.principal_reasons.length >= 1,
        'adverse_action_notice.principal_reasons MUST list the specific factors that drove the negative decision');
      rec('adverse-action-notice-language',
        !!notice && typeof notice.plain_language_explanation === 'string' && notice.plain_language_explanation.length > 0,
        'adverse_action_notice.plain_language_explanation MUST be present (ECOA Regulation B)');
    }
  }

  return RESULTS;
}

module.exports = { run };
