/**
 * @oap-test
 * @levels L4, L5, L5-FINANCE
 * @rfcs RFC-0017 (Irreversibility and Cooling Off), RFC-0019 section 8 adversarial category
 * @category behavior/adversarial
 * @description Cooling-Off Bypass Through Timestamp Manipulation. Submits a
 *   Withdrawal Receipt whose `submitted_at` is back-dated to before the
 *   end of the cooling-off window, paired with an execution Receipt whose
 *   `executed_at` is forward-dated past the window. A conformant
 *   Implementation MUST detect the contradiction with its own server clock
 *   and reject the bypass.
 */

'use strict';

const { fetchManifest, fetchReceipt, claimsAny, endpointUrl } = require('../_helpers');

async function run({ target }) {
  const RESULTS = [];
  const rec = (name, passed, reason) => RESULTS.push({ name, category: 'behavior/adversarial', passed, reason: reason || null });
  const base = target.replace(/\/$/, '');

  const manifest = await fetchManifest(base);
  if (!manifest) return RESULTS;
  const receipt = await fetchReceipt(base, manifest);
  if (!claimsAny(receipt, ['L4', 'L5', 'L5-FINANCE'])) {
    rec('adversarial-cooling-off-bypass-not-applicable', true, 'Cooling-off applies to L4 and above.');
    return RESULTS;
  }

  const url = endpointUrl(base, manifest, 'cooling_off_verify');
  if (!url) {
    rec('adversarial-cooling-off-bypass-endpoint', false,
      'manifest.endpoints.cooling_off_verify MUST be declared so adversarial probes can submit timestamp-manipulated pairs');
    return RESULTS;
  }

  const now = Date.now();
  const backdated = new Date(now - 1000 * 60 * 60 * 24 * 30).toISOString();
  const forwardDated = new Date(now + 1000 * 60 * 60 * 24 * 30).toISOString();

  const payload = {
    irreversible_action_id: 'adv-' + now,
    withdrawal_receipt: { submitted_at: backdated, claimed_signer: 'did:web:attacker.example' },
    execution_receipt: { executed_at: forwardDated },
  };

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    rec('adversarial-cooling-off-bypass-endpoint-reachable', false, `cooling_off_verify unreachable: ${err.message}`);
    return RESULTS;
  }

  rec('adversarial-cooling-off-bypass-rejected',
    res.status >= 400 && res.status < 500,
    `expected 4xx rejection of timestamp-manipulated cooling-off pair, got ${res.status}`);

  return RESULTS;
}

module.exports = { run };
