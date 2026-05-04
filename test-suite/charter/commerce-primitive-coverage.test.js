/**
 * @oap-test
 * @levels L0
 * @rfcs RFC-0014
 * @category charter
 * @description Mechanically backs Theorem 2 (Completeness) of RFC 0014
 *              Appendix A. Loads commerce-primitive-coverage.json, validates
 *              every encoded arrangement against the normative
 *              oap-commerce-primitive.schema.json, and verifies that the
 *              union of encodings exercises every value of every axis at
 *              least once. Also re-asserts the cardinality |C| = 10368
 *              claimed in Appendix A section A.2.
 *
 * @license Apache-2.0
 */

const fs = require('fs');
const path = require('path');
const Ajv2020 = require('ajv/dist/2020').default || require('ajv/dist/2020');
const addFormats = require('ajv-formats').default || require('ajv-formats');

const SCHEMA_PATH = path.resolve(__dirname, '../../schemas/v1.0/oap-commerce-primitive.schema.json');
const COVERAGE_PATH = path.resolve(__dirname, 'commerce-primitive-coverage.json');

function record(results, name, passed, reason) {
  results.push({ name, category: 'charter', passed, reason: reason || null });
}

async function run() {
  const results = [];
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
  const coverage = JSON.parse(fs.readFileSync(COVERAGE_PATH, 'utf-8'));
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  // Cardinality assertion (Appendix A section A.2).
  const cardinality =
    coverage.axes.resource_type.length *
    coverage.axes.transfer_pattern.length *
    coverage.axes.settlement_trigger.length *
    coverage.axes.pricing_function.length *
    coverage.axes.risk_allocation.length;
  record(
    results,
    'commerce-primitive-cardinality',
    cardinality === 10368,
    cardinality === 10368 ? null : `Expected |C| = 10368, got ${cardinality}.`
  );

  // Expected arrangement count.
  record(
    results,
    'commerce-primitive-arrangement-count',
    coverage.arrangements.length === coverage.expected_count,
    coverage.arrangements.length === coverage.expected_count
      ? null
      : `Expected ${coverage.expected_count} arrangements, got ${coverage.arrangements.length}.`
  );

  // Per arrangement schema validation.
  let invalid = 0;
  const failures = [];
  for (const entry of coverage.arrangements) {
    const ok = validate(entry.encoding);
    if (!ok) {
      invalid += 1;
      failures.push(`${entry.id}: ${ajv.errorsText(validate.errors)}`);
    }
  }
  record(
    results,
    'commerce-primitive-encodings-valid',
    invalid === 0,
    invalid === 0 ? null : `${invalid} invalid encodings: ${failures.slice(0, 3).join('; ')}${failures.length > 3 ? '; ...' : ''}`
  );

  // Axis coverage assertion (Theorem 1, Independence, mechanical witness).
  const seen = {
    resource_type: new Set(),
    transfer_pattern: new Set(),
    settlement_trigger: new Set(),
    pricing_function: new Set(),
    risk_allocation: new Set(),
  };
  for (const entry of coverage.arrangements) {
    for (const axis of Object.keys(seen)) {
      seen[axis].add(entry.encoding[axis]);
    }
  }
  for (const axis of Object.keys(seen)) {
    const expected = coverage.axes[axis];
    const missing = expected.filter((v) => !seen[axis].has(v));
    record(
      results,
      `commerce-primitive-axis-coverage-${axis}`,
      missing.length === 0,
      missing.length === 0 ? null : `Axis ${axis} missing values: ${missing.join(', ')}`
    );
  }

  // Taxonomy coverage. The five reference taxonomies named in Appendix A
  // section A.4 must each contribute at least one arrangement.
  const requiredTaxonomies = ['UCC Article 2', 'CISG', 'Posner', 'WTO W/120', 'Agent Economy'];
  const presentTaxonomies = new Set(coverage.arrangements.map((a) => a.taxonomy));
  for (const t of requiredTaxonomies) {
    record(
      results,
      `commerce-primitive-taxonomy-${t.replace(/\s+/g, '-').toLowerCase()}`,
      presentTaxonomies.has(t),
      presentTaxonomies.has(t) ? null : `Reference taxonomy ${t} is not represented.`
    );
  }

  return results;
}

module.exports = { run };
