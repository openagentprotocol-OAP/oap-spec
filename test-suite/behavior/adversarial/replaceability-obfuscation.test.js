/**
 * @oap-test
 * @levels L2, L3, L4, L5, L5-FINANCE
 * @rfcs RFC-0015 (Composable Software Primitives), RFC-0019 section 8 adversarial category
 * @category behavior/adversarial
 * @description Replaceability Obfuscation. Fetches the Implementation's
 *   Composition Manifest under RFC 0015 and verifies that every declared
 *   replaceability_score is paired with the structural justification fields
 *   (api_compatibility_class, data_compatibility_class, switching_cost_estimate),
 *   so that an adversary cannot inflate replaceability without the
 *   verifiable substrate.
 */

'use strict';

const { fetchManifest, fetchReceipt, claimsAny, endpointUrl, fetchJson } = require('../_helpers');

async function run({ target }) {
  const RESULTS = [];
  const rec = (name, passed, reason) => RESULTS.push({ name, category: 'behavior/adversarial', passed, reason: reason || null });
  const base = target.replace(/\/$/, '');

  const manifest = await fetchManifest(base);
  if (!manifest) return RESULTS;
  const receipt = await fetchReceipt(base, manifest);
  if (!claimsAny(receipt, ['L2', 'L3', 'L4', 'L5', 'L5-FINANCE'])) {
    rec('adversarial-replaceability-obfuscation-not-applicable', true, 'Composition manifest applies from L2 upward.');
    return RESULTS;
  }

  const url = endpointUrl(base, manifest, 'composition_manifest');
  if (!url) {
    rec('adversarial-replaceability-obfuscation-not-declared', true,
      'No composition_manifest endpoint; nothing to falsify.');
    return RESULTS;
  }

  const cm = await fetchJson(url);
  if (!cm || !Array.isArray(cm.composes_with)) {
    rec('adversarial-replaceability-obfuscation-shape', false,
      'composition_manifest MUST expose composes_with[] per RFC 0015');
    return RESULTS;
  }

  const REQUIRED = ['replaceability_score', 'api_compatibility_class', 'data_compatibility_class', 'switching_cost_estimate'];
  const missing = cm.composes_with.filter((c) => !REQUIRED.every((k) => c && c[k] !== undefined));
  rec('adversarial-replaceability-obfuscation-justified', missing.length === 0,
    missing.length ? `${missing.length} composition entries declare replaceability_score without the structural justification fields ${REQUIRED.slice(1).join(',')}` : null);

  const inflated = cm.composes_with.filter((c) => c
    && typeof c.replaceability_score === 'number' && c.replaceability_score > 0.7
    && c.api_compatibility_class === 'incompatible');
  rec('adversarial-replaceability-obfuscation-no-contradiction', inflated.length === 0,
    inflated.length ? `${inflated.length} entries declare replaceability_score > 0.7 with api_compatibility_class = incompatible (contradiction)` : null);

  return RESULTS;
}

module.exports = { run };
