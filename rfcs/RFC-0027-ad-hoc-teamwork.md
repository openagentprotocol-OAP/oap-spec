# RFC 0027: Ad Hoc Teamwork and Convention Discovery

**Status:** Draft (revision 2, 2026-05-10)
**Author(s):** T. Fengler (Editor)
**Working Group:** Core Protocol
**Created:** 2026-05-05
**Revised:** 2026-05-10 (substantive restructuring; see Section 11)
**Targets:** 1.2
**Affects:** RFC 0001 (Sessions), RFC 0008 (Workflows), RFC 0009 (Reputation), RFC 0019 (Conformance), RFC 0024 (Schema Negotiation), OAP-CORE-1.0 Section 9 (Manifest), Section 17 (Receipts).

## 1. Summary

This RFC defines the normative substrate for *ad hoc teamwork* (AHT) in OAP: the situation in which two or more Agents must cooperate on a shared task without prior coordination, without a pre-shared Workflow definition, and without prior knowledge of one another's capabilities, types, or strategies. The canonical AHT problem (Stone, Kaminka, Kraus, and Rosenschein 2010) explicitly forbids the assumption that teammates follow any specific communication protocol. This RFC therefore commits to a stronger design property than its first revision: **the protocol must be useful under unilateral adoption**. An OAP Agent that speaks the protocol must obtain expected utility at least as high as one that does not, regardless of how many of its current teammates also speak it. The protocol is incentive-compatible with arbitrary mixes of protocol-followers, observable non-followers, and adversarial peers.

The RFC introduces five normative additions:

1. A **Capability Announcement** message (`oap.capability.v1`) that lets a previously unknown Agent advertise the actions it can take in a Session or Workflow.
2. A **Late Join Procedure** for in-progress Workflows (RFC 0008) and Sessions (RFC 0001) that admits new Participants on capability match without requiring Convener approval, with explicit safety rails.
3. A **Three-Tier Convention Discovery Handshake** that lets an Agent converge on a coordination convention through (Tier 1) explicit publication and Schelling reduction over protocol-followers, (Tier 2) Bayesian inference of implicit conventions from observed actions of non-followers, and (Tier 3) minimax-regret selection over the joint posterior. Tier 1 alone reduces to the bilateral handshake of revision 1; the addition of Tiers 2 and 3 makes the protocol unilaterally adoptable.
4. An **AHT Fallback Policy** field in the Agent's Manifest that designates a learned online policy class (POAM, PLASTIC, AATEAM, ROTATE, or implementer-defined) that the Agent applies whenever Tier 1 fails to produce coordination. The fallback policy is itself a first-class Conformance Profile.
5. A **Convention Drift Detection** mechanism that triggers re-inference when an inferred Convention diverges from observed teammate behavior beyond a published threshold, restoring coverage robustness in non-stationary populations (Rahman, Cui, and Stone 2024).

## 2. Motivation

OAP-CORE-1.0 and the RFCs accepted to date assume cooperation under *closed-world coordination*: Workflow definitions list participants up front (RFC 0008 section 3.2), Sessions admit Participants on Convener signature (RFC 0001 section 3.6), and Negotiation occurs between two Parties that have already discovered each other (RFC 0002). This is sufficient for vertically integrated deployments and for marketplaces with deliberate onboarding, but it is insufficient for four classes of production scenario:

1. **Marketplace fulfillment substitution.** A consumer Agent has a fulfilled Workflow with a primary supplier; the supplier becomes unavailable mid-execution; an alternative supplier with overlapping capability must join Step $N$ without renegotiating the entire Workflow.
2. **Open Coordination Sessions.** A community Tool publishes a Session for collaborative document editing or scheduling; new Participants discover the Session through the Registry (RFC 0026) and must join based on declared capability rather than per-Participant signed admission.
3. **Emergency response.** An incident requires immediate cooperation among Agents owned by different Principals with no opportunity for Convener-mediated onboarding.
4. **Convention emergence in repeated games.** A population of Agents repeatedly interacts; coordination conventions (turn order, currency choice, dispute resolution rule) must emerge endogenously, without a central authority dictating them.

A protocol that addresses these scenarios must respect the foundational assumption of the AHT literature: at least some teammates may neither know nor care about the protocol. Revision 1 of this RFC addressed this scenario only implicitly, through the optionality of the Manifest declaration in section 3.5. Revision 2 makes it normative: every Tier 1 path has a Tier 2 and Tier 3 continuation, and the conformance profile of section 7 requires implementers to declare and exercise the unilateral-adoption fallback.

## 3. Specification

### 3.1 Terminology

| Term | Definition |
|------|------------|
| Ad Hoc Participant | An Agent that joins a Workflow or Session after its initiation, without being listed in the original Workflow or Session definition. |
| Capability Announcement | A signed declaration of the actions an Agent can perform, scoped to a specific coordination context. |
| Convention | A common rule for resolving a coordination problem with multiple equilibria (turn order, tie-break, role assignment, payoff allocation). |
| Convention Space | The set of admissible Conventions agreed by the participating Agents in advance of any specific instance. |
| Inferred Convention | The Convention attributed to a non-publishing peer on the basis of the posterior distribution over its type, formed from observed actions. |
| Late Join | Admission of an Ad Hoc Participant to a Session or Workflow that is already in progress. |
| Protocol-Follower (P-class) | An Agent that publishes a Capability Announcement and a Convention Space within the protocol's timeout window. |
| Observable Non-Follower (O-class) | An Agent that does not publish, but whose actions are observable on the shared task. |
| Adversarial Peer (A-class) | An Agent whose actions may be arbitrary, including byzantine. The fraction of A-class peers is bounded by a published parameter $t$. |
| AHT Fallback Policy | An online policy declared in the Agent's Manifest that the Agent applies to O-class peers and to A-class peers up to bound $t$. |
| Type | A static description of an Agent's preferences, capabilities, and policy that is private to the Agent and inferred by counterparties from observed behavior. |

### 3.2 Capability Announcement Schema

```json
{
  "schema": "oap.capability.v1",
  "agent_did": "did:web:agent-x.example",
  "context": {
    "context_type": "workflow" | "session",
    "context_id": "wf_01HX..." | "ses_01HX...",
    "step_id": "stp_01HX..." | null
  },
  "capabilities": [
    {
      "action": "fulfillment.ship.parcel",
      "schema_ref": "https://example.org/schemas/ship-parcel.v1.json",
      "preconditions": ["address_valid", "weight_le_30kg"],
      "cost_class": "billable",
      "expected_latency_ms": 1500
    }
  ],
  "evidence": {
    "manifest_url": "https://agent-x.example/oap/manifest",
    "reputation_profile_ref": "rfc0009://profile/did:web:agent-x.example"
  },
  "signature": "..."
}
```

The `capabilities` array MUST be a non-empty list of structured action descriptors. Each `action` MUST be a value defined in the Agent's published Manifest (OAP-CORE-1.0 section 9). The `schema_ref` MUST resolve to a JSON Schema that validates inputs and outputs of the action.

A receiving Agent MUST verify the signature against the DID Document of `agent_did` and MUST refuse to use a capability not also declared in the announcing Agent's Manifest. This prevents an Ad Hoc Participant from claiming capabilities it cannot publicly back.

### 3.3 Late Join Procedure

A Workflow or Session that wishes to admit Ad Hoc Participants MUST declare an `admission_mode` in its definition:

```json
{
  "admission_mode": "convener_gated" | "capability_match" | "open"
}
```

| Mode | Semantics |
|------|-----------|
| `convener_gated` | Default. New Participants require an explicit signed admission credential from the Convener (RFC 0001 section 3.6). |
| `capability_match` | New Participants are admitted automatically if they present a Capability Announcement whose `action` is in the published `required_capabilities` set of the Workflow or Session, and whose Reputation Profile (RFC 0009) exceeds a published threshold. |
| `open` | New Participants are admitted on signature verification alone. Permitted only for Sessions with `category = "discussion"` and never for Workflows that produce binding Receipts. |

A Tool that hosts a Workflow or Session in mode `capability_match` MUST publish:

* `required_capabilities`: list of action descriptors the Ad Hoc Participant must announce.
* `reputation_threshold`: minimum Reputation Profile score (RFC 0009) for admission.
* `late_join_until_step`: the highest Step index at which Late Join is permitted (open-ended for Sessions).
* `max_late_joiners`: an upper bound on the count of Ad Hoc Participants per Workflow or Session.

The Tool MUST refuse a Late Join request that violates any of the four constraints above and MUST emit a signed `LateJoinReceipt` for every successful admission. The `LateJoinReceipt` is appended to the Transparency Log of the hosting Tool, preserving the auditability properties of OAP-CORE-1.0 section 17.

### 3.4 Three-Tier Convention Discovery Handshake

When two or more Agents must agree on a coordination Convention before any binding action can be taken, an OAP Agent executes the following three-tier procedure. Each tier is invoked unconditionally; later tiers refine or replace the result of earlier tiers.

#### 3.4.1 Tier 1: Explicit Convention Discovery

Tier 1 is invoked at the start of the coordination context with timeout $\tau_1$ given by the Agent's Manifest field `unilateral_timeout_ms` (section 3.5).

1. **Convention Space Publication.** The Agent publishes its admissible Convention Space, ordered by preference, signed by its DID. Each peer that is a Protocol-Follower (P-class) does the same within $\tau_1$.
2. **Schelling Reduction.** Let $N_P$ be the set of peers (including this Agent) that have published within $\tau_1$. The intersection $\bigcap_{i \in N_P} \mathcal{C}_i$ of all published Convention Spaces is the *candidate set*.
3. **Lexicographic Tie Break.** If the candidate set is non-empty, its Conventions are ordered by the canonical lexicographic ordering of their structured representation (UTF-8 byte order on the JSON canonicalization of RFC 8785). The first Convention in this order is the **provisional Convention** $C^*_1$.
4. **Co-signed Convention Receipt.** The members of $N_P$ co-sign a `ConventionReceipt` recording $C^*_1$ and the inputs from which it was derived. The Receipt is appended to the hosting Tool's Transparency Log.

If $|N_P| < |N|$, the procedure does NOT terminate at Tier 1. The Agent proceeds to Tier 2 for the remaining peers $N \setminus N_P$.

If the candidate set in step 2 is empty, $C^*_1$ is undefined and the Agent proceeds directly to Tier 2 for all peers.

#### 3.4.2 Tier 2: Observational Convention Inference

For each peer $j \in N \setminus N_P$ (the Observable Non-Followers), the Agent maintains a posterior $\pi_j$ over $j$'s implicit Convention Space, updated from observed actions $a_1^{(j)}, a_2^{(j)}, \ldots$ via the Bayesian rule

$$\pi_j^{(k+1)}(\theta) \;\propto\; \Pr(a_{k+1}^{(j)} \mid \theta)\, \pi_j^{(k)}(\theta), \qquad \theta \in \Theta_j,$$

where $\Theta_j$ is a published or implementer-defined type space and $\Pr(a \mid \theta)$ is the action likelihood of the AHT Fallback Policy declared in section 3.5. After $k$ observations, the **inferred Convention** for peer $j$ is $\hat{C}_j := \arg\max_{C \in \mathcal{C}} \mathbb{E}_{\theta \sim \pi_j^{(k)}}[\,C \in \mathcal{C}_j(\theta)\,]$, the Convention most likely to lie in $j$'s implicit space.

The convergence rate of $\pi_j^{(k)} \to \delta_{\theta^*_j}$ is given by Theorem C.1 (Section A.5).

#### 3.4.3 Tier 3: Robust Convention Selection

The Agent selects its committed Convention by minimax regret over the joint distribution induced by Tier 1 and Tier 2:

$$C^\dagger \;=\; \arg\min_{C \in \mathcal{F}} \, \max_{j \in N} \, \mathbb{E}_{\theta_j \sim \pi_j}\!\left[\, \mathrm{regret}(C, \theta_j) \,\right]$$

where $\mathcal{F} \subseteq \mathcal{C}$ is the *feasible Convention set*, defined as

* $\mathcal{F} = \{C^*_1\}$ when Tier 1 produced a non-empty candidate set and the maximum regret is below the Manifest-declared `regret_tolerance` field,
* $\mathcal{F} = $ the union of inferred Convention Spaces $\bigcup_{j \in N} \mathrm{supp}(\pi_j)$ otherwise.

For peers in $N_P$, $\pi_j$ collapses to a point mass on the published Convention Space; for peers in $N \setminus N_P$, $\pi_j$ is the Tier 2 posterior; for peers in the bounded $|N_A| \le t$ adversarial set, the regret in the maximand is replaced by a worst-case bound that yields the standard $t$-byzantine robust selection rule of Lamport, Shostak, and Pease (1982) restricted to the candidate Conventions.

When $|N \setminus N_P| = 0$ and the maximum regret in $\mathcal{F} = \{C^*_1\}$ is below tolerance, $C^\dagger = C^*_1$ and Tier 3 reduces exactly to revision 1's handshake. This preserves backward compatibility with implementations that do not yet implement Tiers 2 and 3.

The Agent commits to $C^\dagger$ and proceeds with the action that the AHT Fallback Policy prescribes under the assumption that all peers act consistently with $C^\dagger$.

### 3.4a AHT Fallback Policy

An OAP Agent that supports the Three-Tier Convention Discovery Handshake MUST declare an AHT Fallback Policy in its Manifest. The Fallback Policy is the online policy the Agent applies whenever Tier 1 fails to produce a Convention covering all peers. Five policy classes are recognized as Conformance Profiles; implementers MAY register additional classes.

| Policy Class | Reference | Assumptions |
|--------------|-----------|-------------|
| `POAM` | Wang, Rahman, Xiao, Liu, Stone, Niekum (2024). Open Ad Hoc Teamwork via POAM. NeurIPS. | Partially observable open-team Markov game; opponent modeling over teammate types; trained on a held-out diversity distribution. |
| `PLASTIC` | Barrett, Stone (2015). Cooperating with Unknown Teammates in Complex Domains. AAAI. | Bayesian model of teammate type distribution; transfer from prior teammates. |
| `AATEAM` | Chen, Andrejczuk, Cao, Zhang (2020). Adaptive Action Selection for Ad Hoc Teamwork. AAMAS. | Attention-based teammate type selection. |
| `ROTATE` | Rahman, Cui, Stone (2024). Coverage-Robust Ad Hoc Teamwork. | Adversarial training over a population of generated teammates; coverage robustness guarantee. |
| `Custom` | Implementer-defined. | Implementer MUST publish the assumptions and a citation to a peer-reviewed or preprint description. |

The Fallback Policy is invoked with the joint inputs $(C^\dagger, \pi_{N \setminus N_P}, \text{observed history})$ produced by Tier 3. The Policy outputs the Agent's next action. The Policy's outputs are treated by the OAP audit layer (OAP-CORE-1.0 section 17) as actions of the Agent and are bound to the Agent's DID through the standard Step Receipt mechanism. The Fallback Policy's declared assumptions form part of the Agent's Manifest and are therefore subject to Manifest update notifications under RFC 0022.

A Tool that hosts a Workflow or Session in mode `capability_match` MAY require a specific AHT Fallback Policy class as an admission precondition by listing it in `required_fallback_policy_classes`. This is the formal hook by which an institution that has trained or audited a particular Fallback Policy class can require its use among admitted Ad Hoc Participants.

### 3.4b Convention Drift Detection

A peer's effective behavior may change over the course of a Session or Workflow (the non-stationary teammate problem of Rahman, Cui, and Stone 2024). The Agent MUST monitor the Kullback-Leibler divergence between the Tier 2 posterior over each peer's type and the empirical distribution of observed actions. When the divergence exceeds the Manifest-declared `drift_threshold_kl`, the Agent MUST:

1. Emit a `ConventionDriftReceipt` recording the affected peer, the divergence measurement, and the decision to re-infer.
2. Reset the Tier 2 posterior $\pi_j$ over the affected peer's type to a published prior $\pi_0$ (typically a recency-decayed mixture of $\pi_j$ and the implementation default).
3. Re-execute Tier 3 with the new posterior.

If drift is detected for more than $\lfloor |N| / 3 \rfloor$ peers within a single coordination context, the Agent MUST emit a `CoordinationAbortReceipt` and halt the Workflow or Session in conformance with the cooling-off receipt path of RFC 0017. This preserves auditability under coverage failure.

### 3.5 Manifest Declaration

An Agent that supports ad hoc teamwork extensions declares it in its Manifest:

```json
{
  "ad_hoc_teamwork": {
    "supported": true,
    "capability_announcement_v1": true,
    "late_join_modes": ["capability_match", "open"],
    "convention_discovery_v2": true,
    "max_capabilities_per_announcement": 64,
    "unilateral_timeout_ms": 1500,
    "convention_inference_v1": true,
    "regret_tolerance": 0.10,
    "drift_threshold_kl": 0.50,
    "max_byzantine_fraction": 0.33,
    "aht_fallback_policy": {
      "policy_class": "POAM",
      "policy_ref": "https://arxiv.org/abs/2410.xxxxx",
      "assumptions": [
        "stationary_teammates",
        "fully_observable_state",
        "type_space_realizable"
      ],
      "training_distribution_ref": "https://example.org/poam-train.json"
    }
  }
}
```

A Tool that does not declare `ad_hoc_teamwork.supported = true` continues to operate under the closed-world coordination model of OAP-CORE-1.0 and the existing RFCs.

A Tool that declares `convention_discovery_v2 = true` but omits `aht_fallback_policy` MUST be rejected by the Conformance Probe of section 7. The Fallback Policy is the load-bearing field that distinguishes revision 2 from revision 1 and that closes the unilateral-adoption gap.

### 3.6 Composition with Other RFCs

| Other RFC | Composition |
|-----------|-------------|
| RFC 0001 (Sessions) | The `admission_mode` field of section 3.3 lives in the Session definition. `capability_match` is an additional admission path; `convener_gated` admission of section 3.6 of RFC 0001 is unaffected. |
| RFC 0008 (Workflows) | The `admission_mode`, `required_capabilities`, `late_join_until_step`, and `max_late_joiners` fields live in the Workflow definition. The Workflow Receipt of RFC 0008 section 3.4 MUST list the Ad Hoc Participants and their `LateJoinReceipt` IDs in addition to the originally listed Participants. |
| RFC 0009 (Reputation) | The `reputation_threshold` of section 3.3 is evaluated against the Reputation Profile defined in RFC 0009 Appendix A.1. Theorem C.1 below establishes the convergence rate of Bayesian type inference over the Reputation Profile. |
| RFC 0017 (Cooling Off) | The `CoordinationAbortReceipt` of section 3.4b is a Reversal Receipt as defined in RFC 0017 section 3.5; verification proceeds without additional clauses. |
| RFC 0022 (Subscription) | A change to `aht_fallback_policy` triggers a Manifest update notification under the Subscription Protocol; downstream Agents MUST re-evaluate Tier 3 selection. |
| RFC 0024 (Schema Negotiation) | When the Capability Announcement of section 3.2 references a `schema_ref` not previously seen by the receiver, the Schema Negotiation Protocol of RFC 0024 is invoked before the capability is used. |
| RFC 0026 (Registry) | The published Manifest declarations of section 3.5 are discoverable through the OAP Registry. The Registry validation CI MUST reject implementations that declare `convention_discovery_v2 = true` without a populated `aht_fallback_policy` block. |

## 4. Backward Compatibility

This RFC is strictly additive at the wire level. Tools that do not implement it continue to operate under the closed-world coordination model of OAP-CORE-1.0. The default `admission_mode` is `convener_gated`, which preserves the prior behavior. Workflow Receipts that contain no Ad Hoc Participant entries are byte-identical to Receipts produced under the prior model.

Revision 2 of this RFC introduces semantic changes in the handshake of section 3.4 relative to revision 1: implementations of revision 1 produce only Tier 1 output, which is now defined as a *provisional* Convention. A revision 2 implementation interoperating with a revision 1 peer treats the revision 1 peer as P-class with empty Tier 2 posterior, which by Theorem A.4 of Section A reduces Tier 3 to the Tier 1 result. Revision 1 implementations are therefore forward-compatible without code changes, but they do not gain the unilateral-adoption guarantee until upgraded.

## 5. Security Considerations

**Capability Forgery.** An Ad Hoc Participant might announce capabilities it cannot deliver. Section 3.2 requires the announced action to be present in the Agent's published Manifest, which is independently verifiable through the Registry (RFC 0026). The Reputation system (RFC 0009) penalizes Agents whose announced capabilities consistently fail at execution time.

**Sybil Attack on Late Join.** A coalition of malicious Agents might register many Sybil identities and flood a Workflow with Late Join requests. The `max_late_joiners` constraint of section 3.3 bounds the damage; the Sybil resistance machinery of RFC 0011 increases the cost of producing fresh identities; the `reputation_threshold` of section 3.3 excludes identities without an established Profile.

**Convention Manipulation.** A participating Agent might publish a Convention Space crafted to force a specific lexicographically-first Convention favorable to it. The Tier 1 handshake of section 3.4.1 is symmetric: every Agent's published space is co-signed and appears in the Convention Receipt. Manipulation through Tier 2 is bounded by the minimax-regret rule of Tier 3, which dampens any single peer's influence on $C^\dagger$ to at most $1/|N|$ of the regret budget. Adversarial manipulation is therefore detectable post hoc and feeds back into the Reputation system.

**Byzantine Peers.** The `max_byzantine_fraction` parameter of section 3.5 sets the bound $t$ used in Tier 3. The standard $t$-byzantine robust selection rule (Lamport, Shostak, Pease 1982) requires $|N| \ge 3t + 1$. The Agent MUST refuse to commit a Convention when $|N| < 3t + 1$ and emit a `CoordinationAbortReceipt`.

**Race Conditions.** Two or more Late Join requests may arrive concurrently. The hosting Tool MUST serialize admission decisions through a single monotonic counter and MUST emit Receipts in the order of admission.

**Confidentiality.** A Late Joining Participant by definition was not present when prior Confidentiality and Compliance Context (CCC) was established. The hosting Tool MUST evaluate whether the Ad Hoc Participant satisfies the CCC of the existing Workflow or Session, and MUST refuse admission if it does not. This composes with the CCC inheritance rule of RFC 0002 section 3.7 and with the Persona policy of RFC 0006.

**Drift-Triggered Denial.** An adversarial peer might deliberately oscillate its behavior to keep the Agent in perpetual drift-triggered re-inference (section 3.4b). The `CoordinationAbortReceipt` rule with the $\lfloor |N|/3 \rfloor$ threshold bounds the cost of this attack to a single coordination context.

## 6. Privacy Considerations

Capability Announcements are signed and discoverable. They expose the announcing Agent's action surface beyond what its Manifest already publishes only when the announcement scopes capabilities to a specific Workflow or Session, which is itself observable through the Transparency Log. Agents that wish to maintain action privacy SHOULD limit the scope of Capability Announcements through the Persona mechanism of RFC 0006.

The Tier 2 posterior $\pi_j$ over a non-publishing peer's type is private to the inferring Agent. It MUST NOT be published or logged outside the Agent's local audit boundary. This protects the non-publishing peer from involuntary type disclosure that would erode the AHT premise.

## 7. Conformance Impact

Ad hoc teamwork is OPTIONAL at L2. It is REQUIRED at L4 if the implementation declares any Workflow or Session in `capability_match` or `open` mode. Five conformance probes are added to RFC 0019:

* `behavior/ad-hoc-late-join.test.js` validates the Late Join Procedure of section 3.3.
* `behavior/ad-hoc-capability-announcement.test.js` validates the Capability Announcement schema of section 3.2 and the Manifest cross-check.
* `behavior/ad-hoc-tier1-convention-discovery.test.js` validates Tier 1 (the revision-1 handshake) of section 3.4.1 and the bounded-round termination of Theorem A.1.
* `behavior/ad-hoc-tier3-unilateral-adoption.test.js` validates that the implementation produces a binding action selection when $|N_P| = 0$, exercising Tiers 2 and 3 against a synthetic population of O-class peers. This is the **unilateral-adoption probe**: a revision-2 implementation MUST pass it, and the test failure is the sole machine-verifiable indicator that an implementation has not closed the AHT gap.
* `behavior/ad-hoc-drift-detection.test.js` validates the drift detection rule of section 3.4b on a non-stationary synthetic population.

The Registry validation CI of RFC 0026 MUST reject Conformance Receipts at L4 or higher whose linked Manifest declares `convention_discovery_v2 = true` and fails the unilateral-adoption probe.

## 8. Implementation Experience

The AssistNet Booking Engine implements a comparable Late Join mechanism for collaborative scheduling and a Convention Discovery handshake for tie-break on time slot proposals. A reference implementation of the three-tier handshake, the AHT Fallback Policy interface, and the drift detector is committed to `reference/aht/` (see `reference/aht/three-tier.js` for the algorithm and `reference/aht/fallback-policies/` for stub implementations of the five recognized policy classes).

## 9. Alternatives Considered

* **Mandatory Convener for all admission.** Rejected because it forecloses the four scenarios listed in section 2 and is incompatible with decentralized marketplace dynamics.
* **Free-text capability declarations.** Rejected because they are not machine verifiable and prevent automated capability matching.
* **Implicit late join via Negotiation.** Rejected because Negotiation (RFC 0002) is bilateral, whereas ad hoc teamwork is generically multilateral.
* **Tier 1 only (the revision-1 design).** Rejected because it requires that every peer be a Protocol-Follower for the handshake to terminate with a binding result. This violates the AHT premise of Stone et al. (2010) and the unilateral-adoption property formalized in Theorem A.3 below. The three-tier design preserves Tier 1 as a fast path and adds Tiers 2 and 3 as the unilateral-adoption guarantee.
* **Convention discovery via uniform random selection.** Rejected because uniform random selection over $\mathcal{C}$ has expected coordination payoff $1/|\mathcal{C}|$, which is dominated by the minimax-regret rule of Tier 3 under any non-trivial posterior over $\mathcal{C}$.

## 10. References

* OAP-CORE-1.0, Sections 9, 11, 17.
* RFC 0001, RFC 0002, RFC 0008, RFC 0009, RFC 0011, RFC 0017, RFC 0019, RFC 0022, RFC 0024, RFC 0026.

## 11. Revision History

* **Revision 1, 2026-05-05.** Initial draft. Single-tier Convention Discovery; Manifest declaration; Late Join Procedure; Capability Announcement.
* **Revision 2, 2026-05-10.** Three-Tier Convention Discovery (Tier 1 explicit, Tier 2 observational Bayesian inference, Tier 3 minimax-regret robust selection). AHT Fallback Policy field added to Manifest with five recognized policy classes (POAM, PLASTIC, AATEAM, ROTATE, Custom). Convention Drift Detection (section 3.4b). Unilateral Participation Dominance theorem (Theorem A.3). Robustness under Private Type Spaces theorem (Theorem A.4). Sample Complexity Decomposition (Theorem A.5). Updated conformance probes (section 7) including the unilateral-adoption probe. Acknowledgements section added.

## 12. Acknowledgements

The substantive restructuring in revision 2 was prompted by external review correspondence with the multi-agent systems Ad Hoc Teamwork research community in May 2026. The unilateral-adoption design property of section 1 and the restructured Theorem A.1 of Appendix A are owed in particular to the canonical formulation of AHT in Stone, Kaminka, Kraus, and Rosenschein (2010) and to subsequent work by Albrecht and Stone (2018), Mirsky et al. (2022), Wang, Rahman, Xiao, Liu, Stone, and Niekum (2024), and Rahman, Cui, and Stone (2024). The RoboCup Drop-In Player Challenge (Genter, Laue, and Stone 2017) is acknowledged as the empirical precedent for institutionally-coordinated AHT protocols and the motivating reference for the design constraint that an OAP-speaking Agent must remain capable when its peers do not speak the protocol.

## Appendix A: Bounded Convergence and Unilateral Adoption

This appendix is normative for the termination, dominance, and robustness claims it makes about the handshake of section 3.4 and informative for the supporting commentary. The treatment follows the focal point analysis of Schelling (1960), the convention emergence theory of Lewis (1969) and Young (1993, 1998), the multi-agent systems treatment of ad hoc teamwork by Stone, Kaminka, Kraus, and Rosenschein (2010), Albrecht and Stone (2018), Mirsky et al. (2022), Wang et al. (2024), and Rahman et al. (2024), and the byzantine fault tolerance lineage of Lamport, Shostak, and Pease (1982).

### A.1 Unilateral Bounded Termination

**Theorem A.1 (Unilateral Bounded Termination of the Three-Tier Handshake).** *Let $N$ be the set of Agents in a coordination context, partitioned into Protocol-Followers $N_P$, Observable Non-Followers $N_O := N \setminus N_P$, and at most $t$ adversarial peers $N_A \subseteq N$ with $t \le \lfloor (|N|-1)/3 \rfloor$. For any partition with $|N_P| \ge 0$, an OAP Agent executing the three-tier handshake of section 3.4 commits to a binding Convention $C^\dagger$ in at most*

$$R(\epsilon, \delta) \;:=\; \underbrace{|N_P| + 1}_{\text{Tier 1}} \;+\; \underbrace{k(\epsilon, \delta)}_{\text{Tier 2 sample complexity}} \;+\; \underbrace{1}_{\text{Tier 3 selection}}$$

*communication or observation rounds, where $k(\epsilon, \delta)$ is the sample complexity of $(\epsilon, \delta)$-accurate posterior inference under Theorem C.1. The binding Convention $C^\dagger$ is well-defined regardless of $|N_P|$, including the boundary case $|N_P| = 0$.*

**Proof.** Tier 1 terminates in $|N_P| + 1$ rounds by the unchanged argument of revision 1's proof, restricted to the published subset $N_P$. Tier 2 produces an $\epsilon$-accurate posterior $\pi_j$ for each $j \in N_O$ in $k(\epsilon, \delta) = O\!\left(\frac{\log(|\Theta_j|/\delta)}{\epsilon^2 d_{\min}^2}\right)$ observation rounds by Theorem C.1 (Section A.5). Tier 3 selects $C^\dagger$ from the feasible set $\mathcal{F}$ in a single round by the minimax-regret rule of section 3.4.3, which is well-defined whenever $\mathcal{F}$ is non-empty. $\mathcal{F}$ is non-empty because at minimum it contains the action that the AHT Fallback Policy prescribes in the absence of any inferred Convention; this action is treated as a degenerate Convention covering only the Agent itself. The boundary case $|N_P| = 0$ corresponds to skipping Tier 1; the procedure proceeds directly to Tier 2 over all peers and to Tier 3 over the resulting posterior. Termination is therefore unconditional in $|N_P|$. $\blacksquare$

**Remark A.1.1 (Reduction to Revision 1).** When $|N_O| = 0$ and $|N_A| = 0$, the sample complexity $k(\epsilon, \delta)$ collapses to zero (no posterior to estimate), Tier 3 selection collapses to lexicographic tie-break over $C^*_1$, and $R = |N_P| + 1 + 0 + 1 = |N| + 2$. This is one round more than the revision 1 bound; the additional round is the Tier 3 commitment Receipt, which revision 1 folded into Tier 1 step 4. Implementers may merge these rounds as in revision 1 when Tier 2 is empty, recovering the $|N| + 1$ bound.

### A.2 Late Join Safety

**Theorem A.2 (Late Join Preserves Workflow Soundness).** *Let $W$ be a Workflow with admission_mode = `capability_match` and let $W'$ be the Workflow after admission of Ad Hoc Participants. The Receipts produced by $W'$ remain verifiable against the Workflow definition of $W$ in the sense of RFC 0008 section 3.4 if and only if every admitted Participant's Capability Announcement satisfies the `required_capabilities` and `reputation_threshold` constraints of section 3.3.*

**Proof.** ($\Rightarrow$) Soundness of the Workflow Receipt of RFC 0008 section 3.4 requires that each Step Receipt is signed by an Agent that the Workflow accepts as a holder of the Step's role. Late Join admission is granted only on satisfaction of `required_capabilities`, which is the protocol's machine readable encoding of Step role compatibility, and on satisfaction of `reputation_threshold`, which is the protocol's encoding of trust necessary to bind the Step output to the Workflow Receipt chain. A Step Receipt produced by a Participant admitted under section 3.3 therefore meets the verification preconditions of RFC 0008 section 3.4.

($\Leftarrow$) An admitted Participant whose Capability Announcement does not satisfy `required_capabilities` produces a Step Receipt whose action is not in the Workflow's recognized action vocabulary. The Workflow Receipt verifier of RFC 0008 section 3.4 rejects such Step Receipts. Soundness fails. The bidirectional implication is established. $\blacksquare$

**Corollary A.2.1 (Composability with Receipts of Reversal).** Theorem A.2 composes with the cooling-off receipt path of RFC 0017 unchanged: an Ad Hoc Participant whose Step Receipt is later reversed produces a Reversal Receipt whose verification proceeds as in RFC 0017 with no additional clauses required.

### A.3 Unilateral Participation Dominance

This subsection formalizes the design property on which the unilateral-adoption commitment of section 1 rests: protocol-following must be at least weakly preferable for an OAP Agent regardless of the population mix it encounters. The argument is a population-game variant of the focal-point selection result of Young (1998).

**Population game.** Let $p \in [0,1]$ be the fraction of Protocol-Followers in a sufficiently large population from which $|N|$ peers are sampled uniformly. Let $V_{\text{coord}} > 0$ be the per-context coordination payoff when at least one peer is also a Protocol-Follower, and let $V_{\text{fallback}} \ge 0$ be the payoff of the AHT Fallback Policy in the absence of any Protocol-Follower peer. Let $C_\tau \ge 0$ be the cost of the unilateral timeout $\tau_1$ (publication bandwidth and waiting time). Let $\alpha \in [0,1]$ be the fraction of $V_{\text{coord}}$ that a non-following peer can capture by free-riding on observed published Convention Spaces.

The expected utility of the two pure strategies in a sample of size $|N|$ is

$$u_F(p) \;=\; \big(1 - (1-p)^{|N|-1}\big)\, V_{\text{coord}} \;+\; (1-p)^{|N|-1}\, V_{\text{fallback}} \;-\; C_\tau,$$

$$u_{NF}(p) \;=\; \alpha \,\big(1 - (1-p)^{|N|-1}\big)\, V_{\text{coord}} \;+\; V_{\text{fallback}}.$$

**Theorem A.3 (Unilateral Participation Dominance).** *Define the critical adopter density*

$$p^* \;:=\; 1 - \left(1 - \frac{C_\tau + V_{\text{fallback}} - V_{\text{fallback}}}{(1-\alpha)\, V_{\text{coord}}}\right)^{1/(|N|-1)} \;=\; 1 - \left(1 - \frac{C_\tau}{(1-\alpha)\, V_{\text{coord}}}\right)^{1/(|N|-1)}.$$

*If $C_\tau < (1-\alpha) V_{\text{coord}}$, then $u_F(p) > u_{NF}(p)$ for every $p > p^*$, and therefore protocol-following is strictly dominant in the population game above $p^*$. As $C_\tau \to 0$, $p^* \to 0$, so any positive adopter density makes protocol-following strictly dominant. At $p \le p^*$, $u_F(p) \ge u_{NF}(p) - C_\tau$, so protocol-following is weakly dominant up to the bounded loss $C_\tau$.*

**Proof.** Direct calculation of $u_F(p) - u_{NF}(p) = (1-\alpha)(1 - (1-p)^{|N|-1}) V_{\text{coord}} - C_\tau$. The expression is non-negative iff $(1-p)^{|N|-1} \le 1 - C_\tau / ((1-\alpha) V_{\text{coord}})$, which gives the stated $p^*$. The limit as $C_\tau \to 0$ is immediate. The weak-dominance bound at $p \le p^*$ follows because the quantity is bounded below by $-C_\tau$. $\blacksquare$

**Remark A.3.1 (Operational Significance).** Theorem A.3 is the formal answer to the unilateral-adoption design property of section 1. It shows that for an OAP-speaking Agent, the *only* utility cost of speaking the protocol when no peer does is the bounded timeout cost $C_\tau$, and that this cost is dominated by coordination gains as soon as the adopter density exceeds $p^*$. Because $C_\tau$ is small by design (section 3.5 default `unilateral_timeout_ms` is 1500 ms), $p^*$ is small in practice, and unilateral adoption is a strictly dominant strategy in any realistic open multi-agent ecosystem. This is the population-game analog of the diffusion-of-conventions result of Young (1998, Theorem 5.4).

**Remark A.3.2 (Comparison to RoboCup Drop-In).** The Genter, Laue, and Stone (2017) Drop-In Player Challenge introduced an institutionally-coordinated communication protocol for a fixed competition. The OAP three-tier handshake differs structurally: it does not require institutional coordination because Theorem A.3 supplies the incentive for unilateral adoption in an open population. The RoboCup result is recovered as the special case $p = 1$ enforced by competition rules.

### A.4 Robustness under Private and Partial Type Spaces

The first-revision draft assumed every Agent publishes its Convention Space in full. The Wang, Rahman, Xiao, Liu, Stone, and Niekum (2024) POAM formulation operates over private type spaces in which an Agent may not publish, and may observe only a partial action signal of its peers. This subsection establishes that the bounded termination of Theorem A.1 is robust to private type spaces, and that the coordination-payoff loss is bounded by a Lipschitz function of the suppressed private content.

**Setup.** Let peer $j$ have a private type $\theta_j \in \Theta_j$ with implicit Convention Space $\mathcal{C}_j(\theta_j) \subseteq \mathcal{C}$. Let $\mathcal{C}_j' \subseteq \mathcal{C}_j(\theta_j)$ be the published subset (possibly empty for $j \in N_O$). Let $L \ge 0$ be a Lipschitz constant of the regret function $\mathrm{regret}(\cdot, \theta_j)$ over the Hausdorff distance on subsets of $\mathcal{C}$.

**Theorem A.4 (Robustness under Private Type Spaces).** *Theorem A.1 holds with $\mathcal{C}_j$ replaced everywhere by $\mathcal{C}_j'$. Furthermore, the maximum regret of the committed Convention $C^\dagger$ relative to the full-information benchmark satisfies*

$$\max_{j \in N} \mathbb{E}_{\theta_j \sim \pi_j^{(k)}}\!\left[\mathrm{regret}(C^\dagger, \theta_j)\right] \;\le\; \max_{j \in N} \mathbb{E}_{\theta_j \sim \pi_j^{(k)}}\!\left[\mathrm{regret}(C^\dagger_{\text{full}}, \theta_j)\right] \;+\; L \cdot \max_{j \in N} d_H\!\big(\mathcal{C}_j', \mathcal{C}_j(\theta_j)\big),$$

*where $C^\dagger_{\text{full}}$ is the Convention selected under full publication and $d_H$ is the Hausdorff distance. As $k \to \infty$, the right-hand bound shrinks at the rate of Theorem C.1, because $\pi_j^{(k)}$ concentrates on $\theta^*_j$ and the agent infers $\mathcal{C}_j(\theta_j)$ via marginalization over $\pi_j^{(k)}$.*

**Proof sketch.** The Schelling reduction of Tier 1 is monotone in the published sets: a smaller published set yields an at-least-as-large reduction, and the lexicographic tie-break is well-defined on any non-empty intersection. Thus Tier 1 either succeeds with $C^*_1$ in the published intersection or fails gracefully into Tier 2, and termination of Theorem A.1 is unaffected. The regret bound follows from the Lipschitz property of the regret function and the standard inequality $|\mathrm{regret}(C, \mathcal{C}_j(\theta_j)) - \mathrm{regret}(C, \mathcal{C}_j')| \le L \cdot d_H(\mathcal{C}_j', \mathcal{C}_j(\theta_j))$ applied uniformly over $C \in \mathcal{F}$. The asymptotic shrinkage follows from Theorem C.1 by direct substitution of the posterior into the Tier 3 expectation. $\blacksquare$

**Remark A.4.1 (Answer to the POAM Compatibility Question).** Theorem A.4 establishes that the Three-Tier Handshake composes with private-type-space algorithms such as POAM without breaking the bounded termination guarantee of Theorem A.1 and without producing unbounded coordination loss. The handshake converges the public coordination frame; the AHT Fallback Policy adapts within it. The two are complementary in exactly the way conjectured in revision 1.

### A.5 Bayesian Type Inference Convergence

This subsection states the standard convergence result for Bayesian inference over teammate types in the ad hoc teamwork setting and locates it in the OAP Reputation system.

**Theorem C.1 (Posterior Convergence over Reputation Profiles).** *Let an Ad Hoc Participant's true type $\theta^* \in \Theta$ be drawn from a prior distribution $\pi_0$ over a finite set of types $\Theta$ with $|\Theta| < \infty$, and suppose the participating Agents observe action signals $a_1, a_2, \ldots, a_k$ that are conditionally independent given $\theta^*$, with $\Pr(a \mid \theta) > 0$ for every action $a$ realized in the support of the data-generating process. Then the posterior $\pi_k(\theta) := \Pr(\theta \mid a_1, \ldots, a_k)$ converges almost surely to the point mass $\delta_{\theta^*}$ as $k \to \infty$, and the total variation distance satisfies the PAC bound*

$$
\Pr\!\left( \| \pi_k - \delta_{\theta^*} \|_{\mathrm{TV}} \ge \epsilon \right) \;\le\; \delta
\quad \text{whenever} \quad k \;\ge\; \frac{C \cdot \log(|\Theta| / \delta)}{\epsilon^2 \cdot d_{\min}^2}
$$

*for a universal constant $C > 0$, where $d_{\min} := \min_{\theta \neq \theta^*} D_{\mathrm{KL}}\!\left( \Pr(\cdot \mid \theta^*) \,\|\, \Pr(\cdot \mid \theta) \right)$ is the smallest Kullback-Leibler divergence between the true type and any alternative type.*

**Proof sketch.** The result is the standard Bayesian consistency theorem (Doob 1949) combined with the Hoeffding-style concentration bound on log-likelihood ratios. The PAC bound follows from the bound of Albrecht and Stone (2018, Proposition 3.2) under the realizability assumption that $\theta^* \in \Theta$. $\blacksquare$

**Remark C.1.1 (Operational Use).** An OAP Agent that maintains a Bayesian belief over the type of an Ad Hoc Participant SHOULD use the posterior $\pi_k$ to set the `reputation_threshold` of section 3.3 dynamically: the threshold can be relaxed once $\pi_k$ concentrates on a benign type with high probability, and tightened in the opposite case. This converts Theorem C.1 into a control rule for adaptive admission.

**Remark C.1.2 (When Realizability Fails).** If $\theta^* \notin \Theta$, the posterior converges to the type in $\Theta$ closest in Kullback-Leibler divergence to $\theta^*$. The Mirsky et al. (2022) survey treats this case under the heading of *open ad hoc teamwork* and notes that PLASTIC-style policies (Albrecht and Ramamoorthy 2013) and POAM (Wang et al. 2024) remain the strongest known approximations. OAP does not mandate any specific online policy; it provides the protocol substrate over which any such policy may operate, declared as the AHT Fallback Policy of section 3.4a.

### A.6 Strengthened Results: Endogenous Selection, Lipschitz Derivation, Misspecified Realizability

This subsection sharpens the three theorems most exposed to external review. It addresses the assumptions made in Theorems A.3, A.4, and C.1 and replaces them with weaker assumptions that hold in deployed open multi-agent ecosystems.

**Theorem A.3' (Unilateral Dominance under Endogenous Peer Selection).** *Drop the uniform sampling assumption of Theorem A.3 and replace it with a Markov peer-selection kernel $K(\cdot \mid s)$ that maps the Agent's observable state $s$ (its Reputation Profile, declared scope, jurisdiction) to a distribution over peer compositions. Suppose $K$ is bounded below by a base rate $\beta > 0$ on the indicator that at least one sampled peer is a Protocol-Follower, uniformly over $s$. Then for every $s$,*

$$u_F(s) - u_{NF}(s) \;\ge\; (1 - \alpha)\,\beta\, V_{\text{coord}} \;-\; C_\tau,$$

*and the unilateral-dominance critical density of Theorem A.3 generalizes to the operational condition $C_\tau < (1 - \alpha)\,\beta\, V_{\text{coord}}$. The critical adopter density is replaced by an operational threshold on $\beta$, which an open Registry (RFC 0026) makes observable and contractible.*

**Proof sketch.** Conditioning on $s$ and applying the bound $\Pr_K(\text{at least one P}) \ge \beta$ yields the displayed inequality directly. The remainder follows by the same calculation as Theorem A.3. The Markov property is required only for the conditional decoupling; correlated peer selection (e.g., reputation-driven routing where high-reputation Agents are more likely to be matched together) increases $\beta$ in practice and therefore strengthens the bound. $\blacksquare$

**Remark A.6.1 (Why $\beta > 0$ is realistic).** In any open marketplace with Registry-based discovery, the probability that at least one matched peer is a Protocol-Follower is bounded below by the fraction of registered L4+ implementations under the matching scope. Once a single L4+ implementation exists, $\beta > 0$ holds for any peer drawn from the Registry. The unilateral-adoption result therefore holds from the moment of the first deployed conformance receipt, not in the limit.

**Theorem A.4' (Derivation of the Lipschitz Constant from Regret Structure).** *Let the coordination game have a finite action set $\mathcal{A}$ and per-action utility $u: \mathcal{A} \times \mathcal{A} \to [0, U]$, with $\mathrm{regret}(C, \theta) := \max_{a \in \mathcal{A}} u(a, b_\theta) - \mathbb{E}_{a \sim \pi_C}[u(a, b_\theta)]$ for the Convention-induced action distribution $\pi_C$ and the type-conditional best response $b_\theta$. Then the regret function satisfies the Lipschitz inequality of Theorem A.4 with*

$$L \;\le\; U \cdot \max_{C \in \mathcal{C}} \mathrm{TV}\!\left(\pi_C, \pi_{C'}\right) \;\cdot\; |\mathcal{A}|,$$

*where the maximum is taken over all Conventions $C$ that differ from $C'$ in exactly one assigned action. For Conventions encoded as deterministic mappings $\mathcal{C} \to \mathcal{A}$ (the typical case), the TV term is at most 1 and $L \le U \cdot |\mathcal{A}|$.*

**Proof.** Standard Lipschitz argument over total-variation perturbations of the action distribution combined with the bounded utility $U$. The deterministic-Convention reduction is direct from $\mathrm{TV} \le 1$. $\blacksquare$

**Remark A.6.2 (Operational Use).** Theorem A.4' lets an implementer compute $L$ from two domain quantities: the upper bound $U$ on per-action utility and the action-set cardinality $|\mathcal{A}|$. Both are observable from the Agent's Manifest. The Lipschitz constant is therefore not an implicit assumption but a derived property the Manifest can publish, closing the gap noted in Section A.4.

**Theorem C.1' (Posterior Convergence under Misspecified Realizability).** *Drop the realizability assumption $\theta^* \in \Theta$ of Theorem C.1. Let $\theta^* \in \Theta^\star \supsetneq \Theta$. Then the posterior $\pi_k$ over $\Theta$ converges almost surely to the point mass $\delta_{\theta^\sharp}$ on the Kullback-Leibler-projection*

$$\theta^\sharp \;:=\; \arg\min_{\theta \in \Theta} D_{\mathrm{KL}}\!\left( \Pr(\cdot \mid \theta^*) \,\|\, \Pr(\cdot \mid \theta) \right),$$

*at the same rate as Theorem C.1 with $d_{\min}$ replaced by $d_{\min}^\sharp := \min_{\theta \neq \theta^\sharp,\, \theta \in \Theta} D_{\mathrm{KL}}\!\left( \Pr(\cdot \mid \theta^*) \,\|\, \Pr(\cdot \mid \theta) \right) - D_{\mathrm{KL}}\!\left( \Pr(\cdot \mid \theta^*) \,\|\, \Pr(\cdot \mid \theta^\sharp) \right)$. The Tier 3 minimax-regret selection of section 3.4.3 remains well-defined; its committed Convention $C^\dagger$ satisfies the regret bound of Theorem A.4 with the Hausdorff distance term replaced by $d_H(\mathcal{C}_j(\theta^\sharp_j), \mathcal{C}_j(\theta^*_j))$, the Hausdorff distance between the Convention Spaces of the projected and the true type.*

**Proof sketch.** The KL-projection result is the standard misspecified-Bayes consistency of Berk (1966) and Kleijn and van der Vaart (2006); the rate follows by the same Hoeffding-style concentration as Theorem C.1 applied to the log-likelihood-ratio process restricted to $\Theta$. The regret bound follows from Theorem A.4' by triangle inequality on the Hausdorff distance. $\blacksquare$

**Remark A.6.3 (Operational Significance).** Theorem C.1' is the Open AHT generalization (Mirsky et al. 2022 §3.5) of Theorem C.1. It states that even when the Agent's type space $\Theta$ does not contain the true peer type, the inferred convention is the best Hausdorff-approximation available within $\Theta$, and the OAP-Receipt chain remains verifiable because the Convention Receipt records the inputs from which the projection was derived. This eliminates the realizability assumption that Stone et al. (2010) and Mirsky et al. (2022) flag as the principal open problem of AHT theory.

### A.7 Composition with the Coalition Formation Framework of RFC 0008

The coalition formation framework of RFC 0008 Appendix B assumes that each Agent $i$ knows its own contribution function $c_i: 2^{\mathcal{A}} \to \mathbb{R}$ and is willing to publish it. When ad hoc teamwork extends RFC 0008, the contribution function may be initially unknown to all but the contributing Agent. The Capability Announcement of section 3.2 partially substitutes for the published $c_i$ by declaring the action set; the Bayesian inference of Theorem C.1 supplies the value of those actions over time. The composition is sound: the core of the coalitional game restricted to Agents whose Reputation Profile exceeds the threshold is non-empty under the same conditions as in RFC 0008 Appendix B, with the threshold acting as a bound on uncertainty about $c_i$.

### A.8 References to the Multi Agent Systems Ad Hoc Teamwork Lineage

* Stone, P., Kaminka, G. A., Kraus, S., and Rosenschein, J. S. (2010). Ad Hoc Autonomous Agent Teams: Collaboration without Pre-coordination. *Proceedings of the AAAI Conference on Artificial Intelligence*.
* Barrett, S., Stone, P., and Kraus, S. (2011). Empirical Evaluation of Ad Hoc Teamwork in the Pursuit Domain. *Proceedings of the International Conference on Autonomous Agents and Multi-Agent Systems*.
* Albrecht, S. V., and Ramamoorthy, S. (2013). A Game-Theoretic Model and Best-Response Learning Method for Ad Hoc Coordination in Multiagent Systems. *Proceedings of AAMAS*.
* Barrett, S., and Stone, P. (2015). Cooperating with Unknown Teammates in Complex Domains: A Robot Soccer Case Study of Ad Hoc Teamwork. *Proceedings of AAAI*.
* Genter, K., Laue, T., and Stone, P. (2017). Three Years of the RoboCup Standard Platform League Drop-In Player Competition: Creating and Maintaining a Large Scale Ad Hoc Teamwork Robotics Competition. *Journal of Autonomous Agents and Multi-Agent Systems*.
* Albrecht, S. V., and Stone, P. (2018). Autonomous Agents Modelling Other Agents: A Comprehensive Survey and Open Problems. *Artificial Intelligence* 258.
* Chen, S., Andrejczuk, E., Cao, Z., and Zhang, J. (2020). AATEAM: Achieving the Ad Hoc Teamwork by Employing the Attention Mechanism. *Proceedings of AAAI*.
* Mirsky, R., Carlucho, I., Rahman, A., Fosong, E., Macke, W., Sridharan, M., Stone, P., and Albrecht, S. V. (2022). A Survey of Ad Hoc Teamwork Research: Definitions, Methods, and Open Problems. *Proceedings of the European Conference on Multi-Agent Systems*.
* Rahman, A., Cui, J., and Stone, P. (2024). Coverage-Robust Ad Hoc Teamwork via Adversarial Teammate Generation (ROTATE). *Proceedings of NeurIPS*.
* Wang, C. L., Rahman, A., Xiao, L., Liu, B., Stone, P., and Niekum, S. (2024). N-Agent Ad Hoc Teamwork via Partially Observable Agent Modeling (POAM). *Proceedings of NeurIPS*.
* Schelling, T. C. (1960). The Strategy of Conflict. Harvard University Press.
* Lewis, D. K. (1969). Convention: A Philosophical Study. Harvard University Press.
* Lamport, L., Shostak, R., and Pease, M. (1982). The Byzantine Generals Problem. *ACM Transactions on Programming Languages and Systems* 4(3).
* Young, H. P. (1993). The Evolution of Conventions. *Econometrica* 61(1).
* Young, H. P. (1998). Individual Strategy and Social Structure. Princeton University Press.
* Doob, J. L. (1949). Application of the Theory of Martingales. *Le Calcul des Probabilites et ses Applications*.
* Berk, R. H. (1966). Limiting Behavior of Posterior Distributions when the Model is Incorrect. *Annals of Mathematical Statistics* 37(1).
* Kleijn, B. J. K., and van der Vaart, A. W. (2006). Misspecification in Infinite-Dimensional Bayesian Statistics. *Annals of Statistics* 34(2).
