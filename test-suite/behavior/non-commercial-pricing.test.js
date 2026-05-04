/**
 * @oap-test
 * @levels L1-NC, L3-NC
 * @rfcs RFC-0025 (Non-Commercial Profile)
 * @category behavior
 * @description Verifies the Non-Commercial Profile invariants per RFC-0025:
 *   1. EVERY declared Action MUST have cost.type === 'free'
 *   2. The implementation MUST publish a Conformance Receipt declaring
 *      profile = 'non-commercial' and a revenue.source from the allowed set
 *      {byok, self-hosted, grant, donation, sponsorship}.
 */

const ALLOWED_SOURCES = new Set(['byok', 'self-hosted', 'grant', 'donation', 'sponsorship']);

const RESULTS = [];
function record(name, passed, reason) {
  RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
}

async function run({ target }) {
  RESULTS.length = 0;
  const base = target.replace(/\/$/, '');

  let manifest;
  try {
    manifest = await (await fetch(`${base}/.well-known/oap-tool.json`)).json();
  } catch (err) {
    record('nc-manifest-fetch', false, err.message);
    return RESULTS.slice();
  }

  // 1. All Actions must be free
  const actions = Array.isArray(manifest.actions) ? manifest.actions : [];
  if (!actions.length) {
    record('nc-actions-declared', false, 'No actions in manifest');
    return RESULTS.slice();
  }
  const nonFree = actions.filter((a) => !a.cost || a.cost.type !== 'free');
  record('nc-all-actions-free', nonFree.length === 0,
    nonFree.length ? `Actions with non-free cost: ${nonFree.map((a) => a.id).join(', ')}` : null);

  // 2. Conformance Receipt must declare non-commercial + valid revenue source.
  // Try the canonical static receipt first, then fall back to the runtime
  // self-attestation endpoint declared in the manifest.
  let receipt = null;
  const candidates = [
    `${base}/oap-conformance-receipt.json`,
    manifest.endpoints && manifest.endpoints.conformance_receipt
      ? (manifest.endpoints.conformance_receipt.startsWith('http')
          ? manifest.endpoints.conformance_receipt
          : `${base}${manifest.endpoints.conformance_receipt}`)
      : `${base}/api/oap/conformance-receipt`,
  ];
  for (const u of candidates) {
    try {
      const r = await fetch(u);
      if (r.ok) { receipt = await r.json(); break; }
    } catch { /* try next */ }
  }

  if (!receipt) {
    record('nc-conformance-receipt-served', false, 'No Conformance Receipt found at any candidate URL');
    return RESULTS.slice();
  }
  record('nc-conformance-receipt-served', true);

  // The Non-Commercial Profile is opt-in. If the implementation does not claim
  // any -NC level in its Conformance Receipt, RFC-0025 simply does not apply
  // and the remaining assertions are reported as not applicable.
  const claimedLevels = receipt.claimed_levels
    || (receipt.conformance_level ? [receipt.conformance_level] : []);
  const claimsNc = Array.isArray(claimedLevels)
    && claimedLevels.some((l) => typeof l === 'string' && l.endsWith('-NC'));

  if (!claimsNc) {
    record('nc-not-applicable', true,
      `Implementation does not claim any -NC level (claimed: ${JSON.stringify(claimedLevels)}). RFC-0025 does not apply.`);
    return RESULTS.slice();
  }

  const profile = receipt.profile || (receipt.declared && receipt.declared.profile);
  record('nc-receipt-profile-non-commercial', profile === 'non-commercial',
    `expected profile='non-commercial', got '${profile}'`);

  const revenue = receipt.revenue || (receipt.declared && receipt.declared.revenue);
  const source = revenue && revenue.source;
  record('nc-receipt-revenue-source-valid', ALLOWED_SOURCES.has(source),
    source ? `source '${source}' not in {${[...ALLOWED_SOURCES].join(', ')}}` : 'revenue.source missing');

  record('nc-receipt-claims-nc-level', true);

  return RESULTS.slice();
}

module.exports = { run };
