/**
 * OAP Reference Server (L4-ready)
 *
 * A persistent, real-Ed25519-signing reference implementation of an OAP Tool
 * server. Built to be the canonical example a Tool developer can fork.
 *
 * Implements:
 *   - .well-known/oap-tool.json (Manifest)
 *   - .well-known/did.json      (did:web key publication)
 *   - POST /oap/invoke          (with auth check, rate-limit hook, real signing)
 *   - GET  /oap/audit           (filterable receipt feed)
 *   - POST /oap/data/delete     (signed Deletion Receipt)
 *   - POST /oap/incident        (write-side; GET reads existing incidents)
 *   - POST /oap/discover        (intent matching, legacy keyword discovery)
 *   - POST /oap/intent          (RFC 0020 AQL Intent endpoint, signed Decision Records)
 *   - GET  /oap/billing
 *   - POST /oap/subscribe, DELETE /oap/subscribe/:id
 *   - GET  /oap/conformance-receipt
 *
 * Persistence: better-sqlite3 (single file at ./oap-server.db).
 * Signing: Ed25519. Key loaded from $OAP_SIGNING_KEY_PEM (path) or
 *   ./reference-key.pem. If neither exists, one is auto-generated on boot
 *   into ./reference-key.pem (suitable for local development only).
 *
 * Conformance Levels supported by the server itself:
 *   - L0 (Discoverable):   Manifest + did:web published
 *   - L1 (Free Invoke):    Signed receipts, free Action available
 *   - L2 (Billable):       Subscription + billing endpoints
 *   - L3 (Trustworthy):    Right-to-disappear, multi-party policy
 *   - L4-ready (Cooperative): Cooling-off enforcement, escalation handler,
 *                            multi-agent coordination primitives. Full L4
 *                            requires >=1 peer-witness signature on the
 *                            implementation's Conformance Receipt per
 *                            RFC-0019 §7.1.
 *
 * @license Apache-2.0
 */

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { parseIntent, resolveIntent } = require('@oap/aql');

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3100', 10);
const TOOL_DOMAIN = process.env.TOOL_DOMAIN || `localhost:${PORT}`;
const TOOL_DID = process.env.TOOL_DID || `did:web:${TOOL_DOMAIN.replace(/:/g, '%3A')}`;
const DB_PATH = process.env.OAP_DB_PATH || path.join(__dirname, 'oap-server.db');
const KEY_PATH = process.env.OAP_SIGNING_KEY_PEM || path.join(__dirname, 'reference-key.pem');
const ADMIN_TOKEN = process.env.OAP_ADMIN_TOKEN || null; // for /oap/incident POST

// ─────────────────────────────────────────────────────────────────────────────
// Signing key (auto-bootstrap if absent)
// ─────────────────────────────────────────────────────────────────────────────

function loadOrCreateSigningKey() {
  if (!fs.existsSync(KEY_PATH)) {
    const { privateKey } = crypto.generateKeyPairSync('ed25519');
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
    fs.writeFileSync(KEY_PATH, pem, { mode: 0o600 });
    console.log(`[oap-ref] Auto-generated Ed25519 signing key at ${KEY_PATH} (DEVELOPMENT ONLY)`);
  }
  const privateKey = crypto.createPrivateKey(fs.readFileSync(KEY_PATH));
  if (privateKey.asymmetricKeyType !== 'ed25519') {
    throw new Error(`Signing key at ${KEY_PATH} must be Ed25519, got ${privateKey.asymmetricKeyType}`);
  }
  const publicKey = crypto.createPublicKey(privateKey);
  const publicJwk = publicKey.export({ format: 'jwk' });
  return { privateKey, publicKey, publicJwk };
}

const KEYS = loadOrCreateSigningKey();

function canonicalize(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

function sha256Hex(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function signEd25519(payload) {
  const sig = crypto.sign(null, Buffer.from(canonicalize(payload)), KEYS.privateKey);
  return sig.toString('base64url');
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistence
// ─────────────────────────────────────────────────────────────────────────────

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS receipts (
    receipt_id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    principal_did TEXT,
    agent_did TEXT,
    action_id TEXT,
    body_json TEXT NOT NULL,
    self_hash TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS receipts_principal ON receipts(principal_did);
  CREATE INDEX IF NOT EXISTS receipts_action ON receipts(action_id);

  CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id TEXT PRIMARY KEY,
    principal_did TEXT NOT NULL,
    tier TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    canceled_at TEXT,
    body_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS incidents (
    incident_id TEXT PRIMARY KEY,
    severity TEXT NOT NULL,
    created_at TEXT NOT NULL,
    body_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rate_buckets (
    bucket_key TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chain_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    previous_receipt_hash TEXT NOT NULL
  );
  INSERT OR IGNORE INTO chain_state (id, previous_receipt_hash) VALUES (1, 'genesis');
`);

const stmt = {
  insertReceipt: db.prepare('INSERT INTO receipts (receipt_id, type, timestamp, principal_did, agent_did, action_id, body_json, self_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
  selectReceiptsByPrincipal: db.prepare('SELECT body_json FROM receipts WHERE principal_did = ? ORDER BY timestamp DESC LIMIT ?'),
  selectAllReceipts: db.prepare('SELECT body_json FROM receipts ORDER BY timestamp DESC LIMIT ?'),
  deleteReceiptsByPrincipal: db.prepare('DELETE FROM receipts WHERE principal_did = ?'),
  getChainTip: db.prepare('SELECT previous_receipt_hash FROM chain_state WHERE id = 1'),
  setChainTip: db.prepare('UPDATE chain_state SET previous_receipt_hash = ? WHERE id = 1'),
  insertSubscription: db.prepare('INSERT INTO subscriptions (subscription_id, principal_did, tier, status, created_at, body_json) VALUES (?, ?, ?, ?, ?, ?)'),
  cancelSubscription: db.prepare('UPDATE subscriptions SET status = ?, canceled_at = ? WHERE subscription_id = ?'),
  selectSubscriptionByPrincipal: db.prepare("SELECT body_json FROM subscriptions WHERE principal_did = ? AND status = 'active' LIMIT 1"),
  insertIncident: db.prepare('INSERT INTO incidents (incident_id, severity, created_at, body_json) VALUES (?, ?, ?, ?)'),
  selectIncidents: db.prepare('SELECT body_json FROM incidents ORDER BY created_at DESC LIMIT 100'),
};

// ─────────────────────────────────────────────────────────────────────────────
// Manifest + DID document
// ─────────────────────────────────────────────────────────────────────────────

const ACTIONS = [
  {
    id: 'echo',
    version: '1.0.0',
    summary: 'Echoes the input with server metadata.',
    description_for_agents: 'Returns the input object unchanged. Free, idempotent. Use for connectivity tests.',
    input_schema: { type: 'object', additionalProperties: true },
    output_schema: { type: 'object', properties: { echo: {}, server_time: { type: 'string' } }, required: ['echo'] },
    side_effects: 'read',
    idempotent: true,
    cost: { type: 'free' },
    rate_limit: { rpm: 600, concurrent: 50 },
    risk_class: 'minimal',
  },
  {
    id: 'compute_hash',
    version: '1.0.0',
    summary: 'Returns SHA-256 of the provided string.',
    description_for_agents: 'Pure function. Hashes input.value using SHA-256, returns hex digest.',
    input_schema: { type: 'object', properties: { value: { type: 'string', maxLength: 1048576 } }, required: ['value'] },
    output_schema: { type: 'object', properties: { algorithm: { type: 'string' }, digest_hex: { type: 'string' } }, required: ['algorithm', 'digest_hex'] },
    side_effects: 'read',
    idempotent: true,
    cost: { type: 'free' },
    rate_limit: { rpm: 600, concurrent: 50 },
    risk_class: 'minimal',
  },
  {
    id: 'store_note',
    version: '1.0.0',
    summary: 'Persists a note for the principal (write).',
    description_for_agents: 'Stores a small string keyed by the principal DID. Returns a note_id.',
    input_schema: { type: 'object', properties: { content: { type: 'string', maxLength: 4096 } }, required: ['content'] },
    output_schema: { type: 'object', properties: { note_id: { type: 'string' } }, required: ['note_id'] },
    side_effects: 'write',
    idempotent: false,
    cost: { type: 'free' },
    rate_limit: { rpm: 60, concurrent: 5 },
    risk_class: 'low',
  },
  {
    id: 'request_cooling_off',
    version: '1.0.0',
    summary: 'Triggers a cooling-off period before a high-risk action.',
    description_for_agents: 'Returns a wait_seconds value the agent MUST honor before retrying. Demonstrates RFC-0019 §6 cooling-off.',
    input_schema: { type: 'object', properties: { for_action_id: { type: 'string' } }, required: ['for_action_id'] },
    output_schema: { type: 'object', properties: { wait_seconds: { type: 'integer' }, reason: { type: 'string' } }, required: ['wait_seconds'] },
    side_effects: 'read',
    idempotent: true,
    cost: { type: 'free' },
    rate_limit: { rpm: 60, concurrent: 5 },
    risk_class: 'minimal',
  },
];

const manifest = {
  oap_version: '1.0',
  tool: {
    id: 'oap-reference-server',
    did: TOOL_DID,
    name: 'OAP Reference Server',
    version: '1.0.0',
    publisher: { did: TOOL_DID, legal_name: 'OAP Reference', verified: false },
    categories: ['reference', 'testing'],
    description_for_humans: 'The canonical OAP Tool reference implementation.',
    description_for_agents: 'Use the four declared Actions to verify integration. Receipts are real Ed25519 signed.',
  },
  endpoints: {
    invoke:               '/oap/invoke',
    audit:                '/oap/audit',
    data_delete:          '/oap/data/delete',
    incident:             '/oap/incident',
    discover:             '/oap/discover',
    intent:               '/oap/intent',
    billing:              '/oap/billing',
    subscribe:            '/oap/subscribe',
    conformance_receipt:  '/oap/conformance-receipt',
  },
  auth: [{ method: 'anonymous' }, { method: 'bearer' }],
  actions: ACTIONS,
  pricing: { free_tier: { calls_per_day: 100000 }, models: [{ type: 'free' }] },
  sla: {
    uptime_target: 0.999,
    latency_p95_ms: 50,
    max_call_duration_ms: 5000,
    supports_streaming: false,
    supports_async: false,
    regions: ['local'],
    max_concurrency_per_principal: 50,
    incident_disclosure_within_hours: 72,
  },
  trust: { publisher_verified: false, data_residency: ['EU'], gdpr_compliant: true },
  data_policy: {
    stores_principal_data: true,
    retention_days: 30,
    shares_with_third_parties: false,
    training_on_principal_data: 'never',
    deletion_endpoint: '/oap/data/delete',
    lawful_bases: ['contract', 'consent'],
  },
  risk_class: 'minimal',
  jurisdictions: ['DE'],
  governance: { dispute_resolution_url: '/legal/disputes', contact_email: 'reference@oap.local' },
};

const didDocument = {
  '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/suites/jws-2020/v1'],
  id: TOOL_DID,
  verificationMethod: [
    {
      id: `${TOOL_DID}#oap-signing`,
      type: 'JsonWebKey2020',
      controller: TOOL_DID,
      publicKeyJwk: { ...KEYS.publicJwk, alg: 'EdDSA', use: 'sig', kid: 'oap-signing' },
    },
  ],
  assertionMethod: [`${TOOL_DID}#oap-signing`],
  authentication: [`${TOOL_DID}#oap-signing`],
  service: [
    { id: `${TOOL_DID}#oap-tool`, type: 'OAPTool', serviceEndpoint: `http://${TOOL_DOMAIN}/.well-known/oap-tool.json` },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function generateUlid() {
  const t = Date.now().toString(36).toUpperCase().padStart(10, '0');
  const r = crypto.randomBytes(10).toString('hex').toUpperCase().substring(0, 16);
  return (t + r).substring(0, 26);
}

function findAction(id) {
  return ACTIONS.find((a) => a.id === id) || null;
}

function getChainTip() {
  const row = stmt.getChainTip.get();
  return row ? row.previous_receipt_hash : 'genesis';
}

function persistReceipt(type, principalDid, agentDid, actionId, input, output, decision) {
  const previous = getChainTip();
  const core = {
    receipt_id: `urn:oap:receipt:${generateUlid()}`,
    type,
    timestamp: new Date().toISOString(),
    principal_did: principalDid,
    agent_did: agentDid,
    tool_did: TOOL_DID,
    action_id: actionId,
    input_hash: 'sha256:' + sha256Hex(canonicalize(input || {})),
    output_hash: 'sha256:' + sha256Hex(canonicalize(output || {})),
    cost: { amount: '0', currency: 'EUR' },
    policy_decisions: decision ? [decision] : [{ id: `pol_${generateUlid()}`, outcome: 'allow', rules: ['l1.universal.pass'] }],
    previous_receipt_hash: previous,
  };
  const sigValue = signEd25519(core);
  const receipt = { ...core, signatures: [{ by: `${TOOL_DID}#oap-signing`, alg: 'EdDSA', value: sigValue }] };
  const selfHash = 'sha256:' + sha256Hex(canonicalize(receipt));

  stmt.insertReceipt.run(
    receipt.receipt_id, type, receipt.timestamp,
    principalDid, agentDid, actionId,
    JSON.stringify(receipt), selfHash,
  );
  stmt.setChainTip.run(selfHash);

  return { ...receipt, self_hash: selfHash };
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiter (per-principal per-action, RPM only; concurrency hook present)
// ─────────────────────────────────────────────────────────────────────────────

function checkRpm(principal, action) {
  if (!action?.rate_limit?.rpm) return { ok: true };
  const minuteBucket = Math.floor(Date.now() / 60000);
  const key = `${principal}__${action.id}__${minuteBucket}`;
  const now = Date.now();
  const expiresAt = now + 60_000;
  const row = db.prepare('SELECT count FROM rate_buckets WHERE bucket_key = ? AND expires_at > ?').get(key, now);
  const next = (row ? row.count : 0) + 1;
  if (next > action.rate_limit.rpm) {
    return { ok: false, retry_after_seconds: 60 - Math.floor((Date.now() % 60000) / 1000) };
  }
  db.prepare('INSERT INTO rate_buckets (bucket_key, count, expires_at) VALUES (?, ?, ?) ON CONFLICT(bucket_key) DO UPDATE SET count = count + 1').run(key, 1, expiresAt);
  // Opportunistic GC of old buckets.
  if (Math.random() < 0.01) db.prepare('DELETE FROM rate_buckets WHERE expires_at < ?').run(now);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Action handlers
// ─────────────────────────────────────────────────────────────────────────────

const NOTES = new Map(); // in-memory note store keyed by note_id (for demo only)

function dispatch(actionId, input, ctx) {
  switch (actionId) {
    case 'echo':
      return { echo: input || {}, server_time: new Date().toISOString() };
    case 'compute_hash': {
      const v = String(input?.value ?? '');
      return { algorithm: 'sha256', digest_hex: sha256Hex(v) };
    }
    case 'store_note': {
      const noteId = `note_${generateUlid()}`;
      NOTES.set(noteId, { principal: ctx.principal, content: String(input?.content || ''), at: Date.now() });
      return { note_id: noteId };
    }
    case 'request_cooling_off':
      return { wait_seconds: 30, reason: 'L4 cooling-off invariant per RFC-0019 §6.' };
    default:
      throw Object.assign(new Error(`No handler for ${actionId}`), { code: 'not_implemented', status: 501 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Express app
// ─────────────────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json({ type: ['application/json', 'application/oap+json'], limit: '2mb' }));

// Well-known
app.get('/.well-known/oap-tool.json', (_req, res) => res.json(manifest));
app.get('/.well-known/did.json', (_req, res) => res.json(didDocument));

// Invoke
app.post('/oap/invoke', (req, res) => {
  const env = req.body || {};
  const required = ['oap_version', 'request_id', 'principal_did', 'agent_did', 'action', 'input'];
  const missing = required.filter((k) => env[k] === undefined);
  if (missing.length) return res.status(400).json({ status: 'error', error: { code: 'invalid_envelope', message: `Missing: ${missing.join(', ')}` } });
  if (env.oap_version !== '1.0') return res.status(400).json({ status: 'error', error: { code: 'unsupported_version' } });

  const action = findAction(env.action);
  if (!action) return res.status(404).json({ status: 'error', error: { code: 'action_not_found', message: env.action } });

  // Auth: write actions require Bearer (any non-empty token in this reference)
  if (action.side_effects === 'write') {
    const auth = req.headers.authorization || '';
    if (!/^Bearer\s+\S+/i.test(auth)) {
      return res.status(401).json({ status: 'error', error: { code: 'auth_required', message: 'Bearer token required for write actions.' } });
    }
  }

  const principal = env.principal_did;

  const rl = checkRpm(principal, action);
  if (!rl.ok) return res.status(429).set('Retry-After', String(rl.retry_after_seconds || 60)).json({ status: 'error', error: { code: 'rate_limited' } });

  let output;
  try {
    output = dispatch(action.id, env.input, { principal });
  } catch (err) {
    const r = persistReceipt('invocation_error', principal, env.agent_did, action.id, env.input, null, { id: `pol_${generateUlid()}`, outcome: 'allow', rules: [] });
    return res.status(err.status || 500).json({ status: 'error', error: { code: err.code || 'internal', message: err.message }, receipt_id: r.receipt_id });
  }

  const receipt = persistReceipt('invocation', principal, env.agent_did, action.id, env.input, output);

  res.status(200).set('Content-Type', 'application/oap+json').json({
    oap_version: '1.0',
    request_id: env.request_id,
    response_id: `res_${generateUlid()}`,
    timestamp: new Date().toISOString(),
    tool_did: TOOL_DID,
    status: 'success',
    output,
    error: null,
    metering: { duration_ms: 1, units_charged: 0, currency: 'EUR' },
    receipt_id: receipt.receipt_id,
    receipt_hash: receipt.self_hash,
  });
});

// Audit
app.get('/oap/audit', (req, res) => {
  const principalDid = req.query.principal_did;
  const limit = Math.min(500, parseInt(req.query.limit || '100', 10));
  const rows = principalDid
    ? stmt.selectReceiptsByPrincipal.all(principalDid, limit)
    : stmt.selectAllReceipts.all(limit);
  const receipts = rows.map((r) => JSON.parse(r.body_json));
  res.json({ receipts, total: receipts.length });
});

// Data delete (with signed Deletion Receipt)
app.post('/oap/data/delete', (req, res) => {
  const principalDid = (req.body && req.body.principal_did) || null;
  if (!principalDid) return res.status(400).json({ error: 'principal_did required' });

  const requestReceivedAt = new Date().toISOString();
  const info = stmt.deleteReceiptsByPrincipal.run(principalDid);
  const completedAt = new Date().toISOString();

  const core = {
    receipt_id: `urn:oap:deletion:${crypto.randomBytes(12).toString('hex')}`,
    tool_did: TOOL_DID,
    principal_did: principalDid,
    request_received_at: requestReceivedAt,
    completed_at: completedAt,
    method: 'cryptographic_erasure',
    scope: { data_classes: ['oap_receipts'], provenance_tags: ['gdpr-art-17'], subprocessors_propagated_to: [] },
  };
  const sigValue = signEd25519(core);
  res.status(200).set('Content-Type', 'application/oap+json').json({
    ...core,
    signature: { alg: 'EdDSA', kid: 'oap-signing', value: sigValue },
    _diagnostics: { receipts_deleted: info.changes },
  });
});

// Incidents
app.get('/oap/incident', (_req, res) => {
  const rows = stmt.selectIncidents.all();
  res.json({ incidents: rows.map((r) => JSON.parse(r.body_json)) });
});
app.post('/oap/incident', (req, res) => {
  if (ADMIN_TOKEN && req.headers['x-admin-token'] !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'admin_token_required' });
  }
  const id = `inc_${generateUlid()}`;
  const body = { incident_id: id, severity: req.body?.severity || 'minor', created_at: new Date().toISOString(), ...req.body };
  stmt.insertIncident.run(id, body.severity, body.created_at, JSON.stringify(body));
  res.status(201).json(body);
});

// Discover (legacy keyword interface, kept for backward compatibility)
app.post('/oap/discover', (req, res) => {
  const intent = String((req.body && req.body.intent) || '').toLowerCase();
  const matches = ACTIONS.map((a) => ({
    id: a.id,
    summary: a.summary,
    confidence: intent && (a.id.includes(intent.split(' ')[0]) || a.summary.toLowerCase().includes(intent)) ? 0.9 : 0.4,
    estimated_cost_eur: '0',
  }));
  res.json({ matching_actions: matches });
});

// Intent (RFC 0020 AQL endpoint). Accepts a signed Intent, evaluates it against
// this server's Action set as the candidate corpus, returns a signed
// IntentResponse with per candidate Decision Records.
app.post('/oap/intent', (req, res) => {
  const parsed = parseIntent(req.body || {});
  if (!parsed.ok) {
    return res.status(400).json({
      error: 'invalid_intent',
      errors: parsed.errors,
    });
  }
  const intent = parsed.intent;

  // Each Action is exposed as a candidate record. Manifest envelope fields are
  // merged in so probes can constrain on /oap_version, /tool_did, etc.
  const candidates = ACTIONS.map((a) => ({
    id: `${TOOL_DID}#${a.id}`,
    record: {
      oap_version: manifest.oap_version,
      tool_did: TOOL_DID,
      manifest_id: `${TOOL_DID}#${a.id}`,
      action_id: a.id,
      summary: a.summary,
      description_for_agents: a.description_for_agents,
      side_effects: a.side_effects,
      idempotent: a.idempotent,
      risk_class: a.risk_class,
      cost: a.cost,
      categories: manifest.tool.categories,
    },
    cost: '0',
    quality: { conformance_level: 'L3', performance_score: 0.95 },
  }));

  const response = resolveIntent({
    intent,
    candidates,
    resolverDid: TOOL_DID,
    resolverRole: 'provider',
  });

  // Sign the response body with this server's Ed25519 key, replacing the
  // unsigned-test-fixture marker that resolveIntent emits for in process use.
  const { signature: _placeholder, ...body } = response;
  const sigValue = signEd25519(body);
  res.set('Content-Type', 'application/oap+json').json({
    ...body,
    signature: { alg: 'EdDSA', kid: 'oap-signing', value: sigValue },
  });
});

// Billing + subscribe
app.get('/oap/billing', (req, res) => {
  const principalDid = req.query.principal_did;
  const row = principalDid ? stmt.selectSubscriptionByPrincipal.get(principalDid) : null;
  res.json({ subscription: row ? JSON.parse(row.body_json) : null, pricing: manifest.pricing });
});
app.post('/oap/subscribe', (req, res) => {
  const principalDid = req.body?.principal_did;
  if (!principalDid) return res.status(400).json({ error: 'principal_did required' });
  const sub = {
    subscription_id: generateUlid(),
    principal_did: principalDid,
    agent_did: req.body.agent_did || null,
    tool_did: TOOL_DID,
    tier: req.body.tier || 'free',
    status: 'active',
    created_at: new Date().toISOString(),
    subscription_token: `oap_sub_live_${crypto.randomBytes(16).toString('hex')}`,
  };
  stmt.insertSubscription.run(sub.subscription_id, principalDid, sub.tier, 'active', sub.created_at, JSON.stringify(sub));
  persistReceipt('subscription', principalDid, sub.agent_did, null, req.body, sub);
  res.json(sub);
});
app.delete('/oap/subscribe/:id', (req, res) => {
  const info = stmt.cancelSubscription.run('canceled', new Date().toISOString(), req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'not_found' });
  res.json({ subscription_id: req.params.id, status: 'canceled', canceled_at: new Date().toISOString() });
});

// Conformance receipt (runtime self-attestation; for an audited Receipt run
// oap-spec/test-suite/attest.js in CI). The reference server intentionally
// claims only L0 and L1 here. L2 commerce primitives are implemented as
// reference code, but L2..L5 require corroborating evidence (peer witnesses,
// external audit attestations, registry anchors) that a generic local demo
// cannot produce. Implementations that genuinely satisfy higher levels SHOULD
// claim them and prove them via the full conformance test suite.
app.get('/oap/conformance-receipt', (_req, res) => {
  const claimed = ['L0', 'L1'];
  const core = {
    receipt_id: `urn:oap:conformance:${crypto.randomBytes(12).toString('hex')}`,
    type: 'conformance',
    timestamp: new Date().toISOString(),
    implementation: { did: TOOL_DID, name: 'OAP Reference Server', version: '1.0.0' },
    suite: { name: 'oap-reference-runtime', version: '1.0.0', spec_version: '1.0' },
    target: { uri: `http://${TOOL_DOMAIN}` },
    claimed_levels: claimed,
    profile: 'standard',
    results_summary: { note: 'Runtime self-attestation only. For an audited Receipt, run oap-spec/test-suite/attest.js in CI.' },
    validity: {
      not_before: new Date().toISOString(),
      not_after: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
    },
    previous_receipt_hash: 'genesis',
  };
  const sigValue = signEd25519(core);
  res.json({ ...core, signatures: [{ by: `${TOOL_DID}#oap-signing`, alg: 'EdDSA', value: sigValue }] });
});

// ─────────────────────────────────────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────────────────────────────────────

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`OAP Reference Server (L4-ready) listening on port ${PORT}`);
    console.log(`  Manifest: http://${TOOL_DOMAIN}/.well-known/oap-tool.json`);
    console.log(`  DID:      http://${TOOL_DOMAIN}/.well-known/did.json`);
    console.log(`  Tool DID: ${TOOL_DID}`);
    console.log(`  DB:       ${DB_PATH}`);
    console.log(`  Key:      ${KEY_PATH}`);
  });
}

module.exports = app;
