/**
 * @oap-test
 * @levels L4
 * @rfcs RFC-0027 section 3.2 (Capability Announcement schema and Manifest cross-check)
 * @category behavior
 * @description Verifies that an L4 implementation declaring
 *   ad_hoc_teamwork.capability_announcement_v1 = true exposes a working
 *   capability-announcement endpoint that accepts a schema-valid
 *   announcement and returns a canonical hash.
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
  if (!aht.supported || !aht.capability_announcement_v1) {
    rec('ad-hoc-capability-announcement-not-applicable', true, 'Implementation does not declare capability_announcement_v1.');
    return RESULTS;
  }
  if (!claimsAny(receipt, ['L4', 'L5'])) {
    rec('ad-hoc-capability-announcement-not-applicable', true, 'Implementation does not claim L4 or higher.');
    return RESULTS;
  }

  const ep = (manifest.endpoints && manifest.endpoints.capability_announcement) || '/oap/aht/capability-announcement';
  const url = ep.startsWith('http') ? ep : `${base}${ep}`;

  const announcement = {
    schema: 'oap.capability.v1',
    agent_did: 'did:web:probe-agent',
    context: { context_type: 'session', context_id: 'probe-ses-1' },
    capabilities: [
      { action: 'fulfillment.ship.parcel', schema_ref: 'https://example.org/schemas/ship-parcel.v1.json' },
    ],
    evidence: { manifest_url: 'https://probe-agent.example/oap/manifest' },
    signature: 'probe-stub-signature',
  };

  // Schema validation locally.
  const validate = ajv && ajv.getSchema && ajv.getSchema('https://openagentprotocol.eu/schemas/v1.0/oap-capability-announcement.schema.json');
  if (validate) {
    const ok = validate(announcement);
    rec('capability-announcement-schema-valid', !!ok, ok ? null : JSON.stringify(validate.errors));
  }

  let r;
  try {
    r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(announcement) });
  } catch (err) {
    rec('capability-announcement-endpoint-reachable', false, `fetch failed: ${err.message}`);
    return RESULTS;
  }
  rec('capability-announcement-endpoint-reachable', r.ok, r.ok ? null : `HTTP ${r.status}`);
  if (!r.ok) return RESULTS;

  const body = await r.json().catch(() => null);
  rec('capability-announcement-returns-hash', !!(body && body.accepted && /^sha256:[a-f0-9]{64}$/.test(body.capability_announcement_hash || '')),
    body ? null : 'Response not JSON or missing hash.');

  // Negative: invalid announcement (missing capabilities).
  const bad = { ...announcement, capabilities: [] };
  const r2 = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bad) }).catch(() => null);
  rec('capability-announcement-rejects-invalid', !!(r2 && (r2.status >= 400 && r2.status < 500)), r2 ? `HTTP ${r2.status}` : 'no response');

  return RESULTS;
}

module.exports = { run };
