"""Ad Hoc Teamwork (RFC 0027 revision 2).

Helpers to build and verify Capability Announcements, drive the Three-Tier
Convention Discovery Handshake, and evaluate AHT Fallback Policies.

The Three-Tier algorithm is the load-bearing element of revision 2: it
makes the protocol unilaterally adoptable (Theorem A.3) by extending
revision 1's explicit Schelling reduction (Tier 1) with Bayesian
observational inference (Tier 2) and minimax-regret robust selection
(Tier 3) over the joint posterior. When all peers are protocol-followers,
Tier 3 collapses to the Tier 1 result.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Literal, Optional

from .signing import canonicalize, sha256_hex

AhtPolicyClass = Literal["POAM", "PLASTIC", "AATEAM", "ROTATE", "Custom"]
PeerClass = Literal["P", "O", "A"]


@dataclass
class AhtFallbackPolicy:
    policy_class: AhtPolicyClass
    assumptions: List[str]
    policy_ref: Optional[str] = None
    training_distribution_ref: Optional[str] = None


@dataclass
class Peer:
    did: str
    classification: PeerClass
    convention_space: Optional[List[Any]] = None
    observed_actions: Optional[List[Any]] = None


@dataclass
class ThreeTierParams:
    unilateral_timeout_ms: int = 1500
    regret_tolerance: float = 0.10
    max_byzantine_fraction: float = 0.0


@dataclass
class ThreeTierResult:
    committed_convention: Optional[Any]
    tier_used: Literal["tier1", "tier1+3", "tier2+3", "fallback-only", "abort"]
    posterior: Dict[str, Dict[str, float]] = field(default_factory=dict)
    worst_case_regret: Optional[float] = None
    reason: Optional[str] = None
    receipts: List[Any] = field(default_factory=list)
    action: Optional[Any] = None


def aht_canonicalize(value: Any) -> str:
    return canonicalize(value)


def capability_announcement_hash(announcement: Dict[str, Any]) -> str:
    return "sha256:" + sha256_hex(aht_canonicalize(announcement))


def _bayesian_posterior(
    observations: List[Any],
    type_space: List[str],
    action_likelihood: Callable[[Any, str], float],
) -> Dict[str, float]:
    n = len(type_space) or 1
    post = {th: 1.0 / n for th in type_space}
    for a in observations:
        z = 0.0
        for th in type_space:
            post[th] = post[th] * max(action_likelihood(a, th), 1e-12)
            z += post[th]
        if z > 0:
            for th in type_space:
                post[th] /= z
    return post


def _expected_regret_under_posterior(
    convention: Any,
    posterior: Dict[str, float],
    regret: Callable[[Any, str], float],
) -> float:
    return sum(p * regret(convention, th) for th, p in posterior.items())


def run_three_tier_handshake(
    *,
    self_agent: Dict[str, Any],
    peers: List[Peer],
    fallback_policy: Callable[[List[Any], Dict[str, Dict[str, float]]], Any],
    action_likelihood: Callable[[Any, str], float],
    type_space: List[str],
    regret: Callable[[Any, str], float],
    convention_space_for_type: Callable[[str], List[Any]],
    params: ThreeTierParams,
) -> ThreeTierResult:
    """Three-Tier Convention Discovery Handshake (RFC 0027 section 3.4).

    Theorem A.1 (Unilateral Bounded Termination) holds for any
    |N_P| >= 0, including the boundary case in which no peers publish.
    """
    n = peers + [Peer(did=self_agent["did"], classification="P", convention_space=self_agent["convention_space"])]
    n_p = [p for p in n if p.classification == "P"]
    n_o = [p for p in peers if p.classification == "O"]
    n_a = [p for p in peers if p.classification == "A"]

    t = len(n_a)
    if len(n) < 3 * t + 1:
        return ThreeTierResult(committed_convention=None, tier_used="abort", reason="byzantine-bound-violated")

    # Tier 1
    provisional: Optional[Any] = None
    if n_p:
        sets = [set(map(aht_canonicalize, p.convention_space or [])) for p in n_p]
        if sets:
            inter = sets[0]
            for s in sets[1:]:
                inter = inter & s
            if inter:
                provisional_key = sorted(inter)[0]
                import json
                provisional = json.loads(provisional_key)

    # Tier 2
    posterior: Dict[str, Dict[str, float]] = {}
    for j in n_o:
        posterior[j.did] = _bayesian_posterior(j.observed_actions or [], type_space, action_likelihood)

    # Tier 3
    feasible: set[str] = set()
    if provisional is not None:
        max_r = 0.0
        for j in n_o:
            r = _expected_regret_under_posterior(provisional, posterior[j.did], regret)
            if r > max_r:
                max_r = r
        if max_r <= params.regret_tolerance:
            feasible.add(aht_canonicalize(provisional))
            if not n_o and not n_a:
                return ThreeTierResult(committed_convention=provisional, tier_used="tier1", posterior=posterior)

    if not feasible:
        for j in n_o:
            for th in [t for t, p in posterior[j.did].items() if p > 0]:
                for c in convention_space_for_type(th):
                    feasible.add(aht_canonicalize(c))
        for c in self_agent.get("convention_space", []) or []:
            feasible.add(aht_canonicalize(c))

    committed: Optional[Any] = None
    best_worst_case = math.inf
    import json as _json
    for c_key in feasible:
        c = _json.loads(c_key)
        per_peer_regret: List[float] = []
        for j in [p for p in n if p.did != self_agent["did"]]:
            r = 0.0
            if j.classification == "P":
                published = list(map(aht_canonicalize, j.convention_space or []))
                r = 0.0 if c_key in published else 1.0
            elif j.classification == "O":
                r = _expected_regret_under_posterior(c, posterior[j.did], regret)
            elif j.classification == "A":
                r = 1.0
            per_peer_regret.append(r)
        per_peer_regret.sort(reverse=True)
        trimmed = per_peer_regret[t:]
        worst_case = trimmed[0] if trimmed else 0.0
        if worst_case < best_worst_case:
            best_worst_case = worst_case
            committed = c

    if committed is None:
        action = fallback_policy([], posterior)
        return ThreeTierResult(committed_convention=None, tier_used="fallback-only", posterior=posterior, action=action)

    tier_used: Literal["tier1+3", "tier2+3"]
    if provisional is not None and aht_canonicalize(provisional) == aht_canonicalize(committed):
        tier_used = "tier1+3"
    else:
        tier_used = "tier2+3"
    return ThreeTierResult(committed_convention=committed, tier_used=tier_used, posterior=posterior, worst_case_regret=best_worst_case)


def detect_convention_drift(
    *,
    posterior: Dict[str, float],
    recent_empirical: Dict[str, float],
    threshold_kl: float,
) -> Dict[str, Any]:
    """RFC 0027 section 3.4b. Returns dict with 'drifted' bool and 'kl_divergence' float."""
    kl = 0.0
    for th, p in recent_empirical.items():
        q = posterior.get(th, 1e-12)
        if p > 0:
            kl += p * math.log(p / q)
    return {"drifted": kl > threshold_kl, "kl_divergence": kl}
