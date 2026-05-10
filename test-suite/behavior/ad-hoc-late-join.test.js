/**
 * @oap-test
 * @levels L4
 * @rfcs RFC-0027 section 3.3 (Late Join Procedure)
 * @category behavior
 * @description Verifies that an L4 implementation declaring
 *   ad_hoc_teamwork.late_join_modes including capability_match exposes a
 *   working late-join endpoint that emits a signed LateJoinReceipt for
 *   matched capabilities and rejects unmatched ones.
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
  if (!aht.supported || !(Array.isArray(aht.late_join_modes) && aht.late_join_modes.includes('capability_match'))) {
    rec('ad-hoc-late-join-not-applicable', true, 'Implementation does not declare capability_match late-join mode.');
    return RESULTS;
  }
  if (!claimsAny(receipt, ['L4', 'L5'])) {
    rec('ad-hoc-late-join-not-applicable', true, 'Implementation does not claim L4 or higher.');
    return RESULTS;
  }

  const ep = (manifest.endpoints && manifest.endpoints.late_join) || '/oap/aht/late-join';
  const url = ep.startsWith('http') ? ep : `${base}${ep}`;

  const matchedAnnouncement = {
    schema: 'oap.capability.v1',
    agent_did: 'did:web:probe-late-joiner',
    context: { context_type: 'session', context_id: 'probe-ses-2' },
    capabilities: [{ action: 'fulfillment.ship.parcel', schema_ref: 'https://example.org/schemas/ship.json' }],
    evidence: { manifest_url: 'https://probe-late-joiner.example/oap/manifest' },
    signature: 'probe-sig',
  };
  const unmatchedAnnouncement = {
    ...matchedAnnouncement,
    agent_did: 'did:web:probe-unmatched',
    capabilities: [{ action: 'unrecognized.action.foo', schema_ref: 'https://example.org/schemas/foo.json' }],
  };

  const r1 = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context: { context_type: 'session', context_id: 'probe-ses-2' },
      capability_announcement: matchedAnnouncement,
    }),
  }).catch((e) => ({ ok: false, status: 0, _err: e.message }));

  rec('late-join-matched-admitted', r1.ok, r1.ok ? null : `HTTP ${r1.status}${r1._err ? ' ' + r1._err : ''}`);

  if (r1.ok) {
    const body = await r1.json().catch(() => null);
    rec('late-join-emits-receipt', !!(body && body.type === 'late_join' && Array.isArray(body.signatures) && body.signatures.length > 0),
      body ? null : 'No signed LateJoinReceipt returned.');
    rec('late-join-monotonic-index', typeof body?.monotonic_admission_index === 'number',
      body ? null : 'monotonic_admission_index missing or not numeric.');

    const validate = ajv && ajv.getSchema && ajv.getSchema('https://openagentprotocol.eu/schemas/v1.0/oap-late-join-receipt.schema.json');
    if (validate && body) {
      const ok = validate(body);
      rec('late-join-receipt-schema-valid', !!ok, ok ? null : JSON.stringify(validate.errors).slice(0, 300));
    }
  }

  const r2 = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context: { context_type: 'session', context_id: 'probe-ses-2' },
      capability_announcement: unmatchedAnnouncement,
    }),
  }).catch(() => null);
  rec('late-join-rejects-unmatched', !!(r2 && r2.status >= 400 && r2.status < 500),
    r2 ? `HTTP ${r2.status}` : 'no response');

  return RESULTS;
}

module.exports = { run };
