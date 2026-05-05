/**
 * @oap-test
 * @levels L1, L2, L3, L4, L5, L5-FINANCE
 * @rfcs RFC-0011 (Sybil Resistance), RFC-0029 (Axiomatic Foundations) Theorem B.1, RFC-0019 section 8 adversarial category
 * @category behavior/adversarial
 * @description Sybil Identity Creation. Attempts to register a fresh
 *   sub-agent identity with no Reputation history and no Stake, and
 *   verifies that the Implementation either rejects the registration or
 *   admits it with influence bounded by the RFC 0029 Theorem B.1 cap.
 *   A conformant Implementation MUST NOT grant a fresh identity influence
 *   above the operational threshold declared in the Manifest under
 *   `sybil_resistance.fresh_identity_influence_cap`.
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
  if (!claimsAny(receipt, ['L1', 'L2', 'L3', 'L4', 'L5', 'L5-FINANCE'])) {
    rec('adversarial-sybil-creation-not-applicable', true, 'No claimed level requires sybil resistance.');
    return RESULTS;
  }

  const cap = manifest && manifest.sybil_resistance && manifest.sybil_resistance.fresh_identity_influence_cap;
  rec('adversarial-sybil-creation-cap-declared', typeof cap === 'number' && cap >= 0 && cap <= 1,
    `manifest.sybil_resistance.fresh_identity_influence_cap MUST be a number in [0,1] (RFC 0029 Theorem B.1), got ${JSON.stringify(cap)}`);

  const url = endpointUrl(base, manifest, 'sub_agent_register');
  if (!url) {
    rec('adversarial-sybil-creation-endpoint', true,
      'No sub_agent_register endpoint declared; sybil-creation surface absent.');
    return RESULTS;
  }

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sub_agent_did: 'did:web:fresh-' + Date.now() + '.adversarial.example',
        stake: 0,
        reputation_history: [],
      }),
    });
  } catch (err) {
    rec('adversarial-sybil-creation-endpoint-reachable', false, `sub_agent_register unreachable: ${err.message}`);
    return RESULTS;
  }

  if (res.status >= 400 && res.status < 500) {
    rec('adversarial-sybil-creation-rejected', true,
      'Implementation rejects fresh stake-less identity (acceptable defense).');
    return RESULTS;
  }

  const body = await res.json().catch(() => null);
  const grantedInfluence = body && typeof body.granted_influence === 'number' ? body.granted_influence : null;
  rec('adversarial-sybil-creation-influence-bounded',
    typeof cap === 'number' && grantedInfluence !== null && grantedInfluence <= cap,
    grantedInfluence === null
      ? 'Response MUST report granted_influence so the bound can be verified'
      : `granted_influence ${grantedInfluence} exceeds declared fresh_identity_influence_cap ${cap}`);

  return RESULTS;
}

module.exports = { run };
