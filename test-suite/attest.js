#!/usr/bin/env node

/**
 * OAP Conformance Receipt Generator
 *
 * Runs the OAP conformance test suite against a target deployment, then
 * produces a Conformance Receipt that conforms to
 * `oap-conformance-receipt.schema.json` and is signed with the supplied
 * Ed25519 private key. The Receipt SHOULD be published by the implementation
 * under a stable URL, referenced from the manifest through
 * `conformance.receipt_uri`, and submitted to the OAP Registry per RFC 0026.
 *
 * Usage (standard profile, L1 through L5):
 *
 *   node attest.js --target https://your-tool.example \
 *                  --did did:web:your-tool.example \
 *                  --name "Your Tool" --version 1.0.0 \
 *                  --signing-key path/to/key.pem \
 *                  --out conformance-receipt.json
 *
 * Usage (Non-Commercial Profile, RFC 0025):
 *
 *   node attest.js --target https://your-tool.example \
 *                  --did did:web:your-tool.example \
 *                  --name "Your Tool" --version 1.0.0 \
 *                  --signing-key path/to/key.pem \
 *                  --profile non-commercial \
 *                  --revenue-source byok \
 *                  --revenue-note "Users supply their own provider keys" \
 *                  --out conformance-receipt.json
 *
 * Usage (peer-witness signing of someone else's Receipt, L4/L5):
 *
 *   node attest.js --peer-witness --in candidate-receipt.json \
 *                  --did did:web:your-tool.example \
 *                  --signing-key path/to/key.pem \
 *                  --witness-receipt-uri https://your-tool.example/api/oap/conformance-receipt \
 *                  --out signed-witness.json
 *
 * Placeholder signatures are forbidden. `--signing-key` is REQUIRED.
 *
 * @license Apache-2.0
 */

const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : def;
}

function flag(name) {
  return process.argv.includes(name);
}

function die(msg) {
  console.error(`attest.js: ${msg}`);
  process.exit(2);
}

const PEER_WITNESS = flag('--peer-witness');
const target = arg('--target', null);
const did = arg('--did', null);
const name = arg('--name', null);
const version = arg('--version', null);
const signingKeyPath = arg('--signing-key', null);
const out = arg('--out', 'conformance-receipt.json');
const profile = arg('--profile', 'standard');
const revenueSource = arg('--revenue-source', null);
const revenueNote = arg('--revenue-note', null);
const witnessReceiptUri = arg('--witness-receipt-uri', null);
const inFile = arg('--in', null);
const registrySlug = arg('--registry-slug', null);

if (!signingKeyPath) {
  die('--signing-key is required. Placeholder signatures are forbidden by RFC 0019 section 7.3.');
}
if (!did) {
  die('--did is required.');
}
if (!fs.existsSync(signingKeyPath)) {
  die(`Signing key file not found at ${signingKeyPath}.`);
}

let signingKey;
try {
  signingKey = crypto.createPrivateKey(fs.readFileSync(signingKeyPath));
} catch (e) {
  die(`Could not load signing key: ${e.message}`);
}

if (signingKey.asymmetricKeyType !== 'ed25519') {
  die(`Signing key must be Ed25519. Got ${signingKey.asymmetricKeyType}. Generate with: openssl genpkey -algorithm ED25519 -out key.pem`);
}

if (!['standard', 'non-commercial'].includes(profile)) {
  die(`--profile must be 'standard' or 'non-commercial'.`);
}

if (profile === 'non-commercial' && !PEER_WITNESS && !revenueSource) {
  die(`--revenue-source is required when --profile=non-commercial. Allowed: byok, self-hosted, grant, donation, sponsorship.`);
}

function canonicalize(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

function sha256Hex(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}
function sha256Tagged(s) {
  return 'sha256:' + sha256Hex(s);
}

function signEd25519(payload) {
  const sig = crypto.sign(null, Buffer.from(canonicalize(payload)), signingKey);
  return { by: did + '#key-1', alg: 'EdDSA', value: sig.toString('base64url') };
}

// ---- Peer-witness mode --------------------------------------------------

if (PEER_WITNESS) {
  if (!inFile) die('--in <candidate-receipt.json> is required in --peer-witness mode.');
  if (!witnessReceiptUri) die('--witness-receipt-uri is required so verifiers can confirm the witness holds L4+.');
  const candidate = JSON.parse(fs.readFileSync(inFile, 'utf-8'));
  // Strip peer_witnesses from the body before signing so each witness signs
  // the same bytes regardless of order in which witnesses are added.
  const body = { ...candidate };
  delete body.peer_witnesses;
  const sig = crypto.sign(null, Buffer.from(canonicalize(body)), signingKey);
  const witness = {
    witness_did: did,
    witness_receipt_uri: witnessReceiptUri,
    alg: 'EdDSA',
    signature: sig.toString('base64url'),
    witnessed_at: new Date().toISOString(),
  };
  candidate.peer_witnesses = [...(candidate.peer_witnesses || []), witness];
  fs.writeFileSync(out, JSON.stringify(candidate, null, 2));
  console.error(`Peer-witness signature appended. ${candidate.peer_witnesses.length} witness(es) total. Written to ${out}.`);
  process.exit(0);
}

// ---- Standard / NC attestation mode -------------------------------------

if (!target || !name || !version) {
  die('--target, --name, --version are required for attestation mode.');
}

function runSuite() {
  const tmpFile = path.join(require('os').tmpdir(), `oap-suite-${Date.now()}.json`);
  const env = { ...process.env, OAP_TARGET: target, OAP_REPORT: 'json', OAP_PROFILE: profile };
  // Use shell redirection so the runner writes directly to a file. This avoids
  // pipe-buffer truncation seen with execFileSync on some platforms.
  execSync(`node "${path.join(__dirname, 'runner.js')}" > "${tmpFile}"`, { env, stdio: ['ignore', 'ignore', 'inherit'] });
  const text = fs.readFileSync(tmpFile, 'utf-8');
  fs.unlinkSync(tmpFile);
  return JSON.parse(text);
}

function levelsFromResults(results) {
  const levelsConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'levels', 'levels.json'), 'utf-8'));
  // Index passed artefacts by both full relative path and basename so the
  // matcher works whether the runner emits 'behavior/lifecycle.test.js' or
  // just 'lifecycle.test.js'.
  // A `*-not-applicable` result is a documented PASS that signals the probe
  // could not run (the implementation does not claim the relevant level or
  // does not declare the relevant capability). Such passes MUST NOT be
  // treated as evidence that the level is satisfied; otherwise an L1
  // implementation would silently inherit L2..L5 credit.
  const passedFiles = new Set();
  const passedBasenames = new Set();
  for (const r of results.results || []) {
    if (!r.passed) continue;
    if (typeof r.name === 'string' && r.name.endsWith('-not-applicable')) continue;
    const f = r.file || r.name;
    if (!f) continue;
    passedFiles.add(f);
    passedBasenames.add(path.basename(f));
  }
  const matches = (required) =>
    passedFiles.has(required) || passedBasenames.has(path.basename(required));
  const claimed = [];
  for (const [level, required] of Object.entries(levelsConfig.levels)) {
    if (!required.length) continue;
    if (profile === 'non-commercial' && !level.endsWith('-NC') && !['L0'].includes(level)) continue;
    if (profile === 'standard' && level.endsWith('-NC')) continue;
    const allPassed = required.every(matches);
    if (allPassed) claimed.push(level);
  }
  if (!claimed.length) {
    die(`No conformance level reached for profile=${profile}. The receipt would be empty; refusing to emit. Inspect the test report and fix failing checks before re-running.`);
  }
  return claimed;
}

const results = runSuite();
const claimedLevels = levelsFromResults(results);

const receiptCore = {
  receipt_id: 'urn:oap:conformance:' + crypto.randomUUID().replace(/-/g, ''),
  type: 'conformance',
  timestamp: new Date().toISOString(),
  implementation: { did, name, version },
  suite: { name: 'oap-conformance-test-suite', version: '1.1.0', spec_version: '1.0' },
  target: { uri: target },
  claimed_levels: claimedLevels,
  profile,
  results_summary: results.summary,
  fixtures_hash: results.fixtures_hash,
  results_hash: sha256Tagged(canonicalize(results)),
  validity: {
    not_before: new Date().toISOString(),
    not_after: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
  },
  previous_receipt_hash: 'genesis',
};

if (profile === 'non-commercial') {
  receiptCore.revenue = {
    source: revenueSource,
    ...(revenueNote ? { note: revenueNote } : {}),
  };
}

const signature = signEd25519(receiptCore);
const receipt = { ...receiptCore, signatures: [signature] };

// Levels L4 and L5 require peer witnesses. Emit the Receipt; surface a
// clear instruction so the operator collects them next.
const needsWitnesses = claimedLevels.some((l) => l.startsWith('L4') || l.startsWith('L5'));
if (needsWitnesses) {
  console.error('NOTE: claimed L4 or L5 requires peer-witness signatures (RFC 0019 section 7.1).');
  console.error('      Send this Receipt to >=1 (L4) or >=3 (L5) independent L4+ implementations and');
  console.error('      ask them to run: node attest.js --peer-witness --in <this-file> --did <theirs> ...');
}

fs.writeFileSync(out, JSON.stringify(receipt, null, 2));

// Optional registry submission stub
if (registrySlug) {
  const submission = {
    slug: registrySlug,
    name,
    tool_did: did,
    manifest_uri: `${target.replace(/\/$/, '')}/.well-known/oap-tool.json`,
    conformance_level: claimedLevels[0],
    conformance_receipt_uri: null,
    conformance_receipt_sha256: sha256Hex(JSON.stringify(receipt)),
    issued_at: receiptCore.validity.not_before,
    expires_at: receiptCore.validity.not_after,
    non_commercial: profile === 'non-commercial',
  };
  const submissionPath = out.replace(/\.json$/, '.registry-submission.json');
  fs.writeFileSync(submissionPath, JSON.stringify(submission, null, 2));
  console.error(`Registry submission stub written to ${submissionPath}. Fill conformance_receipt_uri and submit to oap-registry/implementations/${registrySlug}.json`);
}

console.error(`Conformance receipt written to ${out}. Profile: ${profile}. Claimed levels: ${claimedLevels.join(', ')}.`);
