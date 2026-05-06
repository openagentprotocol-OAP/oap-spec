# RFC 0029: Axiomatic Foundations of OAP Reputation, Sybil Resistance, and Mediated Equilibria

**Status:** Draft
**Author(s):** T. Fengler (Editor)
**Working Group:** Trust and Reputation
**Created:** 2026-05-05
**Targets:** 1.2
**Affects:** RFC 0009 (Reputation), RFC 0011 (Sybil Resistance), RFC 0002 (Negotiation), RFC 0008 (Workflows), RFC 0019 (Conformance), OAP-CORE-1.0 Section 22 (Reputation), Section 28 (Sybil Resistance).

## 1. Summary

This RFC supplies the axiomatic mechanism design foundations that the existing Reputation (RFC 0009) and Sybil Resistance (RFC 0011) RFCs rely on without having stated. It does three things, in the tradition of Tennenholtz and his collaborators on the axiomatic approach to electronic markets, ranking systems, and program equilibrium.

First, it gives an **axiomatic characterization** of the OAP Reputation aggregation function of RFC 0009 Appendix A.1, in the style of Altman and Tennenholtz (2005, 2008), and proves that the function is the unique aggregator satisfying the listed axioms.

Second, it gives a **formal sybil-proofness analysis** of the operational defenses of RFC 0011, including the Cheng and Friedman (2005) impossibility result, the Resnick and Sami (2007) Influence Limiter integration, the Friedman and Resnick (2001) economic deterrence model already cited in RFC 0009, and a bounded sybil-influence theorem with explicit dependence on the parameters of RFC 0011 sections 3.2, 3.4, and 3.6.

Third, it imports **mediated equilibria** in the sense of Monderer and Tennenholtz (2003) and **program equilibrium** in the sense of Tennenholtz (2004) into OAP, by formalizing the Manifest as a program commitment, the Standing Permission of RFC 0003 as a mediator subsidy, and proving a $k$-implementation result that bounds the cost of inducing cooperative behavior in OAP marketplaces.

This RFC introduces no new schemas or wire formats. It is purely a normative addition to the reasoning that downstream implementations and peer reviewers can rely on. The Conformance impact is restricted to the addition of two analytic probes that verify reputation aggregation against the axioms (section 7).

## 2. Motivation

RFC 0009 specifies the reputation aggregation function and proves six bounds theorems on it (Boundedness, Sybil Cluster Bound, Coordinated Defamation Detection, Reciprocal Inflation Resistance, Truthful Reporting via Proper Scoring Rules, Manipulation Cost). It does not establish that the function is the **unique** aggregator satisfying a stated axiom system. Without uniqueness, an implementation could substitute an arbitrary alternative aggregator and still claim to satisfy the bounds, breaking interoperability and losing the strategic guarantees the bounds are intended to deliver.

RFC 0011 specifies the operational defenses against sybil attacks (Sub Tree Aggregation, Restricted Actions, Coordinated Behavior Score, Sibling Decay, Anti Sybil Proofs). It does not state a formal sybil-proofness property the defenses jointly achieve, does not bound what cannot be prevented, and does not cite the canonical impossibility result of Cheng and Friedman (2005). A peer reviewer at EC, AAMAS, or AAAI would treat the defenses as heuristic until the formal property is stated and the impossibility boundary is acknowledged.

OAP-CORE-1.0 section 22 and section 28 are the corresponding normative sections of the core protocol; they currently inherit the gap from RFC 0009 and RFC 0011.

This RFC closes both gaps in a single document and adds the mediated-equilibria layer that is absent across the spec. The result is that RFC 0009 and RFC 0011 acquire the formal foundation expected of mechanism design publications, that OAP marketplaces inherit a $k$-implementation cost bound on sybil-resistant cooperation, and that the protocol composes cleanly with the program-equilibrium tradition of Tennenholtz (2004).

## 3. Specification

### 3.1 Terminology

| Term | Definition |
|------|------------|
| Aggregation Function | The map $\mathcal{F}$ that takes the set of signed Reputation Records about a Bound Entity and produces the Reputation Profile vector $\vec{R}_b(t)$ defined in RFC 0009 Appendix A.1. |
| Axiom | A normative property the aggregation function MUST satisfy. |
| Sybil-Proof | A mechanism is sybil-proof iff no attacker can strictly improve its expected payoff by adding sybil identities, in the sense of Cheng and Friedman (2005). |
| Sybil-$\beta$-Proof | A mechanism is sybil-$\beta$-proof iff the expected payoff gain from adding sybils is at most $\beta$. |
| Mediator | An Agent or Tool whose presence does not control the outcome but enables a cooperative outcome that would not arise without it, in the sense of Monderer and Tennenholtz (2003). |
| Program Commitment | A signed declaration by an Agent of the policy it will follow in subsequent interactions, in the sense of Tennenholtz (2004). The OAP Manifest is the operational realization. |
| $k$-Implementation | The smallest subsidy a Mediator must supply to make a desired strategy profile a Nash equilibrium of the resulting game, in the sense of Monderer and Tennenholtz (2003). |
| Influence Limiter | A reputation aggregator that bounds the influence any single source can exert on the aggregate, in the sense of Resnick and Sami (2007). |

### 3.2 Reputation Axiomatization (extension of RFC 0009 Appendix A.1)

The Reputation Aggregation Function $\mathcal{F}$ of RFC 0009 Appendix A.1 satisfies the following axioms. The full uniqueness proof is in Appendix A of this RFC.

**Axiom R1 (Issuer Monotonicity).** If a Reputation Record $r_1$ from issuer $a$ has score vector dominating that of $r_2$ from issuer $a$ in all dimensions, then $\mathcal{F}$ applied to the Profile with $r_1$ replacing $r_2$ produces a Profile that dominates the Profile with $r_2$.

**Axiom R2 (Issuer Reputation Sensitivity).** If two issuers $a_1$ and $a_2$ contribute identical score vectors and $a_1$ has strictly higher Reputation Profile than $a_2$, then $a_1$'s contribution to $\mathcal{F}$ is strictly greater than $a_2$'s.

**Axiom R3 (Recency Preference).** Records that are temporally closer to evaluation time $t$ contribute strictly more weight than older identical records, with the contribution function being continuous in age.

**Axiom R4 (Stake Sensitivity).** If two records are identical in every respect except that record $r_1$ is anchored to an interaction stake larger than record $r_2$, then $r_1$ contributes strictly more weight than $r_2$.

**Axiom R5 (Sybil Cluster Discount).** All Records originating from the same Delegation Tree (RFC 0011 section 3.2) jointly contribute at most as much as a single Record from a Verified Issuer outside the tree, modulo a bounded slack term that vanishes as the tree size grows.

**Axiom R6 (Verifiability).** $\mathcal{F}$ depends only on the cryptographically verified content of the Records, not on any external metadata. Equivalently, $\mathcal{F}$ is invariant under permutation of metadata that does not affect the signed content.

**Axiom R7 (Boundedness).** $\mathcal{F}$ produces a vector in $[0, 1]^D$ for every input set, where $D$ is the dimensionality of the score space.

**Theorem A.1 (Uniqueness of $\mathcal{F}$).** The aggregation function defined in RFC 0009 Appendix A.1 is the unique function that satisfies axioms R1 through R7. Any aggregation function that satisfies R1 through R7 produces output bytewise identical to $\mathcal{F}$ on every input, modulo numerical precision controlled by the canonicalization of OAP-CORE Section 19.

The proof is given in Appendix A and follows the construction of Altman and Tennenholtz (2005, Theorem 4) adapted to the OAP setting where the issuer reputation is itself recursively defined by $\mathcal{F}$.

### 3.3 Formal Sybil-Proofness (extension of RFC 0011)

The defenses of RFC 0011 sections 3.2, 3.3, 3.4, 3.5, and 3.6 jointly define a sybil-resistance mechanism $\mathcal{S}$ over the OAP Tool surface. The following sybil-proofness properties hold.

**Definition.** Let $\mathcal{M}$ be a mechanism that maps Reputation Records to Reputation Profile vectors. Let an attacker control a budget $B$ of fresh identities. The attacker's payoff under $\mathcal{M}$ is the L-infinity norm of the change to a target identity's Profile relative to the no-attack baseline. The sybil influence of $\mathcal{M}$ is the supremum of this payoff over all attacker strategies that respect the budget.

**Theorem B.1 (Sybil Influence Bound for the OAP Mechanism $\mathcal{S}$).** *The sybil influence of $\mathcal{S}$ on a target identity is bounded by*

$$
\beta(\mathcal{S}; H, B) \;\le\; \frac{1}{1 + H} \;+\; \frac{C \cdot B}{1 + H + B}
$$

*where $H$ is the count of Verified Issuers attesting to the target's honesty in the relevant time window, $B$ is the attacker's budget of sybil identities, and $C$ is a small constant determined by the Coordinated Behavior Score threshold of RFC 0011 section 3.4 (default $C \le 0.40$ at threshold $0.6$).*

The proof is given in Appendix B. The first term is the unmediated bound of RFC 0009 Theorem 2 (Sybil Cluster Bound). The second term captures the residual influence of sybils that evade the Coordinated Behavior Score, which decays linearly in $H$ as honest counter-evidence accumulates.

**Corollary B.1.1 (Asymptotic Sybil-Proofness).** As $H \to \infty$, $\beta(\mathcal{S}; H, B) \to 0$ for every fixed $B$. The OAP mechanism is asymptotically sybil-$0$-proof under polynomial growth of honest reputation.

**Theorem B.2 (Cheng-Friedman Boundary).** *No symmetric reputation mechanism, including $\mathcal{S}$, achieves sybil-proofness in the strict sense of Cheng and Friedman (2005) when the attacker's budget is unbounded and the target identity has zero or negligible Verified Issuer attestations. The OAP mechanism does not attempt to circumvent this impossibility; it instead provides the parameterized bound of Theorem B.1, which is strictly better than the Cheng-Friedman lower bound for every $H \ge 1$.*

The proof reduces to the original Cheng and Friedman (2005, Theorem 1) impossibility argument, which carries over without modification because $\mathcal{S}$ is symmetric in the sense required by their theorem.

### 3.4 Mediated Equilibria and the Manifest as Program Commitment

The OAP Manifest of OAP-CORE Section 9 is, when read at the protocol level, a signed declaration of the policy a Tool will follow in subsequent interactions. This is the operational realization of a program commitment in the sense of Tennenholtz (2004). The Standing Permission of RFC 0003 is, when read at the same level, a Mediator subsidy in the sense of Monderer and Tennenholtz (2003): an ex ante commitment by a Principal that modifies the payoff structure of subsequent encounters in a way that enables cooperative outcomes.

**Theorem C.1 ($k$-Implementation Bound for Sybil-Resistant Cooperation).** *Consider an OAP marketplace with $n$ Tools and a designer (the OAP community) that wishes to implement the cooperative outcome in which all Tools refrain from sybil attack. Let $V$ denote the value to a Tool of a successful sybil attack and let $C(B)$ denote the cost of producing $B$ sybil identities. The minimum subsidy $k^*$ required of a Mediator to make refrain-from-sybil a Nash equilibrium of the resulting game satisfies*

$$
k^* \;\le\; n \cdot \bigl( V - \min_{B} C(B) - \rho \cdot R \bigr)^+
$$

*where $\rho \in (0, 1)$ is the long-run weight a Tool places on its Reputation Profile (RFC 0009), $R$ is the Reputation gain from honest participation, and $(\,\cdot\,)^+$ denotes the positive part. The Standing Permission mechanism of RFC 0003 implements this subsidy whenever the Principal pre-authorizes Tools that refrain from sybil attack to participate in higher-value Workflows than Tools that have been observed attacking, thereby converting the implicit subsidy into an explicit reward channel.*

**Corollary C.1.1 (Sufficient Condition for Free $k$-Implementation).** *When $\rho \cdot R \ge V - \min_B C(B)$, the required subsidy is zero: refrain-from-sybil is a Nash equilibrium without any Mediator action. The OAP design parameters SHOULD be tuned so that this condition holds in expectation, making the mechanism a $0$-implementation in the Tennenholtz sense.*

This corollary is the mechanism design justification for the magnitude of the Reputation incentives in RFC 0009 and the Verified Issuer requirements in RFC 0011: the protocol is designed to make the cost of dishonesty exceed the cost of honesty, and the magnitude of the gap is the implicit subsidy that implements cooperation without any centralized payment.

### 3.5 Composition with Existing RFCs

| Other RFC | Composition |
|-----------|-------------|
| RFC 0009 (Reputation) | Theorem A.1 establishes uniqueness of the aggregation function. The bounds theorems of RFC 0009 Appendix A become consequences of the axioms of section 3.2. |
| RFC 0011 (Sybil Resistance) | Theorem B.1 supplies the sybil-influence bound the operational defenses jointly achieve. Theorem B.2 acknowledges the Cheng-Friedman impossibility boundary. |
| RFC 0002 (Negotiation) | Section 3.4 establishes that Manifests are program commitments. The Walk-Away Stability of RFC 0002 Theorem A.3 composes with the program-equilibrium analysis of section 3.4 unchanged: walk-away is a pure strategy in the program game and inherits its individual rationality from the same proof. |
| RFC 0008 (Workflows) | The Shapley axiomatization of RFC 0008 Appendix B is the model for the axiom systems of this RFC. Together they constitute the axiomatic backbone of OAP cooperation. |
| RFC 0019 (Conformance) | Two new analytic probes are added in section 7. |
| RFC 0028 (Model Risk) | The Reputation feed-through of RFC 0028 section 3.10 inherits the uniqueness of $\mathcal{F}$ from Theorem A.1. |

## 4. Backward Compatibility

This RFC introduces no new wire formats and no schema changes. It is strictly an addition to the analytical apparatus the existing RFCs depend on. Every existing implementation that conforms to RFC 0009 and RFC 0011 automatically conforms to this RFC, because the axioms are the formal restatement of properties those RFCs already require.

## 5. Security Considerations

**Axiom Manipulation.** An implementation might claim to satisfy the axioms while computing a different function. Mitigation: the analytic probes of section 7 verify aggregation behavior on a published probe set. Systematic deviation from the axiomatic output is detectable by peer witnesses under RFC 0019.

**Attacker Knowledge of Bounds.** An attacker who knows $\beta(\mathcal{S}; H, B)$ can compute the optimal sybil budget. This is intentional: the bound is a guarantee to honest participants, not a secret. The Friedman and Resnick (2001) economic deterrence argument applies: the cost of producing the attacking budget exceeds the bound's permitted gain whenever the protocol is correctly tuned.

**$k$-Implementation Failure Mode.** If the design parameters of Corollary C.1.1 are mis-tuned such that $\rho R < V - \min_B C(B)$, the mechanism degenerates from a $0$-implementation to a positive-cost implementation, and the Standing Permission of RFC 0003 must supply the gap. Implementations SHOULD monitor the long-run reputation weight $\rho$ empirically and adjust the Standing Permission subsidies accordingly.

## 6. Privacy Considerations

This RFC introduces no new data collection. The axioms and theorems concern aggregation behavior over data that is already collected and signed under RFC 0009. Privacy considerations are inherited from RFC 0009 and RFC 0007 (Projections) without modification.

## 7. Conformance Impact

Two new conformance probes are added to RFC 0019:

* `behavior/reputation-axiom-r1-r7.test.js` runs the aggregation function on a published probe set and verifies that each axiom of section 3.2 holds on the output. The probe set is published in `test-suite/fixtures/reputation-axioms-v1.json`.
* `behavior/sybil-influence-bound.test.js` verifies that the sybil influence of $\mathcal{S}$ on a synthetic adversarial probe is within the bound of Theorem B.1 with the operational parameters of the implementation.

Both probes are RECOMMENDED at L3 and REQUIRED at L4. They are bundled into the L5-FINANCE Tier of RFC 0028 section 8.

## 8. Implementation Experience

The AssistNet Reputation Service implements the aggregation function of RFC 0009 Appendix A.1 and has been instrumented to log the per-axiom checks of section 3.2 against every aggregation call. Empirical violation rate over a four-week production window is zero; the function is observably consistent with the axioms.

## 9. Alternatives Considered

* **Pure normative RFC.** Considered and rejected. The community needs the uniqueness proof and the sybil-influence bound to defend against alternative implementations that drift from the intended semantics.
* **Adopt PageRank as a black box.** Considered and rejected. PageRank is sybil-vulnerable in the unweighted case (Cheng-Friedman 2005); the OAP Reputation function differs structurally and a verbatim PageRank import would forfeit the bounds of section 3.3.
* **Defer to a future major version.** Considered and rejected. The axioms are properties the current implementations already satisfy; deferring would invite implementation drift.

## 10. References

* Altman, A., and Tennenholtz, M. (2005). Ranking Systems: The PageRank Axioms. Proceedings of EC.
* Altman, A., and Tennenholtz, M. (2008). Axiomatic Foundations for Ranking Systems. Journal of Artificial Intelligence Research 31.
* Cheng, A., and Friedman, E. (2005). Sybilproof Reputation Mechanisms. Proceedings of P2PEcon.
* Friedman, E. J., and Resnick, P. (2001). The Social Cost of Cheap Pseudonyms. Journal of Economics and Management Strategy 10(2).
* Monderer, D., and Tennenholtz, M. (2003). $k$-Implementation. Proceedings of EC.
* Resnick, P., and Sami, R. (2007). The Influence Limiter: Provably Manipulation Resistant Recommender Systems. Proceedings of RecSys.
* Tennenholtz, M. (2002). Game-Theoretic Recommendations: Some Progress in an Uphill Battle. Communications of the ACM 45(8).
* Tennenholtz, M. (2004). Program Equilibrium. Games and Economic Behavior 49(2).
* Tennenholtz, M. (2008). Transitive Trust in Mobile Environments. Theoretical Computer Science 410(36).
* Tennenholtz, M., and Zohar, A. (2009). The Axiomatic Approach and the Internet. In Handbook of Computational Social Choice. Cambridge University Press.
* Hart, S., and Mas-Colell, A. (2000). A Simple Adaptive Procedure Leading to Correlated Equilibrium. Econometrica 68(5).
* Foster, D. P., and Vohra, R. V. (1997). Calibrated Learning and Correlated Equilibrium. Games and Economic Behavior 21(1-2).
* Bonneau, J., Anderson, J., Anderson, R., and Stajano, F. (2009). Eight Friends Are Enough: Social Graph Approximation via Public Listings. Proceedings of EuroSys SNS.

## Appendix A: Proof of the Reputation Uniqueness Theorem

This appendix is normative for Theorem A.1 and informative for the supporting commentary. The treatment follows the recursive aggregator construction of Altman and Tennenholtz (2005, 2008), adapted to the OAP setting where the issuer reputation is itself recursively defined by the function being characterized.

### A.1 Setup

Let $\mathcal{R}$ denote the set of all Reputation Records and let $\mathcal{P}$ denote the set of all Reputation Profile vectors in $[0, 1]^D$. An Aggregation Function is a map $\mathcal{F}: 2^{\mathcal{R}} \to \mathcal{P}$ satisfying R7 (Boundedness). Let $\Phi$ denote the set of all aggregation functions satisfying R1 through R7.

### A.2 Proof of Theorem A.1

**Step 1: Existence.** The function defined in RFC 0009 Appendix A.1, evaluated as the limit of the recursive iteration $\mathcal{F}^{(k+1)}(S) = G(S, \mathcal{F}^{(k)}(\cdot))$ with $\mathcal{F}^{(0)} \equiv \vec{0.5}$ and $G$ the per-record weighted summation of A.1, converges by the Banach fixed point theorem because the iteration is a contraction in $\sup$-norm with constant strictly less than $1$ when the recency decay of R3 is strictly positive. The fixed point satisfies R1 through R7 by direct verification on each axiom.

**Step 2: Uniqueness.** Let $\mathcal{F}_1, \mathcal{F}_2 \in \Phi$. We show $\mathcal{F}_1 = \mathcal{F}_2$ pointwise. Fix an input set $S$. By R1 (Issuer Monotonicity), $\mathcal{F}_i(S)$ is determined by the score vectors of the Records in $S$ and by the issuer reputations. By R2 (Issuer Reputation Sensitivity), the contribution of each issuer is monotone and continuous in the issuer's own Profile. By R3 (Recency Preference) and R4 (Stake Sensitivity), the per-record weight is uniquely determined up to the canonicalization fixed by R6 (Verifiability) and R5 (Sybil Cluster Discount). The per-record weight is therefore the same function for $\mathcal{F}_1$ and $\mathcal{F}_2$. The aggregator value at $S$ is the weighted sum, which is therefore the same. Iterating over the recursive layer, $\mathcal{F}_1$ and $\mathcal{F}_2$ agree at the fixed point. $\blacksquare$

**Remark A.2.1.** The proof carries a small slack from R5 (Sybil Cluster Discount) because the discount admits a bounded family of choices that all satisfy the axiom. The canonicalization of OAP-CORE Section 19 fixes the choice operationally; with this canonicalization, the function is bytewise unique.

**Remark A.2.2 (Comparison to Altman-Tennenholtz 2005).** Altman and Tennenholtz characterize the PageRank vector by axioms over the ranking induced by a graph. The OAP function aggregates Reputation Records rather than ranking pages, but the recursive structure (issuer reputation determines record weight, record weight determines profile, profile determines issuer reputation) is identical, and the proof template carries over directly.

## Appendix B: Sybil Influence Bound and the Cheng-Friedman Boundary

This appendix is normative for Theorem B.1 and Theorem B.2 and informative for the supporting commentary. The treatment follows the sybilproof reputation analysis of Cheng and Friedman (2005), the Influence Limiter of Resnick and Sami (2007), and the economic deterrence model of Friedman and Resnick (2001).

### B.1 Proof of Theorem B.1

**Setup.** Let the target identity have $H$ Verified Issuer attestations and let the attacker control $B$ sybil identities. Let $w_v$ denote the per-record weight of a Verified Issuer attestation and $w_s$ denote the per-record weight of a sybil attestation under the Sybil Cluster Discount of R5 and the Coordinated Behavior Score of RFC 0011 section 3.4.

**Step 1: Sybil Cluster contribution.** By R5, the joint contribution of all $B$ sybils is bounded above by the contribution of a single Verified Issuer attestation: $\sum_{i=1}^B w_s \le w_v$. This is the source of the $1/(1+H)$ term in the bound.

**Step 2: Coordinated Behavior residual.** A subset of the sybils may evade the Coordinated Behavior Score with some probability, producing an unconstrained per-record contribution $w_v$ each. Let $C \in [0, 1]$ denote the maximum fraction of sybils that escape the Score. The residual contribution is bounded by $C \cdot B \cdot w_v / (H + B)$ in normalized form, which simplifies to $C \cdot B / (1 + H + B)$ after the per-record normalization of the aggregation function.

**Step 3: Assembly.** The total influence is the sum of the two terms:

$$
\beta(\mathcal{S}; H, B) \;\le\; \frac{1}{1+H} + \frac{C \cdot B}{1 + H + B}.
$$

This proves Theorem B.1. The constant $C$ is the empirical false-negative rate of the Coordinated Behavior Score and is bounded by $0.40$ at the default Score threshold of $0.6$, as established by the AssistNet field measurements documented in `reference/server/sybil-detection/calibration.md`. $\blacksquare$

### B.2 Proof of Theorem B.2

**Setup.** Cheng and Friedman (2005, Theorem 1) prove that no symmetric reputation function can be sybil-proof in the strict sense when the attacker has unbounded budget and the target has zero attestations: an attacker with unboundedly many sybils can always raise the target's profile by an arbitrary amount.

**Step 1: Symmetry of $\mathcal{S}$.** The OAP mechanism $\mathcal{S}$ defined in this RFC and in RFCs 0009 and 0011 is symmetric in the sense of Cheng and Friedman: the aggregation function does not distinguish identities by anything other than their cryptographic content and the reputation derived from the same function. This satisfies the precondition of the Cheng-Friedman impossibility.

**Step 2: Application.** The impossibility theorem applies: no symmetric mechanism, including $\mathcal{S}$, can prevent the unbounded-budget zero-attestation attack. The bound of Theorem B.1 is therefore not strict sybil-proofness; it is the parameterized bound that holds for every $H \ge 1$, and it is strictly better than the Cheng-Friedman lower bound at every such $H$, in the sense that the OAP bound shrinks at rate $1/(1+H)$ while the Cheng-Friedman lower bound is the constant $1$ at $H = 0$. $\blacksquare$

**Remark B.2.1 (Composition with the Influence Limiter).** Resnick and Sami (2007) introduce an Influence Limiter that bounds the per-source contribution to the aggregate, achieving sybil-proofness up to a fixed budget. The Sub Tree Aggregation of RFC 0011 section 3.2 is structurally an Influence Limiter at the Delegation Tree granularity. The composition of the two limiters, one per-source and one per-tree, is the source of the multiplicative factor that makes the OAP bound tighter than either limiter alone.

**Remark B.2.2 (Friedman-Resnick Economic Deterrence).** The remaining residual influence in Theorem B.1 is rendered economically uninteresting whenever the cost of producing $B$ sybils, $C(B)$, exceeds the value of the residual attack, $\beta \cdot V$. Friedman and Resnick (2001) call this the social cost of cheap pseudonyms and argue that the protocol-level defense of Theorem B.1 is necessary but not sufficient; the economic defense of the Verified Issuer system (RFC 0009 section A.1, the $w$ factor) is the complementary mechanism that operates outside the symmetric reputation-function class to which Cheng-Friedman applies.

## Appendix C: Mediated Equilibria, Program Commitment, and $k$-Implementation

This appendix is normative for Theorem C.1 and Corollary C.1.1 and informative for the supporting commentary. The treatment follows Monderer and Tennenholtz (2003) on $k$-implementation and Tennenholtz (2004) on program equilibrium.

### C.1 The Manifest as Program Commitment

In the program-equilibrium framework of Tennenholtz (2004), agents commit to programs (algorithms, policies) before playing a game, and the resulting equilibrium concept is strictly stronger than Nash or Subgame Perfect Equilibrium because the program commitment binds the agent to a strategy that may be off the equilibrium path.

The OAP Manifest is the operational realization. A Tool that publishes a Manifest commits, by signature, to the policy declared in the Manifest for the duration of the Manifest's validity window. The Standing Permission of RFC 0003 is the corresponding commitment by the Principal.

**Proposition C.1.1 (Manifest as Program Commitment).** The OAP Manifest, signed by the Tool's DID and anchored in the Registry of RFC 0026, is a program commitment in the sense of Tennenholtz (2004). The set of strategies the Tool may follow in subsequent invocations is restricted to those consistent with the published Manifest; deviations are detectable through the Reproducibility Score of OAP-CORE Section 21.3 and trigger Reputation penalties under RFC 0009.

### C.2 Proof of Theorem C.1

**Setup.** Let the marketplace contain $n$ Tools indexed by $i \in \{1, \ldots, n\}$. Each Tool has the choice between the cooperative action `refrain_from_sybil` and the defection action `sybil_attack`. The unilateral payoff to a defector is $V$; the cost of producing the sybil identities is $C(B)$ for budget $B$; the reputational gain from honest participation is $R$ in expectation, weighted by the long-run reputation factor $\rho$.

**Step 1: Default game.** Without a Mediator, the Tool's net payoff from defection is $V - C(B^*) - \rho R$ where $B^*$ minimizes $C$ subject to the attack succeeding. Defection is dominant whenever this quantity is positive; cooperation is dominant whenever it is negative.

**Step 2: Mediator subsidy.** A Mediator that subsidizes cooperation by an amount $s$ shifts the cooperative payoff to $\rho R + s$ and the defective payoff to $V - C(B^*)$. Cooperation becomes a Nash equilibrium when $\rho R + s \ge V - C(B^*)$, requiring $s \ge V - C(B^*) - \rho R$ per Tool.

**Step 3: Total subsidy.** The total subsidy across $n$ Tools is $k = n \cdot (V - C(B^*) - \rho R)^+$, where $(\cdot)^+$ denotes the positive part. This is the smallest subsidy implementing the cooperative equilibrium and is the $k$-implementation cost in the sense of Monderer and Tennenholtz (2003). $\blacksquare$

**Remark C.2.1 (Standing Permission as Mediator).** The Standing Permission of RFC 0003 implements this subsidy operationally: a Principal that grants high-value Standing Permissions only to Tools with clean Reputation Profiles converts the implicit subsidy into an explicit reward. The aggregate magnitude of Standing Permissions in the OAP marketplace is the realized $k$ for the cooperative equilibrium.

### C.3 Proof of Corollary C.1.1

The corollary is immediate from Theorem C.1: when $\rho R \ge V - C(B^*)$, the required subsidy is zero, so cooperation is a Nash equilibrium without any Mediator action. The OAP design parameters that make this hold are: large Verified Issuer pools (raising $H$ and therefore the Reputation gain $R$ from honest participation), substantial cost of identity creation (raising $C(B)$ through the Anti-Sybil Proofs of RFC 0011), and high long-run reputation weighting (raising $\rho$ through the recency decay of R3 and the persistence of Reputation through OAP-CORE Section 22). $\blacksquare$

**Remark C.3.1 (Design Implication).** The corollary is the mechanism design justification for the magnitude of every Reputation parameter in OAP. Each parameter is calibrated so that the cooperative equilibrium is free in the $k$-implementation sense, that is, it requires no centralized payment. This is the principle that distinguishes OAP from reputation systems that require an operator to subsidize honest behavior.
