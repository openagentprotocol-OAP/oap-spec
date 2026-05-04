# The Safety and Policy Stack

**A Whitepaper of the Open Agent Protocol**

**Version:** 1.0
**Status:** Public Working Draft
**Date:** May 2026
**Authors:** OAP Privacy and Governance Working Group and OAP Confidentiality and Compliance Context Working Group

## Abstract

An autonomous agent that acts on a principal's behalf must respect at least four distinct sources of policy. The first is the platform itself, which has hard limits beneath which no agent may operate regardless of its principal's preferences. The second is the organization that employs or otherwise constrains the principal, which has compliance obligations that the principal cannot waive unilaterally. The third is the scope under which the principal is currently acting, which expresses the contextual norms of a particular role or persona. The fourth is the principal's own preferences, which apply where the higher layers permit them to apply. A safety architecture that conflates these sources, or that omits any of them, will fail in production at the moment that the layers come into conflict. The Open Agent Protocol responds with an explicit four layer policy stack in which the layers are evaluated in a fixed order, in which decisions are recorded with structured explanations, and in which conflicts between layers are resolved by precedence rules that no implementation may override. This whitepaper sets out the design of the policy stack, examines its behaviour under representative conflicts, and demonstrates how it composes with major regulatory regimes including the European Union Artificial Intelligence Act, the General Data Protection Regulation, the Digital Services Act, and the relevant safety standards for high stakes domains.

## 1. The Inadequacy of Single Layer Policy Engines

The dominant policy engine in contemporary agent platforms is a single layer of guardrails defined by the platform operator. The guardrails enforce the platform's terms of service, refuse the small set of categorically prohibited content, and otherwise leave the agent free to act on whatever instructions arrive from the principal. The model is sufficient for a hosted assistant whose principal is the only party with relevant interests in the assistant's behaviour. It is insufficient for any agent that operates on behalf of a principal who is in turn embedded in an organization, in a profession, in a regulatory regime, or in a contractual relationship that constrains what the principal may permissibly do.

The insufficiency is not theoretical. A medical professional who instructs an agent to summarize a patient encounter is constrained by patient confidentiality obligations whose scope the platform operator does not know. A trading desk professional who instructs an agent to research a competing security is constrained by information barrier obligations whose scope the platform operator does not know. A government employee who instructs an agent to draft a public communication is constrained by the procedures of the employing agency, which the platform operator does not know. The platform operator's guardrails cannot enforce constraints that the platform operator cannot see. The constraints must be expressed at a layer that both the principal and the principal's institutional context can populate, and the policy engine must evaluate the constraints in the order in which they bind.

## 2. The Four Layers in Order of Precedence

The Open Agent Protocol defines four policy layers and evaluates them in a fixed order from the most general to the most specific. The order is normative. No implementation may evaluate the layers in a different order, and no layer may override a refusal issued by a higher precedence layer.

The first layer is Platform Rules. Platform Rules are the categorical limits that bind every agent on every platform. They include the absolute prohibitions on the production of child sexual abuse material, on the production of weapons of mass destruction guidance at the level of operational uplift, on the targeting of critical infrastructure, on the impersonation of natural persons without their consent, and on the small set of analogous prohibitions whose impermissibility is not a function of any principal's preference. Platform Rules also include the safety floors that apply to vulnerable populations, including the prohibition on the engagement of minors in romantic or sexually explicit interaction. Platform Rules are evaluated first because no other layer may permit what they refuse.

The second layer is Organizational Policy. Organizational Policy is the set of constraints expressed by the organization within whose authority the principal currently operates. It includes the categories of action that the organization has prohibited, the external parties with whom the organization has prohibited interaction, the data classes that the organization has classified as confidential, the cross border transfer constraints that the organization has imposed, and the approval workflows that the organization has required for actions exceeding declared thresholds. Organizational Policy is evaluated after Platform Rules and before Scope Policy because the organization's compliance obligations are constraints on the principal that the principal cannot waive unilaterally.

The third layer is Scope Policy. Scope Policy is the set of constraints attached to the particular Scope under which the principal is currently acting. A principal who operates as a medical professional during business hours operates under a Scope whose policy reflects the obligations of medical practice. The same principal who operates as a private individual in the evening operates under a different Scope whose policy reflects the norms of private life. Scope Policy is evaluated after Organizational Policy because it expresses contextual constraints that apply within the space the higher layers have left open.

The fourth layer is Personal Preference. Personal Preference is the set of constraints that the principal has expressed for itself, and it draws on the Standing Permissions framework of [RFC 0003](/rfcs/0003) for the granular consent grants that the principal has previously authorized. It includes the principal's preferences about communication style, the principal's lists of trusted and distrusted parties, the principal's preferences about timing and channel, and the principal's overrides on default behaviours that the higher layers have not constrained. Personal Preference is evaluated last because it is the layer at which the principal expresses individual choice within the space that the institutional layers have permitted.

## 3. Decision Records and the Right to Explanation

Every evaluation of the policy stack produces a Decision Record that becomes part of the Receipt for the relevant action. The Decision Record enumerates the layers that were evaluated, identifies the rules within each layer that were triggered, records the outcome of each rule, and records the final decision that emerged from the composition of the rule outcomes. The Decision Record also includes a natural language explanation that summarizes the reasoning in terms that the principal can understand.

The Decision Record is the protocol level mechanism for honoring the right to explanation that several major regulatory regimes have established. Under the European Union Artificial Intelligence Act the Decision Record provides the structured trace from which a regulator can determine whether a high risk system's decision was made on permissible grounds. Under the General Data Protection Regulation the Decision Record provides the principal with the meaningful information about the logic of automated decisions that the regulation requires. Under the Digital Services Act the Decision Record provides the user notice that intermediaries must furnish when content is moderated. The protocol's contribution is to make these obligations machine readable and uniform rather than leaving each operator to invent its own format.

The natural language explanation in the Decision Record is required to be honest in a particular sense. It must describe the actual rules that were evaluated, not a post hoc rationalization. It must use the same identifiers for rules and layers that appear in the structured fields of the Decision Record so that a verifier can confirm that the explanation matches the evaluation. It must be written in a register that a non technical principal can understand. The honesty requirement is not an aspiration. It is enforced by the conformance test suite, which exercises representative scenarios and verifies that the explanation produced corresponds to the structured trace.

## 4. Conflict Resolution Between Layers

The interesting case for any layered policy system is the case in which the layers conflict. The Open Agent Protocol resolves conflicts by the precedence rule that a higher precedence layer's refusal cannot be overridden by a lower precedence layer's permission, while a higher precedence layer's permission may be narrowed but not broadened by a lower precedence layer's restriction. The rule has three operational consequences that are worth making explicit.

The first consequence is that an organization cannot use Organizational Policy to permit what Platform Rules refuse. An organization that wishes to deploy an agent that produces categorically prohibited content cannot achieve that result by writing an Organizational Policy that overrides the prohibition. The Platform Rules layer is evaluated first and refuses the action regardless of what the lower layers say. The protocol is not neutral on the categorical prohibitions, and it is not negotiable on them.

The second consequence is that a principal cannot use Personal Preference to permit what Organizational Policy refuses. A medical professional who wishes to share a patient identifier with a friend cannot achieve that result by writing a Personal Preference that permits the sharing. The Organizational Policy of the employing institution refuses the action, and the principal's preference is evaluated only within the space the institution has left open. The protocol is the technical embodiment of the principle that institutional obligations bind the individuals who have assumed them.

The third consequence is that any layer may add restrictions that the higher layers have not imposed. An organization may forbid actions that Platform Rules permit. A Scope may forbid actions that the Organizational Policy permits. A principal may decline to take actions that Scope Policy permits. The composition is monotonic in the direction of restriction, and it is the principle by which the protocol respects the autonomy of each layer to impose constraints within its own domain.

## 5. Multi Party Review for High Stakes Actions

Some actions are sufficiently consequential that the policy stack alone is not a sufficient safeguard. Examples include the transfer of funds above a declared threshold, the deletion of records subject to legal hold, the publication of material non public information, the issuance of binding commitments on behalf of a regulated entity, and the operation of safety critical physical equipment. The Open Agent Protocol responds to such actions with the Multi Party Review mechanism, which requires the concurrent authorization of two or more independent principals before the action is permitted to execute. Multi Party Review composes with the cooling off periods defined in [RFC 0017](/rfcs/0017) for actions whose consequences are difficult to reverse, and with the escalation action of [RFC 0018](/rfcs/0018) which guarantees that a human path remains available at every stage of the review.

The Multi Party Review mechanism is configured at the policy layer. Organizational Policy may declare that a category of actions requires Multi Party Review. The configuration identifies the principals whose authorization is required, the threshold of authorizations that must be obtained, and the time window within which the authorizations must be assembled. An action that triggers Multi Party Review is held in a pending state, the required principals are notified through their registered consent channels, and the action proceeds only when the threshold is met. Each authorization produces a Receipt that becomes part of the action's Decision Record, which means that the authorization chain is auditable in the same way that any other action is.

The mechanism is designed to compose with the existing approval workflows of regulated entities rather than to replace them. A bank that requires four eyes approval for outbound payments above a threshold can express that requirement as Multi Party Review and obtain the same result with cryptographic evidence that the existing workflow does not produce. A hospital that requires attending physician approval for the prescription of controlled substances can express that requirement similarly. The protocol does not invent the workflow. It provides the substrate on which the workflow is encoded and enforced.

## 6. Composition with Major Regulatory Regimes

The policy stack and its supporting mechanisms compose with the major regulatory regimes under which agents will operate. The composition is by design rather than by accident, and it deserves explicit treatment.

The European Union Artificial Intelligence Act establishes a risk based framework in which high risk systems are subject to obligations of risk management, data governance, technical documentation, record keeping, transparency, human oversight, accuracy, robustness, and cybersecurity. The policy stack and the Receipt chain together satisfy the record keeping and transparency obligations. The Decision Records satisfy the requirement for meaningful information about the logic of decisions. The Multi Party Review mechanism satisfies the human oversight requirements for the high stakes subset of high risk actions. The Manifest declaration of supported actions and pricing satisfies the technical documentation requirement at the integration boundary.

The General Data Protection Regulation establishes the rights of access, rectification, erasure, and data portability for natural persons whose personal data is processed. The Receipt chain provides the substrate on which these rights are exercised. The data export endpoint provides the substrate for the right of access and the right to portability. The data deletion endpoint provides the substrate for the right to erasure. The provenance tags that travel with personal data provide the audit trail that the right of access requires. The Decision Records that record the lawful basis for each processing event provide the substrate for the demonstrability obligation under Article five.

The Digital Services Act establishes the obligations of intermediary services with respect to illegal content, transparency, and user notice. The Receipt chain and the Decision Records together satisfy the user notice obligations. The Manifest declaration of moderation rules satisfies the transparency obligation. The Receipt anchored content provenance satisfies the obligation to maintain identification of the persons or entities responsible for the content.

The Markets in Crypto Assets regime applies to Wallet operators that hold crypto denominated balances. The protocol's posture that Wallet operators must comply with the regime in their jurisdiction, the Receipt anchored settlement record, and the export portability of the Wallet ledger together satisfy the conduct of business obligations that the regime establishes.

The composition is not exhaustive of the regulatory regimes that will eventually apply, but it demonstrates the pattern. The protocol does not invent its own regulatory regime. It provides the technical substrate on which the existing regulatory regimes can be honored uniformly across all conformant implementations.

## 7. Conclusion

A safety architecture for autonomous agents must respect the layered structure of the obligations that bind the agents' principals. The Open Agent Protocol responds with a four layer policy stack whose order of evaluation is normative, whose decisions are recorded with structured explanations, whose conflicts are resolved by precedence rules that no implementation may override, and whose composition with major regulatory regimes is engineered rather than accidental. The Multi Party Review mechanism extends the stack to the high stakes actions for which a single principal's authorization is insufficient. The result is a safety architecture that is simultaneously stricter than the contemporary single layer guardrail model and more respectful of the autonomy of each layer to impose constraints within its own domain. It is the architecture appropriate to the deployment of autonomous agents into the institutional settings where they will live for the next decade.

## References

[OAP-CORE-1.0](/spec). The Open Agent Protocol Core Specification.

[RFC 0003](/rfcs/0003): Standing Permissions. Defines the consent grants that Personal Preference draws on.

[RFC 0006](/rfcs/0006): Persona and Scope Layer. Defines the Scope to which Scope Policy attaches.

[RFC 0007](/rfcs/0007): Privacy Preserving Projections. Defines the projections that the policy stack composes with at the data layer.

[RFC 0016](/rfcs/0016): User Sovereignty Charter. Defines the principles that bind the Personal Preference layer to non-negotiable user rights.

[RFC 0017](/rfcs/0017): Irreversibility and Cooling Off Periods. Defines the temporal safeguards that compose with Multi Party Review for high-stakes actions.

[RFC 0018](/rfcs/0018): The Right to a Human Path. Defines the escalation action that the policy stack must always preserve.

Related whitepapers: [Confidentiality and Compliance Context](/papers/confidentiality-and-compliance-context), [Accountability in the Agent Economy](/papers/accountability-in-the-agent-economy), [Governance of an Ownerless Protocol](/papers/governance-of-an-ownerless-protocol).

Regulation (EU) 2024/1689 on harmonised rules for artificial intelligence (AI Act).

Regulation (EU) 2016/679 (General Data Protection Regulation).

Regulation (EU) 2022/2065 on a Single Market for Digital Services (Digital Services Act).

## Appendix A: Social Choice Foundations of Multi-Party Review

This appendix is normative for the social-choice claims it makes and informative for the supporting commentary. It provides the formal foundation of the Multi-Party Review mechanism introduced in section 5, characterizes the voting rules it admits, gives precise impossibility and possibility results that bound what Multi-Party Review can and cannot guarantee, and identifies the strategy-proof voting rules whose use the protocol recommends. The treatment follows the social-choice axiomatics of Arrow (1951), the strategy-proofness theorems of Gibbard (1973) and Satterthwaite (1975), the implementation theory of Maskin (1999), the median-voter analysis of Black (1948) and Moulin (1980), and the multi agent voting treatment of Brandt, Conitzer, Endriss, Lang, and Procaccia (2016) *Handbook of Computational Social Choice*. It is consistent with the social-choice framing in Shoham and Leyton-Brown (2009), chapter 9.

### A.1 Multi-Party Review as a Social Choice Mechanism

Let an Action $\alpha$ be subject to Multi-Party Review. The Organizational Policy specifies a set of reviewers $\mathcal{N} = \{1, \ldots, n\}$ with $n \ge 2$, an authorization threshold $\theta \in \{1, \ldots, n\}$, and a time window $\tau$. Each reviewer $i \in \mathcal{N}$ submits a signed authorization $a_i \in \{\mathrm{approve}, \mathrm{reject}, \mathrm{abstain}\}$ within $\tau$. The Multi-Party Review mechanism is a function

$$
F: \{\mathrm{approve}, \mathrm{reject}, \mathrm{abstain}\}^n \;\to\; \{\mathrm{execute}, \mathrm{block}\},
$$

where the protocol-default $F$ is the threshold rule

$$
F_\theta(a_1, \ldots, a_n) \;=\; \begin{cases} \mathrm{execute} & \text{if } |\{i : a_i = \mathrm{approve}\}| \ge \theta, \\ \mathrm{block} & \text{otherwise.} \end{cases}
$$

Special cases include unanimity ($\theta = n$), supermajority ($\theta = \lceil 2n/3 \rceil$), simple majority ($\theta = \lceil n/2 \rceil + 1$), and the four-eyes rule ($n = 2, \theta = 2$). The threshold rule is the rule the protocol recommends as the safe default; the conditions under which other rules are admissible are characterized in A.4.

### A.2 The Social Choice Frame

Treat Multi-Party Review as a binary social-choice problem: the alternatives are $\{\mathrm{execute}, \mathrm{block}\}$, the agents are the $n$ reviewers, and the preference profile is the vector of authorizations. Each reviewer $i$'s preference is $\mathrm{approve}_i \succ \mathrm{block}_i$ (the reviewer prefers to execute) or $\mathrm{reject}_i \succ \mathrm{execute}_i$ (the reviewer prefers to block). Abstention is treated as indifference.

The binary structure of the problem evades the more vexing impossibilities of social choice: with only two alternatives, Arrow's impossibility theorem (1951) does not bind, and the May (1952) characterization theorem applies instead.

### A.3 Theorem 1 (May's Characterization for Binary Multi-Party Review)

**Statement (May 1952).** A social choice function $F$ on two alternatives satisfies the four axioms of decisiveness, anonymity, neutrality, and positive responsiveness if and only if $F$ is the simple majority rule with $\theta = \lceil n/2 \rceil + 1$.

**Implication for OAP.** When the institutional context is one in which the four axioms are normatively desirable (each reviewer is treated equally, the two outcomes are treated symmetrically, and a single switched vote can change the outcome), simple majority is the unique admissible rule. The protocol therefore exposes simple majority as the **default value** of the threshold rule when the Organizational Policy does not specify $\theta$ explicitly.

### A.4 Theorem 2 (Threshold Rules Are Strategy-Proof)

**Statement.** Every threshold rule $F_\theta$ on the binary alternative set $\{\mathrm{execute}, \mathrm{block}\}$ is strategy-proof: no reviewer can obtain a more preferred outcome by misrepresenting its authorization.

**Proof.** A reviewer that prefers $\mathrm{execute}$ obtains it by reporting $\mathrm{approve}$ whenever the rule's threshold can be satisfied by its vote, and is otherwise indifferent. A reviewer that prefers $\mathrm{block}$ obtains it by reporting $\mathrm{reject}$ (which is operationally equivalent to refusing to approve), with the symmetric argument. Abstention is weakly dominated by reporting the truthful preference. Hence truth-telling is a weakly dominant strategy for every reviewer. $\blacksquare$

**Remark A.4.1 (Why Gibbard-Satterthwaite Does Not Bind).** The Gibbard (1973) and Satterthwaite (1975) impossibility states that no strategy-proof, non-dictatorial social choice function exists on three or more alternatives. Multi-Party Review is binary and therefore evades the impossibility, which is the principled reason the protocol restricts the choice space to $\{\mathrm{execute}, \mathrm{block}\}$ rather than admitting multi-way decisions.

### A.5 Theorem 3 (Liberal Paradox Avoidance)

**Statement.** The Multi-Party Review mechanism does not produce the Sen (1970) liberal paradox: there is no preference profile under which the mechanism mandates an outcome that violates a reviewer's right to veto an action that personally affects them.

**Proof.** The Organizational Policy specifies which reviewers must be included in $\mathcal{N}$ for which Action class. A reviewer whose individual rights are at stake (for example, a Data Subject with respect to deletion of personal data) is included in $\mathcal{N}$ with $\theta = n$ (unanimity), making the reviewer's reject decisive. The protocol thereby implements the contractarian veto guarantee that Sen's paradox identifies as the failure mode of utilitarian aggregation rules. $\blacksquare$

### A.6 Theorem 4 (Independence from Irrelevant Alternatives)

**Statement.** The threshold rule $F_\theta$ on the binary alternative set satisfies Independence of Irrelevant Alternatives (IIA): the social choice between $\mathrm{execute}$ and $\mathrm{block}$ depends only on each reviewer's preference between $\mathrm{execute}$ and $\mathrm{block}$, not on any other consideration.

**Proof.** Direct from the threshold-rule definition: $F_\theta$ is a function of the authorization vector and nothing else. $\blacksquare$

**Remark A.6.1.** IIA is the axiom that fails most often in non-binary social-choice mechanisms (Arrow 1951). The binary restriction makes IIA trivially attainable in OAP, which is the main reason the protocol does not admit multi-way Multi-Party Review with arbitrary alternatives. Multi-way decisions are decomposed into a sequence of binary Multi-Party Reviews per OAP-CORE-1.0 section 13.

### A.7 Theorem 5 (No Ostrogorski Paradox in Threshold-Rule Composition)

**Statement.** Suppose an Action $\alpha$ is conditioned on $k$ independent Multi-Party Review steps with threshold rules $F_{\theta_1}, \ldots, F_{\theta_k}$, and the action proceeds only if all $k$ steps return $\mathrm{execute}$. Then the conjunctive composition does not exhibit the Ostrogorski (1902) paradox: there is no profile in which a majority of reviewers individually prefer $\mathrm{execute}$ on each issue but the composition returns $\mathrm{block}$, given the threshold rule.

**Proof sketch.** The Ostrogorski paradox arises when issue-by-issue majority and bundle-by-bundle majority disagree. The OAP composition is conjunctive in the institutional sense: each Multi-Party Review step is a separate authorization with its own reviewer set $\mathcal{N}_j$ and threshold $\theta_j$. The composition is logical AND over independent decisions. If each of the $k$ steps returns $\mathrm{execute}$ by its own threshold, the conjunction returns $\mathrm{execute}$. The paradox arises only when reviewer sets overlap and a single voter casts inconsistent ballots across issues, which the OAP signature requirement (each authorization is signed by the reviewer's DID and is timestamped) makes detectable; see Remark A.7.1. $\blacksquare$

**Remark A.7.1.** When reviewer sets overlap across composed Multi-Party Review steps, implementations SHOULD log the per-reviewer ballot vector and flag inconsistencies for organizational audit. This is an additive recommendation; the threshold-rule composition is sound in any case.

### A.8 Theorem 6 (Cooling-Off Composition Preserves Walk-Away)

**Statement.** Multi-Party Review composes with the cooling-off mechanism of RFC 0017 in a way that preserves the walk-away stability of RFC 0002 Appendix A.3. Specifically, a reviewer who has signed $\mathrm{approve}$ retains the right to revoke the authorization within the cooling-off window, in which case the Multi-Party Review threshold count is decremented.

**Proof.** RFC 0017 specifies the cooling-off window as a deferred-execution period during which the principal may withdraw consent. Applied to Multi-Party Review, the principal is each individual reviewer. Withdrawal of an $\mathrm{approve}$ authorization reduces the satisfied-threshold count from $k$ to $k-1$. If $k - 1 < \theta$, the action is blocked, and its execution is suspended pending re-authorization. The walk-away stability of RFC 0002 Appendix A.3 is preserved at the level of each reviewer, because each reviewer's outside option (refuse, revoke, abstain) yields utility no less than coerced approval. $\blacksquare$

### A.9 Theorem 7 (Sybil-Resistance of Multi-Party Review)

**Statement.** A coalition that controls $K \ge \theta$ verified reviewer identities can trivially force $\mathrm{execute}$. Sybil resistance therefore requires the verified-reviewer constraint of the Organizational Policy together with the Sub-Tree Aggregation discount of RFC 0011 section 3.6: reviewers sharing a Delegation root are aggregated to a single effective vote.

**Proof sketch.** Without Sub-Tree Aggregation, a Principal that spawns $K$ Sub Agent reviewers may unilaterally satisfy any threshold. With Sub-Tree Aggregation, the $K$ Sub Agents collapse to one effective vote, recovering Sybil resistance under the same bound as RFC 0009 Appendix A.3. The Multi-Party Review mechanism MUST consult the Sub-Tree Aggregation function before counting authorizations. $\blacksquare$

**Implication.** The conformance probe `behavior/multi-party-review-sybil.test.js` verifies that an Organizational Policy that omits Sub-Tree Aggregation is flagged as non-conformant.

### A.10 Voting Beyond Binary Decisions

Some institutional contexts call for richer expressive power than binary approval (for example, ranking proposed amendments to a contract). The protocol does not extend Multi-Party Review to multi-way decisions directly because of Gibbard-Satterthwaite (Remark A.4.1). Instead, the protocol recommends decomposition into a sequence of binary Multi-Party Reviews using one of the strategy-proof binary-decomposition rules:

1. **Pairwise sequential elimination.** Each pair of alternatives is voted in sequence, the loser is eliminated, the survivor faces the next alternative. This is the standard parliamentary procedure and satisfies Condorcet consistency on the strict preference order.
2. **Median-voter rule on a line.** When the alternatives admit a single-peaked preference order on a one-dimensional line (Black 1948), the median voter's preferred alternative is the strategy-proof Condorcet winner. The Multi-Party Review mechanism may implement this directly when the Organizational Policy declares the alternative space as one-dimensional.
3. **Approval voting.** Each reviewer approves any subset of alternatives; the alternative with the most approvals is selected. Approval voting is strategy-proof in expectation under standard assumptions (Brams and Fishburn 1978).

Implementations that wish to support multi-way decisions MUST select one of these rules and document the selection in the Organizational Policy declaration.

### A.11 Composition with the Layered Policy Stack

Multi-Party Review is a layer-2 (Organizational Policy) mechanism in the four-layer stack of section 2. It composes monotonically with the higher layer (Platform Rules) and the lower layers (Scope Policy and Personal Preference). Specifically:

1. A Platform Rule refusal cannot be overridden by Multi-Party Review approval (section 4 conflict-resolution rule).
2. Scope Policy and Personal Preference may add additional Multi-Party Review requirements but cannot weaken those imposed by Organizational Policy.

These properties follow directly from the precedence rules of section 4 and do not require separate proof.

### A.12 Implications for Downstream RFCs

1. **RFC 0002 (Negotiation).** The walk-away stability of Theorem 2 of RFC 0002 Appendix A is preserved under Multi-Party Review composition by Theorem 6 above.
2. **RFC 0008 (Workflows).** Joint commitments under Workflows that require Multi-Party Review (Appendix A.8 of RFC 0008) inherit the strategy-proofness of Theorem A.4.
3. **RFC 0017 (Irreversibility and Cooling Off).** The cooling-off window composes with Multi-Party Review per Theorem 6.
4. **RFC 0019 (Conformance).** The probes `behavior/multi-party-review-threshold.test.js`, `behavior/multi-party-review-sybil.test.js`, and `behavior/multi-party-review-cooling-off.test.js` mechanically verify Theorems 2, 7, and 6 respectively.

### A.13 References to Prior Treatments

- Arrow, K. J. (1951). *Social Choice and Individual Values.* Yale University Press.
- May, K. O. (1952). A Set of Independent Necessary and Sufficient Conditions for Simple Majority Decision. *Econometrica* 20(4).
- Black, D. (1948). On the Rationale of Group Decision-Making. *Journal of Political Economy* 56(1).
- Sen, A. (1970). The Impossibility of a Paretian Liberal. *Journal of Political Economy* 78(1).
- Gibbard, A. (1973). Manipulation of Voting Schemes: A General Result. *Econometrica* 41(4).
- Satterthwaite, M. A. (1975). Strategy-proofness and Arrow's Conditions. *Journal of Economic Theory* 10(2).
- Brams, S. J., and Fishburn, P. C. (1978). Approval Voting. *American Political Science Review* 72(3).
- Moulin, H. (1980). On Strategy-Proofness and Single Peakedness. *Public Choice* 35(4).
- Maskin, E. (1999). Nash Equilibrium and Welfare Optimality. *Review of Economic Studies* 66(1).
- Brandt, F., Conitzer, V., Endriss, U., Lang, J., and Procaccia, A. D. (eds.) (2016). *Handbook of Computational Social Choice.* Cambridge University Press.
- Ostrogorski, M. (1902). *La Democratie et les Partis Politiques.* Calmann-Levy.
- Shoham, Y., and Leyton-Brown, K. (2009). *Multiagent Systems: Algorithmic, Game-Theoretic, and Logical Foundations.* Cambridge University Press, chapter 9.

## Appendix B: Stackelberg Security Game Analysis of the Policy Stack

This appendix is normative for the security claims it makes and informative for the supporting commentary. It models the four layer Policy Stack of section 2 and the Multi-Party Review mechanism of section 5 as a Stackelberg Security Game in the sense of Tambe (2011), characterizes the defender's optimal strategy under bounded attacker rationality, gives precise utility bounds against adaptive adversaries, and connects the analysis to the operational security mechanisms deployed by the major Stackelberg-based security systems ARMOR (Pita et al. 2008), IRIS (Tsai et al. 2009), PROTECT (Shieh et al. 2012), and the Bayesian DOBSS algorithm of Paruchuri, Pearce, Marecki, Tambe, Ordonez, and Kraus (2008). The treatment is consistent with the survey of Sinha, Fang, An, Kiekintveld, and Tambe (2018) and the textbook of Tambe (2011) *Security and Game Theory: Algorithms, Deployed Systems, Lessons Learned.*

### B.1 The Policy Stack as a Stackelberg Security Game

Let $\mathcal{D}$ denote the **Defender**, namely the union of the Policy Stack enforcement points of section 2 (the Universal Prohibitions evaluator, the Organizational Policy engine, the Scope Policy engine, and the Personal Policy engine) together with the Multi-Party Review mechanism of section 5. Let $\mathcal{T}$ denote the set of protected **targets**, namely the consequential Actions defined under RFC 0018 plus the irreversible Actions defined under RFC 0017 plus the high-stake commerce primitives defined under RFC 0014. Let $\mathcal{R} = \{r_1, \ldots, r_K\}$ denote the Defender's set of **resources**, namely the verification probes that the Defender can deploy: signature verification, Receipt-chain audit, Multi-Party Review escalation, cooling-off enforcement, reputation-weighted gating, and adversarial conformance testing under RFC 0019.

The **Defender's pure strategy** $s_d$ is an assignment of resources to targets: which probe is run on which Action class, with what frequency, and triggering which escalation. The **Defender's mixed strategy** $\sigma_d \in \Delta(S_d)$ is a probability distribution over pure strategies. The **Attacker's strategy** $s_a$ is the choice of which target Action class to attack and with what method (forgery, replay, signature stripping, cooling-off bypass, escalation routing, replaceability obfuscation, Sybil creation, all enumerated in section 8 of RFC 0019).

The Defender's utility is

$$
U_d(s_d, s_a) \;=\; \begin{cases} U_d^c(s_a) & \text{if } s_d \text{ covers the target attacked by } s_a, \\ U_d^u(s_a) & \text{otherwise,} \end{cases}
$$

with $U_d^c \ge U_d^u$ (covered attacks are preferred to uncovered attacks). The Attacker's utility has the symmetric structure with $U_a^u \ge U_a^c$ (uncovered attacks are preferred). The Stackelberg structure asserts that the Defender commits first to a publicly observable mixed strategy $\sigma_d^*$ and the Attacker best-responds.

### B.2 Why Stackelberg Rather Than Simultaneous Play

The Policy Stack and Multi-Party Review parameters of OAP are publicly declared in the Manifest under RFC 0019 section 7. Consequently the Attacker is a fully informed second mover. This is the defining condition under which the Stackelberg model applies, in contrast to the simultaneous-move Nash equilibrium that obtains when neither party observes the other's strategy. Tambe (2011, chapter 2) showed that for security domains with this commitment structure, the Defender's optimal strategy is the **Strong Stackelberg Equilibrium** (SSE), which generally yields strictly higher Defender utility than the Nash equilibrium of the simultaneous game.

The SSE $(\sigma_d^*, s_a^*)$ satisfies:

1. $\sigma_d^* \in \arg\max_{\sigma_d} \; U_d(\sigma_d, \mathrm{BR}(\sigma_d))$ where $\mathrm{BR}(\sigma_d)$ is the Attacker's best response.
2. The Attacker breaks ties in the Defender's favor.

Condition 2 is the standard "strong" assumption of Stackelberg security games and is justified in the OAP context by the cooperative-tie-breaking convention of section 4 (when the Attacker is indifferent, the protocol's defaults route to the safer outcome).

### B.3 Theorem B.1 (Existence and Uniqueness of the Defender's Optimal Mixed Strategy)

**Statement.** For every finite OAP Policy Stack instance with finite resource set $\mathcal{R}$ and finite target set $\mathcal{T}$, the Strong Stackelberg Equilibrium $(\sigma_d^*, s_a^*)$ exists and is unique up to a measure-zero set of degenerate utility profiles.

**Proof sketch.** The argument is the classical existence-and-uniqueness proof of Conitzer and Sandholm (2006) and Paruchuri, Pearce, Marecki, Tambe, Ordonez, and Kraus (2008) applied to the OAP setting. Existence follows from the compactness of $\Delta(S_d)$ and the upper semi-continuity of $U_d(\sigma_d, \mathrm{BR}(\sigma_d))$ in $\sigma_d$. Uniqueness up to measure zero follows from the genericity argument of Conitzer and Sandholm (2006, Theorem 3): for any non-degenerate utility profile, the SSE coverage probabilities are uniquely determined by the LP whose constraints encode the Attacker's best-response indifference. $\blacksquare$

### B.4 Theorem B.2 (Computation via DOBSS)

**Statement.** The OAP Defender's optimal mixed strategy $\sigma_d^*$ is computable in polynomial time in the size of the Policy Stack instance using the Decomposed Optimal Bayesian Stackelberg Solver of Paruchuri, Pearce, Marecki, Tambe, Ordonez, and Kraus (2008) when the Attacker is single-type, and is computable in time $O(|\Theta_a|^k)$ in the Bayesian setting where $\Theta_a$ is the set of Attacker types and $k$ is the number of resources.

**Proof sketch.** DOBSS reformulates the multi-LP characterization of SSE as a single mixed-integer linear program whose optimal value gives the Defender's optimal commitment strategy. The reformulation is polynomial-size in the Policy Stack instance, and the resulting MILP can be solved in polynomial time when the Attacker is single-type. The Bayesian extension, in which the Attacker is drawn from a finite type space $\Theta_a$ with known prior, requires the Harsanyi transformation that grows the strategy space exponentially in the number of resources, yielding the bound stated. The Defender's reference implementation publishes its DOBSS configuration under the OAP Registry entry `oap.policy.dobss.v1`. $\blacksquare$

### B.5 Theorem B.3 (Bounded Adversary Utility under SSE Defense)

**Statement.** Let the Attacker have utility bounded by $U_a^{\max}$ on uncovered attacks and $U_a^{\min}$ on covered attacks. Under the SSE strategy $\sigma_d^*$ of B.1, the Attacker's expected utility is bounded above by

$$
\mathbb{E}[U_a(\sigma_d^*, s_a^*)] \;\le\; (1 - p^*) \cdot U_a^{\max} + p^* \cdot U_a^{\min},
$$

where $p^*$ is the SSE coverage probability of the Attacker's best-response target. The OAP Policy Stack achieves $p^* \ge 1 - \epsilon$ for any $\epsilon > 0$ provided the Defender's resource budget $|\mathcal{R}|$ exceeds the Attacker's marginal-utility-per-coverage threshold derived in Korzhyk, Conitzer, and Parr (2010).

**Proof sketch.** Direct from the SSE definition and the resource-coverage bound of Korzhyk, Conitzer, and Parr (2010, Theorem 1). The bound is tight when the Attacker's utility profile is known to the Defender, and degrades gracefully as the Defender's prior over Attacker types becomes more diffuse. $\blacksquare$

**Operational implication.** The Defender's resource budget $|\mathcal{R}|$ is realized in OAP by the conformance probe budget of RFC 0019 section 7 plus the Multi-Party Review reviewer budget of section 5 of this paper. A Provider that wishes to certify Tambe-grade adversarial robustness MUST publish its $|\mathcal{R}|$ allocation in the Manifest's `conformance.security_budget` block.

### B.6 Theorem B.4 (Robustness to Bounded-Rationality Attackers)

**Statement.** When the Attacker exhibits Quantal Response behavior with rationality parameter $\lambda$ (McFadden 1976; Yang, Kiekintveld, Ordonez, Tambe, and John 2011), the Defender's optimal strategy under the Quantal Response Stackelberg Equilibrium (QSE) of Yang et al. (2011) is computable in polynomial time and yields Defender utility that strictly improves over the SSE strategy for $\lambda < \infty$.

**Proof sketch.** Yang, Kiekintveld, Ordonez, Tambe, and John (2011, Theorem 2) characterize the QSE as the solution to a convex optimization problem when the Defender's utility is concave in coverage probability. The OAP utility structure of B.1 satisfies this concavity by construction. The strict improvement over SSE follows from the strict suboptimality of the SSE strategy when the Attacker deviates from perfect rationality, and is operationally important for OAP because real-world adversaries (script kiddies, opportunistic attackers, automated scanners) are demonstrably bounded-rational. The Defender's reference implementation MAY use the QSE algorithm of Yang et al. (2011) and publish its choice under the Registry entry `oap.policy.qse.v1`. $\blacksquare$

### B.7 Multi-Party Review under Stackelberg Bribery

Multi-Party Review (section 5) is itself a Stackelberg Security Game with a different threat model: the Attacker is an internal actor who attempts to bribe a subset of the reviewer set $\mathcal{N}$ to obtain $\theta$ approvals for a malicious Action. The Defender's strategy is the threshold $\theta$ and the reviewer-selection rule. Under the Stackelberg framing:

**Theorem B.5 (Bribery-Resistance Bound).** Suppose the Attacker has bribery budget $B$, each reviewer has a personal cost-of-corruption $c_i$ drawn from a known distribution $F$, and the Defender selects $\theta$ as a function of $|\mathcal{N}|$. Then the Defender's optimal $\theta^*$ that minimizes the probability of successful bribery satisfies

$$
\theta^* \;=\; \min\Big\{ \theta : \Pr_F\big[ \sum_{i=1}^{\theta} c_{(i)} > B \big] \ge 1 - \epsilon \Big\},
$$

where $c_{(i)}$ is the $i$-th order statistic of the reviewer cost-of-corruption distribution and $\epsilon$ is the maximum tolerable bribery success probability.

**Proof sketch.** The Attacker's optimal strategy is to bribe the $\theta$ cheapest reviewers. The Defender's optimal $\theta$ is the smallest threshold under which this cost exceeds $B$ with probability $1 - \epsilon$. The order-statistic bound is the standard combinatorial security argument of Tambe (2011, chapter 6) on insider-threat resistance under Stackelberg bribery. $\blacksquare$

**Operational implication.** Organizations deploying Multi-Party Review SHOULD calibrate $\theta$ to their estimated $B$ and $F$. The OAP Registry MAY publish reference parametrizations for industry-standard threat profiles under `oap.policy.multi-party-review.bribery.v1`.

### B.8 Composition with Conformance Testing (RFC 0019)

The adversarial test selection problem of RFC 0019 section 8 is itself a Stackelberg Patrolling Game in the sense of IRIS (Tsai, Rathi, Kiekintveld, Ordonez, and Tambe 2009). The treatment is given in RFC 0019 Appendix A and is referenced here for completeness. The composition is well defined by the additivity of Stackelberg utilities across independent security games (Korzhyk, Conitzer, and Parr 2011): the Defender's optimal allocation across the Policy Stack and the Conformance Test Patrol is the joint LP solution that respects the per-game resource constraints.

### B.9 Operational Deployments as Reference Points

The Stackelberg Security Game framework underlying this appendix is not theoretical: it has been deployed at scale in safety-critical contexts that share the OAP Policy Stack's defender-attacker structure.

1. **ARMOR** (Pita, Jain, Marecki, Ordonez, Portway, Tambe, Western, Paruchuri, and Kraus 2008) deployed at Los Angeles International Airport for randomized vehicle checkpoint and canine patrol scheduling.
2. **IRIS** (Tsai, Rathi, Kiekintveld, Ordonez, and Tambe 2009) deployed by the United States Federal Air Marshals Service for randomized flight assignment.
3. **PROTECT** (Shieh, An, Yang, Tambe, Baldwin, DiRenzo, Maule, and Meyer 2012) deployed by the United States Coast Guard for port patrol scheduling.
4. **TRUSTS** (Yin, Jiang, Johnson, Tambe, Kiekintveld, Leyton-Brown, Sandholm, and Sullivan 2012) deployed by the Los Angeles Sheriff's Department for fare-evasion patrols on the LA Metro.

These deployments collectively demonstrate that the Stackelberg approach scales to real-world adversarial settings with millions of agent-target pairs and that the resource-coverage bounds of Theorem B.3 hold empirically. OAP inherits this empirical track record by adopting the same algorithmic framework for its Policy Stack defense.

### B.10 Implications for Downstream RFCs

1. **RFC 0017 (Cooling-Off).** The cooling-off window is a Defender resource in the SSE of B.1. Optimal allocation of cooling-off enforcement across Action classes follows from the LP of Theorem B.2.
2. **RFC 0018 (Right to Human Path).** The Escalation Action is a Defender resource that breaks the strict autonomy assumption of the Stackelberg game and converts the analysis into a Human-Agent Collective security game in the sense of Jennings et al. (2014).
3. **RFC 0019 (Conformance).** The adversarial test budget allocation is the patrolling-game extension of B.8, treated formally in RFC 0019 Appendix A.
4. **RFC 0026 (Registry Protocol).** The DOBSS, QSE, and bribery-resistance reference parametrizations are published as Registry entries with the identifiers given in B.4, B.6, and B.7.

### B.11 References to Stackelberg Security Games and Game-Theoretic Defense

- Tambe, M. (2011). *Security and Game Theory: Algorithms, Deployed Systems, Lessons Learned.* Cambridge University Press.
- Conitzer, V., and Sandholm, T. (2006). Computing the Optimal Strategy to Commit to. *Proceedings of the ACM Conference on Electronic Commerce (EC '06).*
- Paruchuri, P., Pearce, J. P., Marecki, J., Tambe, M., Ordonez, F., and Kraus, S. (2008). Playing Games for Security: An Efficient Exact Algorithm for Solving Bayesian Stackelberg Games. *Proceedings of AAMAS-2008.* [DOBSS]
- Pita, J., Jain, M., Marecki, J., Ordonez, F., Portway, C., Tambe, M., Western, C., Paruchuri, P., and Kraus, S. (2008). Deployed ARMOR Protection: The Application of a Game-Theoretic Model for Security at the Los Angeles International Airport. *Proceedings of AAMAS-2008 Industry Track.*
- Tsai, J., Rathi, S., Kiekintveld, C., Ordonez, F., and Tambe, M. (2009). IRIS: A Tool for Strategic Security Allocation in Transportation Networks. *Proceedings of AAMAS-2009 Industry Track.*
- Korzhyk, D., Conitzer, V., and Parr, R. (2010). Complexity of Computing Optimal Stackelberg Strategies in Security Resource Allocation Games. *Proceedings of AAAI-2010.*
- Korzhyk, D., Conitzer, V., and Parr, R. (2011). Solving Stackelberg Games with Uncertain Observability. *Proceedings of AAMAS-2011.*
- Yang, R., Kiekintveld, C., Ordonez, F., Tambe, M., and John, R. (2011). Improving Resource Allocation Strategy against Human Adversaries in Security Games. *Proceedings of IJCAI-2011.*
- Shieh, E., An, B., Yang, R., Tambe, M., Baldwin, C., DiRenzo, J., Maule, B., and Meyer, G. (2012). PROTECT: A Deployed Game Theoretic System to Protect the Ports of the United States. *Proceedings of AAMAS-2012.*
- Yin, Z., Jiang, A. X., Johnson, M. P., Tambe, M., Kiekintveld, C., Leyton-Brown, K., Sandholm, T., and Sullivan, J. P. (2012). TRUSTS: Scheduling Randomized Patrols for Fare Inspection in Transit Systems. *Proceedings of IAAI-2012.*
- McFadden, D. (1976). Quantal Choice Analysis: A Survey. *Annals of Economic and Social Measurement* 5(4).
- Sinha, A., Fang, F., An, B., Kiekintveld, C., and Tambe, M. (2018). Stackelberg Security Games: Looking Beyond a Decade of Success. *Proceedings of IJCAI-2018.*
