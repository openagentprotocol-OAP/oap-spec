'use strict';

/**
 * Reference implementation of the Three-Tier Convention Discovery Handshake
 * (RFC 0027, revision 2, section 3.4).
 *
 * Tier 1: Explicit Convention Discovery (Schelling reduction over publishers).
 * Tier 2: Observational Convention Inference (Bayesian over silent peers).
 * Tier 3: Robust Convention Selection (minimax-regret over joint posterior).
 *
 * This module is normative-by-example: it exists so that conformance probes
 * have a reference behavior to compare implementations against, and so that
 * the unilateral-adoption probe (RFC 0027 section 7) has a working baseline.
 */

const { canonicalizeJson } = require('./canonical');

/**
 * Run the three-tier handshake.
 *
 * @param {Object} opts
 * @param {Object} opts.self                       The Agent's own published Convention Space + DID.
 * @param {Object[]} opts.peers                    Peers. Each peer is one of:
 *                                                  - { did, classification: 'P', conventionSpace: [...] }
 *                                                  - { did, classification: 'O', observedActions: [...] }
 *                                                  - { did, classification: 'A' }
 * @param {Function} opts.fallbackPolicy           AHT Fallback Policy: (history, posterior) -> action.
 * @param {Function} opts.actionLikelihood         (action, theta) -> probability. Required for Tier 2.
 * @param {string[]} opts.typeSpace                Theta. Finite type space for Bayesian inference.
 * @param {Function} opts.regret                   (convention, theta) -> regret in [0, 1].
 * @param {Function} opts.conventionSpaceForType   (theta) -> Convention[]. Models C_j(theta).
 * @param {Object} opts.params
 * @param {number} opts.params.unilateralTimeoutMs Tier 1 publication wait.
 * @param {number} opts.params.regretTolerance     Tier 3 acceptance threshold for tier-1 result.
 * @param {number} opts.params.maxByzantineFraction t / |N|. Triggers Tier 3 byzantine-robust selection.
 * @returns {Object} { committedConvention, tierUsed, posterior, receipts }
 */
function runHandshake(opts) {
  const {
    self,
    peers,
    fallbackPolicy,
    actionLikelihood,
    typeSpace,
    regret,
    conventionSpaceForType,
    params,
  } = opts;

  if (!self || !Array.isArray(peers) || typeof fallbackPolicy !== 'function') {
    throw new TypeError('runHandshake: invalid arguments');
  }

  const N = peers.concat([self]);
  const NP = N.filter((p) => p.classification === 'P' || p === self);
  const NO = peers.filter((p) => p.classification === 'O');
  const NA = peers.filter((p) => p.classification === 'A');

  const t = Math.floor(NA.length);
  if (N.length < 3 * t + 1) {
    return { committedConvention: null, tierUsed: 'abort', reason: 'byzantine-bound-violated' };
  }

  // ---- Tier 1: Explicit Convention Discovery -----------------------------
  let provisional = null;
  let tier1Receipt = null;
  if (NP.length >= 1) {
    const intersection = intersectConventionSpaces(NP.map((p) => p.conventionSpace || []));
    if (intersection.length > 0) {
      const sorted = intersection
        .map((c) => ({ c, key: canonicalizeJson(c) }))
        .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
      provisional = sorted[0].c;
      tier1Receipt = {
        type: 'ConventionReceipt',
        convention: provisional,
        cosigners: NP.map((p) => p.did),
      };
    }
  }

  // ---- Tier 2: Observational Convention Inference ------------------------
  const posterior = {};
  for (const j of NO) {
    posterior[j.did] = bayesianPosteriorOverTypes({
      observations: j.observedActions || [],
      typeSpace,
      actionLikelihood,
    });
  }

  // ---- Tier 3: Robust Convention Selection -------------------------------
  // Construct feasible set F.
  const F = new Set();
  if (provisional !== null) {
    const tier1MaxRegret = maxExpectedRegret(provisional, NO, posterior, regret);
    if (tier1MaxRegret <= params.regretTolerance) {
      F.add(canonicalizeJson(provisional));
      // Fast path: Tier 1 succeeded with acceptable regret.
      if (NO.length === 0 && NA.length === 0) {
        return {
          committedConvention: provisional,
          tierUsed: 'tier1',
          posterior,
          receipts: [tier1Receipt],
        };
      }
    }
  }
  // Otherwise enlarge F to the union of inferred convention spaces.
  if (F.size === 0) {
    for (const j of NO) {
      const supportedTypes = Object.keys(posterior[j.did]).filter((th) => posterior[j.did][th] > 0);
      for (const th of supportedTypes) {
        for (const c of conventionSpaceForType(th)) {
          F.add(canonicalizeJson(c));
        }
      }
    }
    // Always include self's own convention space as fallback feasible.
    for (const c of self.conventionSpace || []) {
      F.add(canonicalizeJson(c));
    }
  }

  // Minimax-regret selection with t-byzantine-robust trimming
  // (Lamport, Shostak, Pease 1982). For each candidate Convention c, compute
  // per-peer regret, then drop the t largest contributions before taking the
  // worst case. This bounds the influence of any t adversarial peers on the
  // selection, preserving the |N| >= 3t + 1 BFT guarantee asserted in
  // RFC 0027 section 5 ("Byzantine Peers").
  let committed = null;
  let bestWorstCase = Infinity;
  for (const cKey of F) {
    const c = JSON.parse(cKey);
    const perPeerRegret = [];
    for (const j of N.filter((p) => p !== self)) {
      let r = 0;
      if (j.classification === 'P') {
        const published = (j.conventionSpace || []).map(canonicalizeJson);
        r = published.includes(cKey) ? 0 : 1;
      } else if (j.classification === 'O') {
        r = expectedRegretUnderPosterior(c, posterior[j.did], regret);
      } else if (j.classification === 'A') {
        // Pre-trimming worst case is 1 (a byzantine peer maximizes regret).
        // Trimming below removes the top t contributions, eliminating the
        // adversary's influence on the minimax decision.
        r = 1;
      }
      perPeerRegret.push(r);
    }
    // Trim the t largest entries (LSP-style filter). When t = 0, this is the
    // straight maximum and the selection reduces to the standard minimax
    // regret rule.
    perPeerRegret.sort((a, b) => b - a);
    const trimmed = perPeerRegret.slice(t);
    const worstCase = trimmed.length > 0 ? trimmed[0] : 0;
    if (worstCase < bestWorstCase) {
      bestWorstCase = worstCase;
      committed = c;
    }
  }

  if (committed === null) {
    // Pure fallback path: no inferred conventions, no provisional.
    const action = fallbackPolicy([], posterior);
    return {
      committedConvention: null,
      tierUsed: 'fallback-only',
      posterior,
      action,
      receipts: tier1Receipt ? [tier1Receipt] : [],
    };
  }

  return {
    committedConvention: committed,
    tierUsed: provisional && canonicalizeJson(provisional) === canonicalizeJson(committed)
      ? 'tier1+3'
      : 'tier2+3',
    posterior,
    worstCaseRegret: bestWorstCase,
    receipts: tier1Receipt ? [tier1Receipt] : [],
  };
}

function intersectConventionSpaces(spaces) {
  if (spaces.length === 0) return [];
  const keyed = spaces.map((s) => new Set(s.map(canonicalizeJson)));
  const first = keyed[0];
  const inter = [...first].filter((k) => keyed.every((set) => set.has(k)));
  return inter.map((k) => JSON.parse(k));
}

function bayesianPosteriorOverTypes({ observations, typeSpace, actionLikelihood }) {
  const post = {};
  const n = typeSpace.length;
  for (const th of typeSpace) post[th] = 1 / n;
  for (const a of observations) {
    let z = 0;
    for (const th of typeSpace) {
      post[th] = post[th] * Math.max(actionLikelihood(a, th), 1e-12);
      z += post[th];
    }
    if (z > 0) for (const th of typeSpace) post[th] /= z;
  }
  return post;
}

function maxExpectedRegret(convention, peers, posterior, regret) {
  let m = 0;
  for (const j of peers) {
    const r = expectedRegretUnderPosterior(convention, posterior[j.did] || {}, regret);
    if (r > m) m = r;
  }
  return m;
}

function expectedRegretUnderPosterior(convention, posterior, regret) {
  let s = 0;
  for (const th of Object.keys(posterior)) {
    s += posterior[th] * regret(convention, th);
  }
  return s;
}

/**
 * Convention drift detector (RFC 0027 section 3.4b).
 * Returns true if KL(empirical || posterior) > threshold.
 */
function detectDrift({ posterior, recentEmpirical, thresholdKl }) {
  let kl = 0;
  for (const th of Object.keys(recentEmpirical)) {
    const p = recentEmpirical[th];
    const q = posterior[th] || 1e-12;
    if (p > 0) kl += p * Math.log(p / q);
  }
  return kl > thresholdKl;
}

module.exports = {
  runHandshake,
  intersectConventionSpaces,
  bayesianPosteriorOverTypes,
  detectDrift,
};
