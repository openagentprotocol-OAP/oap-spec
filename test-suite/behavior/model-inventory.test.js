/**
 * @oap-test
 * @levels L5-FINANCE
 * @rfcs RFC-0028 (Model Risk and Symbiotic Autonomy) section 3.2
 * @category behavior
 * @description Verifies that L5-FINANCE implementations declare a Model
 *   Inventory in the Manifest under `model_risk.models[]`, that every
 *   declared Model carries the required fields including `interpretability_class`
 *   with one of the three normative values, and that no Model used in a
 *   covered decision class is `opaque` without the symbiotic escalation
 *   path of section 3.7.1.
 */

'use strict';

const { fetchManifest, fetchReceipt, claimsAny } = require('./_helpers');

const VALID_INTERPRETABILITY = new Set(['inherent', 'post_hoc_interpretable', 'opaque']);
const REQUIRED_FIELDS = ['model_id', 'version', 'interpretability_class', 'training_data_summary', 'last_validated_at'];

async function run({ target }) {
  const RESULTS = [];
  const rec = (name, passed, reason) => RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
  const base = target.replace(/\/$/, '');

  const manifest = await fetchManifest(base);
  if (!manifest) return RESULTS;
  const receipt = await fetchReceipt(base, manifest);

  if (!claimsAny(receipt, ['L5-FINANCE'])) {
    rec('model-inventory-not-applicable', true, 'Implementation does not claim L5-FINANCE.');
    return RESULTS;
  }

  const models = manifest && manifest.model_risk && Array.isArray(manifest.model_risk.models)
    ? manifest.model_risk.models : null;
  rec('model-inventory-present', Array.isArray(models) && models.length > 0,
    'Manifest MUST declare model_risk.models[] under RFC 0028 section 3.2 for L5-FINANCE');
  if (!Array.isArray(models)) return RESULTS;

  const malformed = models.filter((m) => !REQUIRED_FIELDS.every((f) => m && m[f] !== undefined));
  rec('model-inventory-shape', malformed.length === 0,
    malformed.length ? `${malformed.length} models missing required fields ${REQUIRED_FIELDS.join(',')}` : null);

  const badClass = models.filter((m) => m && !VALID_INTERPRETABILITY.has(m.interpretability_class));
  rec('model-inventory-interpretability-class', badClass.length === 0,
    badClass.length ? `${badClass.length} models have invalid interpretability_class (allowed: inherent|post_hoc_interpretable|opaque)` : null);

  const opaqueInHighStakes = models.filter((m) => m && m.interpretability_class === 'opaque' && m.used_in_covered_decision_class === true);
  const escalation = manifest && manifest.model_risk && manifest.model_risk.opaque_model_escalation_policy;
  rec('model-inventory-opaque-escalation-bound',
    opaqueInHighStakes.length === 0 || escalation === 'always_escalate',
    opaqueInHighStakes.length && escalation !== 'always_escalate'
      ? `${opaqueInHighStakes.length} opaque models used in covered decision class without model_risk.opaque_model_escalation_policy = always_escalate (RFC 0028 section 3.7.1)` : null);

  return RESULTS;
}

module.exports = { run };
