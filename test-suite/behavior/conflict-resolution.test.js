/**
 * @oap-test
 * @levels L4
 * @rfcs RFC-0022 (Conflict Resolution)
 * @category behavior
 * @description Verifies that L4 implementations publish a conflict
 *   resolution path: either a dispute_resolution_url that resolves OR a
 *   conflict_resolution endpoint. Skipped when the implementation does
 *   not claim L4 or higher.
 */

'use strict';

const { fetchManifest, fetchReceipt, claimsAny, endpointUrl } = require('./_helpers');

async function run({ target }) {
  const RESULTS = [];
  const rec = (name, passed, reason) => RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
  const base = target.replace(/\/$/, '');

  const manifest = await fetchManifest(base);
  if (!manifest) return RESULTS;
  const receipt = await fetchReceipt(base, manifest);

  if (!claimsAny(receipt, ['L4', 'L5'])) {
    rec('conflict-resolution-not-applicable', true, 'Implementation does not claim L4 or higher.');
    return RESULTS;
  }

  const gov = manifest.governance || {};
  const disputeUrl = typeof gov.dispute_resolution_url === 'string' ? gov.dispute_resolution_url : null;
  const cfEndpoint = endpointUrl(base, manifest, 'conflict_resolution');
  const escalation = typeof gov.escalation_endpoint === 'string' ? gov.escalation_endpoint : null;

  rec('conflict-resolution-path-declared', !!(disputeUrl || cfEndpoint),
    disputeUrl || cfEndpoint
      ? null
      : 'Neither governance.dispute_resolution_url nor endpoints.conflict_resolution declared.');

  if (disputeUrl) {
    let ok = false;
    let status = null;
    try {
      const r = await fetch(disputeUrl, { method: 'HEAD' });
      status = r.status;
      ok = r.status < 400;
    } catch (err) {
      rec('conflict-resolution-dispute-url-reachable', false, err.message);
    }
    if (status !== null) {
      rec('conflict-resolution-dispute-url-reachable', ok, ok ? null : `HTTP ${status}`);
    }
  }

  rec('conflict-resolution-escalation-endpoint-present', !!escalation,
    escalation ? null : 'governance.escalation_endpoint missing (RFC 0022 section 4)');

  return RESULTS;
}

module.exports = { run };
