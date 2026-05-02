#!/usr/bin/env node
/**
 * Strict ajv-based validation runner. Loads all OAP schemas, resolves $ref
 * by $id, and validates every example artifact under examples/.
 *
 * Usage: node reference/validator/ajv-validate.js
 */

const fs = require('fs');
const path = require('path');

let Ajv2020, addFormats;
try {
  Ajv2020 = require('ajv/dist/2020').default;
  addFormats = require('ajv-formats').default;
} catch {
  console.error('Install dependencies first: npm install ajv ajv-formats');
  process.exit(2);
}

const SCHEMA_DIR = path.resolve(__dirname, '../../schemas/v1.0');
const EXAMPLES_DIR = path.resolve(__dirname, '../../examples');

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

// Load all schemas so $ref by $id resolves.
const schemaFiles = fs.readdirSync(SCHEMA_DIR).filter(f => f.endsWith('.schema.json'));
const schemas = {};
for (const f of schemaFiles) {
  const s = JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, f), 'utf-8'));
  schemas[f] = s;
  ajv.addSchema(s, s.$id || f);
}

// Routing: filename suffix -> schema $id
function pickSchema(filename, data) {
  if (filename.endsWith('manifest.json')) return schemas['oap-manifest.schema.json'];
  if (filename.endsWith('receipt.json')) return schemas['oap-receipt.schema.json'];
  if (filename.endsWith('decision-record.json')) return schemas['oap-decision-record.schema.json'];
  if (filename.endsWith('ccc.json')) return schemas['oap-ccc.schema.json'];
  if (filename.endsWith('subscription.json')) return schemas['oap-subscription.schema.json'];
  if (filename.endsWith('attestation.json')) return schemas['oap-attestation.schema.json'];
  return null;
}

let total = 0, passed = 0;
const failures = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.json') && entry.name !== 'package.json') {
      const data = JSON.parse(fs.readFileSync(full, 'utf-8'));
      const schema = pickSchema(entry.name, data);
      if (!schema) { console.log(`SKIP   ${path.relative(EXAMPLES_DIR, full)} (no schema match)`); continue; }
      const validate = ajv.compile(schema);
      const ok = validate(data);
      total++;
      if (ok) { passed++; console.log(`PASS   ${path.relative(EXAMPLES_DIR, full)} (${schema.$id?.split('/').pop() || 'inline'})`); }
      else { failures.push({ file: full, errors: validate.errors }); console.log(`FAIL   ${path.relative(EXAMPLES_DIR, full)}`); }
    }
  }
}

walk(EXAMPLES_DIR);

console.log(`\n${passed}/${total} passed.`);
if (failures.length) {
  console.log('\nErrors:');
  for (const f of failures) {
    console.log(`\n--- ${path.relative(process.cwd(), f.file)} ---`);
    for (const e of f.errors) console.log(`  ${e.instancePath || '/'}: ${e.message} ${e.params ? JSON.stringify(e.params) : ''}`);
  }
  process.exit(1);
}
