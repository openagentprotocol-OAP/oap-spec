/**
 * AQL Parser and Validator
 *
 * Validates an Intent against the oap-intent.schema.json schema and against
 * the additional structural rules of RFC 0020 that JSON Schema cannot express.
 *
 * @license Apache-2.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const SCHEMA_DIR = path.resolve(__dirname, '..', '..', '..', 'schemas', 'v1.0');

const ajv = new Ajv2020({ strict: false, allErrors: true, allowUnionTypes: true });
addFormats(ajv);

function loadSchema(name) {
  return JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, name), 'utf-8'));
}

const intentSchema = loadSchema('oap-intent.schema.json');
const intentResponseSchema = loadSchema('oap-intent-response.schema.json');
const aqlDecisionSchema = loadSchema('oap-aql-decision.schema.json');

ajv.addSchema(aqlDecisionSchema);
ajv.addSchema(intentResponseSchema);
const validateIntentSchema = ajv.compile(intentSchema);
const validateResponseSchema = ajv.getSchema(intentResponseSchema.$id);

const VALID_OPERATORS = new Set([
  'eq', 'ne', 'lt', 'lte', 'gt', 'gte',
  'in', 'not_in', 'contains', 'matches',
  'before', 'after', 'within', 'outside', 'exists',
]);

const ALLOCATION_REQUIRES_TOP_K = new Set(['ranked_top_k']);

/**
 * Parse and validate an Intent. Returns { ok, errors, intent }.
 *
 * @param {object|string} input - Intent object or JSON string.
 * @returns {{ok: boolean, errors: string[], intent: object|null}}
 */
function parseIntent(input) {
  let intent;
  try {
    intent = typeof input === 'string' ? JSON.parse(input) : input;
  } catch (err) {
    return { ok: false, errors: [`invalid JSON: ${err.message}`], intent: null };
  }

  const errors = [];

  if (!validateIntentSchema(intent)) {
    for (const e of validateIntentSchema.errors || []) {
      errors.push(`schema: ${e.instancePath || '/'} ${e.message}`);
    }
    return { ok: false, errors, intent: null };
  }

  // Additional structural rules from RFC 0020 that JSON Schema cannot express.
  validateConstraintTree(intent.constraints, '/constraints', errors);

  if (intent.budget && ALLOCATION_REQUIRES_TOP_K.has(intent.budget.allocation)) {
    if (typeof intent.budget.top_k !== 'number') {
      errors.push('budget: allocation ranked_top_k requires top_k.');
    }
    if (Array.isArray(intent.budget.distribution)) {
      const sum = intent.budget.distribution.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 1) > 1e-6) {
        errors.push(`budget: distribution must sum to 1.0 (got ${sum}).`);
      }
      if (typeof intent.budget.top_k === 'number' && intent.budget.distribution.length !== intent.budget.top_k) {
        errors.push('budget: distribution length must equal top_k.');
      }
    }
  }

  if (intent.category === 'subscription' && typeof intent.max_event_rate_per_minute !== 'number') {
    errors.push('subscription category requires max_event_rate_per_minute.');
  }

  const from = Date.parse(intent.validity.from);
  const to = Date.parse(intent.validity.to);
  if (!(to > from)) {
    errors.push('validity: to must be strictly after from.');
  }

  return { ok: errors.length === 0, errors, intent: errors.length === 0 ? intent : null };
}

function validateConstraintTree(node, pointer, errors) {
  if (!node || typeof node !== 'object') {
    errors.push(`${pointer}: constraint node must be an object.`);
    return;
  }
  if ('all_of' in node) {
    if (!Array.isArray(node.all_of) || node.all_of.length === 0) {
      errors.push(`${pointer}/all_of must be a non empty array.`);
    } else {
      node.all_of.forEach((c, i) => validateConstraintTree(c, `${pointer}/all_of/${i}`, errors));
    }
    return;
  }
  if ('any_of' in node) {
    if (!Array.isArray(node.any_of) || node.any_of.length === 0) {
      errors.push(`${pointer}/any_of must be a non empty array.`);
    } else {
      node.any_of.forEach((c, i) => validateConstraintTree(c, `${pointer}/any_of/${i}`, errors));
    }
    return;
  }
  if ('not' in node) {
    validateConstraintTree(node.not, `${pointer}/not`, errors);
    return;
  }
  if (!('path' in node) || !('operator' in node) || !('value' in node)) {
    errors.push(`${pointer}: leaf must have path, operator, value.`);
    return;
  }
  if (!VALID_OPERATORS.has(node.operator)) {
    errors.push(`${pointer}: operator ${node.operator} is not in the closed set defined by RFC 0020 section 3.2.`);
  }
}

function parseResponse(input) {
  let res;
  try {
    res = typeof input === 'string' ? JSON.parse(input) : input;
  } catch (err) {
    return { ok: false, errors: [`invalid JSON: ${err.message}`], response: null };
  }
  if (!validateResponseSchema(res)) {
    return { ok: false, errors: (validateResponseSchema.errors || []).map((e) => `${e.instancePath} ${e.message}`), response: null };
  }
  return { ok: true, errors: [], response: res };
}

module.exports = { parseIntent, parseResponse, VALID_OPERATORS };
