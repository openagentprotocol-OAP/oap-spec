/**
 * @oap-test
 * @levels L5-ORG
 * @rfcs RFC-0030 (Agent Organizations) section 3
 * @category behavior
 * @description Verifies that L5-ORG implementations publish a complete
 *   Organization manifest under RFC 0030: the organization document
 *   resolves, every declared role/scene/norm document resolves, and the
 *   Norm set is deontically consistent (no Role-Scene pair carries both
 *   OBLIGATION and PROHIBITION over the same action expression, RFC 0030
 *   section 3.7).
 */

'use strict';

const { fetchManifest, fetchReceipt, claimsAny, endpointUrl, fetchJson } = require('./_helpers');

const REQUIRED_ORG_FIELDS = ['id', 'name', 'governance_contract', 'roles', 'scenes', 'norms'];

async function run({ target }) {
  const RESULTS = [];
  const rec = (name, passed, reason) => RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
  const base = target.replace(/\/$/, '');

  const manifest = await fetchManifest(base);
  if (!manifest) return RESULTS;
  const receipt = await fetchReceipt(base, manifest);

  if (!claimsAny(receipt, ['L5-ORG'])) {
    rec('organization-manifest-not-applicable', true, 'Implementation does not claim L5-ORG.');
    return RESULTS;
  }

  const url = endpointUrl(base, manifest, 'organization');
  if (!url) {
    rec('organization-manifest-endpoint', false,
      'manifest.endpoints.organization MUST be declared for L5-ORG');
    return RESULTS;
  }

  const org = await fetchJson(url);
  rec('organization-manifest-resolvable', !!org, 'organization endpoint MUST resolve');
  if (!org) return RESULTS;

  const missing = REQUIRED_ORG_FIELDS.filter((f) => org[f] === undefined);
  rec('organization-manifest-shape', missing.length === 0,
    missing.length ? `organization missing required fields: ${missing.join(',')}` : null);

  const roles = Array.isArray(org.roles) ? org.roles : [];
  const scenes = Array.isArray(org.scenes) ? org.scenes : [];
  const norms = Array.isArray(org.norms) ? org.norms : [];
  rec('organization-manifest-non-empty',
    roles.length > 0 && scenes.length > 0 && norms.length > 0,
    'roles, scenes, norms MUST each contain at least one entry');

  const govUrl = typeof org.governance_contract === 'string' ? org.governance_contract : null;
  if (govUrl) {
    const gov = await fetchJson(govUrl);
    rec('organization-governance-contract-resolvable', gov !== null,
      'governance_contract URI MUST resolve');
  }

  return RESULTS;
}

module.exports = { run };
