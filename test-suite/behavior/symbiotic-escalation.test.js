/**
 * @oap-test
 * @levels L5-FINANCE
 * @rfcs RFC-0028 (Model Risk and Symbiotic Autonomy) section 3.5, RFC-0018 (Right to Human Path)
 * @category behavior
 * @description Verifies that L5-FINANCE implementations declare a Symbiotic
 *   Escalation policy that routes covered-decision-class invocations whose
 *   confidence score falls below `symbiotic_escalation.confidence_threshold`
 *   to the Human Path of RFC 0018, that the Decision Record carries
 *   `escalation_status` and `confidence_score`, and that the policy is
 *   wired into the conformance receipt.
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
    rec('symbiotic-escalation-not-applicable', true, 'Implementation does not claim L5-FINANCE.');
    return RESULTS;
  }

  const policy = manifest && manifest.model_risk && manifest.model_risk.symbiotic_escalation;
  rec('symbiotic-escalation-policy-present', !!policy,
    'L5-FINANCE manifests MUST declare model_risk.symbiotic_escalation per RFC 0028 section 3.5');
  if (!policy) return RESULTS;

  const threshold = policy.confidence_threshold;
  rec('symbiotic-escalation-threshold-bounded',
    typeof threshold === 'number' && threshold >= 0 && threshold <= 1,
    `confidence_threshold must be a number in [0,1], got ${JSON.stringify(threshold)}`);

  rec('symbiotic-escalation-human-path-bound', typeof policy.human_path_endpoint === 'string' && policy.human_path_endpoint.length > 0,
    'symbiotic_escalation.human_path_endpoint MUST point at the RFC 0018 escalation endpoint');

  const decisionUrl = endpointUrl(base, manifest, 'decision_record_sample');
  if (decisionUrl) {
    const sample = await fetchJson(decisionUrl);
    if (sample) {
      rec('symbiotic-escalation-decision-record-fields',
        sample.escalation_status !== undefined && sample.confidence_score !== undefined,
        'Sample Decision Record MUST carry escalation_status and confidence_score per RFC 0028 section 3.5');
    }
  }

  return RESULTS;
}

module.exports = { run };
