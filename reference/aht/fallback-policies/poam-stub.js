'use strict';

/**
 * POAM stub (Wang, Rahman, Xiao, Liu, Stone, Niekum 2024).
 *
 * This is a reference STUB, not a trained POAM policy. Its sole purpose is to
 * provide a deterministic action selector for the unilateral-adoption probe
 * (RFC 0027 section 7). A production OAP Agent would substitute this with a
 * compiled POAM policy whose declared assumptions match the Manifest field
 * `aht_fallback_policy.assumptions`.
 *
 * The stub implements the interface contract:
 *   policy(history, posterior) -> action
 *
 * where `posterior` is the per-peer Tier 2 posterior from RFC 0027 section
 * 3.4.2 and `history` is the observed action sequence in the current context.
 */

function policy(history, posterior) {
  // Maximum a posteriori type per peer.
  const peerTypes = {};
  for (const peerDid of Object.keys(posterior || {})) {
    const post = posterior[peerDid];
    let bestType = null;
    let bestProb = -Infinity;
    for (const th of Object.keys(post)) {
      if (post[th] > bestProb) {
        bestProb = post[th];
        bestType = th;
      }
    }
    peerTypes[peerDid] = bestType;
  }
  // Stub action: emit a coordination probe targeting the most common inferred type.
  const counts = {};
  for (const t of Object.values(peerTypes)) counts[t] = (counts[t] || 0) + 1;
  const dominantType = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || 'unknown';
  return {
    kind: 'coordination_probe',
    target_type: dominantType,
    history_len: (history || []).length,
  };
}

module.exports = {
  policyClass: 'POAM',
  assumptions: ['stationary_teammates', 'fully_observable_state', 'type_space_realizable'],
  policy,
};
