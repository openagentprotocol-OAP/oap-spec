/**
 * @oap-test
 * @levels L4
 * @rfcs RFC-0027 section 3.4.1 (Tier 1 Convention Discovery, Theorem A.1)
 * @category behavior
 * @description Verifies that the Tier 1 explicit Convention Discovery
 *   handshake selects the lex-first Convention from the Schelling reduction
 *   over published Convention Spaces, terminates within |N|+1 rounds, and
 *   emits a signed ConventionReceipt.
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
  if (!aht.supported || !(aht.convention_discovery_v1 || aht.convention_discovery_v2)) {
    rec('ad-hoc-tier1-not-applicable', true, 'Implementation does not declare convention_discovery_v1 or v2.');
    return RESULTS;
  }
  if (!claimsAny(receipt, ['L4', 'L5'])) {
    rec('ad-hoc-tier1-not-applicable', true, 'Implementation does not claim L4 or higher.');
    return RESULTS;
  }

  const ep = (manifest.endpoints && manifest.endpoints.convention_propose) || '/oap/aht/convention/propose';
  const url = ep.startsWith('http') ? ep : `${base}${ep}`;

  // Two publishers with overlapping spaces; lex-first of intersection {B,D} is {rule:"B"}.
  const body = {
    context: { context_type: 'session', context_id: 'probe-tier1' },
    convention_spaces: [
      { did: 'did:web:peer-a', space: [{ rule: 'A' }, { rule: 'B' }, { rule: 'D' }] },
      { did: 'did:web:peer-b', space: [{ rule: 'B' }, { rule: 'C' }, { rule: 'D' }] },
    ],
  };

  const t0 = Date.now();
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch((e) => ({ ok: false, _err: e.message }));
  const elapsed = Date.now() - t0;
  rec('tier1-endpoint-reachable', r.ok, r.ok ? null : `HTTP ${r.status || '?'}${r._err ? ' ' + r._err : ''}`);
  if (!r.ok) return RESULTS;

  const j = await r.json().catch(() => null);
  rec('tier1-emits-convention-receipt', !!(j && j.type === 'convention' && j.tier_used && j.convention),
    j ? null : 'No ConventionReceipt returned.');
  rec('tier1-selects-lex-first-of-intersection',
    !!(j && j.convention && j.convention.rule === 'B'),
    j ? `Got rule=${j.convention?.rule}, expected "B" (lex-first of intersection {B,D}).` : 'no body');
  rec('tier1-bounded-rounds', elapsed < 5000,
    `Tier 1 took ${elapsed}ms; bounded-round assertion of Theorem A.1 expects single-digit RTTs.`);

  const validate = ajv && ajv.getSchema && ajv.getSchema('https://openagentprotocol.eu/schemas/v1.0/oap-convention-receipt.schema.json');
  if (validate && j) {
    const ok = validate(j);
    rec('tier1-receipt-schema-valid', !!ok, ok ? null : JSON.stringify(validate.errors).slice(0, 300));
  }

  // Empty intersection -> convention_failed (HTTP 409) when no observable peers.
  const failBody = {
    context: { context_type: 'session', context_id: 'probe-tier1-fail' },
    convention_spaces: [
      { did: 'did:web:peer-a', space: [{ rule: 'A' }] },
      { did: 'did:web:peer-b', space: [{ rule: 'Z' }] },
    ],
  };
  const r2 = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(failBody) }).catch(() => null);
  rec('tier1-empty-intersection-fails', !!(r2 && r2.status === 409),
    r2 ? `HTTP ${r2.status}` : 'no response');

  return RESULTS;
}

module.exports = { run };
