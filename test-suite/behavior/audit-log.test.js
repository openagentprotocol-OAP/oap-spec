/**
 * @oap-test
 * @levels L3
 * @rfcs RFC-0010 (Audit Receipts), RFC-0017 (Hash Chain Audit Log)
 * @category behavior
 * @description Verifies that L3 implementations expose an Audit endpoint
 *   returning Receipts that form a hash chain (every Receipt references
 *   the previous receipt's hash). Skipped when the implementation does
 *   not claim L3 or higher.
 */

'use strict';

const crypto = require('node:crypto');
const { fetchManifest, fetchReceipt, claimsAny, endpointUrl } = require('./_helpers');

async function run({ target }) {
  const RESULTS = [];
  const rec = (name, passed, reason) => RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
  const base = target.replace(/\/$/, '');

  const manifest = await fetchManifest(base);
  if (!manifest) return RESULTS;
  const receipt = await fetchReceipt(base, manifest);

  if (!claimsAny(receipt, ['L3', 'L4', 'L5'])) {
    rec('audit-log-not-applicable', true, 'Implementation does not claim L3 or higher. Hash-chain audit log not required.');
    return RESULTS;
  }

  const url = endpointUrl(base, manifest, 'audit');
  rec('audit-log-endpoint-declared', !!url, url ? null : 'Manifest does not declare endpoints.audit.');
  if (!url) return RESULTS;

  let res;
  let body = null;
  try {
    res = await fetch(`${url}?limit=10`, { headers: { accept: 'application/json' } });
    if (res.ok) body = await res.json();
  } catch (err) {
    rec('audit-log-reachable', false, err.message);
    return RESULTS;
  }
  rec('audit-log-reachable', !!res && res.ok, res ? `HTTP ${res.status}` : null);
  if (!body) return RESULTS;

  const list = Array.isArray(body) ? body : (Array.isArray(body.receipts) ? body.receipts : []);
  if (list.length < 2) {
    rec('audit-log-has-receipts', list.length >= 1, list.length ? null : 'audit endpoint returned no receipts');
    rec('audit-log-chain-not-applicable', true, 'Fewer than 2 receipts available; chain assertion deferred.');
    return RESULTS;
  }

  // Receipts in chronological order. Each receipt[i+1].previous_receipt_hash
  // must equal sha256 of canonical receipt[i] (excluding the field itself).
  const sorted = list.slice().sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));
  let chainOk = true;
  let badAt = -1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const declared = cur.previous_receipt_hash || (cur.audit && cur.audit.previous_receipt_hash);
    if (typeof declared !== 'string' || declared.length === 0) { chainOk = false; badAt = i; break; }
    const canonical = JSON.stringify(prev, Object.keys(prev).filter((k) => k !== 'signature').sort());
    const expected = 'sha256:' + crypto.createHash('sha256').update(canonical).digest('hex');
    // Accept either bare hex or sha256: prefix.
    const matches = declared === expected
      || declared === expected.replace('sha256:', '')
      || declared.endsWith(expected.replace('sha256:', ''));
    if (!matches) { chainOk = false; badAt = i; break; }
  }
  rec('audit-log-hash-chain-intact', chainOk, chainOk ? null : `chain breaks at index ${badAt}`);

  return RESULTS;
}

module.exports = { run };
