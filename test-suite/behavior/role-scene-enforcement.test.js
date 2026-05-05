/**
 * @oap-test
 * @levels L5-ORG
 * @rfcs RFC-0030 (Agent Organizations) section 3.4, section 4
 * @category behavior
 * @description Verifies that L5-ORG implementations respect Role-Scene
 *   participation rules. The probe submits an interaction in a Scene
 *   declared in the Organization manifest under a Role that the Scene
 *   marks `necessity = required`, with the required Role missing, and
 *   verifies that the interaction is rejected.
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

  if (!claimsAny(receipt, ['L5-ORG'])) {
    rec('role-scene-enforcement-not-applicable', true, 'Implementation does not claim L5-ORG.');
    return RESULTS;
  }

  const url = endpointUrl(base, manifest, 'scene_open');
  if (!url) {
    rec('role-scene-enforcement-endpoint', false,
      'manifest.endpoints.scene_open MUST be declared for L5-ORG so the probe can attempt to open a Scene with a missing required Role');
    return RESULTS;
  }

  const probeSceneId = manifest.organization_test_scene_id || 'probe-scene';
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scene: probeSceneId,
        participants: [],
        omit_required_roles: true,
      }),
    });
  } catch (err) {
    rec('role-scene-enforcement-endpoint-reachable', false, `scene_open unreachable: ${err.message}`);
    return RESULTS;
  }

  rec('role-scene-enforcement-required-role-rejected',
    res.status >= 400 && res.status < 500,
    `Scene open with missing required Roles MUST be rejected per RFC 0030 section 3.4, got ${res.status}`);

  return RESULTS;
}

module.exports = { run };
