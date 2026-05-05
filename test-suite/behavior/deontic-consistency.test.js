/**
 * @oap-test
 * @levels L5-ORG
 * @rfcs RFC-0030 (Agent Organizations) section 3.5, section 3.7
 * @category behavior
 * @description Verifies that no Role-Scene pair in the Organization carries
 *   a Norm with `deontic = OBLIGATION` and another Norm with
 *   `deontic = PROHIBITION` over the same `action_expression`. This is the
 *   deontic consistency requirement of RFC 0030 section 3.7. Implementations
 *   that fail this probe have published an unenforceable normative system.
 */

'use strict';

const { fetchManifest, fetchReceipt, claimsAny, endpointUrl, fetchJson } = require('./_helpers');

async function run({ target }) {
  const RESULTS = [];
  const rec = (name, passed, reason) => RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
  const base = target.replace(/\/$/, '');

  const manifest = await fetchManifest(base);
  if (!manifest) return RESULTS;
  const receipt = await fetchReceipt(base, manifest);

  if (!claimsAny(receipt, ['L5-ORG'])) {
    rec('deontic-consistency-not-applicable', true, 'Implementation does not claim L5-ORG.');
    return RESULTS;
  }

  const normsUrl = endpointUrl(base, manifest, 'organization_norms');
  if (!normsUrl) {
    rec('deontic-consistency-endpoint', false,
      'manifest.endpoints.organization_norms MUST be declared for L5-ORG');
    return RESULTS;
  }

  const list = await fetchJson(normsUrl);
  if (!Array.isArray(list)) {
    rec('deontic-consistency-shape', false, 'organization_norms MUST return a JSON array of Norm documents');
    return RESULTS;
  }

  const byKey = new Map();
  for (const n of list) {
    if (!n || typeof n.scene !== 'string' || typeof n.role !== 'string') continue;
    const action = (n.action_expression && JSON.stringify(n.action_expression)) || '';
    const key = `${n.scene}::${n.role}::${action}`;
    if (!byKey.has(key)) byKey.set(key, new Set());
    byKey.get(key).add(n.deontic);
  }

  const conflicts = [];
  for (const [key, deontics] of byKey.entries()) {
    if (deontics.has('OBLIGATION') && deontics.has('PROHIBITION')) conflicts.push(key);
  }

  rec('deontic-consistency-no-obligation-prohibition-overlap', conflicts.length === 0,
    conflicts.length ? `deontic conflict on ${conflicts.length} (role,scene,action) tuples: ${conflicts.slice(0, 3).join('; ')}` : null);

  const validDeontic = list.every((n) => !n || ['OBLIGATION', 'PROHIBITION', 'PERMISSION'].includes(n.deontic));
  rec('deontic-consistency-operator-domain', validDeontic,
    'every Norm.deontic MUST be one of OBLIGATION|PROHIBITION|PERMISSION');

  return RESULTS;
}

module.exports = { run };
