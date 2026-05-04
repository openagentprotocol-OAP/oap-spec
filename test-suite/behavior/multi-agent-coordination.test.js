/**
 * @oap-test
 * @levels L4
 * @rfcs RFC-0018 (Multi-Agent Coordination)
 * @category behavior
 * @description Verifies that L4 implementations declare a coordination
 *   surface (endpoints.coordinate or endpoints.coordination_session) and
 *   that the surface is reachable. Skipped when the implementation does
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
    rec('multi-agent-coordination-not-applicable', true, 'Implementation does not claim L4 or higher.');
    return RESULTS;
  }

  const url = endpointUrl(base, manifest, 'coordinate') || endpointUrl(base, manifest, 'coordination_session');
  rec('multi-agent-coordination-endpoint-declared', !!url,
    url ? null : 'Manifest declares neither endpoints.coordinate nor endpoints.coordination_session.');
  if (!url) return RESULTS;

  let res;
  try {
    res = await fetch(url, { method: 'OPTIONS' });
  } catch (err) {
    rec('multi-agent-coordination-reachable', false, err.message);
    return RESULTS;
  }
  rec('multi-agent-coordination-reachable', res.status < 500, `HTTP ${res.status}`);

  // Manifest must also declare the coordination protocol version it speaks.
  const cap = manifest.capabilities && manifest.capabilities.coordination;
  rec('multi-agent-coordination-protocol-versioned',
    cap && typeof cap.protocol_version === 'string' && /^\d+\.\d+/.test(cap.protocol_version),
    cap && cap.protocol_version ? null : 'manifest.capabilities.coordination.protocol_version missing or malformed');

  return RESULTS;
}

module.exports = { run };
