#!/usr/bin/env node

/**
 * OAP Conformance Validator
 *
 * Validates OAP Manifests, Receipts, Decision Records, and CCC objects
 * against the normative JSON Schemas. Also performs endpoint reachability
 * checks and receipt chain integrity verification.
 *
 * Usage:
 *   node validate.js manifest path/to/manifest.json
 *   node validate.js receipt path/to/receipt.json
 *   node validate.js ccc path/to/ccc.json
 *   node validate.js decision path/to/decision-record.json
 *   node validate.js chain path/to/receipts-array.json
 *   node validate.js endpoints https://tool.example
 *   node validate.js all path/to/directory/
 *
 * @license Apache-2.0
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Schema registry
// ---------------------------------------------------------------------------

const SCHEMA_DIR = path.resolve(__dirname, '../../schemas/v1.0');

const SCHEMA_MAP = {
  manifest: 'oap-manifest.schema.json',
  action: 'oap-action.schema.json',
  request: 'oap-request-envelope.schema.json',
  response: 'oap-response-envelope.schema.json',
  receipt: 'oap-receipt.schema.json',
  decision: 'oap-decision-record.schema.json',
  ccc: 'oap-ccc.schema.json',
  subscription: 'oap-subscription.schema.json',
  wallet: 'oap-wallet-statement.schema.json',
  incident: 'oap-incident.schema.json',
  deletion: 'oap-deletion-receipt.schema.json',
  attestation: 'oap-attestation.schema.json',
};

// ---------------------------------------------------------------------------
// Simple JSON Schema Validator (production: use ajv)
// ---------------------------------------------------------------------------

function loadSchema(type) {
  const filename = SCHEMA_MAP[type];
  if (!filename) throw new Error(`Unknown schema type: ${type}`);
  const filePath = path.join(SCHEMA_DIR, filename);
  if (!fs.existsSync(filePath)) throw new Error(`Schema file not found: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function validateRequiredFields(data, schema, prefix) {
  const errors = [];
  if (schema.required) {
    for (const field of schema.required) {
      if (data[field] === undefined || data[field] === null) {
        errors.push(`${prefix}Missing required field: ${field}`);
      }
    }
  }
  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (data[key] !== undefined && propSchema.type) {
        const expected = Array.isArray(propSchema.type) ? propSchema.type : [propSchema.type];
        const actual = Array.isArray(data[key]) ? 'array' : typeof data[key] === 'object' && data[key] !== null ? 'object' : typeof data[key];
        if (!expected.includes(actual) && !(actual === 'number' && expected.includes('integer'))) {
          errors.push(`${prefix}${key}: expected ${expected.join('|')}, got ${actual}`);
        }
      }
      if (data[key] !== undefined && propSchema.enum && !propSchema.enum.includes(data[key])) {
        errors.push(`${prefix}${key}: value "${data[key]}" not in enum [${propSchema.enum.join(', ')}]`);
      }
      if (data[key] !== undefined && propSchema.const && data[key] !== propSchema.const) {
        errors.push(`${prefix}${key}: expected const "${propSchema.const}", got "${data[key]}"`);
      }
      if (data[key] !== undefined && propSchema.pattern) {
        const re = new RegExp(propSchema.pattern);
        if (typeof data[key] === 'string' && !re.test(data[key])) {
          errors.push(`${prefix}${key}: value "${data[key]}" does not match pattern ${propSchema.pattern}`);
        }
      }
      // Recurse into nested objects
      if (data[key] !== undefined && propSchema.type === 'object' && propSchema.properties) {
        errors.push(...validateRequiredFields(data[key], propSchema, `${prefix}${key}.`));
      }
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

function validateManifest(data) {
  const schema = loadSchema('manifest');
  const errors = validateRequiredFields(data, schema, '');

  // Additional semantic checks
  if (data.oap_version !== '1.0') errors.push('oap_version must be "1.0"');
  if (data.risk_class === 'unacceptable') errors.push('risk_class "unacceptable" MUST NOT be published');
  if (data.actions && data.actions.length === 0) errors.push('At least one action is required');
  if (data.jurisdictions && data.jurisdictions.length === 0) errors.push('At least one jurisdiction is required');

  // Check mandatory endpoints
  const mandatoryEndpoints = ['invoke', 'audit', 'data_delete', 'incident'];
  for (const ep of mandatoryEndpoints) {
    if (!data.endpoints || !data.endpoints[ep]) {
      errors.push(`Missing mandatory endpoint: ${ep}`);
    }
  }

  // description_for_agents length
  if (data.tool && data.tool.description_for_agents && data.tool.description_for_agents.length > 4000) {
    errors.push('tool.description_for_agents exceeds 4000 codepoints');
  }

  return { type: 'manifest', valid: errors.length === 0, errors, conformance_level: inferConformanceLevel(data) };
}

function validateReceipt(data) {
  const schema = loadSchema('receipt');
  const errors = validateRequiredFields(data, schema, '');
  if (data.receipt_id && !data.receipt_id.startsWith('urn:oap:receipt:')) {
    errors.push('receipt_id must start with urn:oap:receipt:');
  }
  if (data.signatures && data.signatures.length < 1) {
    errors.push('At least one signature is required');
  }
  return { type: 'receipt', valid: errors.length === 0, errors };
}

function validateDecisionRecord(data) {
  const schema = loadSchema('decision');
  const errors = validateRequiredFields(data, schema, '');
  return { type: 'decision_record', valid: errors.length === 0, errors };
}

function validateCcc(data) {
  const schema = loadSchema('ccc');
  const errors = validateRequiredFields(data, schema, '');
  if (data.ccc_version !== '1.0') errors.push('ccc_version must be "1.0"');
  return { type: 'ccc', valid: errors.length === 0, errors };
}

function validateReceiptChain(receiptsArray) {
  const errors = [];
  let prev = null;
  for (let i = 0; i < receiptsArray.length; i++) {
    const r = receiptsArray[i];
    if (i === 0 && r.previous_receipt_hash !== 'genesis') {
      const prevHash = 'sha256:' + crypto.createHash('sha256').update(JSON.stringify(receiptsArray[i - 1] || {})).digest('hex');
      if (r.previous_receipt_hash !== 'genesis') {
        errors.push(`Receipt ${i}: expected previous_receipt_hash "genesis" for first receipt`);
      }
    }
    if (i > 0) {
      const expectedPrev = 'sha256:' + crypto.createHash('sha256').update(JSON.stringify(receiptsArray[i - 1])).digest('hex');
      if (r.previous_receipt_hash !== expectedPrev) {
        errors.push(`Receipt ${i} (${r.receipt_id}): chain broken. Expected ${expectedPrev}, got ${r.previous_receipt_hash}`);
      }
    }
    prev = r;
  }
  return { type: 'receipt_chain', valid: errors.length === 0, errors, length: receiptsArray.length };
}

async function validateEndpoints(baseUrl) {
  const errors = [];
  const manifestUrl = `${baseUrl.replace(/\/$/, '')}/.well-known/oap-tool.json`;

  try {
    const res = await fetch(manifestUrl);
    if (!res.ok) {
      errors.push(`Manifest not reachable: HTTP ${res.status}`);
      return { type: 'endpoints', valid: false, errors };
    }
    const manifest = await res.json();
    const mandatoryEndpoints = ['invoke', 'audit', 'data_delete', 'incident'];
    for (const ep of mandatoryEndpoints) {
      const url = manifest.endpoints[ep];
      if (!url) {
        errors.push(`Missing endpoint declaration: ${ep}`);
        continue;
      }
      const fullUrl = url.startsWith('http') ? url : `${baseUrl.replace(/\/$/, '')}${url}`;
      try {
        const epRes = await fetch(fullUrl, { method: ep === 'audit' || ep === 'incident' ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json' }, body: ep !== 'audit' && ep !== 'incident' ? '{}' : undefined });
        if (epRes.status >= 500) errors.push(`${ep} endpoint returned ${epRes.status}`);
      } catch (err) {
        errors.push(`${ep} endpoint unreachable: ${err.message}`);
      }
    }
  } catch (err) {
    errors.push(`Failed to fetch manifest: ${err.message}`);
  }

  return { type: 'endpoints', valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Conformance Level Inference
// ---------------------------------------------------------------------------

function inferConformanceLevel(manifest) {
  if (!manifest.endpoints || !manifest.endpoints.invoke) return 'L0';
  if (!manifest.tool || !manifest.actions || manifest.actions.length === 0) return 'L0';

  let level = 'L1';

  // L2: needs pricing, billing, subscribe
  if (manifest.pricing && manifest.endpoints.billing && manifest.endpoints.subscribe) {
    level = 'L2';
  }

  // L3: needs trust verification, data policy, audit
  if (level === 'L2' && manifest.trust && manifest.trust.publisher_verified && manifest.data_policy) {
    level = 'L3';
  }

  // L4: needs collaboration
  if (level === 'L3' && manifest.collaboration && manifest.collaboration.supports_concurrent_agents) {
    level = 'L4';
  }

  // L5: needs SOC2 or ISO 27001 + insurance
  if (level === 'L4' && (manifest.trust.soc2_type_ii || manifest.trust.iso_27001) && manifest.insurance) {
    level = 'L5';
  }

  return level;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const [,, command, target] = process.argv;

  if (!command) {
    console.log('Usage: node validate.js <command> <target>');
    console.log('Commands: manifest, receipt, decision, ccc, chain, endpoints, all');
    process.exit(1);
  }

  let result;

  switch (command) {
    case 'manifest': {
      const data = JSON.parse(fs.readFileSync(target, 'utf-8'));
      result = validateManifest(data);
      break;
    }
    case 'receipt': {
      const data = JSON.parse(fs.readFileSync(target, 'utf-8'));
      result = validateReceipt(data);
      break;
    }
    case 'decision': {
      const data = JSON.parse(fs.readFileSync(target, 'utf-8'));
      result = validateDecisionRecord(data);
      break;
    }
    case 'ccc': {
      const data = JSON.parse(fs.readFileSync(target, 'utf-8'));
      result = validateCcc(data);
      break;
    }
    case 'chain': {
      const data = JSON.parse(fs.readFileSync(target, 'utf-8'));
      result = validateReceiptChain(Array.isArray(data) ? data : data.receipts || []);
      break;
    }
    case 'endpoints': {
      result = await validateEndpoints(target);
      break;
    }
    case 'all': {
      const dir = target;
      const results = [];
      const files = fs.readdirSync(dir, { recursive: true }).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const filePath = path.join(dir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (data.oap_version && data.tool) results.push({ file, ...validateManifest(data) });
        else if (data.receipt_id) results.push({ file, ...validateReceipt(data) });
        else if (data.decision_id) results.push({ file, ...validateDecisionRecord(data) });
        else if (data.ccc_version) results.push({ file, ...validateCcc(data) });
      }
      result = { type: 'batch', results, total: results.length, passed: results.filter(r => r.valid).length };
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.valid === false || (result.results && result.passed < result.total) ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
