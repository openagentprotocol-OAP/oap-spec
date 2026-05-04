# RFC 0002: Negotiation Protocol

**Status:** Draft
**Author(s):** OAP Working Group on Confidentiality and Compliance
**Created:** 2026-05-03
**Working Group:** CCC
**Targets:** 1.1

## 1. Summary

This RFC introduces a normative Negotiation Protocol for OAP. Negotiation enables two or more Agents to converge on mutually acceptable terms over multiple structured turns, with each turn signed, time bound, and binding upon acceptance. Negotiation is the protocol substrate for pricing discussions, scheduling, scope definition, service level agreements, and any other commercial or operational arrangement that cannot be unilaterally imposed.

## 2. Motivation

OAP-CORE-1.0 specifies Pricing in the Manifest as a published, take it or leave it offer. This is sufficient for commodity services but not for the long tail of agent to agent commerce. Production deployments demonstrate four patterns that v1.0 cannot express:

1. **Time Bound Counter Offers.** A Tool offers a service at a list price. The Agent counters with a lower price contingent on a higher volume commitment. Both sides need a binding handshake.
2. **Conditional Acceptance.** A Tool accepts a proposed meeting only if the rate exceeds a threshold. The conditional needs a structured representation.
3. **Multi Round Refinement.** A scheduling negotiation traverses three or more rounds of proposed time slots before convergence.
4. **Walk Away Rights.** Either side needs a normative way to withdraw without producing legal exposure.

Without a standardized Negotiation Protocol, every Tool reinvents these primitives, creating both implementation cost and security risk.

## 3. Specification

### 3.1 Terminology

| Term | Definition |
|------|------------|
| Negotiation | A bounded sequence of Proposals and Counter Proposals between exactly two Negotiating Parties. |
| Party | A Participant in a Negotiation, identified by a DID. |
| Proposal | A signed, structured offer with explicit Terms, Validity, and Withdrawal rules. |
| Counter Proposal | A Proposal that explicitly references and modifies a prior Proposal. |
| Acceptance | A signed assent to a specific Proposal that creates a binding Agreement. |
| Agreement | The bound, hash chained outcome of a successful Negotiation. |
| Walk Away | A signed withdrawal that terminates a Negotiation without an Agreement. |

### 3.2 State Machine

```
                +--------+   propose    +----------+
   start ---->  | OPEN   | -----------> | PROPOSED |
                +--------+              +----------+
                                             |
                       counter (n times)     |
                            +----------------+
                            v                |
                       +-----------+         |
                       | COUNTERED |---------+
                       +-----------+
                            |
                            +-- accept --> ACCEPTED (terminal)
                            +-- reject --> REJECTED (terminal)
                            +-- expire --> EXPIRED (terminal)
                            +-- withdraw -> WITHDRAWN (terminal)
```

A Tool that supports Negotiation MUST implement this state machine and MUST refuse transitions that violate it.

### 3.3 Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/oap/negotiation/open` | POST | Initiate a Negotiation. |
| `/oap/negotiation/{id}/propose` | POST | Submit a Proposal or Counter Proposal. |
| `/oap/negotiation/{id}/accept` | POST | Accept the most recent Proposal. |
| `/oap/negotiation/{id}/reject` | POST | Reject the most recent Proposal. |
| `/oap/negotiation/{id}/withdraw` | POST | Walk away. |
| `/oap/negotiation/{id}` | GET | Retrieve the Negotiation history. |

### 3.4 Proposal Schema

```json
{
  "proposal_id": "prp_01HX2QFP4N8R5T6V7W8X9Y0Z1A",
  "negotiation_id": "neg_01HX2QF8GZRP9V3K5YXJW0AQ7M",
  "previous_proposal_id": null,
  "from": "did:web:agent-a.example",
  "to": "did:web:agent-b.example",
  "round": 1,
  "category": "pricing",
  "terms": {
    "action": "weather.forecast.detailed",
    "calls_per_month": 100000,
    "price_per_call_eur": "0.0040",
    "billing_interval": "month",
    "minimum_commitment_months": 6,
    "early_termination_fee_eur": "200.00"
  },
  "valid_until": "2026-05-10T12:00:00Z",
  "justification": {
    "type": "trade_off",
    "rationale": "Reduced unit price by 12 percent in exchange for a 6 month minimum commitment, preserving expected revenue while improving the buyer's per call cost.",
    "appeals_to": ["buyer.cost_minimization", "seller.revenue_smoothing"],
    "references": ["prp_01HX2QFJ8N4M6Q7R8S9T0U1V2W"]
  },
  "signature": "..."
}
```

The `justification` field is OPTIONAL and is reserved for argumentation-based negotiation in the sense of Sierra, Jennings, Noriega, and Parsons (1998). When present, it carries one of the argument types `trade_off`, `appeal_to_authority`, `appeal_to_self_interest`, `appeal_to_prevailing_practice`, `threat`, `reward`, `counterexample`, or `concession_explanation`. The receiver MAY use the justification to update its opponent model, but the protocol assigns no normative force to the justification beyond what the structured `terms` already commit to. The formal treatment of argumentation-based negotiation, including admissibility, attack relations, and the Faratin-Sierra-Jennings trade-off heuristic, is given in Appendix B.

### 3.5 Acceptance Produces an Agreement

A successful Acceptance MUST produce a signed Agreement document with the following structure:

```json
{
  "agreement_id": "agr_01HX2QFXR0Q4S8U9V3W7X2Y0Z1",
  "negotiation_id": "neg_01HX2QF8GZRP9V3K5YXJW0AQ7M",
  "parties": ["did:web:agent-a.example", "did:web:agent-b.example"],
  "terms": { "...": "from accepted Proposal" },
  "effective_from": "2026-05-04T00:00:00Z",
  "effective_until": "2026-11-04T00:00:00Z",
  "agreement_hash": "sha256-...",
  "signatures": {
    "did:web:agent-a.example": "...",
    "did:web:agent-b.example": "..."
  }
}
```

Agreements MUST be appended to the Transparency Log of the Tool that hosted the Negotiation.

### 3.6 Manifest Declaration

```json
{
  "negotiation": {
    "supported": true,
    "categories": ["pricing", "scheduling", "scope", "sla"],
    "max_rounds": 8,
    "default_validity_minutes": 60,
    "binding_acceptance": true,
    "withdrawal_penalty_terms": "https://example.com/legal/walk-away.pdf"
  }
}
```

### 3.7 Confidentiality

Negotiation content MUST inherit the CCC of the most restrictive Party. A Negotiation between a regulated profession (medical, legal, financial) and an unregulated counterparty MUST flag the regulated obligations in the resulting Agreement metadata.

## 4. Backward Compatibility

Tools that do not declare `negotiation.supported = true` continue to operate under v1.0 take it or leave it pricing. Existing pricing entries in the Manifest remain valid as opening Proposals.

## 5. Security Considerations

1. **Replay of Withdrawn Proposals.** Tools MUST enforce monotonic round numbers and reject any Proposal whose `previous_proposal_id` is not the most recent live Proposal.
2. **Signature Theft.** Acceptance MUST be co signed by the receiving Party from a key bound to its DID Document.
3. **Race Conditions.** A Tool MUST treat the first valid Acceptance as terminal and reject all subsequent state transitions.

## 6. Privacy Considerations

Negotiations between natural persons MAY contain personal data such as scheduling preferences. Tools MUST allow Parties to redact non material content from public Transparency Log entries while preserving the integrity hash.

## 7. Conformance Impact

Negotiation is OPTIONAL at L2. Negotiation MUST be supported at L3 if any Tool offering involves variable terms.

## 8. Implementation Experience

The AssistNet Booking Engine operates a comparable mechanism in production for meeting scheduling and partnership negotiation. A reference implementation is committed to `reference/server/negotiation/`.

## 9. Alternatives Considered

1. **Free text negotiation in chat messages.** Rejected because outcomes are not machine verifiable.
2. **Bilateral smart contracts.** Rejected because they introduce settlement coupling that conflicts with the Wallet abstraction.
3. **Auction protocols only.** Rejected because most production negotiations are not auctions.

## 10. References

1. OAP-CORE-1.0, Section 11 (Pricing).
2. UN/CEFACT Buy Ship Pay Reference Data Model.

## Appendix A: Game Theoretic Analysis of OAP Negotiation

This appendix is normative for the equilibrium claims it makes and informative for the supporting commentary. It models the protocol of section 3 as an extensive form game with imperfect information, characterizes its equilibria, proves walk-away stability under standard rationality assumptions, and gives precise conditions on the `pricing_function` axis of RFC 0014 under which the protocol is incentive compatible. The treatment follows the bilateral bargaining literature of Rubinstein (1982), the mechanism design framework of Maskin (1999) and Myerson (1981), the leveled commitment analysis of Sandholm and Lesser (1995, 2001), and the bounded rationality treatment of Larson and Sandholm (2001). Notation is consistent with Appendix A of RFC 0014.

### A.1 Formal Game

A Negotiation is modeled as a finite extensive form game with imperfect information

$$
\Gamma \;=\; \langle N, H, Z, P, (\mathcal{I}_i)_{i \in N}, (u_i)_{i \in N} \rangle ,
$$

with the components below.

- **Players.** $N = \{A, B\}$, the two Parties of section 3.1, each identified by a DID.
- **Histories.** $H$ is the set of finite sequences of Proposals, Counter Proposals, and terminal actions (`accept`, `reject`, `withdraw`, or expiry by `valid_until`), respecting the state machine of section 3.2 and the maximum round count $K = $ `max_rounds` of the manifest declaration in section 3.6. The set of terminal histories is $Z \subseteq H$.
- **Player Function.** $P: H \setminus Z \to N$ assigns to every non terminal history the player whose turn it is. By the state machine, players strictly alternate, beginning with the initiator.
- **Information Sets.** $\mathcal{I}_i$ partitions histories at which player $i$ moves. The valuation type of the opponent is private, hence $\mathcal{I}_i$ is non trivial. All transmitted Proposals are signed and verifiable, hence proposal content is common knowledge once a transmission has occurred.
- **Action Sets.** At a history $h$ with $P(h) = i$, the action set is $A_i(h) = \{ \text{propose}(c, \pi) : c \in \mathcal{C}, \pi \in \Pi \} \cup \{\text{accept}, \text{reject}, \text{withdraw}\}$, where $(\mathcal{C}, \Pi)$ are the Commerce Primitive Space and parameter space of Appendix A of RFC 0014. The `propose` action is restricted by the schema of section 3.4 and by the monotonic round constraint of section 5.
- **Payoffs.** Each player $i$ has a privately known type $\theta_i \in \Theta_i$ and a quasi linear utility function

$$
u_i(z, \theta_i) \;=\; v_i(c^*, \pi^*; \theta_i) - x_i(c^*, \pi^*) - \kappa_i \cdot \rho(z) ,
$$

where $z$ is a terminal history, $(c^*, \pi^*)$ is the agreed Commerce Primitive and parameter map if $z$ ends in `accept` and undefined otherwise, $v_i$ is the private valuation, $x_i$ is the monetary transfer to player $i$ (negative for the buyer, positive for the seller), $\kappa_i \ge 0$ is the per round protocol cost (signing, transport, opportunity cost of the `valid_until` window), and $\rho(z) \in \{0, 1, \ldots, K\}$ is the realized round count. If $z$ ends in `withdraw`, `reject`, or expiry, the agreed tuple is undefined and $v_i = x_i = 0$, leaving $u_i = -\kappa_i \rho(z)$.

The walk-away clause of section 3.6 endows each player with an **outside option** $\omega_i$ that is the realized utility from declining to participate further in $\Gamma$. We assume $\omega_i \ge 0$, normalized so that pure withdrawal yields $u_i = -\kappa_i \rho(z)$ as above.

### A.2 Theorem 1 (Existence of Subgame Perfect Equilibrium)

**Statement.** $\Gamma$ admits at least one Subgame Perfect Equilibrium (SPE) in pure strategies whenever the per round cost $\kappa_i$ is strictly positive for at least one player and the maximum round count $K$ is finite.

**Proof.** $\Gamma$ is a finite extensive form game with perfect recall. The state machine of section 3.2 admits no infinite path, because: (i) the proposal round counter is monotonically increasing by section 5.1, (ii) `max_rounds` is bounded above by the manifest declaration in section 3.6, and (iii) every Proposal carries a `valid_until` timestamp that triggers `EXPIRED` deterministically. Hence the game tree has finite depth $\le K + 1$ and finite branching at every node (the action set at each history is bounded by the schema validation of section 3.4 and the value set cardinality of Appendix A of RFC 0014). Selten (1965) and Kuhn (1953) established that every finite extensive form game with perfect recall admits a Subgame Perfect Equilibrium in behavioral strategies, and Kuhn's theorem provides the equivalence to pure strategies under perfect recall. Solving by backward induction from the $|Z|$ terminal histories yields a constructive SPE. $\blacksquare$

**Remark A.2.1 (Multiplicity).** Multiplicity of SPE is generic in bilateral bargaining with private types (Rubinstein 1985). The protocol does not select among equilibria; it provides the binding handshake (section 3.5) that makes any selected equilibrium enforceable. Equilibrium selection is therefore a matter of the strategies that implementations adopt, not of the protocol.

**Remark A.2.2 (Discounting).** When $\kappa_i > 0$ and $K$ is finite, the resulting equilibrium implements a discounted alternating offers bargaining outcome with discount factor

$$
\delta_i \;=\; \exp\!\left(-\frac{\kappa_i}{|v_i(c^*, \pi^*; \theta_i)|}\right) \in (0, 1],
$$

and the unique SPE outcome under symmetric information matches the Rubinstein (1982) split. Asymmetric information yields multiple equilibria, partially refined by the perfect Bayesian equilibrium concept of Fudenberg and Tirole (1991).

### A.3 Theorem 2 (Walk-Away Stability)

**Statement.** Let $\sigma^*$ be any Subgame Perfect Equilibrium of $\Gamma$ and let $u_i^*(\sigma^*)$ be the equilibrium expected utility of player $i$. Then $\sigma^*$ is **individually rational**: $u_i^*(\sigma^*) \ge \omega_i$ for every $i \in N$.

**Proof.** By contradiction. Suppose $u_i^*(\sigma^*) < \omega_i$ for some player $i$. By the manifest declaration of section 3.6, the action `withdraw` is available at every information set at which $P(h) = i$. By construction of the outside option in section A.1, the deviation strategy $\sigma_i'$ that selects `withdraw` at the first information set yields utility $\omega_i - \kappa_i \rho(h_0) \ge \omega_i - \kappa_i K$. For any $\kappa_i$ such that $\omega_i - \kappa_i K > u_i^*(\sigma^*)$, which holds for all sufficiently small $\kappa_i$ and is enforced in practice by the manifest's `default_validity_minutes` and `max_rounds` parameters bounding the cost, the deviation strictly improves on $\sigma_i^*$, contradicting subgame perfection. The contradiction shows $u_i^*(\sigma^*) \ge \omega_i$. $\blacksquare$

**Corollary A.3.1 (Cooling-Off Compatibility).** Theorem 2 composes with the cooling-off period of RFC 0017: if a Party is granted a post-acceptance reversal right within the cooling-off window, the effective outside option is $\omega_i' = \max(\omega_i, u_i^{\text{revert}})$, where $u_i^{\text{revert}}$ is the utility realized after exercising the cooling-off right. The proof of Theorem 2 carries through with $\omega_i$ replaced by $\omega_i'$.

**Corollary A.3.2 (Walk-Away Penalty Bounds).** The optional `withdrawal_penalty_terms` of section 3.6 modifies the proof of Theorem 2 by adding a non-negative penalty $\lambda_i \ge 0$ to the cost of the `withdraw` action. Individual rationality is preserved if and only if $\lambda_i \le \omega_i - u_i^*(\sigma^*) + \omega_i$, that is, the penalty does not exceed the surplus of the outside option over equilibrium. Implementations MUST publish $\lambda_i$ ex ante so that this bound can be evaluated by the consumer Agent before opening a Negotiation. This is an algebraic refinement of the disclosure obligation in section 3.6.

### A.4 Theorem 3 (Truthfulness Conditions per Pricing Function)

**Statement.** The OAP Negotiation Protocol is **incentive compatible in dominant strategies** (DSIC) if and only if the agreed `pricing_function` axis (as defined in Appendix A of RFC 0014, axis $P$) takes a value for which the resulting allocation rule is a Vickrey-Clarke-Groves (VCG) mechanism. Equivalently, DSIC fails for `pricing_function = negotiated`, holds for `pricing_function = auction` when the auction is implemented as a sealed-bid second-price auction, and is partial for the remaining values, with the precise characterization below.

**Proof and Characterization.** For each value $p \in P$ of the `pricing_function` axis we characterize the strongest incentive-compatibility property the protocol can attain.

1. **`fixed`.** The price is published in the manifest. The negotiation reduces to a take it or leave it offer. By Myerson (1981), this is DSIC for the seller (the seller's optimal strategy is to publish the monopoly price computed from the buyer's type distribution) and Bayesian incentive compatible (BIC) for the buyer (the buyer's optimal strategy is to accept if and only if $v_B(c, \pi; \theta_B) \ge \pi$). DSIC holds for both players because each has a unique best response independent of the other's type.

2. **`metered`.** The unit price is fixed but consumption is private. Truth telling about consumption is enforced by the `commerce_primitive` block on Receipts (section 5.4 of RFC 0014) combined with the audit log of OAP Core. Misreported consumption is detectable ex post and triggers the dispute resolution path of RFC 0017. DSIC holds modulo the audit assumption.

3. **`auction`.** When the auction is sealed-bid second-price (Vickrey 1961), DSIC is the celebrated result of Vickrey, formalized for multiunit settings by Clarke (1971) and Groves (1973). When the auction is first-price, DSIC fails generically and the equilibrium concept reduces to Bayesian Nash. The protocol does not specify which auction format is used; implementations that wish to claim DSIC under `auction` SHOULD select a Vickrey or VCG variant and SHOULD document the chosen format in the manifest. This is an analytical observation, not a normative requirement of the protocol.

4. **`formula`.** The price is a published function of public inputs. Provided the inputs are verifiable, DSIC reduces to the case `fixed` evaluated at the realized inputs.

5. **`negotiated`.** Bilateral bargaining with private types is generically not DSIC (Myerson and Satterthwaite 1983). The strongest incentive property attainable is BIC, and even BIC fails to support an ex post efficient outcome when the buyer's and seller's reserve values overlap with positive probability. This is a structural limitation of bilateral bargaining, not of the OAP protocol; the protocol provides the binding handshake but cannot manufacture incentives that the underlying mechanism does not possess.

6. **`reputation_weighted`.** Truth telling about reputation signals (RFC 0009) is enforced by the cryptographic provenance of those signals: reputation is computed from signed Receipts and signed dispute outcomes that the reporting Party did not produce alone. Forgery is reduced to forgery of signatures, which is computationally infeasible. DSIC holds with respect to reputation reporting; DSIC with respect to price acceptance reduces to whichever underlying value of $P$ the reputation weighting modifies.

The complete characterization is summarized in the table below.

| Pricing Function | DSIC | BIC | Ex Post Efficient | Notes |
|---|---|---|---|---|
| `fixed` | yes | yes | yes (in the take it or leave it sense) | Optimal seller strategy is monopoly pricing |
| `metered` | yes (modulo audit) | yes | yes | Audit by Receipt and Transparency Log |
| `auction` (Vickrey/VCG) | yes | yes | yes | Section 3 MUST specify Vickrey variant |
| `auction` (first price) | no | yes | no | Equilibrium is Bayesian Nash with bid shading |
| `formula` | yes | yes | yes | Provided inputs are verifiable |
| `negotiated` | no | partial | no | Myerson-Satterthwaite impossibility |
| `reputation_weighted` | yes (reputation reporting) | inherits underlying | inherits underlying | Cryptographic provenance prevents forgery |

The boundary between `negotiated` and the other values is the central impossibility result. RFC 0002 does not claim DSIC for `negotiated`; it provides walk-away stability (Theorem 2) and binding handshake (section 3.5), which are the strongest properties achievable under Myerson-Satterthwaite. $\blacksquare$

### A.5 Theorem 4 (Replay and Race Resistance)

**Statement.** The protocol of section 3, taken together with the security clauses of section 5, is robust to replay attacks and race conditions in the following sense: no player can profitably deviate from $\sigma^*$ by replaying a withdrawn or superseded Proposal or by attempting to accept multiple Proposals concurrently.

**Proof sketch.** The monotonic round counter (section 5.1) ensures that a Proposal whose `previous_proposal_id` is not the most recent live Proposal is rejected by the receiver. Replay therefore cannot inject a stale Proposal into the live game tree. The first-acceptance terminal rule (section 5.3) ensures that of any race between two `accept` actions, exactly one becomes effective and the other transitions to a no-op. Concurrent accept attempts therefore yield expected utility no greater than the SPE acceptance, because the additional acceptance attempts incur $\kappa_i$ without changing the agreed terms. $\blacksquare$

### A.6 Bounded Rationality

The DSIC and SPE results above assume unbounded computational capacity. In practice, agent reasoning is bounded (Larson and Sandholm 2001). The protocol accommodates bounded rationality through three mechanisms.

1. The `default_validity_minutes` field of section 3.6 bounds the deliberation window. A Party that cannot compute its best response within the window is forced into a default action (typically `reject` by expiry), which is an admissible move under the state machine.
2. The `max_rounds` field of section 3.6 bounds the depth of strategic recursion. Bounded-depth backward induction yields an approximate SPE whose welfare loss is bounded by $K \cdot \kappa_i$ relative to the unbounded-depth solution.
3. The leveled commitment analysis of Sandholm and Lesser (1995, 2001) maps onto the optional `withdrawal_penalty_terms` of section 3.6: a non-zero penalty implements a leveled commitment contract whose decommitment thresholds depend on the realized type distribution. Sandholm and Lesser proved that leveled commitment Pareto-dominates full commitment in expectation when types are uncertain, which is the typical case for bilateral agent-to-agent negotiation.

### A.7 Collusion Resistance and Opponent Modeling

**Collusion.** A coalition $\{A, B\}$ that wishes to manipulate the Transparency Log must produce a sequence of co-signed Proposals whose published terms misrepresent the true agreement. The Transparency Log (section 3.5) is append-only and hash-chained; the co-signatures are independently verifiable against the DID Documents of the parties. Successful collusion therefore requires the coalition to deceive third-party verifiers about a publicly verifiable artifact, which is detectable post hoc and triggers reputation penalties under RFC 0009. Collusion is strategically dominated when the long-run reputation cost exceeds the short-run gain, which holds for any sufficiently long-lived Agent under the discounted infinite-horizon analysis of Fudenberg and Maskin (1986).

**Opponent Modeling.** A Party that learns the opponent's type distribution may compute a tighter best response than uninformed play. The protocol does not prohibit opponent modeling, in keeping with the open and adversarial nature of agent-to-agent commerce. Privacy of the type itself is preserved by the requirement that only Proposals (the public actions) are transmitted; the underlying $\theta_i$ remains private. Any inference about $\theta_i$ that the opponent can perform is bounded by the standard signaling-game refinements of Cho and Kreps (1987).

### A.8 Composition with the Policy Stack

The four-layer Policy Stack of `papers/safety-and-policy-stack.md` constrains the action sets $A_i(h)$ of $\Gamma$ at every history. Concretely, an action `propose(c, \pi)` that violates a Universal Prohibition, an Organizational Policy, the active Persona Policy, or the Personal Policy of the principal is masked from the action set before strategic computation, and the resulting reduced game $\Gamma'$ inherits Theorems 1 through 4 unchanged. This is a consequence of the monotonic restriction property of the Policy Stack: removing actions cannot create equilibria, only eliminate them, so the SPE of $\Gamma'$ is an SPE of the original $\Gamma$ restricted to admissible histories.

### A.9 Summary of Equilibrium Properties

| Property | Status in OAP Negotiation | Reference |
|---|---|---|
| Existence of Subgame Perfect Equilibrium | Yes, in pure strategies | Theorem 1 |
| Walk-Away Stability (individual rationality) | Yes, unconditionally | Theorem 2 |
| Cooling-Off Compatibility | Yes | Corollary A.3.1, RFC 0017 |
| Dominant Strategy Incentive Compatibility | Holds for `fixed`, `metered`, `formula`, `auction` (VCG), `reputation_weighted`; fails for `negotiated` and first-price `auction` | Theorem 3 |
| Bayesian Incentive Compatibility | Holds for all `pricing_function` values; partial for `negotiated` | Theorem 3 |
| Ex Post Efficiency | Holds when DSIC holds; impossible for `negotiated` | Myerson-Satterthwaite 1983 |
| Replay Resistance | Yes | Theorem 4, section 5.1 |
| Race Resistance | Yes | Theorem 4, section 5.3 |
| Collusion Resistance | Holds in long-run repeated play under RFC 0009 | Section A.7 |
| Bounded-Rationality Compatibility | Yes, via `valid_until`, `max_rounds`, `withdrawal_penalty_terms` | Section A.6 |
| Composition with Policy Stack | Yes, by monotonic restriction | Section A.8 |

### A.10 References to Prior Mathematical Treatments

- Rubinstein, A. (1982). Perfect Equilibrium in a Bargaining Model. *Econometrica* 50(1).
- Rubinstein, A. (1985). A Bargaining Model with Incomplete Information About Time Preferences. *Econometrica* 53(5).
- Selten, R. (1965). Spieltheoretische Behandlung eines Oligopolmodells mit Nachfragetragheit. *Zeitschrift fur die gesamte Staatswissenschaft* 121.
- Kuhn, H. W. (1953). Extensive Games and the Problem of Information. In *Contributions to the Theory of Games II.* Princeton University Press.
- Vickrey, W. (1961). Counterspeculation, Auctions, and Competitive Sealed Tenders. *Journal of Finance* 16(1).
- Clarke, E. H. (1971). Multipart Pricing of Public Goods. *Public Choice* 11.
- Groves, T. (1973). Incentives in Teams. *Econometrica* 41(4).
- Myerson, R. B. (1981). Optimal Auction Design. *Mathematics of Operations Research* 6(1).
- Myerson, R. B., and Satterthwaite, M. A. (1983). Efficient Mechanisms for Bilateral Trading. *Journal of Economic Theory* 29(2).
- Maskin, E. (1999). Nash Equilibrium and Welfare Optimality. *Review of Economic Studies* 66(1).
- Fudenberg, D., and Maskin, E. (1986). The Folk Theorem in Repeated Games with Discounting or with Incomplete Information. *Econometrica* 54(3).
- Fudenberg, D., and Tirole, J. (1991). *Game Theory.* MIT Press.
- Cho, I.-K., and Kreps, D. M. (1987). Signaling Games and Stable Equilibria. *Quarterly Journal of Economics* 102(2).
- Sandholm, T., and Lesser, V. (1995). Issues in Automated Negotiation and Electronic Commerce. *Proceedings of ICMAS-95.*
- Sandholm, T., and Lesser, V. (2001). Leveled Commitment Contracts and Strategic Breach. *Games and Economic Behavior* 35(1-2).
- Larson, K., and Sandholm, T. (2001). Bargaining with Limited Computation. *Artificial Intelligence* 132(2).

## Appendix B: Argumentation-Based Negotiation and the Multi Agent Systems Lineage

This appendix is normative for the schema-level claims it makes about the optional `justification` field of section 3.4 and informative for the supporting commentary. It situates the OAP Negotiation protocol within the multi agent systems tradition of automated negotiation that originated with the heuristic and argumentation-based work of Rosenschein and Zlotkin (1994), Sierra, Jennings, Noriega, and Parsons (1998), Parsons, Sierra, and Jennings (1998), Faratin, Sierra, and Jennings (1998, 2002), Kraus, Sycara, and Evenchik (1998), Amgoud, Maudet, and Parsons (2000), and the Human-Agent Collectives synthesis of Jennings, Moreau, Nicholson, Ramchurn, Roberts, Rodden, and Rogers (2014). The mechanism design results of Appendix A characterize what the protocol guarantees from a strategic standpoint; the present appendix characterizes what it inherits from the MAS literature on negotiation as a process of structured persuasion among bounded agents.

### B.1 Negotiation as a Process Among Bounded Agents

The game-theoretic equilibrium analysis of Appendix A assumes that each Party has a fixed type $\theta_i$, a fixed utility function $u_i$, and unbounded reasoning capacity. The MAS tradition relaxes all three assumptions. Following Rosenschein and Zlotkin (1994), a Negotiation is treated as a structured interaction in which each Party may revise its type-relevant beliefs, may exchange partial justifications for its proposals, and may operate under an explicit computational budget. The OAP protocol of section 3 is consistent with this treatment: the `valid_until`, `max_rounds`, and the optional `justification` block of section 3.4 jointly define a bounded, partially transparent interaction whose outcomes the MAS literature has analyzed at length.

### B.2 The Trade-Off Heuristic of Faratin-Sierra-Jennings

Faratin, Sierra, and Jennings (2002) introduced the **trade-off heuristic** for multi-issue negotiation under the constraint that a Party knows its own utility function but not the opponent's. Let $\mathbf{x} \in \mathcal{X}$ be a candidate Proposal in the multi-issue space $\mathcal{X} = X_1 \times \cdots \times X_k$, and let the Party hold a **similarity function** $\mathrm{sim}_j: X_j \times X_j \to [0,1]$ for each issue $j$. The trade-off Counter Proposal is

$$
\mathbf{x}_{\mathrm{tradeoff}} \;=\; \arg\max_{\mathbf{x} \in \mathcal{X}_{u_i = c}} \; \mathrm{sim}(\mathbf{x}, \mathbf{x}_{\mathrm{opp}}),
$$

where $\mathcal{X}_{u_i = c}$ is the iso-utility surface of the Party at utility level $c$ (the reservation utility currently being targeted), $\mathbf{x}_{\mathrm{opp}}$ is the most recent Proposal received from the opponent, and $\mathrm{sim}$ is an aggregate similarity computed by, for example, the weighted Euclidean composition $\mathrm{sim}(\mathbf{x}, \mathbf{y}) = \sum_j w_j \cdot \mathrm{sim}_j(x_j, y_j)$.

The trade-off Counter Proposal is by construction iso-utility for the proposing Party (it concedes nothing in expected utility) while monotonically improving the similarity to the opponent's last position (it concedes maximally in form along the dimensions the opponent has revealed it cares about). Faratin, Sierra, and Jennings (2002) proved that under standard concavity assumptions on the issue-level utility functions, repeated application of the trade-off heuristic by both Parties produces a sequence of Proposals that converges to a point on the Pareto frontier in expected polynomial steps in $k$, the number of issues.

**OAP integration.** The trade-off heuristic is implementable on top of the OAP Counter Proposal action of section 3.2 with no protocol-level modification. A Party that wishes to declare its use of the heuristic SHOULD set the `justification.type` field of section 3.4 to `"trade_off"`, and SHOULD populate `justification.references` with the `proposal_id` of the opponent Proposal whose terms were used as $\mathbf{x}_{\mathrm{opp}}$ in the similarity computation. A Resolver implementing automated negotiation under OAP MAY consult the OAP Registry entry `oap.negotiation.tradeoff.v1` for a reference similarity function definition.

### B.3 Theorem B.1 (Pareto Convergence of Trade-Off Negotiation)

**Statement.** Suppose both Parties to an OAP Negotiation use the trade-off heuristic of B.2 with concave issue-level utilities, and suppose the protocol's `max_rounds` field exceeds $K^* = O(k \cdot \log(1/\epsilon))$ where $k$ is the number of issues and $\epsilon$ is the Pareto-distance tolerance. Then the resulting Agreement is $\epsilon$-Pareto-efficient: no alternative Agreement strictly improves the utility of one Party without reducing the other's utility by more than $\epsilon$.

**Proof sketch.** The argument is the classical concession-and-similarity proof of Faratin, Sierra, and Jennings (2002, Theorem 3) applied to the OAP state machine of section 3.2. The bounded-round provision of `max_rounds` is the cap that requires $K^*$; the `withdrawal_penalty_terms` of section 3.6 ensures that neither Party is incentivized to terminate prematurely, which is the additional condition needed to translate the original asymptotic result to a finite-round protocol. $\blacksquare$

### B.4 Argumentation-Based Negotiation

Sierra, Jennings, Noriega, and Parsons (1998) introduced **argumentation-based negotiation** as the framework in which Proposals are accompanied by structured justifications, and the receiver's response is influenced not only by the Proposal terms but by the strength and admissibility of the accompanying argument. Parsons, Sierra, and Jennings (1998) and Amgoud, Maudet, and Parsons (2000) developed the formal underpinnings using Dung's (1995) abstract argumentation framework.

Formally, an **argumentation framework** is a pair $\langle \mathcal{A}_g, \mathcal{R}_g \rangle$ where $\mathcal{A}_g$ is a set of arguments and $\mathcal{R}_g \subseteq \mathcal{A}_g \times \mathcal{A}_g$ is a binary attack relation. A set $S \subseteq \mathcal{A}_g$ is **admissible** iff $S$ is conflict-free and $S$ defends every member: for every $a \in S$ and every $b$ with $(b, a) \in \mathcal{R}_g$, there exists $c \in S$ with $(c, b) \in \mathcal{R}_g$. The grounded extension is the least fixed point of the characteristic function $F(S) = \{a \in \mathcal{A}_g : a \text{ is defended by } S\}$; it gives the most cautious admissible set.

In an OAP Negotiation, the arguments are the contents of the `justification` field accumulated across the Negotiation history. The attack relation is established by domain-specific rules (for example, a `threat` argument attacks a previous `appeal_to_self_interest` argument; a `counterexample` attacks an `appeal_to_prevailing_practice`). The receiving Party's reasoning module computes the grounded extension over the accumulated argument set and accepts a Proposal iff the supporting argument is in the grounded extension AND the structured `terms` are individually rational under the Walk-Away Stability bound of Theorem A.3.

**Conformance note.** The protocol does not mandate any particular argumentation framework, since argumentation-based reasoning is at the discretion of the Party. The `justification` field enables it without requiring it. A Party that ignores the `justification` field is fully conformant. A Party that uses argumentation MUST NOT replace the structured `terms` of section 3.4 with the argument: arguments are persuasive context, not commitments.

### B.5 Theorem B.2 (Argumentation Preserves Walk-Away Stability)

**Statement.** Augmenting the OAP Negotiation with an argumentation layer over the `justification` field as described in B.4 preserves the Walk-Away Stability of Theorem A.3: every Party retains its outside option of $\theta_i$, and no admissible argument can compel acceptance of a Proposal that yields strictly less than $\theta_i$.

**Proof.** The argumentation layer of B.4 informs the receiver's evaluation of the Proposal but does not modify the receiver's action set, which remains $\{\mathrm{accept}, \mathrm{reject}, \mathrm{counter}, \mathrm{withdraw}\}$ as defined by section 3.2. The receiver retains the option to reject or withdraw at every round. By the proof of Theorem A.3, the equilibrium value of the receiver is at least $\theta_i$. Argumentation can only restrict the set of Proposals the receiver finds acceptable (some otherwise-acceptable Proposals may now be rejected because the supporting argument is not in the grounded extension), which weakly reduces the set of equilibria but never produces an equilibrium below the outside-option utility. $\blacksquare$

### B.6 The Rosenschein-Zlotkin Lineage

Rosenschein and Zlotkin (1994), in *Rules of Encounter,* established three negotiation domains that have since been canonical in MAS scholarship: the **Task-Oriented Domain** (TOD), in which Agents have lists of tasks and exchange tasks to reduce joint cost; the **State-Oriented Domain** (SOD), in which Agents wish to transition the world from a current state to a goal state and may benefit from coordinated transitions; and the **Worth-Oriented Domain** (WOD), in which Agents value world states by a real-valued worth function and bargain over which state to bring about. The OAP Negotiation protocol covers all three domains by virtue of the abstract `terms` block of section 3.4 not constraining the underlying decision problem. A `pricing` Negotiation is a WOD instance with worth functions that depend on monetary terms; a `service_substitution` Negotiation is a TOD instance with task lists encoded as the substituted services; a `state_change` Negotiation is an SOD instance with the current and target states encoded as receipt-anchored evidence.

Rosenschein and Zlotkin proved that for each of the three domains, a unique Nash bargaining solution exists when the parties have complete information, and that the Monotonic Concession Protocol converges to it in $O(k)$ rounds. The OAP protocol does not mandate the Monotonic Concession Protocol but admits its use as a Counter Proposal strategy, with the `justification.type` value `"concession_explanation"` provided as the appropriate argument category for declaring monotonic concession behavior.

### B.7 Composition with the Reputation System (RFC 0009)

The MAS negotiation literature, in particular Sabater and Sierra (2005) and Huynh, Jennings, and Shadbolt (2006), distinguishes between **direct experience trust** (built from prior bilateral interactions with the counterparty), **witness trust** (built from third-party reports about the counterparty), **role-based trust** (built from the counterparty's institutional role and credentials), and **certified trust** (built from the counterparty's verifiable credentials). The OAP Reputation Profile of RFC 0009 Appendix A.1 aggregates over all four sources via the weight function $w(a, x, t)$, and FIRE-style four-source aggregation is the special case treated in RFC 0009 Appendix B.1.

A Party engaged in OAP Negotiation SHOULD condition its reservation utility $\theta_i$ on the counterparty's Reputation Profile. The composition is well defined by Theorem A.3 (Walk-Away Stability) and the manipulation-resistance bounds of RFC 0009 Appendix A.

### B.8 Composition with Workflows (RFC 0008) and Coalition Formation

A bilateral Negotiation between two Parties is the simplest case of cooperative interaction in OAP. When more than two Parties wish to combine capabilities to satisfy an Intent that none could satisfy alone, the appropriate primitive is the multi-Step Workflow of RFC 0008, optionally augmented by the coalition-formation framework of RFC 0008 Appendix B. The justification arguments of B.4 generalize naturally to the coalition setting: each prospective coalition member submits a coalition-formation Proposal whose `justification` block declares the value the member contributes, and the coalition is admissible iff the implied coalitional payoff vector lies in the core of the resulting cooperative game.

### B.9 Implications for Downstream RFCs

1. **RFC 0008 (Workflows).** Multi-party Workflows that include a Negotiation Step inherit the Pareto convergence of Theorem B.1 within that Step.
2. **RFC 0009 (Reputation).** The four-source aggregation of FIRE (RFC 0009 Appendix B.1) supplies the trust signal that conditions the reservation utility $\theta_i$ of B.7.
3. **RFC 0019 (Conformance).** The conformance probe `behavior/negotiation-justification-schema.test.js` validates that conformant Parties accept and round-trip the `justification` field without modification, and that the absence of a justification does not affect Proposal validity.

### B.10 References to the Multi Agent Systems Negotiation Lineage

- Rosenschein, J. S., and Zlotkin, G. (1994). *Rules of Encounter: Designing Conventions for Automated Negotiation among Computers.* MIT Press.
- Sierra, C., Jennings, N. R., Noriega, P., and Parsons, S. (1998). A Framework for Argumentation-Based Negotiation. In *Intelligent Agents IV (ATAL '97).* Springer LNAI 1365.
- Parsons, S., Sierra, C., and Jennings, N. R. (1998). Agents that Reason and Negotiate by Arguing. *Journal of Logic and Computation* 8(3).
- Faratin, P., Sierra, C., and Jennings, N. R. (1998). Negotiation Decision Functions for Autonomous Agents. *Robotics and Autonomous Systems* 24(3-4).
- Faratin, P., Sierra, C., and Jennings, N. R. (2002). Using Similarity Criteria to Make Issue Trade-Offs in Automated Negotiations. *Artificial Intelligence* 142(2).
- Kraus, S., Sycara, K., and Evenchik, A. (1998). Reaching Agreements through Argumentation: A Logical Model and Implementation. *Artificial Intelligence* 104(1-2).
- Amgoud, L., Maudet, N., and Parsons, S. (2000). Modelling Dialogues using Argumentation. *Proceedings of ICMAS-2000.*
- Dung, P. M. (1995). On the Acceptability of Arguments and its Fundamental Role in Nonmonotonic Reasoning, Logic Programming and N-Person Games. *Artificial Intelligence* 77(2).
- Jennings, N. R., Faratin, P., Lomuscio, A. R., Parsons, S., Wooldridge, M., and Sierra, C. (2001). Automated Negotiation: Prospects, Methods and Challenges. *Group Decision and Negotiation* 10(2).
- Jennings, N. R., Moreau, L., Nicholson, D., Ramchurn, S., Roberts, S., Rodden, T., and Rogers, A. (2014). Human-Agent Collectives. *Communications of the ACM* 57(12).
