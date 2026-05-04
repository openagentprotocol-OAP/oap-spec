/**
 * @oap-test
 * @levels L2
 * @rfcs RFC-0014 (Commerce Primitives)
 * @category behavior
 * @description Verifies that an implementation claiming L2 declares and
 *   honors a working Subscription endpoint. Skipped (empty result set) when
 *   the implementation's Conformance Receipt does not claim L2 or L2-NC.
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
    rec('subscribe-not-applicable', true, 'Implementation does not claim L2 or higher. RFC 0014 subscribe surface not required.');
    return RESULTS;
  }

  const url = endpointUrl(base, manifest, 'subscribe');
  rec('subscribe-endpoint-declared', !!url, url ? null : 'Manifest does not declare endpoints.subscribe.');
  if (!url) return RESULTS;

  const principalDid = 'did:web:probe-subscribe.example';
  let createRes;
  let body = null;
  try {
    createRes = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ principal_did: principalDid, tier: 'free' }),
    });
    if (createRes.ok) body = await createRes.json();
  } catch (err) {
    rec('subscribe-create-reachable', false, err.message);
    return RESULTS;
  }
  rec('subscribe-create-reachable', !!createRes && createRes.ok, createRes ? `HTTP ${createRes.status}` : null);
  if (!body) return RESULTS;

  rec('subscribe-create-returns-id', typeof body.subscription_id === 'string' && body.subscription_id.length > 0,
    body.subscription_id ? null : 'response missing subscription_id');
  rec('subscribe-create-returns-active', body.status === 'active',
    body.status === 'active' ? null : `expected status='active', got ${JSON.stringify(body.status)}`);
  rec('subscribe-create-returns-token', typeof body.subscription_token === 'string' && body.subscription_token.length > 0,
    body.subscription_token ? null : 'response missing subscription_token (RFC 0014 section 5)');

  if (body.subscription_id) {
    let cancelRes;
    try {
      cancelRes = await fetch(`${url}/${encodeURIComponent(body.subscription_id)}`, { method: 'DELETE' });
    } catch (err) {
      rec('subscribe-cancel-reachable', false, err.message);
      return RESULTS;
    }
    rec('subscribe-cancel-reachable', cancelRes.ok, cancelRes.ok ? null : `HTTP ${cancelRes.status}`);
    if (cancelRes.ok) {
      const cancelBody = await cancelRes.json().catch(() => null);
      rec('subscribe-cancel-status-canceled', cancelBody && cancelBody.status === 'canceled',
        cancelBody && cancelBody.status === 'canceled' ? null : 'cancel response did not report status=canceled');
    }
  }

  return RESULTS;
}

module.exports = { run };
