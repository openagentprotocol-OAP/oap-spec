# Agent Context Mobility in the Institutional World

**A Whitepaper of the Open Agent Protocol**

**Version:** 1.0
**Status:** Public Working Draft
**Date:** May 2026
**Authors:** T. Fengler (Editor)
**Working Groups:** Identity and Organizations WG

## Abstract

A person in the agent economy does not operate with a single agent. The person operates with a personal agent, an employer provisioned agent, a bank provisioned agent, a health insurer provisioned agent, a professional association provisioned agent, and potentially several more. Each agent operates under a different model, a different policy regime, a different data boundary, and a different billing owner. The result is a context mobility problem that has no precedent in the human web: the person must switch between agent contexts as they switch between institutional roles, and the switch must be instantaneous, policy compliant, memory isolated, and auditable. This paper examines the context mobility problem, surveys the existing solutions and their limitations, presents the OAP response in RFC 0031, and provides formal analysis of the security and privacy properties that the protocol achieves.

## 1. The Context Mobility Problem

The contemporary discourse on AI agents treats the agent as a singular entity: one person, one agent. This assumption is false in every institutional setting that matters. A physician has a personal agent for private life, a hospital provisioned agent for clinical work, a medical board provisioned agent for continuing education, and a health insurer provisioned agent for claims processing. A lawyer has a personal agent, a firm provisioned agent, a bar association provisioned agent, and a court provisioned agent. An employee at a technology company has a personal agent and an employer provisioned agent with a different model, different tools, and different data access.

The problem is not merely that multiple agents exist. The problem is that the person must transition between them, and the transition must satisfy constraints that no existing protocol addresses.

The first constraint is **policy continuity**. When a physician switches from a personal context to a clinical context, the clinical context's Organizational Policy must take effect immediately. No data from the clinical context may leak into the personal context, and no personal data may contaminate the clinical context, except through explicitly authorized bridges.

The second constraint is **identity continuity**. The person is the same person across all contexts. Their DID is the same. Their reputation history spans all contexts. Their preferences (language, accessibility, timezone) should be available in every context. The challenge is to provide identity continuity without providing data continuity.

The third constraint is **lifecycle management**. The relationship between a person and an institution has a beginning (onboarding), a middle (daily operation), and an end (offboarding). Each phase has distinct requirements. Onboarding requires discovery, compliance evaluation, and credential issuance. Daily operation requires context switching, memory isolation, and bridge management. Offboarding requires credential revocation, data disposition, and transition handoff.

The fourth constraint is **BYOA compatibility**. Some institutions permit the person to use their personal agent within the institutional context, subject to compliance conditions. This is the agent analog of Bring Your Own Device (BYOD), with the additional complexity that the agent's model, memory, and reasoning are software that can be audited but not physically controlled.

## 2. Existing Approaches and Their Limitations

### 2.1 FIDO Alliance Agentic Authentication Working Group

The FIDO Alliance announced its Agentic Authentication Technical Working Group in April 2026, chaired by members from CVS Health, Google, and OpenAI. The group focuses on verifiable user instructions, agent authentication, and trusted delegation for commerce. These are necessary primitives, but they address the authentication layer, not the provisioning and context mobility layer. A person who has authenticated to two organizations still lacks a protocol for switching between them.

### 2.2 Microsoft Entra Agent ID

Microsoft's Entra Agent ID provides enterprise identity management for agents within a single organization: agent lifecycle management, conditional access, audit logging, and OAuth 2.0 integration. It solves the single organization problem well. It does not address the cross organization problem. A person whose employer uses Entra Agent ID and whose bank uses a different identity system has no interoperability layer between them.

### 2.3 OAuth 2.0 and OIDC Extensions

The OAuth 2.1 and OIDC specifications have been adapted for machine to machine interaction with scoped access tokens, token exchange, and identity federation. These adaptations provide the authorization substrate but not the semantic layer. OAuth scopes can express "read calendar" but cannot express "this agent is operating under medical confidentiality obligations and its memory must be wiped upon offboarding."

### 2.4 Academic Literature

The multiagent systems literature provides the theoretical foundations. Castelfranchi (1998, 2003) formalized the delegation of authority in institutional contexts: an institution delegates a subset of its authority to an agent, and the delegation carries obligations that constrain the agent's behavior. Singh (1999, 2013) formalized commitments as the primitive of social interaction: when an institution provisions an agent, it commits to certain service levels and the person commits to certain usage constraints. Artikis, Sergot, and Pitt (2009) formalized the computational specification of open agent societies with norm governed institutions: the norms of the institution are computable and enforceable at the protocol level.

The OAP contribution is to take these formalisms out of the academic setting and into a deployable protocol with signed documents, JSON schemas, conformance tests, and reference implementations.

## 3. The OAP Response: RFC 0031

RFC 0031 introduces five entities that together formalize the agent provisioning lifecycle.

### 3.1 Provisioning Manifest

An Organization publishes a Provisioning Manifest at a well known endpoint. The Manifest declares the model requirements, the BYOA policy, the scope template, the billing arrangement, and the offboarding procedure. A personal agent can discover this Manifest and present it to the person for review before onboarding.

The Provisioning Manifest is the agent analog of an employee handbook: it describes what the institution provides, what it expects, and what happens when the relationship ends. Unlike an employee handbook, the Provisioning Manifest is machine readable, schema validated, and cryptographically signed.

### 3.2 BYOA Attestation

When an institution permits a person to use their personal agent, the institution must verify that the agent satisfies compliance conditions. The BYOA Attestation is a signed credential that records the outcome of this verification: data residency confirmed, audit logging confirmed, model evaluation passed, no training on organizational data confirmed. The Attestation has a validity period and a re attestation cadence.

### 3.3 Context Mobility Envelope

When a person switches between institutional contexts, the switch is recorded in a Context Mobility Envelope. The Envelope declares the source and target Scopes, the agents involved, the data categories transferred, the data categories prohibited, and the policy evaluation outcome. Every Context Mobility Envelope is evaluated against all four layers of the Policy Stack before the transition proceeds.

### 3.4 Offboarding Receipt

When a person leaves an institution, the institution issues an Offboarding Receipt that records the revocation of all credentials, the disposition of all data, and any transition handoff to the person's personal scope. The Receipt is a verifiable proof that the institution has fulfilled its offboarding obligations and that the person has received their data portability rights.

## 4. How Agents and Humans Work with This Protocol

### 4.1 The Human Experience

For the human, the protocol is largely invisible. The experience is:

1. **Join a new organization.** The personal agent discovers the organization's Provisioning Manifest and presents a summary: "Acme Corp offers you an agent with GPT-4o, or you can use your own Claude agent if it passes their compliance check. They will pay for up to EUR 500 per month. When you leave, your task list and calendar commitments will transfer back to your personal agent. Do you want to proceed?" The person approves.

2. **Daily life.** The person says "start work" and the agent context switches to the organizational scope. The person says "end work" and it switches back. The person never sees a Context Mobility Envelope. The person never sees a policy evaluation. The agent handles everything.

3. **Leave an organization.** The person says "I am leaving Acme" and the agent initiates offboarding. The person receives a summary: "Your Acme access has been revoked. Your task titles and calendar commitments have been transferred to your personal agent. Acme will retain your organizational data for 90 days and then delete it. Your audit trail will be preserved for 10 years." The person confirms.

### 4.2 The Agent Experience

For the agent, the protocol provides clear, machine readable instructions at every step.

**Discovery.** The agent fetches `/.well-known/oap-provisioning.json` and parses the Provisioning Manifest. The agent evaluates whether the organization's requirements are compatible with its own capabilities (model family, data residency, audit logging).

**BYOA evaluation.** If the person elects BYOA, the agent assembles compliance evidence (certifications, audit log endpoint, data residency attestation) and submits it to the organization's BYOA evaluation endpoint. The agent receives a BYOA Attestation and stores it.

**Context switching.** When the person indicates a context change, the agent constructs a Context Mobility Envelope, evaluates it against the Policy Stack, applies the data transfer rules (transfer permitted categories, prohibit forbidden categories), activates the relevant Context Bridges, and begins operating under the target Scope's policies.

**Offboarding.** When the person indicates departure, the agent submits an offboarding request. The agent receives an Offboarding Receipt, verifies that all credentials have been revoked, exports the person's data if permitted, wipes organizational memory, and transfers permitted data categories to the personal Scope.

### 4.3 The Organization Experience

For the organization, the protocol provides a declarative interface for agent governance.

**Publish once.** The organization publishes a Provisioning Manifest that declares its agent requirements. This Manifest is the single source of truth for all agent provisioning within the organization.

**Evaluate BYOA.** When a member requests BYOA, the organization's compliance system evaluates the personal agent against the conditions declared in the Manifest. If the evaluation passes, the system issues a BYOA Attestation automatically.

**Enforce policy.** The organization's Organizational Policy (Layer 2 of the Policy Stack) applies automatically to all agents operating within organizational Scopes. The organization does not need to configure each agent individually.

**Offboard cleanly.** When a member departs, the organization's system revokes all credentials, issues an Offboarding Receipt, and handles data disposition according to the Manifest's offboarding policy.

## 5. Formal Security Analysis

### 5.1 Threat Model

The adversary has one of five goals: (a) forge a Provisioning Manifest to trick a personal agent into onboarding under a malicious organization, (b) replay a BYOA Attestation after the underlying compliance conditions have changed, (c) inject a fraudulent Context Mobility Envelope to force an unauthorized context switch, (d) extract organizational data through a compromised personal agent operating under BYOA, or (e) issue an incomplete Offboarding Receipt that leaves residual access paths.

### 5.2 Mitigations

Each threat is mitigated by a protocol level mechanism:

**(a)** Provisioning Manifests MUST be signed by the Organization's DID and anchored in the OAP Registry (RFC 0026). A personal agent MUST verify the Registry anchor before presenting a Manifest to the person.

**(b)** BYOA Attestations carry `valid_until` and `re_attestation_due` fields. Tools MUST verify currency. Expired attestations MUST NOT be honored. Re attestation requires fresh compliance evidence.

**(c)** Context Mobility Envelopes MUST be signed by the Principal. Both source and target agents MUST verify the signature. The Policy Stack evaluation is mandatory and cannot be bypassed.

**(d)** A BYOA agent operates under the Organization's Scope Policy, which restricts data access to the categories declared in the Provisioning Manifest. Memory isolation (RFC 0006 section 3.5) prevents organizational data from persisting in the personal Scope. Audit logging (required by the BYOA Attestation) provides post hoc detection.

**(e)** Offboarding Receipts are schema validated. Theorem 3 of RFC 0031 proves that a valid Offboarding Receipt severs all access paths. The conformance probe verifies that revoked credentials are no longer honored.

## 6. Regulatory Composition

The provisioning and context mobility protocol composes with the major regulatory regimes.

**EU AI Act.** The Provisioning Manifest's `model_policy` section documents the AI system's capabilities and limitations, satisfying the technical documentation requirements for high risk systems. The BYOA evaluation satisfies the requirement for risk assessment when deploying AI systems.

**GDPR.** The Offboarding Receipt's `data_disposition` section provides the verifiable record of data deletion and export that Articles 17 (erasure) and 20 (portability) require. The Context Bridge's `bridge_requires_principal_consent` field enforces the consent requirements of Article 6.

**Digital Services Act.** The audit trail preserved by the Offboarding Receipt satisfies the record keeping obligations for intermediary services.

## 7. Conclusion

The agent context mobility problem is one of the defining infrastructure challenges of the agent economy. It is not a niche concern; it affects every person who works for an organization, uses a bank, has health insurance, or interacts with government services. The Open Agent Protocol's response in RFC 0031 is the first protocol level solution that addresses the full lifecycle: discovery, onboarding, BYOA attestation, daily context switching, re attestation, and offboarding, with formal security properties and regulatory composition.

## References

Artikis, A., Sergot, M. J., Pitt, J. V. (2009). Specifying Norm Governed Computational Societies. *ACM Transactions on Computational Logic* 10(1).

Castelfranchi, C. (1998). Modelling Social Action for AI Agents. *Artificial Intelligence* 103(1-2).

Castelfranchi, C., Falcone, R. (2003). From Automaticity to Autonomy: The Frontier of Artificial Agents. *Agent Autonomy*, Springer.

Dignum, V. (2003). *A Model for Organizational Interaction*. PhD Thesis, Utrecht University.

Dignum, V. (2019). *Responsible Artificial Intelligence*. Springer.

FIDO Alliance (2026). Agentic Authentication Technical Working Group Charter.

Floridi, L. (2018). Soft Ethics and the General Data Protection Regulation. *Phil. Trans. R. Soc. A* 376.

Josang, A., Ismail, R., Boyd, C. (2007). A Survey of Trust and Reputation Systems. *Decision Support Systems* 43(2).

Microsoft (2026). Microsoft Entra Agent ID Documentation.

Russell, S. J. (2019). *Human Compatible*. Viking.

Sabater, J., Sierra, C. (2005). Review on Computational Trust and Reputation Models. *Artificial Intelligence Review* 24(1).

Singh, M. P. (1999). An Ontology for Commitments in Multiagent Systems. *Artificial Intelligence and Law* 7(1).

Singh, M. P. (2013). Norms as a Basis for Governing Sociotechnical Systems. *ACM TIST* 5(1).
