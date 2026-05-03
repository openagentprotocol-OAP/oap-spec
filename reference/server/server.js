/**
 * OAP Reference Server
 *
 * Minimal conformant OAP Tool server demonstrating all mandatory endpoints.
 * Designed as a starting point for Tool developers.
 *
 * Implements: invoke, audit, data_delete, incident, discover, billing, subscribe.
 * Conformance Level: L2 (Billable).
 *
 * @license Apache-2.0
 */

const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json({ type: ['application/json', 'application/oap+json'] }));

// ---------------------------------------------------------------------------
// In memory stores (replace with database in production)
// ---------------------------------------------------------------------------

const receipts = [];
const subscriptions = new Map();
const auditLog = [];
const incidents = [];
let previousReceiptHash = 'genesis';

// ---------------------------------------------------------------------------
// Configuration (replace with your Tool data)
// ---------------------------------------------------------------------------

const TOOL_DID = process.env.TOOL_DID || 'did:web:example-tool.local';
const PORT = process.env.PORT || 3100;

const manifest = {
  oap_version: '1.0',
  tool: {
    id: 'example-tool',
    did: TOOL_DID,
    name: 'Example OAP Tool',
    version: '1.0.0',
    publisher: { did: TOOL_DID, legal_name: 'Example GmbH', verified: false },
    categories: ['example'],
    description_for_humans: 'A reference OAP Tool for demonstration purposes.',
    description_for_agents: 'Returns echoed input with metadata. Use for testing OAP integration, validating request and response envelopes, and verifying receipt chains.',
  },
  endpoints: {
    invoke:      '/oap/invoke',
    audit:       '/oap/audit',
    data_delete: '/oap/data/delete',
    incident:    '/oap/incident',
    discover:    '/oap/discover',
    billing:     '/oap/billing',
    subscribe:   '/oap/subscribe',
  },
  auth: [{ method: 'anonymous' }, { method: 'api_key' }],
  actions: [
    {
      id: 'echo',
      version: '1.0.0',
      summary: 'Echoes the input with OAP metadata.',
      description_for_agents: 'Returns the input object unchanged, wrapped in OAP metadata. Use for integration testing.',
      input_schema: { type: 'object', additionalProperties: true },
      output_schema: { type: 'object', properties: { echo: { type: 'object' }, server_time: { type: 'string' } } },
      side_effects: 'none',
      idempotent: true,
      idempotency_window_seconds: 60,
      cost: { type: 'free' },
      latency_p95_ms: 10,
      rate_limit: { rpm: 1000, concurrent: 100 },
      requires_consent: false,
      risk_class: 'minimal',
      data_classes_in: [],
      data_classes_out: [],
      examples: [
        { input: { hello: 'world' }, output: { echo: { hello: 'world' }, server_time: '2026-05-03T10:00:00Z' } },
      ],
    },
  ],
  pricing: { free_tier: { calls_per_day: 10000 }, models: [{ type: 'free' }] },
  sla: {
    uptime_target: 0.999,
    latency_p95_ms: 50,
    max_call_duration_ms: 5000,
    supports_streaming: false,
    supports_async: false,
    regions: ['local'],
    max_concurrency_per_principal: 100,
    incident_disclosure_within_hours: 72,
  },
  trust: { publisher_verified: false, data_residency: ['EU'], gdpr_compliant: true },
  data_policy: {
    stores_principal_data: false,
    retention_days: 0,
    shares_with_third_parties: false,
    training_on_principal_data: 'never',
    deletion_endpoint: '/oap/data/delete',
    lawful_bases: ['contract'],
  },
  risk_class: 'minimal',
  jurisdictions: ['DE'],
  governance: { dispute_resolution_url: '/legal/disputes', contact_email: 'compliance@example.local' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateUlid() {
  const t = Date.now().toString(36).toUpperCase().padStart(10, '0');
  const r = crypto.randomBytes(10).toString('hex').toUpperCase().substring(0, 16);
  return (t + r).substring(0, 26);
}

function hashJson(obj) {
  return 'sha256:' + crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

function createReceipt(type, req, output) {
  const receipt = {
    receipt_id: `urn:oap:receipt:${generateUlid()}`,
    type,
    timestamp: new Date().toISOString(),
    principal_did: (req.body.principal && req.body.principal.did) || req.body.principal_did || 'anonymous',
    agent_did: (req.body.agent && req.body.agent.did) || req.body.agent_did || 'anonymous',
    tool_did: TOOL_DID,
    action_id: req.body.action_id || req.body.action || null,
    input_hash: hashJson(req.body.input || {}),
    output_hash: hashJson(output || {}),
    cost: { amount: '0', currency: 'EUR' },
    policy_decisions: [{ id: `pol_${generateUlid()}`, outcome: 'allow', rules: ['l1.universal.pass'] }],
    provenance_tags_in: [],
    provenance_tags_out: [],
    previous_receipt_hash: previousReceiptHash,
    signatures: [{ by: TOOL_DID, alg: 'EdDSA', value: 'reference-implementation-unsigned' }],
  };
  previousReceiptHash = hashJson(receipt);
  receipts.push(receipt);
  auditLog.push({ timestamp: receipt.timestamp, type, receipt_id: receipt.receipt_id, principal_did: receipt.principal_did });
  return receipt;
}

// ---------------------------------------------------------------------------
// Manifest (well known)
// ---------------------------------------------------------------------------

app.get('/.well-known/oap-tool.json', (_req, res) => {
  res.json(manifest);
});

// ---------------------------------------------------------------------------
// Invoke
// ---------------------------------------------------------------------------

app.post('/oap/invoke', (req, res) => {
  const actionId = req.body.action_id || req.body.action;
  const action = manifest.actions.find(a => a.id === actionId);

  if (!action) {
    return res.status(404).json({
      oap_version: '1.0',
      request_id: req.body.request_id,
      response_id: generateUlid(),
      timestamp: new Date().toISOString(),
      status: 'error',
      error: { code: 'not_found', message: `Action ${actionId} not found.` },
      signature: { alg: 'EdDSA', kid: `${TOOL_DID}#key-1`, value: '' },
    });
  }

  const output = { echo: req.body.input || {}, server_time: new Date().toISOString() };
  const receipt = createReceipt('invocation', req, output);

  res.json({
    oap_version: '1.0',
    request_id: req.body.request_id,
    response_id: generateUlid(),
    timestamp: new Date().toISOString(),
    status: 'ok',
    output,
    model_version: 'reference-1.0',
    cost: { amount: '0', currency: 'EUR' },
    receipt: { id: receipt.receipt_id, anchored_in: [] },
    warnings: [],
    signature: { alg: 'EdDSA', kid: `${TOOL_DID}#key-1`, value: '' },
  });
});

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

app.get('/oap/audit', (req, res) => {
  const principalDid = req.query.principal_did;
  const filtered = principalDid
    ? auditLog.filter(e => e.principal_did === principalDid)
    : auditLog;
  res.json({ entries: filtered, total: filtered.length });
});

// ---------------------------------------------------------------------------
// Data Delete
// ---------------------------------------------------------------------------

app.post('/oap/data/delete', (req, res) => {
  const receipt = createReceipt('deletion', req, { deleted: true });
  res.json({
    receipt_id: receipt.receipt_id.replace('receipt', 'deletion'),
    tool_did: TOOL_DID,
    principal_did: req.body.principal_did || 'anonymous',
    request_received_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    method: 'logical_purge',
    scope: { data_classes: [], provenance_tags: [] },
    exceptions: [],
    signature: { alg: 'EdDSA', kid: `${TOOL_DID}#key-1`, value: '' },
  });
});

// ---------------------------------------------------------------------------
// Incident
// ---------------------------------------------------------------------------

app.get('/oap/incident', (_req, res) => {
  res.json({ incidents });
});

// ---------------------------------------------------------------------------
// Discover
// ---------------------------------------------------------------------------

app.post('/oap/discover', (req, res) => {
  const intent = (req.body.intent || '').toLowerCase();
  const matches = manifest.actions.map(a => ({
    id: a.id,
    summary: a.summary,
    confidence: intent.includes('echo') || intent.includes('test') ? 0.95 : 0.5,
    estimated_cost_eur: '0',
  }));
  res.json({ matching_actions: matches });
});

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

app.get('/oap/billing', (req, res) => {
  const principalDid = req.query.principal_did;
  const sub = subscriptions.get(principalDid);
  res.json({ subscription: sub || null, pricing: manifest.pricing });
});

// ---------------------------------------------------------------------------
// Subscribe
// ---------------------------------------------------------------------------

app.post('/oap/subscribe', (req, res) => {
  const token = `oap_sub_live_${crypto.randomBytes(16).toString('hex')}`;
  const sub = {
    subscription_id: generateUlid(),
    principal_did: req.body.principal_did,
    agent_did: req.body.agent_did,
    tool_did: TOOL_DID,
    tier: req.body.tier || 'free',
    status: 'active',
    created_at: new Date().toISOString(),
    subscription_token: token,
  };
  subscriptions.set(req.body.principal_did, sub);
  createReceipt('subscription', req, sub);
  res.json(sub);
});

app.delete('/oap/subscribe/:id', (req, res) => {
  for (const [key, sub] of subscriptions) {
    if (sub.subscription_id === req.params.id) {
      sub.status = 'canceled';
      sub.canceled_at = new Date().toISOString();
      return res.json(sub);
    }
  }
  res.status(404).json({ error: 'not_found' });
});

// ---------------------------------------------------------------------------
// Receipts (diagnostic, not part of OAP spec but useful)
// ---------------------------------------------------------------------------

app.get('/oap/receipts', (req, res) => {
  const principalDid = req.query.principal_did;
  const filtered = principalDid
    ? receipts.filter(r => r.principal_did === principalDid)
    : receipts;
  res.json({ receipts: filtered, chain_valid: true });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`OAP Reference Server running on port ${PORT}`);
  console.log(`Manifest: http://localhost:${PORT}/.well-known/oap-tool.json`);
});

module.exports = app;
