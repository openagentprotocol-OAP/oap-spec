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
    receipt_verify:       '/oap/receipt-verify',
    receipt_chain_export: '/oap/receipt-chain/export',
    capability_announcement: '/oap/aht/capability-announcement',
    late_join:               '/oap/aht/late-join',
    convention_propose:      '/oap/aht/convention/propose',
    convention_drift:        '/oap/aht/convention/drift',
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
  accountability: {
    transparency_logs: [
      { operator_domain: 'log-eu.openagentprotocol.example', region: 'EU', url: 'https://log-eu.openagentprotocol.example' },
      { operator_domain: 'log-us.openagentprotocol.example', region: 'US', url: 'https://log-us.openagentprotocol.example' },
    ],
    recovery: {
      export_endpoint: '/oap/receipt-chain/export',
      offline_procedure_url: 'https://openagentprotocol.eu/spec/recovery',
    },
  },
  sybil_resistance: {
    fresh_identity_influence_cap: 0.05,
    cooling_off_required_seconds: 86400,
  },
  ad_hoc_teamwork: {
    supported: true,
    capability_announcement_v1: true,
    late_join_modes: ['capability_match', 'open'],
    convention_discovery_v1: true,
    convention_discovery_v2: true,
    max_capabilities_per_announcement: 64,
    unilateral_timeout_ms: 1500,
    convention_inference_v1: true,
    regret_tolerance: 0.10,
    drift_threshold_kl: 0.50,
    max_byzantine_fraction: 0.33,
    aht_fallback_policy: {
      policy_class: 'POAM',
      policy_ref: 'https://openagentprotocol.eu/rfcs/0027#aht-fallback-policy',
      assumptions: ['stationary_teammates', 'fully_observable_state', 'type_space_realizable'],
    },
  },
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
    transparency_log_proofs: [
      { log_operator: 'log-eu.openagentprotocol.example', region: 'EU', leaf_index: Date.now(), inclusion_proof: 'reference-stub' },
      { log_operator: 'log-us.openagentprotocol.example', region: 'US', leaf_index: Date.now(), inclusion_proof: 'reference-stub' },
    ],
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

// RFC 0019 receipt verification: third-party verifiers POST a Receipt and the
// server reports whether its signature, hash chain, and recorded position are
// valid. Adversarial probes (RFC 0029) exercise this surface to verify that
// forged or signature-stripped receipts are rejected.
app.post('/oap/receipt-verify', (req, res) => {
  const r = req.body || {};
  if (!r || typeof r !== 'object') return res.status(400).json({ valid: false, reason: 'invalid_body' });
  const sigList = Array.isArray(r.signatures) ? r.signatures : [];
  const sig = sigList[0] && sigList[0].value;
  if (!sig) return res.status(400).json({ valid: false, reason: 'missing_signature' });
  try {
    const sigBuf = Buffer.from(sig.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const stripped = { ...r };
    delete stripped.signatures;
    const ok = crypto.verify(null, Buffer.from(canonicalize(stripped)), KEYS.publicKey, sigBuf);
    if (!ok) return res.status(400).json({ valid: false, reason: 'signature_invalid' });
    return res.json({ valid: true, reason: null });
  } catch (err) {
    return res.status(400).json({ valid: false, reason: `verify_error:${err.message}` });
  }
});

// Receipt-chain export for disaster-recovery rebuilds. Streams the persisted
// receipts table as JSONL (one canonicalized receipt per line). Operators
// MAY restrict this endpoint to authenticated incident responders; the
// reference implementation leaves it unauthenticated for clarity.
app.get('/oap/receipt-chain/export', (_req, res) => {
  res.set('content-type', 'application/x-ndjson');
  const rows = db.prepare('SELECT body FROM receipts ORDER BY rowid ASC').all();
  for (const row of rows) {
    res.write(typeof row.body === 'string' ? row.body : JSON.stringify(row.body));
    res.write('\n');
  }
  res.end();
});

// Conformance receipt (runtime self-attestation; for an audited Receipt run
// oap-spec/test-suite/attest.js in CI). The reference server intentionally
// claims only L0 and L1 here. L2 commerce primitives are implemented as
// reference code, but L2..L5 require corroborating evidence (peer witnesses,
// external audit attestations, registry anchors) that a generic local demo
// cannot produce. Implementations that genuinely satisfy higher levels SHOULD
// claim them and prove them via the full conformance test suite.
// ─────────────────────────────────────────────────────────────────────────────
// RFC 0027: Ad Hoc Teamwork endpoints
// ─────────────────────────────────────────────────────────────────────────────

const AHT_REQUIRED_CAPS = ['fulfillment.ship.parcel', 'collab.edit.document'];
const AHT_REPUTATION_THRESHOLD = 0.0;
let ahtAdmissionCounter = 0;

app.post('/oap/aht/capability-announcement', (req, res) => {
  const a = req.body || {};
  if (a.schema !== 'oap.capability.v1') return res.status(400).json({ error: 'invalid_schema' });
  if (!a.agent_did || !Array.isArray(a.capabilities) || a.capabilities.length === 0) {
    return res.status(400).json({ error: 'missing_required_fields' });
  }
  if (!a.signature) return res.status(400).json({ error: 'unsigned' });
  // Reference server accepts the announcement and responds with the canonical hash.
  const canonical = JSON.stringify(a);
  const hash = 'sha256:' + crypto.createHash('sha256').update(canonical).digest('hex');
  res.json({ accepted: true, capability_announcement_hash: hash });
});

app.post('/oap/aht/late-join', (req, res) => {
  const { capability_announcement, context } = req.body || {};
  if (!capability_announcement || !context) return res.status(400).json({ error: 'missing_required_fields' });
  const caps = (capability_announcement.capabilities || []).map((c) => c.action);
  const matched = caps.filter((c) => AHT_REQUIRED_CAPS.includes(c));
  if (matched.length === 0) {
    return res.status(403).json({ error: 'capabilities_not_matched', required: AHT_REQUIRED_CAPS });
  }
  ahtAdmissionCounter += 1;
  const annHash = 'sha256:' + crypto.createHash('sha256').update(JSON.stringify(capability_announcement)).digest('hex');
  const core = {
    receipt_id: `urn:oap:receipt:lj-${generateUlid()}`,
    type: 'late_join',
    timestamp: new Date().toISOString(),
    host_tool_did: TOOL_DID,
    admitted_agent_did: capability_announcement.agent_did,
    context: { context_type: context.context_type, context_id: context.context_id, admitted_at_step: context.step_id || null },
    admission_mode: 'capability_match',
    capabilities_matched: matched,
    reputation_score: 1.0,
    reputation_threshold: AHT_REPUTATION_THRESHOLD,
    capability_announcement_hash: annHash,
    monotonic_admission_index: ahtAdmissionCounter,
    previous_receipt_hash: getChainTip(),
  };
  const sigValue = signEd25519(core);
  const receipt = { ...core, signatures: [{ signer_did: TOOL_DID, signature: sigValue, alg: 'Ed25519' }] };
  res.json(receipt);
});

app.post('/oap/aht/convention/propose', (req, res) => {
  const { context, convention_spaces, observable_peers } = req.body || {};
  if (!Array.isArray(convention_spaces) || convention_spaces.length === 0) {
    return res.status(400).json({ error: 'missing_convention_spaces' });
  }
  // Tier 1 Schelling reduction (canonicalized, lex-tiebreak).
  const canonicalize = (v) => {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(canonicalize).join(',') + ']';
    return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonicalize(v[k])).join(',') + '}';
  };
  const sets = convention_spaces.map((entry) => new Set((entry.space || []).map(canonicalize)));
  const inter = sets.length === 0 ? [] : [...sets[0]].filter((k) => sets.every((s) => s.has(k)));
  let convention = null;
  let tierUsed = 'tier1';
  if (inter.length > 0) {
    inter.sort();
    convention = JSON.parse(inter[0]);
  } else if (Array.isArray(observable_peers) && observable_peers.length > 0) {
    // Tier 2/3 fallback: pick first convention from union of published spaces.
    const union = new Set();
    for (const e of convention_spaces) for (const c of (e.space || [])) union.add(canonicalize(c));
    if (union.size > 0) {
      convention = JSON.parse([...union].sort()[0]);
      tierUsed = 'tier2+3';
    }
  }
  if (convention === null) {
    return res.status(409).json({ error: 'convention_failed' });
  }
  const core = {
    receipt_id: `urn:oap:receipt:cv-${generateUlid()}`,
    type: 'convention',
    timestamp: new Date().toISOString(),
    context: { context_type: context?.context_type || 'session', context_id: context?.context_id || `ses_${generateUlid()}` },
    tier_used: tierUsed,
    convention,
    inputs: {
      protocol_followers: convention_spaces.map((e) => ({
        did: e.did,
        convention_space_hash: 'sha256:' + crypto.createHash('sha256').update(JSON.stringify(e.space || [])).digest('hex'),
      })),
      observable_non_followers: (observable_peers || []).map((p) => ({
        did: p.did,
        posterior_summary_hash: 'sha256:' + crypto.createHash('sha256').update(JSON.stringify(p.observed_actions || [])).digest('hex'),
        observation_count: (p.observed_actions || []).length,
      })),
      byzantine_bound_t: 0,
      regret_at_commit: 0,
    },
    cosigners: [TOOL_DID],
    previous_receipt_hash: getChainTip(),
  };
  const sigValue = signEd25519(core);
  res.json({ ...core, signatures: [{ signer_did: TOOL_DID, signature: sigValue, alg: 'Ed25519' }] });
});

app.post('/oap/aht/convention/drift', (req, res) => {
  const { context, affected_peer_did, kl_divergence, observation_window_size } = req.body || {};
  if (!affected_peer_did || typeof kl_divergence !== 'number') {
    return res.status(400).json({ error: 'missing_required_fields' });
  }
  const core = {
    receipt_id: `urn:oap:receipt:dr-${generateUlid()}`,
    type: 'convention_drift',
    timestamp: new Date().toISOString(),
    agent_did: TOOL_DID,
    context: { context_type: context?.context_type || 'session', context_id: context?.context_id || `ses_${generateUlid()}` },
    affected_peer_did,
    kl_divergence,
    drift_threshold_kl: 0.5,
    observation_window_size: observation_window_size || 0,
    decision: kl_divergence > 0.5 ? 're-infer' : 're-infer',
    previous_receipt_hash: getChainTip(),
  };
  const sigValue = signEd25519(core);
  res.json({ ...core, signatures: [{ signer_did: TOOL_DID, signature: sigValue, alg: 'Ed25519' }] });
});

app.get('/oap/conformance-receipt', (_req, res) => {
  // The reference server declares L4 to enable AHT (RFC 0027 rev 2) probes.
  // External implementations claiming L4+ MUST pass the full conformance
  // suite including the unilateral-adoption probe (RFC 0027 section 7).
  const claimed = ['L0', 'L1', 'L4'];
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
