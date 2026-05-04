/**
 * @oap-test
 * @levels L3
 * @rfcs RFC-0011 (Data Policy)
 * @category behavior
 * @description Verifies that L3 implementations publish a complete
 *   data_policy block in their Manifest. Skipped when the implementation
 *   does not claim L3 or higher.
 */

'use strict';

const { fetchManifest, fetchReceipt, claimsAny } = require('./_helpers');

const TRAINING_VALUES = new Set(['never', 'with_consent', 'by_default']);

async function run({ target }) {
  const RESULTS = [];
  const rec = (name, passed, reason) => RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
  const base = target.replace(/\/$/, '');

  const manifest = await fetchManifest(base);
  if (!manifest) return RESULTS;
  const receipt = await fetchReceipt(base, manifest);

  if (!claimsAny(receipt, ['L3', 'L4', 'L5'])) {
    rec('data-policy-not-applicable', true, 'Implementation does not claim L3 or higher. Data policy block not required.');
    return RESULTS;
  }

  const dp = manifest.data_policy;
  rec('data-policy-block-present', !!dp && typeof dp === 'object', dp ? null : 'manifest.data_policy missing');
  if (!dp || typeof dp !== 'object') return RESULTS;

  rec('data-policy-stores-principal-data-typed', typeof dp.stores_principal_data === 'boolean',
    typeof dp.stores_principal_data === 'boolean' ? null : 'stores_principal_data must be boolean');

  rec('data-policy-retention-days-typed',
    typeof dp.retention_days === 'number' && dp.retention_days >= 0,
    typeof dp.retention_days === 'number' ? null : 'retention_days must be a non-negative number');

  rec('data-policy-shares-third-parties-typed', typeof dp.shares_with_third_parties === 'boolean',
    typeof dp.shares_with_third_parties === 'boolean' ? null : 'shares_with_third_parties must be boolean');

  rec('data-policy-training-on-data-enum',
    typeof dp.training_on_principal_data === 'string' && TRAINING_VALUES.has(dp.training_on_principal_data),
    `training_on_principal_data must be one of ${[...TRAINING_VALUES].join(', ')}`);

  rec('data-policy-deletion-endpoint-present',
    typeof dp.deletion_endpoint === 'string' && dp.deletion_endpoint.length > 0,
    dp.deletion_endpoint ? null : 'deletion_endpoint missing (RFC 0011 section 6)');

  rec('data-policy-lawful-bases-present',
    Array.isArray(dp.lawful_bases) && dp.lawful_bases.length > 0,
    Array.isArray(dp.lawful_bases) && dp.lawful_bases.length ? null : 'lawful_bases must be a non-empty array');

  if (dp.shares_with_third_parties === true) {
    rec('data-policy-subprocessors-listed-when-shared',
      Array.isArray(dp.subprocessors) && dp.subprocessors.length > 0,
      'shares_with_third_parties=true requires a non-empty subprocessors array (RFC 0011 section 7)');
  }

  return RESULTS;
}

module.exports = { run };
