/**
 * @oap-test
 * @levels L0
 * @rfcs RFC-0014
 * @category schema
 * @description Mechanically backs Theorem 4 (Schema Soundness) of RFC 0014
 *              Appendix A. Soundness: every JSON document accepted by
 *              oap-commerce-primitive.schema.json decodes to a unique tuple
 *              c in C with a parameter map. Completeness: every tuple
 *              c in C is the decoding of at least one schema-valid document.
 *
 *              Soundness is checked by enumerating constructed documents that
 *              violate exactly one axis constraint and asserting rejection.
 *              Completeness is checked by enumerating all 10368 tuples in C
 *              and asserting acceptance.
 *
 *              This file is also exposed via the charter wrapper at
 *              charter/commerce-primitive-soundness.test.js so that the
 *              standard runner picks it up.
 *
 * @license Apache-2.0
 */

const fs = require('fs');
const path = require('path');
const Ajv2020 = require('ajv/dist/2020').default || require('ajv/dist/2020');
const addFormats = require('ajv-formats').default || require('ajv-formats');

const SCHEMA_PATH = path.resolve(__dirname, '../../schemas/v1.0/oap-commerce-primitive.schema.json');

const AXES = {
  resource_type: ['good', 'knowledge', 'capability', 'attention', 'risk', 'capital', 'time', 'intermediation'],
  transfer_pattern: ['ownership_transfer', 'access_grant', 'action_delegation', 'risk_pooling', 'intermediation', 'capital_lending'],
  settlement_trigger: ['on_invocation', 'on_outcome', 'on_schedule', 'on_event', 'on_claim', 'on_consumption'],
  pricing_function: ['fixed', 'metered', 'auction', 'formula', 'negotiated', 'reputation_weighted'],
  risk_allocation: ['buyer', 'seller', 'mutual_pool', 'escrow', 'stake', 'third_party_guarantor'],
};

const EXPECTED_CARDINALITY = 8 * 6 * 6 * 6 * 6;

function record(results, name, passed, reason) {
  results.push({ name, category: 'schema', passed, reason: reason || null });
}

function buildValidator() {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  return { ajv, validate: ajv.compile(schema) };
}

function* enumerateTuples() {
  for (const r of AXES.resource_type)
    for (const t of AXES.transfer_pattern)
      for (const s of AXES.settlement_trigger)
        for (const p of AXES.pricing_function)
          for (const y of AXES.risk_allocation)
            yield { resource_type: r, transfer_pattern: t, settlement_trigger: s, pricing_function: p, risk_allocation: y };
}

async function run() {
  const results = [];
  const { ajv, validate } = buildValidator();

  // Cardinality of the schema-defined product equals 10368.
  let total = 0;
  for (const _ of enumerateTuples()) total += 1;
  record(
    results,
    'commerce-primitive-schema-cardinality',
    total === EXPECTED_CARDINALITY,
    total === EXPECTED_CARDINALITY ? null : `Enumerated ${total}, expected ${EXPECTED_CARDINALITY}.`
  );

  // Completeness: every tuple in C is accepted by the schema.
  let rejected = 0;
  let firstFailure = null;
  for (const tuple of enumerateTuples()) {
    if (!validate(tuple)) {
      rejected += 1;
      if (!firstFailure) firstFailure = `${JSON.stringify(tuple)} :: ${ajv.errorsText(validate.errors)}`;
    }
  }
  record(
    results,
    'commerce-primitive-schema-completeness',
    rejected === 0,
    rejected === 0 ? null : `${rejected} tuples rejected by schema. First: ${firstFailure}`
  );

  // Soundness, axis by axis: replacing one axis with an out-of-enum value
  // must always produce rejection.
  const baseline = {
    resource_type: 'capability',
    transfer_pattern: 'access_grant',
    settlement_trigger: 'on_schedule',
    pricing_function: 'fixed',
    risk_allocation: 'buyer',
  };
  let acceptedBad = 0;
  const axes = Object.keys(AXES);
  for (const axis of axes) {
    const bad = { ...baseline, [axis]: '__not_a_valid_value__' };
    if (validate(bad)) acceptedBad += 1;
  }
  record(
    results,
    'commerce-primitive-schema-soundness-axis-enum',
    acceptedBad === 0,
    acceptedBad === 0 ? null : `${acceptedBad} out-of-enum substitutions accepted.`
  );

  // Soundness: missing required axes (without preset) must be rejected.
  const missingAxis = { resource_type: 'capability', transfer_pattern: 'access_grant', settlement_trigger: 'on_schedule', pricing_function: 'fixed' };
  record(
    results,
    'commerce-primitive-schema-soundness-required',
    !validate(missingAxis),
    validate(missingAxis) ? 'Document missing risk_allocation was accepted.' : null
  );

  // Soundness: unknown property must be rejected (additionalProperties false).
  const extra = { ...baseline, unknown_axis: 'x' };
  record(
    results,
    'commerce-primitive-schema-soundness-additional-properties',
    !validate(extra),
    validate(extra) ? 'Document with unknown property was accepted.' : null
  );

  // Soundness: preset alone is admissible (anyOf branch).
  record(
    results,
    'commerce-primitive-schema-preset-branch',
    validate({ preset: 'subscription' }),
    validate({ preset: 'subscription' }) ? null : `Preset-only document rejected: ${ajv.errorsText(validate.errors)}`
  );

  return results;
}

module.exports = { run, AXES, EXPECTED_CARDINALITY };
