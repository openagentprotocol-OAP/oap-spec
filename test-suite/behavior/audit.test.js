/**
 * @oap-test
 * @levels L1, L1-NC
 * @rfcs OAP-CORE-1.0 §11 (Audit)
 * @category behavior
 * @description Verifies that an emitted Receipt is retrievable via the audit
 *              endpoint, that the audit response has a structurally valid
 *              shape, and that the receipt is hash-chained (signature or
 *              previous_receipt_hash present).
 */

const RESULTS = [];
function record(name, passed, reason) {
  RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
}

const ULID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function ulid() {
  let out = '';
  for (let i = 0; i < 26; i++) out += ULID_ALPHABET[Math.floor(Math.random() * 32)];
  return out;
}

async function run({ target }) {
  RESULTS.length = 0;
  const base = target.replace(/\/$/, '');

  let manifest;
  try {
    manifest = await (await fetch(`${base}/.well-known/oap-tool.json`)).json();
  } catch (err) {
    record('audit-manifest-fetch', false, err.message);
    return RESULTS.slice();
  }

  if (!manifest.endpoints || !manifest.endpoints.audit) {
    record('audit-endpoint-declared', false, 'manifest.endpoints.audit missing');
    return RESULTS.slice();
  }
  record('audit-endpoint-declared', true);

  const invokeUrl = manifest.endpoints.invoke.startsWith('http')
    ? manifest.endpoints.invoke
    : `${base}${manifest.endpoints.invoke}`;

  const freeAction = (manifest.actions || []).find((a) => a.cost && a.cost.type === 'free' && a.side_effects === 'read');
  if (!freeAction) {
    record('audit-precondition-free-action', false, 'No free read Action declared');
    return RESULTS.slice();
  }

  // Trigger an invocation to produce a receipt
  let receiptId;
  let testPrincipal = `did:plc:audit_probe_${Date.now()}`;
  try {
    const input = freeAction.input_schema && freeAction.input_schema.properties && freeAction.input_schema.properties.query
      ? { query: 'audit-probe', max_results: 1 } : {};
    const r = await fetch(invokeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/oap+json' },
      body: JSON.stringify({
        oap_version: '1.0', request_id: ulid(),
        timestamp: new Date().toISOString(),
        principal_did: testPrincipal,
        agent_did: 'did:assistnet:audit_test',
        action: freeAction.id, input,
        context: { locale: 'en-US', currency: 'EUR', jurisdiction_user: 'DE', jurisdiction_agent: 'DE' },
        signature: { alg: 'EdDSA', kid: 'probe', value: 'probe' },
      }),
    });
    const body = await r.json();
    receiptId = body.receipt_id;
    record('audit-receipt-created', !!receiptId, receiptId ? null : 'no receipt_id in invoke response');
  } catch (err) {
    record('audit-receipt-created', false, err.message);
    return RESULTS.slice();
  }

  if (!receiptId) return RESULTS.slice();

  // Fetch from audit endpoint
  const auditUrl = manifest.endpoints.audit.startsWith('http')
    ? manifest.endpoints.audit
    : `${base}${manifest.endpoints.audit}`;

  try {
    const url = `${auditUrl}?principal_did=${encodeURIComponent(testPrincipal)}`;
    const r = await fetch(url);
    record('audit-endpoint-reachable', r.ok, r.ok ? null : `HTTP ${r.status}`);
    if (r.ok) {
      const body = await r.json();
      const list = Array.isArray(body.receipts) ? body.receipts
                  : Array.isArray(body) ? body
                  : Array.isArray(body.items) ? body.items : null;
      record('audit-returns-receipt-list', Array.isArray(list),
        list ? null : 'response body must be {receipts: [...]} or array');
      if (Array.isArray(list)) {
        const found = list.find((x) => x.receipt_id === receiptId);
        record('audit-includes-emitted-receipt', !!found,
          found ? null : `receipt ${receiptId} not present in audit listing`);
        if (found) {
          const chained = !!(found.previous_receipt_hash || found.self_hash || found.signature || found.signatures);
          record('audit-receipt-is-chained', chained,
            chained ? null : 'receipt missing chain/signature fields');
        }
      }
    }
  } catch (err) {
    record('audit-endpoint-reachable', false, err.message);
  }

  return RESULTS.slice();
}

module.exports = { run };
