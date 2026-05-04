/**
 * @oap-test
 * @levels L2
 * @rfcs RFC-0014 (Commerce Primitives), RFC-0024 (Refund and Cooling-Off)
 * @category behavior
 * @description Verifies that L2 implementations either declare a refund
 *   endpoint OR mark every paid Action with a refund window. Skipped when
 *   the implementation does not claim L2 or higher.
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

  if (!claimsAny(receipt, ['L2', 'L3', 'L4', 'L5'])) {
    rec('refund-not-applicable', true, 'Implementation does not claim L2 or higher. Refund surface not required.');
    return RESULTS;
  }

  const actions = Array.isArray(manifest.actions) ? manifest.actions : [];
  const paid = actions.filter((a) => a.cost && a.cost.type && a.cost.type !== 'free');

  // If no paid actions exist at all, refund semantics are vacuously satisfied.
  if (paid.length === 0) {
    rec('refund-no-paid-actions', true, 'Manifest declares no paid Actions; refund obligations vacuously satisfied.');
    return RESULTS;
  }

  const refundUrl = endpointUrl(base, manifest, 'refund');
  if (refundUrl) {
    let res;
    try {
      res = await fetch(refundUrl, { method: 'OPTIONS' });
    } catch (err) {
      rec('refund-endpoint-reachable', false, err.message);
      return RESULTS;
    }
    // Accept any non-5xx response on OPTIONS as proof the route exists.
    rec('refund-endpoint-reachable', res.status < 500, `HTTP ${res.status}`);
  } else {
    // No endpoint: every paid Action MUST self-describe a refund window.
    const missing = paid.filter((a) => {
      const c = a.cost || {};
      const hasWindow = typeof c.refund_window_hours === 'number' && c.refund_window_hours >= 0;
      const explicitlyNonRefundable = c.refundable === false && typeof c.non_refundable_reason === 'string';
      return !(hasWindow || explicitlyNonRefundable);
    });
    rec('refund-paid-actions-declare-window', missing.length === 0,
      missing.length
        ? `Paid actions without refund_window_hours and without explicit non_refundable_reason: ${missing.map((a) => a.id).join(', ')}`
        : null);
  }

  return RESULTS;
}

module.exports = { run };
