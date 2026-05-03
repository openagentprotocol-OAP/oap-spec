#!/usr/bin/env node

/**
 * OAP Conformance Test Suite Runner
 *
 * Executes the schema, behavior, level, and charter test suites and produces
 * a structured report. The runner is deliberately small and dependency light
 * so that it can be embedded into other tooling such as the reference Agent's
 * conformance verifier described in RFC 0019 section 6.
 *
 * Exit code 0 indicates that every selected test passed. Any other exit code
 * indicates that at least one test failed. The detailed report is written to
 * stdout in JSON when the OAP_REPORT environment variable is set to "json".
 *
 * @license Apache-2.0
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const SCHEMA_DIR = path.resolve(ROOT, '../schemas/v1.0');
const REPORT_FORMAT = process.env.OAP_REPORT === 'json' ? 'json' : 'text';

const args = process.argv.slice(2);
const onlyIndex = args.indexOf('--only');
const ONLY = onlyIndex >= 0 ? args[onlyIndex + 1] : null;
const TARGET = process.env.OAP_TARGET || 'http://localhost:3100';

let Ajv2020;
let addFormats;
try {
  Ajv2020 = require('ajv/dist/2020').default || require('ajv/dist/2020');
  addFormats = require('ajv-formats').default || require('ajv-formats');
} catch (err) {
  console.error('Missing dependencies. Run npm install in test-suite/ first.');
  process.exit(2);
}

const ajv = new Ajv2020({ strict: false, allErrors: true, allowUnionTypes: true });
addFormats(ajv);

const compiledByFile = new Map();

function loadAllSchemas() {
  const files = fs.readdirSync(SCHEMA_DIR).filter((f) => f.endsWith('.schema.json'));
  for (const f of files) {
    const schema = JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, f), 'utf-8'));
    const id = schema.$id || f;
    if (!ajv.getSchema(id)) {
      try {
        ajv.addSchema(schema, id);
      } catch (err) {
        console.error(`Failed to load schema ${f}: ${err.message}`);
      }
    }
  }
  return files;
}

function getValidator(schemaFile) {
  if (compiledByFile.has(schemaFile)) return compiledByFile.get(schemaFile);
  const schema = JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, schemaFile), 'utf-8'));
  const id = schema.$id || schemaFile;
  let validate = ajv.getSchema(id);
  if (!validate) {
    ajv.addSchema(schema, id);
    validate = ajv.getSchema(id);
  }
  compiledByFile.set(schemaFile, validate);
  return validate;
}

function listFixtures(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.json')) out.push(full);
    }
  }
  walk(dir);
  return out;
}

function inferSchemaIdFromFixture(fixturePath) {
  const base = path.basename(fixturePath);
  const map = {
    'manifest': 'oap-manifest.schema.json',
    'receipt': 'oap-receipt.schema.json',
    'envelope-request': 'oap-request-envelope.schema.json',
    'envelope-response': 'oap-response-envelope.schema.json',
    'decision-record': 'oap-decision-record.schema.json',
    'ccc': 'oap-ccc.schema.json',
    'commerce-primitive': 'oap-commerce-primitive.schema.json',
    'composition-manifest': 'oap-composition-manifest.schema.json',
    'customization-receipt': 'oap-customization-receipt.schema.json',
    'attestation': 'oap-attestation.schema.json',
    'incident': 'oap-incident.schema.json',
    'deletion-receipt': 'oap-deletion-receipt.schema.json',
    'offer': 'oap-offer.schema.json',
    'procurement-intent': 'oap-procurement-intent.schema.json',
    'subscription': 'oap-subscription.schema.json',
    'wallet-statement': 'oap-wallet-statement.schema.json',
    'conformance-receipt': 'oap-conformance-receipt.schema.json',
  };
  for (const [key, schemaFile] of Object.entries(map)) {
    if (base.includes(key)) return schemaFile;
  }
  return null;
}

async function runSchemaSuite() {
  const results = [];
  loadAllSchemas();

  const validDir = path.join(ROOT, 'schema', 'valid');
  const invalidDir = path.join(ROOT, 'schema', 'invalid');

  for (const fixture of listFixtures(validDir)) {
    const data = JSON.parse(fs.readFileSync(fixture, 'utf-8'));
    const schemaFile = inferSchemaIdFromFixture(fixture);
    if (!schemaFile) {
      results.push({ name: path.relative(ROOT, fixture), category: 'schema-valid', passed: false, reason: 'Could not infer schema from fixture name.' });
      continue;
    }
    const validate = getValidator(schemaFile);
    const ok = validate(data);
    results.push({
      name: path.relative(ROOT, fixture),
      category: 'schema-valid',
      schema: schemaFile,
      passed: !!ok,
      reason: ok ? null : ajv.errorsText(validate.errors),
    });
  }

  for (const fixture of listFixtures(invalidDir)) {
    const data = JSON.parse(fs.readFileSync(fixture, 'utf-8'));
    const schemaFile = inferSchemaIdFromFixture(fixture);
    if (!schemaFile) {
      results.push({ name: path.relative(ROOT, fixture), category: 'schema-invalid', passed: false, reason: 'Could not infer schema from fixture name.' });
      continue;
    }
    const validate = getValidator(schemaFile);
    const ok = validate(data);
    results.push({
      name: path.relative(ROOT, fixture),
      category: 'schema-invalid',
      schema: schemaFile,
      passed: !ok,
      reason: ok ? 'Document validated unexpectedly. Invalid fixture must fail validation.' : null,
    });
  }

  return results;
}

async function runBehaviorSuite() {
  const results = [];
  const dir = path.join(ROOT, 'behavior');
  if (!fs.existsSync(dir)) return results;

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.test.js'));
  for (const f of files) {
    const mod = require(path.join(dir, f));
    if (typeof mod.run !== 'function') continue;
    try {
      const partial = await mod.run({ target: TARGET, ajv });
      for (const r of partial) results.push({ ...r, file: f });
    } catch (err) {
      results.push({ name: f, category: 'behavior', passed: false, reason: err.message });
    }
  }
  return results;
}

async function runCharterSuite() {
  const results = [];
  const dir = path.join(ROOT, 'charter');
  if (!fs.existsSync(dir)) return results;

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.test.js'));
  for (const f of files) {
    const mod = require(path.join(dir, f));
    if (typeof mod.run !== 'function') continue;
    try {
      const partial = await mod.run({ target: TARGET });
      for (const r of partial) results.push({ ...r, file: f });
    } catch (err) {
      results.push({ name: f, category: 'charter', passed: false, reason: err.message });
    }
  }
  return results;
}

function summarize(results) {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  return { total, passed, failed };
}

function reportText(allResults) {
  const groups = {};
  for (const r of allResults) {
    const key = r.category || 'unknown';
    groups[key] = groups[key] || [];
    groups[key].push(r);
  }
  for (const [cat, items] of Object.entries(groups)) {
    const s = summarize(items);
    console.log(`\n[${cat}] ${s.passed}/${s.total} passed`);
    for (const r of items) {
      const mark = r.passed ? 'PASS' : 'FAIL';
      console.log(`  ${mark}  ${r.name}${r.reason ? '  -- ' + r.reason : ''}`);
    }
  }
  const overall = summarize(allResults);
  console.log(`\nOverall: ${overall.passed}/${overall.total} passed.`);
}

function reportJson(allResults) {
  const overall = summarize(allResults);
  const fixturesHash = crypto.createHash('sha256');
  for (const r of allResults) fixturesHash.update(r.name);
  console.log(JSON.stringify({
    suite: 'oap-conformance-test-suite',
    suite_version: '1.0.0',
    target: TARGET,
    summary: overall,
    fixtures_hash: 'sha256:' + fixturesHash.digest('hex'),
    results: allResults,
  }, null, 2));
}

async function main() {
  const all = [];
  if (!ONLY || ONLY === 'schema') all.push(...await runSchemaSuite());
  if (!ONLY || ONLY === 'behavior') all.push(...await runBehaviorSuite());
  if (!ONLY || ONLY === 'charter') all.push(...await runCharterSuite());

  if (REPORT_FORMAT === 'json') reportJson(all);
  else reportText(all);

  const overall = summarize(all);
  process.exit(overall.failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
