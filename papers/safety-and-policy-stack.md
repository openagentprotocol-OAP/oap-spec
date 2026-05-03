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
