/**
 * Ad Hoc Teamwork (RFC 0027 revision 2).
 *
 * Helpers to build and verify Capability Announcements, drive the Three-Tier
 * Convention Discovery Handshake, and evaluate AHT Fallback Policies.
 *
 * The Three-Tier algorithm is the load-bearing element of revision 2: it
 * makes the protocol unilaterally adoptable (Theorem A.3) by extending
 * revision 1's explicit Schelling reduction (Tier 1) with Bayesian
 * observational inference (Tier 2) and minimax-regret robust selection
 * (Tier 3) over the joint posterior. When all peers are protocol-followers,
 * Tier 3 collapses to the Tier 1 result.
 */

import { canonicalize, sha256Hex } from './signing.js';

export type AhtPolicyClass = 'POAM' | 'PLASTIC' | 'AATEAM' | 'ROTATE' | 'Custom';

export type PeerClass = 'P' | 'O' | 'A';

export interface CapabilityAnnouncement {
  schema: 'oap.capability.v1';
  agent_did: string;
  context: { context_type: 'workflow' | 'session'; context_id: string; step_id?: string | null };
  capabilities: Array<{
    action: string;
    schema_ref: string;
    preconditions?: string[];
    cost_class?: 'free' | 'billable' | 'stakeable';
    expected_latency_ms?: number;
  }>;
  evidence: {
    manifest_url: string;
    reputation_profile_ref?: string;
    role_enactment?: { organization_did: string; role_id: string; role_credential?: string };
    byoa_attestation_ref?: string;
  };
  issued_at?: string;
  expires_at?: string;
  signature: string;
}

export interface AhtFallbackPolicy {
  policy_class: AhtPolicyClass;
  policy_ref?: string;
  assumptions: string[];
  training_distribution_ref?: string;
}

export interface Peer<C extends PeerClass = PeerClass> {
  did: string;
  classification: C;
  conventionSpace?: unknown[];
  observedActions?: unknown[];
}

export interface ThreeTierParams {
  unilateralTimeoutMs: number;
  regretTolerance: number;
  maxByzantineFraction: number;
}

export interface ThreeTierResult {
  committedConvention: unknown | null;
  tierUsed: 'tier1' | 'tier1+3' | 'tier2+3' | 'fallback-only' | 'abort';
  posterior: Record<string, Record<string, number>>;
  worstCaseRegret?: number;
  reason?: string;
  receipts: unknown[];
  action?: unknown;
}

export interface ThreeTierInputs {
  self: { did: string; conventionSpace: unknown[] };
  peers: Peer[];
  fallbackPolicy: (history: unknown[], posterior: Record<string, Record<string, number>>) => unknown;
  actionLikelihood: (action: unknown, theta: string) => number;
  typeSpace: string[];
  regret: (convention: unknown, theta: string) => number;
  conventionSpaceForType: (theta: string) => unknown[];
  params: ThreeTierParams;
}

export function ahtCanonicalize(value: unknown): string {
  return canonicalize(value as Record<string, unknown>);
}

export async function capabilityAnnouncementHash(a: CapabilityAnnouncement): Promise<string> {
  return 'sha256:' + sha256Hex(ahtCanonicalize(a));
}

function bayesianPosterior(
  observations: unknown[],
  typeSpace: string[],
  actionLikelihood: (a: unknown, theta: string) => number,
): Record<string, number> {
  const post: Record<string, number> = {};
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

function expectedRegretUnderPosterior(
  convention: unknown,
  posterior: Record<string, number>,
  regret: (c: unknown, theta: string) => number,
): number {
  let s = 0;
  for (const th of Object.keys(posterior)) s += posterior[th] * regret(convention, th);
  return s;
}

/**
 * Three-Tier Convention Discovery Handshake (RFC 0027 section 3.4).
 *
 * Tier 1 runs Schelling reduction over publishers; Tier 2 runs Bayesian
 * inference over silent peers; Tier 3 selects via t-byzantine-trimmed
 * minimax regret. Theorem A.1 (Unilateral Bounded Termination) holds for
 * any |N_P| >= 0, including the boundary case in which no peers publish.
 */
export function runThreeTierHandshake(opts: ThreeTierInputs): ThreeTierResult {
  const { self, peers, fallbackPolicy, actionLikelihood, typeSpace, regret, conventionSpaceForType, params } = opts;

  const N = [...peers, self];
  const NP = N.filter((p) => (p as Peer).classification === 'P' || p === self);
  const NO = peers.filter((p) => p.classification === 'O');
  const NA = peers.filter((p) => p.classification === 'A');

  const t = NA.length;
  if (N.length < 3 * t + 1) {
    return { committedConvention: null, tierUsed: 'abort', posterior: {}, reason: 'byzantine-bound-violated', receipts: [] };
  }

  // Tier 1
  let provisional: unknown = null;
  if (NP.length >= 1) {
    const sets = NP.map((p) => new Set(((p as Peer).conventionSpace || []).map(ahtCanonicalize)));
    const inter = sets.length === 0 ? [] : [...sets[0]].filter((k) => sets.every((s) => s.has(k)));
    if (inter.length > 0) {
      inter.sort();
      provisional = JSON.parse(inter[0]);
    }
  }

  // Tier 2
  const posterior: Record<string, Record<string, number>> = {};
  for (const j of NO) {
    posterior[j.did] = bayesianPosterior(j.observedActions || [], typeSpace, actionLikelihood);
  }

  // Tier 3
  const F = new Set<string>();
  if (provisional !== null) {
    let max = 0;
    for (const j of NO) {
      const r = expectedRegretUnderPosterior(provisional, posterior[j.did], regret);
      if (r > max) max = r;
    }
    if (max <= params.regretTolerance) {
      F.add(ahtCanonicalize(provisional));
      if (NO.length === 0 && NA.length === 0) {
        return { committedConvention: provisional, tierUsed: 'tier1', posterior, receipts: [] };
      }
    }
  }
  if (F.size === 0) {
    for (const j of NO) {
      const supportedTypes = Object.keys(posterior[j.did]).filter((th) => posterior[j.did][th] > 0);
      for (const th of supportedTypes) for (const c of conventionSpaceForType(th)) F.add(ahtCanonicalize(c));
    }
    for (const c of self.conventionSpace || []) F.add(ahtCanonicalize(c));
  }

  let committed: unknown = null;
  let bestWorstCase = Infinity;
  for (const cKey of F) {
    const c = JSON.parse(cKey);
    const perPeerRegret: number[] = [];
    for (const j of N.filter((p) => p !== self)) {
      let r = 0;
      const jp = j as Peer;
      if (jp.classification === 'P') {
        const published = (jp.conventionSpace || []).map(ahtCanonicalize);
        r = published.includes(cKey) ? 0 : 1;
      } else if (jp.classification === 'O') {
        r = expectedRegretUnderPosterior(c, posterior[jp.did], regret);
      } else if (jp.classification === 'A') {
        r = 1;
      }
      perPeerRegret.push(r);
    }
    perPeerRegret.sort((a, b) => b - a);
    const trimmed = perPeerRegret.slice(t);
    const worstCase = trimmed.length > 0 ? trimmed[0] : 0;
    if (worstCase < bestWorstCase) {
      bestWorstCase = worstCase;
      committed = c;
    }
  }

  if (committed === null) {
    const action = fallbackPolicy([], posterior);
    return { committedConvention: null, tierUsed: 'fallback-only', posterior, action, receipts: [] };
  }

  const tierUsed: ThreeTierResult['tierUsed'] =
    provisional !== null && ahtCanonicalize(provisional) === ahtCanonicalize(committed) ? 'tier1+3' : 'tier2+3';
  return { committedConvention: committed, tierUsed, posterior, worstCaseRegret: bestWorstCase, receipts: [] };
}

export function detectConventionDrift(opts: {
  posterior: Record<string, number>;
  recentEmpirical: Record<string, number>;
  thresholdKl: number;
}): { drifted: boolean; klDivergence: number } {
  let kl = 0;
  for (const th of Object.keys(opts.recentEmpirical)) {
    const p = opts.recentEmpirical[th];
    const q = opts.posterior[th] ?? 1e-12;
    if (p > 0) kl += p * Math.log(p / q);
  }
  return { drifted: kl > opts.thresholdKl, klDivergence: kl };
}
