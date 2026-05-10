'use strict';

/**
 * AATEAM stub (Chen, Andrejczuk, Cao, Zhang 2020).
 *
 * Reference STUB. AATEAM uses an attention mechanism over the inferred
 * teammate types and selects an action conditioned on the soft-max
 * attention distribution. The stub uses the posterior directly as the
 * attention weights.
 */

function policy(history, posterior) {
  const peers = Object.keys(posterior || {});
  const attention = {};
  let total = 0;
  for (const peerDid of peers) {
    const post = posterior[peerDid];
    for (const th of Object.keys(post)) {
      attention[th] = (attention[th] || 0) + post[th];
      total += post[th];
    }
  }
  const weighted = {};
  for (const th of Object.keys(attention)) weighted[th] = total > 0 ? attention[th] / total : 0;
  return {
    kind: 'aateam_action',
    attention_distribution: weighted,
    history_len: (history || []).length,
  };
}

module.exports = {
  policyClass: 'AATEAM',
  assumptions: ['attention_over_inferred_types'],
  policy,
};
