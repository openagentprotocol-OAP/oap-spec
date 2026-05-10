/**
 * @oap-test
 * @levels L4
 * @rfcs RFC-0027 section 3.4b (Convention Drift Detection)
 * @category behavior
 * @description Verifies that an L4 implementation declaring
 *   ad_hoc_teamwork.convention_inference_v1 = true exposes a drift
 *   reporting endpoint and emits a signed ConventionDriftReceipt for
 *   above-threshold KL divergence.
 */

'use strict';

const { fetchManifest, fetchReceipt, claimsAny } = require('./_helpers');

async function run({ target, ajv }) {
  const RESULTS = [];
  const rec = (name, passed, reason) => RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
  const base = target.replace(/\/$/, '');

  const manifest = await fetchManifest(base);
  if (!manifest) return RESULTS;
  const receipt = await fetchReceipt(base, manifest);

  const aht = manifest.ad_hoc_teamwork || {};
  if (!aht.supported || !aht.convention_inference_v1) {
    rec('ad-hoc-drift-not-applicable', true, 'Implementation does not declare convention_inference_v1.');
    return RESULTS;
  }

  const ep = (manifest.endpoints && manifest.endpoints.convention_drift) || '/oap/aht/convention/drift';
  const url = ep.startsWith('http') ? ep : `${base}${ep}`;

  const body = {
    context: { context_type: 'session', context_id: 'probe-drift' },
    affected_peer_did: 'did:web:drifting-peer',
    kl_divergence: 0.85,
    observation_window_size: 12,
  };
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch((e) => ({ ok: false, _err: e.message }));
  rec('drift-endpoint-reachable', r.ok, r.ok ? null : `HTTP ${r.status || '?'}${r._err ? ' ' + r._err : ''}`);
  if (!r.ok) return RESULTS;

  const j = await r.json().catch(() => null);
  rec('drift-emits-receipt',
    !!(j && j.type === 'convention_drift' && Array.isArray(j.signatures) && j.signatures.length > 0),
    j ? null : 'No signed ConventionDriftReceipt returned.');
  rec('drift-records-kl', typeof j?.kl_divergence === 'number' && j.kl_divergence >= 0,
    j ? null : 'kl_divergence missing or negative.');
  rec('drift-decision-set', j && (j.decision === 're-infer' || j.decision === 'abort'),
    j ? `decision=${j.decision}` : 'no body');

  const validate = ajv && ajv.getSchema && ajv.getSchema('https://openagentprotocol.eu/schemas/v1.0/oap-convention-drift-receipt.schema.json');
  if (validate && j) {
    const ok = validate(j);
    rec('drift-receipt-schema-valid', !!ok, ok ? null : JSON.stringify(validate.errors).slice(0, 300));
  }

  return RESULTS;
}

module.exports = { run };
