# RFC 0027: Ad Hoc Teamwork and Convention Discovery

**Status:** Draft
**Author(s):** T. Fengler (Editor)
**Working Group:** Core Protocol
**Created:** 2026-05-05
**Working Group:** Core Protocol
**Targets:** 1.2
**Affects:** RFC 0001 (Sessions), RFC 0008 (Workflows), RFC 0009 (Reputation), RFC 0019 (Conformance), RFC 0024 (Schema Negotiation), OAP-CORE-1.0 Section 9 (Manifest), Section 17 (Receipts).

## 1. Summary

This RFC defines the normative substrate for *ad hoc teamwork* in OAP: the situation in which two or more Agents must cooperate on a shared task without prior coordination, without a pre-shared Workflow definition, and without prior knowledge of one another's capabilities, types, or strategies. It introduces three additions to the protocol:

1. A **Capability Announcement** message (`oap.capability.v1`) that lets a previously unknown Agent advertise the actions it can take in a Session or Workflow.
2. A **Late Join Procedure** for in-progress Workflows (RFC 0008) and Sessions (RFC 0001) that admits new Participants on capability match without requiring Convener approval, with explicit safety rails.
3. A **Convention Discovery Handshake** that lets two or more Agents converge on a coordination convention (turn order, role assignment, payoff allocation) in a bounded number of rounds.

The motivation is the agent-to-agent commerce reality the rest of OAP enables: new Tools and Agents come online continuously. The protocol must support cooperation among Agents that have never met, with no opportunity for a designer to pre-coordinate them. This is the *ad hoc autonomous agent teams* problem of Stone, Kaminka, Kraus, and Rosenschein (2010).

## 2. Motivation

OAP-CORE-1.0 and the RFCs accepted to date assume cooperation under *closed-world coordination*: Workflow definitions list participants up front (RFC 0008 section 3.2), Sessions admit Participants on Convener signature (RFC 0001 section 3.6), and Negotiation occurs between two Parties that have already discovered each other (RFC 0002). This is sufficient for vertically integrated deployments and for marketplaces with deliberate onboarding, but it is insufficient for four classes of production scenario:

1. **Marketplace fulfillment substitution.** A consumer Agent has a fulfilled Workflow with a primary supplier; the supplier becomes unavailable mid-execution; an alternative supplier with overlapping capability must join Step $N$ without renegotiating the entire Workflow.
2. **Open Coordination Sessions.** A community Tool publishes a Session for collaborative document editing or scheduling; new Participants discover the Session through the Registry (RFC 0026) and must join based on declared capability rather than per-Participant signed admission.
3. **Emergency response.** An incident requires immediate cooperation among Agents owned by different Principals with no opportunity for Convener-mediated onboarding.
4. **Convention emergence in repeated games.** A population of Agents repeatedly interacts; coordination conventions (turn order, currency choice, dispute resolution rule) must emerge endogenously, without a central authority dictating them.

Without this RFC, every implementation reinvents these mechanisms, creating both interoperability cost and security risk. This RFC defines the minimal protocol additions required to make all four scenarios first-class.

## 3. Specification

### 3.1 Terminology

| Term | Definition |
|------|------------|
| Ad Hoc Participant | An Agent that joins a Workflow or Session after its initiation, without being listed in the original Workflow or Session definition. |
| Capability Announcement | A signed declaration of the actions an Agent can perform, scoped to a specific coordination context. |
| Convention | A common rule for resolving a coordination problem with multiple equilibria (turn order, tie-break, role assignment, payoff allocation). |
| Convention Space | The set of admissible Conventions agreed by the participating Agents in advance of any specific instance. |
| Late Join | Admission of an Ad Hoc Participant to a Session or Workflow that is already in progress. |
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

### 3.4 Convention Discovery Handshake

When two or more Agents must agree on a coordination Convention before any binding action can be taken, they execute the following bounded handshake.

1. **Convention Space Publication.** Each Agent publishes its admissible Convention Space, ordered by preference, signed by the Agent's DID.
2. **Schelling Reduction.** The Convention Space is reduced to the intersection of all participating Agents' published spaces. If the intersection is empty, the handshake terminates with `convention_failed` and no binding action follows.
3. **Lexicographic Tie Break.** The remaining Conventions are ordered by the canonical lexicographic ordering of their structured representation (UTF-8 byte order on the JSON canonicalization defined in RFC 8785). The first Convention in this order is the agreed Convention.
4. **Co-signed Convention Receipt.** All participating Agents co-sign a `ConventionReceipt` recording the agreed Convention and the inputs from which it was derived. This Receipt is appended to the hosting Tool's Transparency Log.

The handshake terminates in at most $|N| + 1$ communication rounds, where $|N|$ is the number of participating Agents. Section 5 (Theorem A.1) gives the formal termination guarantee.

### 3.5 Manifest Declaration

An Agent that supports ad hoc teamwork extensions declares it in its Manifest:

```json
{
  "ad_hoc_teamwork": {
    "supported": true,
    "capability_announcement_v1": true,
    "late_join_modes": ["capability_match", "open"],
    "convention_discovery_v1": true,
    "max_capabilities_per_announcement": 64
  }
}
```

A Tool that does not declare `ad_hoc_teamwork.supported = true` continues to operate under the closed-world coordination model of OAP-CORE-1.0 and the existing RFCs.

### 3.6 Composition with Other RFCs

| Other RFC | Composition |
|-----------|-------------|
| RFC 0001 (Sessions) | The `admission_mode` field of section 3.3 lives in the Session definition. `capability_match` is an additional admission path; `convener_gated` admission of section 3.6 of RFC 0001 is unaffected. |
| RFC 0008 (Workflows) | The `admission_mode`, `required_capabilities`, `late_join_until_step`, and `max_late_joiners` fields live in the Workflow definition. The Workflow Receipt of RFC 0008 section 3.4 MUST list the Ad Hoc Participants and their `LateJoinReceipt` IDs in addition to the originally listed Participants. |
| RFC 0009 (Reputation) | The `reputation_threshold` of section 3.3 is evaluated against the Reputation Profile defined in RFC 0009 Appendix A.1. Theorem C.1 below establishes the convergence rate of Bayesian type inference over the Reputation Profile. |
| RFC 0024 (Schema Negotiation) | When the Capability Announcement of section 3.2 references a `schema_ref` not previously seen by the receiver, the Schema Negotiation Protocol of RFC 0024 is invoked before the capability is used. |
| RFC 0026 (Registry) | The published Manifest declarations of section 3.5 are discoverable through the OAP Registry. |

## 4. Backward Compatibility

This RFC is strictly additive. Tools that do not implement it continue to operate under the closed-world coordination model of OAP-CORE-1.0. The default `admission_mode` is `convener_gated`, which preserves the prior behavior. Workflow Receipts that contain no Ad Hoc Participant entries are byte-identical to Receipts produced under the prior model.

## 5. Security Considerations

**Capability Forgery.** An Ad Hoc Participant might announce capabilities it cannot deliver. Section 3.2 requires the announced action to be present in the Agent's published Manifest, which is independently verifiable through the Registry (RFC 0026). The Reputation system (RFC 0009) penalizes Agents whose announced capabilities consistently fail at execution time.

**Sybil Attack on Late Join.** A coalition of malicious Agents might register many Sybil identities and flood a Workflow with Late Join requests. The `max_late_joiners` constraint of section 3.3 bounds the damage; the Sybil resistance machinery of RFC 0011 increases the cost of producing fresh identities; the `reputation_threshold` of section 3.3 excludes identities without an established Profile.

**Convention Manipulation.** A participating Agent might publish a Convention Space crafted to force a specific lexicographically-first Convention favorable to it. The handshake of section 3.4 is symmetric: every Agent's published space is co-signed and appears in the Convention Receipt. Adversarial manipulation is therefore detectable post hoc and feeds back into the Reputation system.

**Race Conditions.** Two or more Late Join requests may arrive concurrently. The hosting Tool MUST serialize admission decisions through a single monotonic counter and MUST emit Receipts in the order of admission.

**Confidentiality.** A Late Joining Participant by definition was not present when prior Confidentiality and Compliance Context (CCC) was established. The hosting Tool MUST evaluate whether the Ad Hoc Participant satisfies the CCC of the existing Workflow or Session, and MUST refuse admission if it does not. This composes with the CCC inheritance rule of RFC 0002 section 3.7 and with the Persona policy of RFC 0006.

## 6. Privacy Considerations

Capability Announcements are signed and discoverable. They expose the announcing Agent's action surface beyond what its Manifest already publishes only when the announcement scopes capabilities to a specific Workflow or Session, which is itself observable through the Transparency Log. Agents that wish to maintain action privacy SHOULD limit the scope of Capability Announcements through the Persona mechanism of RFC 0006.

## 7. Conformance Impact

Ad hoc teamwork is OPTIONAL at L2. It is REQUIRED at L4 if the implementation declares any Workflow or Session in `capability_match` or `open` mode. Three new conformance probes are added to RFC 0019:

* `behavior/ad-hoc-late-join.test.js` validates the Late Join Procedure of section 3.3.
* `behavior/ad-hoc-capability-announcement.test.js` validates the Capability Announcement schema of section 3.2 and the Manifest cross-check.
* `behavior/ad-hoc-convention-discovery.test.js` validates the Convention Discovery Handshake of section 3.4 and the bounded-round termination of Theorem A.1.

## 8. Implementation Experience

The AssistNet Booking Engine implements a comparable Late Join mechanism for collaborative scheduling and a Convention Discovery handshake for tie-break on time slot proposals. A reference implementation is committed to `reference/server/ad-hoc/`.

## 9. Alternatives Considered

* **Mandatory Convener for all admission.** Rejected because it forecloses the four scenarios listed in section 2 and is incompatible with decentralized marketplace dynamics.
* **Free-text capability declarations.** Rejected because they are not machine verifiable and prevent automated capability matching.
* **Implicit late join via Negotiation.** Rejected because Negotiation (RFC 0002) is bilateral, whereas ad hoc teamwork is generically multilateral.

## 10. References

* OAP-CORE-1.0, Sections 9, 11, 17.
* RFC 0001, RFC 0002, RFC 0008, RFC 0009, RFC 0011, RFC 0019, RFC 0024, RFC 0026.

## Appendix A: Bounded Convergence of the Convention Discovery Handshake

This appendix is normative for the termination claims it makes about the handshake of section 3.4 and informative for the supporting commentary. The treatment follows the focal point analysis of Schelling (1960), the convention emergence theory of Lewis (1969) and Young (1993, 1998), and the multi agent systems treatment of ad hoc teamwork by Stone, Kaminka, Kraus, and Rosenschein (2010), Albrecht and Stone (2018), and the Mirsky et al. (2022) survey.

### A.1 Termination

**Theorem A.1 (Bounded Termination of Convention Discovery).** *Let $N$ be the set of Agents participating in a Convention Discovery Handshake of section 3.4, with $|N| \ge 2$. Suppose every Agent transmits its Convention Space within the protocol's `default_validity_minutes` window. Then the handshake terminates in at most $|N| + 1$ communication rounds with either an agreed Convention or with `convention_failed`.*

**Proof.** Round 1 is the Convention Space Publication phase: each Agent transmits its space, in parallel, in a single round of the network. Rounds 2 through $|N| + 1$ are required only in the worst case of strict serialization for the hosting Tool to compute the intersection, apply the lexicographic tie break, and circulate the Convention Receipt for co-signature. In the synchronous parallel case, rounds 2 and 3 suffice. Termination is unconditional because the lexicographic ordering of section 3.4 is total over canonicalized JSON (RFC 8785), so step 3 of the handshake either selects a unique Convention or determines that the intersection is empty in finite time. $\blacksquare$

**Remark A.1.1 (Optimality).** The lower bound is two rounds (publication, then receipt). The handshake is therefore optimal up to a small constant factor. Tighter bounds in the synchronous parallel model are possible but not normative.

**Remark A.1.2 (Comparison to Empirical Convergence).** Young (1993) established that uncoordinated repeated play in a coordination game converges to a single Convention in expected time exponential in the number of strategies. The OAP handshake circumvents this by transforming the implicit coordination problem into an explicit one round publication followed by a deterministic resolver. The Convention Receipt is the artifact that makes this transformation possible: it provides the binding commitment that uncoordinated repeated play lacks.

### A.2 Late Join Safety

**Theorem A.2 (Late Join Preserves Workflow Soundness).** *Let $W$ be a Workflow with admission_mode = `capability_match` and let $W'$ be the Workflow after admission of Ad Hoc Participants. The Receipts produced by $W'$ remain verifiable against the Workflow definition of $W$ in the sense of RFC 0008 section 3.4 if and only if every admitted Participant's Capability Announcement satisfies the `required_capabilities` and `reputation_threshold` constraints of section 3.3.*

**Proof.** ($\Rightarrow$) Soundness of the Workflow Receipt of RFC 0008 section 3.4 requires that each Step Receipt is signed by an Agent that the Workflow accepts as a holder of the Step's role. Late Join admission is granted only on satisfaction of `required_capabilities`, which is the protocol's machine readable encoding of Step role compatibility, and on satisfaction of `reputation_threshold`, which is the protocol's encoding of trust necessary to bind the Step output to the Workflow Receipt chain. A Step Receipt produced by a Participant admitted under section 3.3 therefore meets the verification preconditions of RFC 0008 section 3.4.

($\Leftarrow$) An admitted Participant whose Capability Announcement does not satisfy `required_capabilities` produces a Step Receipt whose action is not in the Workflow's recognized action vocabulary. The Workflow Receipt verifier of RFC 0008 section 3.4 rejects such Step Receipts. Soundness fails. The bidirectional implication is established. $\blacksquare$

**Corollary A.2.1 (Composability with Receipts of Reversal).** Theorem A.2 composes with the cooling-off receipt path of RFC 0017 unchanged: an Ad Hoc Participant whose Step Receipt is later reversed produces a Reversal Receipt whose verification proceeds as in RFC 0017 with no additional clauses required.

### A.3 Bayesian Type Inference Convergence

This subsection is informative. It states the standard convergence result for Bayesian inference over teammate types in the ad hoc teamwork setting and locates it in the OAP Reputation system.

**Theorem C.1 (Posterior Convergence over Reputation Profiles).** *Let an Ad Hoc Participant's true type $\theta^* \in \Theta$ be drawn from a prior distribution $\pi_0$ over a finite set of types $\Theta$ with $|\Theta| < \infty$, and suppose the participating Agents observe action signals $a_1, a_2, \ldots, a_k$ that are conditionally independent given $\theta^*$, with $\Pr(a \mid \theta) > 0$ for every action $a$ realized in the support of the data-generating process. Then the posterior $\pi_k(\theta) := \Pr(\theta \mid a_1, \ldots, a_k)$ converges almost surely to the point mass $\delta_{\theta^*}$ as $k \to \infty$, and the total variation distance satisfies the PAC bound*

$$
\Pr\!\left( \| \pi_k - \delta_{\theta^*} \|_{\mathrm{TV}} \ge \epsilon \right) \;\le\; \delta
\quad \text{whenever} \quad k \;\ge\; \frac{C \cdot \log(|\Theta| / \delta)}{\epsilon^2 \cdot d_{\min}^2}
$$

*for a universal constant $C > 0$, where $d_{\min} := \min_{\theta \neq \theta^*} D_{\mathrm{KL}}\!\left( \Pr(\cdot \mid \theta^*) \,\|\, \Pr(\cdot \mid \theta) \right)$ is the smallest Kullback-Leibler divergence between the true type and any alternative type.*

**Proof sketch.** The result is the standard Bayesian consistency theorem (Doob 1949) combined with the Hoeffding-style concentration bound on log-likelihood ratios. The PAC bound follows from the bound of Albrecht and Stone (2018, Proposition 3.2) under the realizability assumption that $\theta^* \in \Theta$. $\blacksquare$

**Remark C.1.1 (Operational Use).** An OAP Agent that maintains a Bayesian belief over the type of an Ad Hoc Participant SHOULD use the posterior $\pi_k$ to set the `reputation_threshold` of section 3.3 dynamically: the threshold can be relaxed once $\pi_k$ concentrates on a benign type with high probability, and tightened in the opposite case. This converts Theorem C.1 into a control rule for adaptive admission.

**Remark C.1.2 (When Realizability Fails).** If $\theta^* \notin \Theta$, the posterior converges to the type in $\Theta$ closest in Kullback-Leibler divergence to $\theta^*$. The Mirsky et al. (2022) survey treats this case under the heading of *open ad hoc teamwork* and notes that PLASTIC-style policies (Albrecht and Ramamoorthy 2013) remain the strongest known approximation. OAP does not mandate any specific online policy; it provides the protocol substrate over which any such policy may operate.

### A.4 Composition with the Coalition Formation Framework of RFC 0008

The coalition formation framework of RFC 0008 Appendix B assumes that each Agent $i$ knows its own contribution function $c_i: 2^{\mathcal{A}} \to \mathbb{R}$ and is willing to publish it. When ad hoc teamwork extends RFC 0008, the contribution function may be initially unknown to all but the contributing Agent. The Capability Announcement of section 3.2 partially substitutes for the published $c_i$ by declaring the action set; the Bayesian inference of Theorem C.1 supplies the value of those actions over time. The composition is sound: the core of the coalitional game restricted to Agents whose Reputation Profile exceeds the threshold is non-empty under the same conditions as in RFC 0008 Appendix B, with the threshold acting as a bound on uncertainty about $c_i$.

### A.5 References to the Multi Agent Systems Ad Hoc Teamwork Lineage

* Stone, P., Kaminka, G. A., Kraus, S., and Rosenschein, J. S. (2010). Ad Hoc Autonomous Agent Teams: Collaboration without Pre-coordination. *Proceedings of the AAAI Conference on Artificial Intelligence*.
* Albrecht, S. V., and Stone, P. (2018). Autonomous Agents Modelling Other Agents: A Comprehensive Survey and Open Problems. *Artificial Intelligence* 258.
* Mirsky, R., Carlucho, I., Rahman, A., Fosong, E., Macke, W., Sridharan, M., Stone, P., and Albrecht, S. V. (2022). A Survey of Ad Hoc Teamwork Research: Definitions, Methods, and Open Problems. *Proceedings of the European Conference on Multi-Agent Systems*.
* Barrett, S., Stone, P., and Kraus, S. (2011). Empirical Evaluation of Ad Hoc Teamwork in the Pursuit Domain. *Proceedings of the International Conference on Autonomous Agents and Multi-Agent Systems*.
* Albrecht, S. V., and Ramamoorthy, S. (2013). A Game-Theoretic Model and Best-Response Learning Method for Ad Hoc Coordination in Multiagent Systems. *Proceedings of AAMAS*.
* Schelling, T. C. (1960). The Strategy of Conflict. Harvard University Press.
* Lewis, D. K. (1969). Convention: A Philosophical Study. Harvard University Press.
* Young, H. P. (1993). The Evolution of Conventions. *Econometrica* 61(1).
* Young, H. P. (1998). Individual Strategy and Social Structure. Princeton University Press.
* Doob, J. L. (1949). Application of the Theory of Martingales. *Le Calcul des Probabilites et ses Applications*.
