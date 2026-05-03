#!/usr/bin/env node

/**
 * OAP Conformance Receipt Generator
 *
 * Runs the test suite against a target deployment, produces a Conformance
 * Receipt that conforms to oap-conformance-receipt.schema.json, and signs it
 * with the supplied private key. The resulting receipt SHOULD be published
 * by the implementation under a stable URL and referenced from the manifest
 * through conformance.receipt_uri.
 *
 * Usage:
 *   node attest.js --target https://your-tool.example \
 *                  --did did:web:your-tool.example \
 *                  --name "Your Tool" --version 1.0.0 \
 *                  --signing-key path/to/key.pem \
 *                  --out conformance-receipt.json
 *
 * For demonstration the signature is a placeholder string when no signing
 * key is provided. Production usage MUST supply a signing key. A receipt
 * with a placeholder signature MUST NOT be accepted by a verifier.
 *
 * @license Apache-2.0
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : def;
}

const target = arg('--target', 'http://localhost:3100');
const did = arg('--did', 'did:web:example.local');
const name = arg('--name', 'Unknown Implementation');
const version = arg('--version', '0.0.0');
const signingKey = arg('--signing-key', null);
const out = arg('--out', 'conformance-receipt.json');

function runSuite() {
  const env = { ...process.env, OAP_TARGET: target, OAP_REPORT: 'json' };
  const stdout = execFileSync('node', [path.join(__dirname, 'runner.js')], { env, encoding: 'utf-8' });
  return JSON.parse(stdout);
}

function levelsFromResults(results) {
  const levels = new Set();
  const annotations = {};
  const behaviorDir = path.join(__dirname, 'behavior');
  const charterDir = path.join(__dirname, 'charter');
  for (const dir of [behaviorDir, charterDir]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.test.js'))) {
      const src = fs.readFileSync(path.join(dir, f), 'utf-8');
      const m = src.match(/@levels\s+([A-Z0-9, ]+)/);
      if (m) annotations[f] = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  for (const r of results.results || []) {
    if (!r.passed) continue;
    if (r.file && annotations[r.file]) for (const lv of annotations[r.file]) levels.add(lv);
  }
  return Array.from(levels).sort();
}

function canonicalize(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

function sha256(s) {
  return 'sha256:' + crypto.createHash('sha256').update(s).digest('hex');
}

function sign(payload) {
  if (!signingKey) {
    return { by: did + '#key-1', alg: 'EdDSA', value: 'PLACEHOLDER_NOT_FOR_PRODUCTION' };
  }
  const key = crypto.createPrivateKey(fs.readFileSync(signingKey));
  const sig = crypto.sign(null, Buffer.from(canonicalize(payload)), key);
  return { by: did + '#key-1', alg: 'EdDSA', value: sig.toString('base64url') };
}

const results = runSuite();
const claimedLevels = levelsFromResults(results);

const receiptCore = {
  receipt_id: 'urn:oap:conformance:' + crypto.randomUUID().replace(/-/g, ''),
  type: 'conformance',
  timestamp: new Date().toISOString(),
  implementation: { did, name, version },
  suite: { name: 'oap-conformance-test-suite', version: '1.0.0', spec_version: '1.0' },
  target: { uri: target },
  claimed_levels: claimedLevels.length ? claimedLevels : ['L0'],
  results_summary: results.summary,
  fixtures_hash: results.fixtures_hash,
  results_hash: sha256(canonicalize(results)),
  validity: {
    not_before: new Date().toISOString(),
    not_after: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
  },
  previous_receipt_hash: 'genesis',
};

const signature = sign(receiptCore);
const receipt = { ...receiptCore, signatures: [signature] };

fs.writeFileSync(out, JSON.stringify(receipt, null, 2));
console.error(`Conformance receipt written to ${out}. Claimed levels: ${claimedLevels.join(', ') || 'none'}.`);
