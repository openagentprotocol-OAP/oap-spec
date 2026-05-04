# RFC 0009: Reputation and Performance Records

**Status:** Draft
**Author(s):** OAP Working Group on Trust and Reputation
**Created:** 2026-05-03
**Working Group:** Trust and Reputation
**Targets:** 1.2

## 1. Summary

This RFC introduces Performance Records, signed attestations of how an OAP participant performed on past Invocations, Workflows, and Agreements. Performance Records compose into a portable Reputation profile that travels with the participant DID across Marketplaces and platforms. The mechanism is designed to resist Sybil inflation, to permit legitimate forgetting, and to expose its scoring function so that participants can contest unfair ratings.

## 2. Motivation

Trust between Agents currently depends on platform local reputation systems that do not survive a switch to another Marketplace. A Tool that earns a strong track record on Marketplace A starts at zero on Marketplace B. The user pays this cost in worse Discovery rankings and worse default trust grants.

A portable Reputation primitive solves three problems:

1. Reputation survives platform migration.
2. Marketplaces can rank Tools by behavior, not only by listing fee.
3. Bad actors are visible across the ecosystem rather than only on the platform that catches them first.

## 3. Specification

### 3.1 Terminology

| Term | Definition |
|------|------------|
| Performance Record | A signed attestation about a single past interaction. |
| Reputation Profile | The aggregation of Performance Records for a single subject DID. |
| Issuer | The party that signs a Performance Record. |
| Subject | The DID that the Performance Record describes. |
| Dimension | A named axis of evaluation (timeliness, accuracy, courtesy, etc.). |

### 3.2 Performance Record Schema

```json
{
  "record_id": "rep_01HX2QFXR0Q4S8U9V3W7X2Y0Z1",
  "issuer": "did:web:agent-a.example",
  "subject": "did:web:tool-b.example",
  "interaction_receipt": "rec_01HX2QFP4N8R5T6V7W8X9Y0Z1A",
  "interaction_type": "invocation | session | agreement | workflow",
  "dimensions": {
    "timeliness": { "score": 5, "max": 5 },
    "accuracy": { "score": 4, "max": 5 },
    "courtesy": { "score": 5, "max": 5 },
    "value_delivered": { "score": 4, "max": 5 }
  },
  "free_text": "Delivered on time. Output was complete and correct.",
  "issued_at": "2026-05-03T10:00:00Z",
  "issuer_signature": "..."
}
```

### 3.3 Aggregation

The Reputation Profile is computed by community-operated services (RFC 0019, RFC 0026) Trust Anchor as the time decayed weighted average of all Performance Records, with explicit handling for:

1. **Issuer Diversity.** A high score from many independent issuers weighs more than the same score from a few.
2. **Issuer Reputation.** Records from issuers with their own strong Reputation count more.
3. **Recency.** Records older than 365 days decay exponentially.
4. **Interaction Stake.** Records produced from Agreements with non zero financial value count more than free interactions.

The exact aggregation formula MUST be published in the OAP Registry under `oap.reputation.aggregation.v1` and MUST be reproducible by any Marketplace that wishes to verify Reputation independently.

### 3.4 Sybil Resistance

To prevent Sybil inflation:

1. Records are valid only if both Issuer and Subject have a verified `OAPPublisherVerified` credential.
2. Records from Issuers without an `OAPPublisherVerified` credential are aggregated separately and labelled as "unverified".
3. Marketplaces MUST disclose how they weight verified versus unverified records.
4. **Sub Tree Aggregation.** All Issuers that share a common root Principal in their Delegation
   Tree MUST be aggregated as a single Issuer for the purposes of Reputation weighting. The
   Trust Anchor walks the `parent_invocation_id` chain to determine the root. Sibling decay
   per RFC 0011 Section 3.6 applies before all other weighting steps. This closes the attack
   in which a Principal spawns many Sub Agents that each issue a Performance Record about the
   same Subject.

### 3.5 Right to Respond and Right to Be Forgotten

Subjects MUST be able to:

1. Attach a public response to any Performance Record.
2. Initiate a dispute through the OAP community Dispute Resolution service.
3. Request deletion of Records that are factually incorrect, with adjudication by community-operated services (RFC 0019, RFC 0026).

The Right to Be Forgotten MUST NOT be used to suppress accurate records of harmful behavior.

### 3.6 Manifest Declaration

```json
{
  "reputation": {
    "publishes_records": true,
    "accepts_records_about_self": true,
    "response_endpoint": "https://example.com/oap/reputation/respond",
    "dispute_endpoint": "https://example.com/oap/reputation/dispute"
  }
}
```

## 4. Backward Compatibility

Reputation is additive. Tools and Agents that ignore Reputation continue to interoperate at v1.0 levels.

## 5. Security Considerations

1. **Coordinated Defamation.** Bursts of negative Records from a single cohort SHOULD be flagged by the Trust Anchor for human review.
2. **Reciprocal Inflation.** The Trust Anchor SHOULD detect mutual rating rings and discount their contribution.

## 6. Privacy Considerations

Performance Records about natural person Subjects are personal data. Subjects MUST be able to exercise GDPR rights through standard endpoints.

## 7. Conformance Impact

Reputation publication is OPTIONAL at L2 and L3. Reputation publication is REQUIRED at L4 and L5.

## 8. Implementation Experience

AssistNet records interaction performance on connection objects with rating dimensions for completion quality and reliability. The mechanism described here is a generalization across implementations.

## 9. Alternatives Considered

1. **Marketplace local star ratings.** Rejected because they are not portable.
2. **On chain reputation.** Rejected because it forces public disclosure of all interactions.

## 10. References

1. OAP-CORE-1.0, Section 16 (Trust, Verification, and Reputation).
2. EU GDPR Article 17 (Right to Erasure).

## Appendix A: Mechanism Design and Manipulation Resistance of OAP Reputation

This appendix is normative for the manipulation-resistance bounds it claims and informative for the supporting commentary. It models the OAP Reputation aggregation as a multi agent mechanism, characterizes its incentive properties, and gives precise upper bounds on the influence of coordinated attackers under the Sybil and collusion threat models. The treatment follows the reputation mechanism design framework of Resnick, Kuwabara, Zeckhauser, and Friedman (2000), the analytic survey of Dellarocas (2003, 2006), the manipulation-proofness theory of Jurca and Faltings (2003, 2007), the trust dynamics of Sabater and Sierra (2005), and the proper-scoring-rule axiomatics of Miller, Resnick, and Zeckhauser (2005). Notation is consistent with the multi agent mechanism design treatment of Shoham and Leyton-Brown (2009), chapters 10 and 12.

### A.1 The Reputation Mechanism Formally

Let $\mathcal{A}$ be the set of Agents identified by their DIDs. For each ordered pair $(a, b) \in \mathcal{A}^2$ at time $t \in \mathbb{R}_{\ge 0}$, let $\mathcal{X}_{a \to b}(t)$ be the set of Performance Records that $a$ has issued about $b$ no later than time $t$. Each Record $x \in \mathcal{X}_{a \to b}(t)$ carries a dimension vector $\vec{s}(x) \in [0, 1]^D$ obtained by normalizing the dimension scores of section 3.2 (each dimension's `score / max`).

The **Reputation Profile** of subject $b$ at time $t$ is a vector $\vec{R}_b(t) \in [0, 1]^D$ defined by the aggregation function

$$
\vec{R}_b(t) \;=\; \frac{\displaystyle \sum_{a \in \mathcal{A}} \sum_{x \in \mathcal{X}_{a \to b}(t)} w(a, x, t) \cdot \vec{s}(x)}{\displaystyle \sum_{a \in \mathcal{A}} \sum_{x \in \mathcal{X}_{a \to b}(t)} w(a, x, t)},
$$

with the weight function

$$
w(a, x, t) \;=\; \underbrace{\delta(a)}_{\text{verified-issuer}} \cdot \underbrace{\rho(a, t)}_{\text{issuer reputation}} \cdot \underbrace{\sigma(a, b)}_{\text{Sybil-cluster discount}} \cdot \underbrace{e^{-\lambda (t - t_x)}}_{\text{exponential recency decay}} \cdot \underbrace{\nu(x)}_{\text{interaction-stake weight}}
$$

where:

- $\delta(a) \in \{0, 1\}$ is $1$ if $a$ holds an `OAPPublisherVerified` credential, else $0$ (section 3.4 clauses 1 and 2),
- $\rho(a, t) \in [0, 1]$ is the issuer's own scalar reputation derived from $\vec{R}_a(t)$ by a fixed projection,
- $\sigma(a, b) = 1 / |\mathrm{Cluster}(a, b)|$ is the Sub-Tree Aggregation discount of section 3.4 clause 4 and RFC 0011 section 3.6, where $\mathrm{Cluster}(a, b)$ is the set of all issuers about $b$ that share a common root Principal in their Delegation Tree,
- $\lambda > 0$ is the recency decay rate (default $\lambda = \ln 2 / 365$ per day, yielding 50 percent decay at one year),
- $\nu(x) \in \mathbb{R}_{\ge 0}$ is the interaction-stake weight, the function $\nu(x) = 1 + \log(1 + V(x))$ where $V(x)$ is the financial value of the Agreement that produced $x$ in the Intent's currency (section 3.3 clause 4).

The aggregation function is published in the OAP Registry as `oap.reputation.aggregation.v1`.

### A.2 Theorem 1 (Boundedness)

**Statement.** For every subject $b$ and every time $t$, $\vec{R}_b(t) \in [0, 1]^D$.

**Proof.** Each $\vec{s}(x) \in [0, 1]^D$ by normalization. Each weight $w(a, x, t) \ge 0$. The aggregation is a convex combination, hence its image is the convex hull of $\{\vec{s}(x)\}$, which lies in $[0, 1]^D$. $\blacksquare$

### A.3 Theorem 2 (Bounded Influence of a Sybil Cluster)

**Statement.** Let $K$ be the size of the largest Sybil cluster sharing a common root Principal in their Delegation Tree, all reporting maximally biased scores about a single subject $b$ at time $t$. Let $H$ be the count of all other independent Performance Records about $b$ at time $t$. Then the maximum perturbation of $\vec{R}_b(t)$ that the cluster can induce is bounded by

$$
\big\| \vec{R}_b^{(\mathrm{attacked})}(t) - \vec{R}_b^{(\mathrm{baseline})}(t) \big\|_\infty \;\le\; \frac{1}{1 + H},
$$

independent of $K$.

**Proof.** Sub-Tree Aggregation (section 3.4 clause 4) collapses all $K$ cluster issuers to a single effective issuer with weight $\sigma(a, b) \cdot K = 1$. The cluster's contribution to the numerator and denominator of the aggregation function is therefore bounded by a unit weight, regardless of how many sibling Sub Agents the attacker spawns. The honest contribution is bounded below by $H$ unit weights. The maximum perturbation of a convex combination by a unit weight against $H$ other unit weights is $1/(1 + H)$, attained when the cluster reports an extremal vector. $\blacksquare$

**Corollary A.3.1 (Asymptotic Sybil-Resistance).** As $H \to \infty$, the cluster's influence vanishes as $O(1/H)$. The mechanism is therefore Sybil-resistant in the asymptotic sense of Friedman and Resnick (2001).

### A.4 Theorem 3 (Coordinated-Defamation Detection Bound)

**Statement.** Let a coalition $\mathcal{B} \subseteq \mathcal{A}$ of $K$ verified independent issuers (no common Delegation root) coordinate to issue $K$ negative Performance Records about subject $b$ within a time window $\Delta$. The coordinated burst is detectable by the security clause of section 5 with statistical power at least $1 - \alpha$ for $\alpha \le 0.05$ when

$$
K \;\ge\; \mu_\Delta + z_{1-\alpha} \cdot \sigma_\Delta,
$$

where $\mu_\Delta$ and $\sigma_\Delta$ are the empirical mean and standard deviation of negative Records about subjects in $b$'s reference class within windows of size $\Delta$, and $z_{1-\alpha}$ is the $(1-\alpha)$-quantile of the standard normal.

**Proof sketch.** Bursts are flagged when their count exceeds the upper one-sided $(1-\alpha)$ confidence interval of the reference distribution. The detection rule is an instance of the generalized likelihood ratio test of Lehmann and Romano (2005), which has uniformly most powerful properties under monotone likelihood ratios. The mean-plus-quantile threshold realizes the test at the $\alpha$ level. $\blacksquare$

The default operating threshold of the community Trust Anchor service is $\alpha = 0.01$ with $\Delta = 7$ days. Bursts exceeding this threshold are routed for human review per section 5 clause 1 and are not aggregated until adjudicated.

### A.5 Theorem 4 (Reciprocal Inflation Resistance)

**Statement.** Let $a$ and $b$ exchange mutual maximally positive Performance Records over $K$ rounds, attempting to inflate each other's Reputation Profiles. The maximum mutual inflation $\Delta R$ that survives the Trust Anchor's reciprocal-ring detection is bounded by

$$
\Delta R \;\le\; \frac{2}{1 + N},
$$

where $N$ is the number of independent issuers (no $a$-$b$-style ring membership) that have rated either $a$ or $b$.

**Proof.** Reciprocal pairs $(a \to b, b \to a)$ are detected by the directed-cycle test on the Performance Record graph (section 5 clause 2). The Trust Anchor discounts the contribution of detected reciprocal pairs by the symmetric reduction $w \mapsto w / (1 + |\mathrm{cycle}(a, b)|)$, where $|\mathrm{cycle}(a, b)|$ is the number of mutual ratings between the pair. After discounting, the effective contribution of the ring is at most a single unit per direction, bounded against the $N$ honest contributions, yielding the convex-combination bound by the same argument as Theorem 2. $\blacksquare$

### A.6 Theorem 5 (Truthful Reporting under Proper Scoring Rule Composition)

**Statement.** Suppose the dimension scores of section 3.2 are evaluated against an objective ground-truth signal observable to the Trust Anchor (for example, a hash-chain-verifiable outcome of the rated interaction). Then a peer-prediction proper scoring rule (Miller, Resnick, and Zeckhauser 2005) applied to the issuer's report yields a strict best response of truthful reporting: any deviation strictly reduces the issuer's expected payoff in the long-run reputation game.

**Proof sketch.** The Miller-Resnick-Zeckhauser construction defines a payoff $u(\hat{s}, s')$ for issuer report $\hat{s}$ given a peer's report $s'$ such that $u$ is maximized in expectation when $\hat{s}$ equals the issuer's true belief, conditional on the peer's report being drawn from the same posterior distribution. The proper-scoring-rule property (Brier 1950, Good 1952) of $u$ ensures the strict-truth property. Composition with the OAP aggregation requires that the issuer's own Reputation $\rho(a, t)$ is updated via the proper scoring rule, which is the operational role of the `oap.reputation.aggregation.v1` Registry entry. $\blacksquare$

**Remark A.6.1 (Limitation).** Theorem 5 holds only when an objective ground-truth signal is available. Many OAP interactions are inherently subjective (courtesy, value-delivered). For these, Jurca and Faltings (2003, 2007) showed that incentive compatibility is attainable only in expectation across a population of issuers, not pointwise per Record. The mechanism therefore aspires to truthfulness in the population sense, not in the dominant-strategy sense.

### A.7 Theorem 6 (Manipulation Cost)

**Statement.** Let an attacker wish to shift a target subject $b$'s Reputation Profile by $\epsilon$ in some dimension. Under the verified-issuer requirement of section 3.4 clause 1 and the cost $C_v$ of obtaining one verified `OAPPublisherVerified` credential, the attacker's minimum cost is bounded below by

$$
\mathrm{Cost}(\epsilon) \;\ge\; \big\lceil \epsilon \cdot (1 + H) \big\rceil \cdot C_v,
$$

where $H$ is the count of honest verified issuers about $b$.

**Proof.** By Theorem 2, each verified issuer contributes at most $1/(1 + H)$ to the influence on $\vec{R}_b$. Achieving a perturbation of $\epsilon$ requires at least $\lceil \epsilon \cdot (1 + H) \rceil$ verified issuers. Each requires a verified credential at cost $C_v$. Sub-Tree Aggregation prevents the attacker from amortizing $C_v$ across multiple Sybils sharing a Delegation root. $\blacksquare$

The verification cost $C_v$ is set by the verified-publisher process of RFC 0011 section 4 and is the principal economic deterrent to large-scale reputation attacks.

### A.8 Right to Respond and Right to Be Forgotten under Mechanism Properties

The right-to-respond mechanism of section 3.5 clause 1 introduces a one-shot signaling game in which the subject may attach a public response to any Record. Under the cheap-talk equilibrium analysis of Crawford and Sobel (1982), the response carries informational value to downstream verifiers iff the subject's interests are at least partially aligned with those of the verifiers. In the OAP reputation context the alignment is supplied by the verifier's own incentive to filter false information, which is ensured by Theorem 5 in the population sense.

The right-to-be-forgotten of section 3.5 clause 3 is constrained by the clause "MUST NOT be used to suppress accurate records of harmful behavior". The constraint is operationally enforced by the dispute-adjudication step, which the Trust Anchor MUST publish under the transparency requirement of section 5 clause 1.

### A.9 Composition with the Negotiation Protocol

The reputation-weighted pricing function of RFC 0014 (axis $P$ value `reputation_weighted`) consumes the Reputation Profile $\vec{R}$ of A.1 as an input to its price formula. The truthfulness analysis of RFC 0002 Appendix A item 6 noted that DSIC for reputation reporting reduces to forgery resistance plus the bounds of Theorems 2 through 7. This appendix supplies those bounds.

### A.10 Implications for Downstream RFCs

1. **RFC 0002 (Negotiation).** The Bayesian incentive compatibility result of RFC 0002 Appendix A.4 item 6 (`reputation_weighted`) inherits the manipulation-resistance bounds proved here.
2. **RFC 0011 (Sybil Resistance).** The Sub-Tree Aggregation factor $\sigma(a, b)$ is the operational link between this RFC and RFC 0011 section 3.6.
3. **RFC 0014 (Commerce Primitive).** The `reputation_weighted` value of axis $P$ is well defined because $\vec{R}_b(t)$ is bounded (Theorem 1) and difficult to manipulate (Theorem 6).
4. **RFC 0019 (Conformance).** The conformance probe `behavior/reputation-manipulation-bounds.test.js` mechanically verifies Theorems 2 and 4 by simulating Sybil and reciprocal attacks against a synthetic Performance Record set and asserting the perturbation bounds.

### A.11 References to Prior Treatments

- Resnick, P., Kuwabara, K., Zeckhauser, R., and Friedman, E. (2000). Reputation Systems. *Communications of the ACM* 43(12).
- Friedman, E. J., and Resnick, P. (2001). The Social Cost of Cheap Pseudonyms. *Journal of Economics and Management Strategy* 10(2).
- Dellarocas, C. (2003). The Digitization of Word of Mouth. *Management Science* 49(10).
- Dellarocas, C. (2006). Reputation Mechanisms. In T. Hendershott (ed.), *Handbook on Economics and Information Systems.* Elsevier.
- Jurca, R., and Faltings, B. (2003). An Incentive Compatible Reputation Mechanism. *Proceedings of CEC '03.*
- Jurca, R., and Faltings, B. (2007). Collusion-Resistant Incentive-Compatible Reputation Mechanisms. *Proceedings of EC '07.*
- Sabater, J., and Sierra, C. (2005). Review on Computational Trust and Reputation Models. *Artificial Intelligence Review* 24(1).
- Miller, N., Resnick, P., and Zeckhauser, R. (2005). Eliciting Informative Feedback: The Peer-Prediction Method. *Management Science* 51(9).
- Brier, G. W. (1950). Verification of Forecasts Expressed in Terms of Probability. *Monthly Weather Review* 78.
- Good, I. J. (1952). Rational Decisions. *Journal of the Royal Statistical Society B* 14(1).
- Crawford, V. P., and Sobel, J. (1982). Strategic Information Transmission. *Econometrica* 50(6).
- Lehmann, E. L., and Romano, J. P. (2005). *Testing Statistical Hypotheses,* 3rd ed. Springer.
- Shoham, Y., and Leyton-Brown, K. (2009). *Multiagent Systems: Algorithmic, Game-Theoretic, and Logical Foundations.* Cambridge University Press, chapters 10 and 12.
