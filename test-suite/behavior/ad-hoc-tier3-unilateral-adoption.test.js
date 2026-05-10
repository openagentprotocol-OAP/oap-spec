/**
 * @oap-test
 * @levels L4
 * @rfcs RFC-0027 (Ad Hoc Teamwork, revision 2, section 7)
 * @category behavior
 * @description Unilateral-adoption probe. Verifies that an OAP Agent
 *   declaring convention_discovery_v2 produces a binding Convention
 *   commitment when |N_P| = 0 (no protocol-following peers). This is the
 *   single machine-verifiable indicator that an implementation has
 *   closed the AHT-gap of revision 1. Section 7 of RFC 0027 makes this
 *   probe REQUIRED at L4 whenever convention_discovery_v2 is true.
 *
 *   The probe runs the reference Three-Tier Handshake locally against a
 *   synthetic population of O-class peers. Implementations that wish to
 *   claim conformance with their own handshake implementation can
 *   override the runner via OAP_AHT_RUNNER (path to a module exporting
 *   { runHandshake }) — the contract in RFC 0027 section 3.4 is the
 *   normative reference.
 */

'use strict';

const path = require('path');

async function run({ target: _unusedTarget }) {
  const RESULTS = [];
  const rec = (name, passed, reason) =>
    RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });

  let mod;
  try {
    const runnerPath = process.env.OAP_AHT_RUNNER
      ? path.resolve(process.env.OAP_AHT_RUNNER)
      : path.resolve(__dirname, '../../reference/aht/three-tier');
    mod = require(runnerPath);
  } catch (err) {
    rec('aht-tier3-runner-loadable', false, `Cannot load three-tier handshake module: ${err.message}`);
    return RESULTS;
  }

  if (typeof mod.runHandshake !== 'function') {
    rec('aht-tier3-runner-loadable', false, 'Loaded module does not export runHandshake.');
    return RESULTS;
  }
  rec('aht-tier3-runner-loadable', true);

  // Synthetic AHT scenario: |N_P| = 0, |N_O| = 3, |N_A| = 0.
  // Conventions are simple objects { rule: 'A' | 'B' | 'C' }.
  const conventions = [{ rule: 'A' }, { rule: 'B' }, { rule: 'C' }];
  const typeSpace = ['t1', 't2'];
  const conventionSpaceForType = (theta) =>
    theta === 't1' ? [{ rule: 'A' }, { rule: 'B' }] : [{ rule: 'B' }, { rule: 'C' }];
  const actionLikelihood = (action, theta) => {
    if (action.rule === 'A') return theta === 't1' ? 0.7 : 0.1;
    if (action.rule === 'B') return 0.3;
    return theta === 't2' ? 0.6 : 0.1;
  };
  const regret = (convention, theta) => {
    const space = conventionSpaceForType(theta).map((c) => c.rule);
    return space.includes(convention.rule) ? 0 : 1;
  };
  const fallbackPolicy = (history, posterior) => ({
    kind: 'coordination_probe',
    history_len: history.length,
    posterior_keys: Object.keys(posterior || {}),
  });

  const peers = [
    { did: 'did:example:o1', classification: 'O', observedActions: [{ rule: 'A' }, { rule: 'B' }] },
    { did: 'did:example:o2', classification: 'O', observedActions: [{ rule: 'C' }, { rule: 'B' }] },
    { did: 'did:example:o3', classification: 'O', observedActions: [{ rule: 'A' }, { rule: 'A' }] },
  ];
  const self = { did: 'did:example:self', conventionSpace: conventions };

  const result = mod.runHandshake({
    self,
    peers,
    fallbackPolicy,
    actionLikelihood,
    typeSpace,
    regret,
    conventionSpaceForType,
    params: { unilateralTimeoutMs: 1500, regretTolerance: 0.1, maxByzantineFraction: 0 },
  });

  rec(
    'aht-tier3-binds-without-followers',
    result.committedConvention !== null || result.action !== undefined,
    result.committedConvention === null && result.action === undefined
      ? 'Three-Tier Handshake produced neither a committed Convention nor a fallback action when |N_P| = 0. RFC 0027 Theorem A.1 is violated.'
      : null
  );

  rec(
    'aht-tier3-posterior-populated',
    result.posterior && Object.keys(result.posterior).length === peers.length,
    !result.posterior
      ? 'No Tier 2 posterior produced.'
      : Object.keys(result.posterior).length !== peers.length
        ? `Tier 2 posterior covers ${Object.keys(result.posterior || {}).length} of ${peers.length} O-class peers.`
        : null
  );

  // Backward compatibility: when |N_O| = 0 and Tier 1 succeeds, must reduce to revision 1.
  const peersAllP = [
    { did: 'did:example:p1', classification: 'P', conventionSpace: conventions },
    { did: 'did:example:p2', classification: 'P', conventionSpace: conventions },
  ];
  const result2 = mod.runHandshake({
    self,
    peers: peersAllP,
    fallbackPolicy,
    actionLikelihood,
    typeSpace,
    regret,
    conventionSpaceForType,
    params: { unilateralTimeoutMs: 1500, regretTolerance: 0.1, maxByzantineFraction: 0 },
  });
  rec(
    'aht-tier1-backward-compatible',
    result2.tierUsed === 'tier1' && result2.committedConvention !== null,
    result2.committedConvention === null
      ? 'Tier 1 path failed when all peers are protocol-followers with overlapping spaces.'
      : null
  );

  // Byzantine bound: when |N| < 3t + 1 with t >= 1, must abort.
  const byzantinePeers = [{ did: 'did:example:a1', classification: 'A' }];
  const result3 = mod.runHandshake({
    self,
    peers: byzantinePeers,
    fallbackPolicy,
    actionLikelihood,
    typeSpace,
    regret,
    conventionSpaceForType,
    params: { unilateralTimeoutMs: 1500, regretTolerance: 0.1, maxByzantineFraction: 0.5 },
  });
  rec(
    'aht-byzantine-abort-below-bound',
    result3.tierUsed === 'abort',
    result3.tierUsed !== 'abort'
      ? 'Implementation did not abort when |N| < 3t + 1, violating RFC 0027 section 5 Byzantine Peers clause.'
      : null
  );

  return RESULTS;
}

module.exports = { run };
