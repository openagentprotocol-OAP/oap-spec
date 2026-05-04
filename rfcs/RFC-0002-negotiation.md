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
  "signature": "..."
}
```

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
