'use strict';

/**
 * ROTATE stub (Rahman, Cui, Stone 2024).
 *
 * Reference STUB. ROTATE provides coverage robustness through adversarial
 * teammate generation during training. The stub records the worst-case
 * teammate type encountered in the posterior as a coverage indicator and
 * selects an action that hedges against that type.
 */

function policy(history, posterior) {
  const peers = Object.keys(posterior || {});
  let minProbType = null;
  let minProb = Infinity;
  for (const peerDid of peers) {
    const post = posterior[peerDid];
    for (const th of Object.keys(post)) {
      if (post[th] < minProb) { minProb = post[th]; minProbType = th; }
    }
  }
  return {
    kind: 'rotate_action',
    coverage_hedge_against_type: minProbType,
    coverage_min_posterior_mass: minProb === Infinity ? 0 : minProb,
    history_len: (history || []).length,
  };
}

module.exports = {
  policyClass: 'ROTATE',
  assumptions: ['adversarial_teammate_generation_in_training', 'coverage_robustness'],
  policy,
};
