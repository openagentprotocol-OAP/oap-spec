'use strict';

/**
 * PLASTIC stub (Barrett, Stone, Kraus 2011; Barrett, Stone 2015).
 *
 * Reference STUB. Production OAP Agents substitute a trained PLASTIC policy
 * over the implementer's domain. The stub satisfies the Fallback Policy
 * interface contract: policy(history, posterior) -> action.
 *
 * PLASTIC's defining behavior: select the action that maximizes expected
 * payoff under the *Bayesian model* of teammate type, using the prior over
 * known teammate types from previous teams. The stub's payoff model is a
 * uniform-coordination heuristic over the maximum-a-posteriori type.
 */

function policy(history, posterior) {
  const peers = Object.keys(posterior || {});
  const typeCounts = {};
  for (const peerDid of peers) {
    const post = posterior[peerDid];
    let bestType = null;
    let bestProb = -Infinity;
    for (const th of Object.keys(post)) {
      if (post[th] > bestProb) { bestProb = post[th]; bestType = th; }
    }
    typeCounts[bestType] = (typeCounts[bestType] || 0) + 1;
  }
  const dominant = Object.keys(typeCounts).sort((a, b) => typeCounts[b] - typeCounts[a])[0] || 'unknown';
  return {
    kind: 'plastic_action',
    bayesian_target_type: dominant,
    history_len: (history || []).length,
    transferred_from_prior_teams: true,
  };
}

module.exports = {
  policyClass: 'PLASTIC',
  assumptions: ['bayesian_type_prior_over_known_teammates', 'transfer_from_prior_teams'],
  policy,
};
