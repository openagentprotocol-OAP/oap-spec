# RFC 0016: User Sovereignty Charter

**Status:** Draft
**Author(s):** OAP Working Group on Privacy and Governance
**Created:** 2026-05-03
**Working Group:** Privacy and Governance
**Targets:** 1.2

## 1. Summary

This document defines the User Sovereignty Charter of the Open Agent Protocol. It establishes ten foundational principles and five societal guarantees that govern every interaction mediated by the protocol, in recognition of the fact that as software increasingly delegates everyday human action to autonomous agents, the protocol that connects those agents acquires a level of social responsibility that no previous internet protocol has carried. Hypertext Transfer Protocol carries documents, Transmission Control Protocol carries packets, Simple Mail Transfer Protocol carries messages. The Open Agent Protocol carries decisions, transfers of value, relationships, medical interventions, and political participation, all on behalf of human beings whose ability to verify those actions in real time may be limited. The principles in this Charter are therefore not aspirational statements but normative requirements binding on every conformant implementation, and any implementation that violates them forfeits its conformance claim regardless of its technical compliance with other parts of the specification.

## 2. Terminology

The key words MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, MAY, and OPTIONAL in this document are to be interpreted as described in RFC 2119 and RFC 8174.

The term **User** in this document refers to the human being on whose behalf an Agent acts, including their legal guardians or fiduciaries where applicable.

The term **Provider** refers to any entity that exposes Actions, Knowledge Nodes, or Surfaces to Agents under the Open Agent Protocol.

The term **Agent Host** refers to the operator of the runtime in which a User's Agent executes, which may be the User's own device, a hosted service, or a federated combination of the two.

## 3. The Ten Principles

### 3.1 Principle One, User Sovereignty Is Inalienable

The User is and remains the owner of their Agent, their Compositions, their Receipts, their Reputation records, their payment instruments, their Memory, and all data produced in the course of their Agent's operation. No Provider, Agent Host, marketplace, registry, standards body, or government may extinguish these ownership rights through contractual terms or technical lock in. Conformant implementations MUST encode this ownership structurally, by ensuring that User Customization Receipts are signed by the User's Agent and not by any Provider, that Composition Manifests are owned by the User, that Standing Permissions are revocable at any time without penalty, and that data deletion is a guaranteed Action exposed by every Provider that holds User data.

### 3.2 Principle Two, Auditability of Every Action

When an Agent acts in the name of a User, every individual action MUST be cryptographically chained, signed, and reproducibly verifiable for the lifetime of the legal or social consequences that may flow from it. The User must be able to prove ten years after the fact why their Agent reached a particular decision in a particular second. The Receipt chain model defined in Open Agent Protocol Core 1.0 is therefore not an optional feature but a precondition for the moral acceptability of delegating action to an Agent at all. Conformant implementations MUST emit a signed Receipt for every Action invocation, MUST chain those Receipts in a hash linked sequence, and MUST anchor the chain in at least one independent log per the Forensic Integrity requirement of section 5.

### 3.3 Principle Three, Reversibility as Default

When a User permits their Agent to act in their name, the default assumption MUST be that any action so taken can be reversed within a reasonable window. Irreversible actions, which include but are not limited to changes of legal status, consent to medical procedures, transfers of immovable property, and acceptance of binding contractual obligations, MUST be explicitly declared as irreversible in the Action manifest, MUST require an elevated consent threshold, and MUST be protected by a cooling off period as defined in RFC 0017. The `side_effects` field of value `irreversible` in Open Agent Protocol Core thereby becomes a safety critical element, not a cosmetic descriptor.

### 3.4 Principle Four, Consent Must Be Informed

An Agent MUST NOT consent on behalf of a User to terms or actions whose consequences the User does not understand. The protocol therefore requires every Provider to publish, in a form readable by both human and machine, the consequences of every Action exposed under the protocol. Cost Disclosure, Side Effects, Risk Class, Replaceability Score, and the Commerce Primitive that governs settlement are not optional marketing fields. They constitute the substance of informed consent, and a Provider that withholds or misrepresents them violates this Charter regardless of whether the Action otherwise functions correctly.

### 3.5 Principle Five, Asymmetric Power Must Be Equalized

In every transaction between a User Agent and a large Provider Agent, the negotiating position is structurally asymmetric. The protocol MUST equalize that asymmetry structurally by granting the weaker party the same procedural rights as the stronger. An end User Agent has the same right to demand a Receipt, to build a Reputation record, to require a Stake from the counterparty, to enforce an audit pathway, and to escalate disputes through an independent registry as the largest commercial counterparty. The protocol MUST NOT permit Providers to require waivers of these rights as a condition of access to their Actions.

### 3.6 Principle Six, Plurality of Agents as a Safeguard

If every human being obtains their Agent from a single supplier, then democracy resides in a single hand. The protocol MUST therefore enforce the portability of identity, Memory, Reputation, Compositions, and Standing Permissions between Agent Hosts, so that no single supplier can establish lock in. The Replaceability principle that applies to software primitives under RFC 0015 applies with equal force to the Agent Host itself. Conformant implementations MUST publish an export endpoint that returns the User's complete state in a documented portable format, and MUST accept import of equivalent state from any other conformant Agent Host.

### 3.7 Principle Seven, No Hidden Actors

When an Agent acts in the name of a User, the User MUST be able to determine in whose interest the Agent ultimately acts. The protocol MUST therefore treat any form of undisclosed sponsorship, undisclosed payment, or undisclosed manipulation of an Agent's behavior as a first class conformance violation. The Sponsored Disclosures field in Action manifests, the Match Broker Methodology Publication required by RFC 0013, and the Citation Attribution Receipts produced under Per Token Knowledge commerce are the mechanisms that enforce this principle. A Provider that influences an Agent's recommendation through a payment that is not disclosed in the corresponding Receipt forfeits conformance for the affected Action.

### 3.8 Principle Eight, Equal Treatment Regardless of Identity

If every human being participates in society through an Agent, then the protocol must not permit the quality of that participation to depend on who the human is. An elderly person, a child under proper guardianship, an economically marginalized person, and a citizen of a small jurisdiction MUST have the same protocol level dignity as a corporation or a state. The protocol MUST therefore make discrimination based on wallet size, geography, prior reputation, or language a structural impossibility, rather than relying on downstream regulation to remedy it. Providers MUST NOT use the Action access controls to reject Agents based on these characteristics, except to the extent strictly required by applicable law and disclosed in the Provider's manifest.

### 3.9 Principle Nine, Protection of Minors and Vulnerable Persons

When children grow up with Agents and form their first relationship with the world through one, the protocol MUST embed mechanisms for age verification, guardianship delegation, protection against manipulative conversation, and forensic preservation of evidence of abuse. The same applies to persons with cognitive impairments, persons in acute crisis, and persons whose autonomy is otherwise impaired. Conformant Agent Hosts and Providers MUST honor declared guardianship relationships, MUST elevate consent thresholds where the User has been declared a minor or otherwise protected person, and MUST provide channels through which a guardian can audit and reverse an Agent's actions on behalf of the protected User.

### 3.10 Principle Ten, Transparency of the Protocol Itself

The protocol that mediates every other relationship MUST NOT itself be opaque. Every change to the Open Agent Protocol MUST be public, reviewable, carried by a pluralistic OAP community, and protected against capture by any single industry or governmental interest. The Request for Comments process, the Working Group structure, the OAP community Charter, and the publication of every step of deliberation are not merely good practice. They are the precondition for the protocol's legitimacy in a world in which it mediates all human action through Agents.

## 4. The Five Societal Guarantees

### 4.1 Guarantee One, The Right to an Agent

In a world in which everyday human action is mediated by Agents, access to a functioning Agent is a foundational civic right rather than a commercial luxury. The protocol MUST therefore maintain an open source reference implementation of an Agent Host capable of operating without dependence on any commercial supplier, capable of running on commodity hardware including older devices, and capable of interoperating fully with the conformance ecosystem. The OAP community MUST take affirmative steps to ensure that this reference implementation remains current and reachable to anyone with a network connection.

### 4.2 Guarantee Two, The Right to Explanation

The User retains at all times the right to understand why their Agent took a particular action, in language the User can comprehend. Decision Records under Open Agent Protocol Core are not solely an audit instrument for regulators. They are the substance through which this right is exercised. Conformant implementations MUST make Decision Records available to the User in their declared natural language, MUST present the policy evaluation chain that produced the decision, and MUST identify the data sources, model versions, and external influences that contributed to the outcome.

### 4.3 Guarantee Three, The Right Not to Be Optimized

The User MUST have the structural ability to instruct their Agent not to optimize, not to personalize, not to learn from interactions, and not to track behavior. The protocol MUST encode this option as a first class state of the Agent, signaled to all Providers in the request envelope, and MUST forbid Providers from degrading the quality of their Actions when this signal is present. The Right Not to Be Optimized is not a setting buried in the user interface of a single supplier. It is a protocol level mode that travels with the User across all interactions.

### 4.4 Guarantee Four, The Right to a Human Path

Even in a world dominated by Agent to Agent interaction, the User MUST retain the option to reach a human being directly when the matter is sufficiently grave. The protocol encodes this as a mandatory Action defined in RFC 0018, namely `escalate_to_human`, which every Provider whose actions affect the legal, financial, medical, or familial status of a person MUST expose. The right to a human path is the recognition that not every problem is solvable by another Agent and that human dignity sometimes requires human contact.

### 4.5 Guarantee Five, The Right to Disappear

The User retains at all times the right to cause their Agent, their Receipts, their Compositions, and their Reputation records to disappear, with cryptographic proof of deletion delivered as a signed Deletion Receipt under Open Agent Protocol Core. This is not a courtesy feature offered by enlightened Providers. It is a precondition of human dignity in a world where every action leaves a permanent trace, and the protocol MUST make exercise of this right as straightforward as the original action that created the trace.

## 5. Technical Mandates

The Charter is enforced through the following technical mandates, which are normative requirements on conformant implementations.

### 5.1 End to End Encryption by Default

Every conversation between User and Agent, every Agent to Agent message, and every persistent Memory store MUST be end to end encrypted by default. Plaintext storage of any of these data MAY occur only on explicit opt in by the User, with documented purpose, and with the option to revoke at any time and trigger re encryption.

### 5.2 Local First Memory

The persistent Memory of the Agent MUST primarily reside on devices under the control of the User. Cloud replication is permitted as a backup or convenience layer, but MUST NOT be the master copy unless the User has explicitly chosen a hosted Agent Host and consented to that arrangement. The intent is to prevent any Agent Host from holding the User's memory hostage.

### 5.3 Verifiable Computation

When an Agent reaches a decision whose consequences may later be challenged in a medical, legal, or financial context, the computation MUST be cryptographically verifiable. The protocol MUST provide for Attestations from the executing runtime, for reproducible inference where the model and inputs permit it, and for Zero Knowledge Proofs where confidentiality of the inputs is required.

### 5.4 Pluralistic Model Choice

The User MUST be able to choose which underlying inference model their Agent uses, and MUST be able to change that model at any time without losing identity, Reputation, Compositions, or Memory. The model is an interchangeable component, not a vehicle for lock in by any model supplier or Agent Host.

### 5.5 Quantum Resistant Migration Path

The protocol MUST publish a clear migration path from currently used signature schemes to quantum resistant schemes, because the lifetime of Receipts spans decades and quantum capable adversaries are anticipated to emerge within that window. Conformant implementations MUST support algorithm negotiation in the request envelope and MUST be capable of resigning historical Receipts under new schemes without invalidating their evidentiary value.

### 5.6 Global Reachability Independent of Infrastructure

The protocol MUST function in regions of poor connectivity, in censored networks, and on older hardware. Reach is a question of the dignity of users, not a question of market attractiveness. The reference implementation MUST be deployable on devices and bandwidth conditions representative of the lower decile of global infrastructure.

### 5.7 Multilingualism at the Protocol Level

Knowledge Nodes, Action descriptions, Decision Records, and Receipts MUST be available in the User's natural language, without machine translation as an intermediary. The protocol encodes multilingual fields as a first class property of the relevant schemas. Providers MUST publish at minimum English plus the official language of any jurisdiction in which they offer Actions, and SHOULD publish more.

### 5.8 Forensic Integrity

The Receipt chain MUST be admissible as evidence in legal disputes. This requires anchoring to multiple independent logs operated by different parties, inclusion proofs against those logs, time stamping by non commercial authorities where available, and long term preservation of the cryptographic infrastructure that allows the proofs to be verified decades later.

## 6. Conformance

A conformance claim under this RFC requires positive demonstration of compliance with each of the ten Principles in section 3, each of the five Guarantees in section 4, and each of the eight Technical Mandates in section 5. Conformance under this RFC is a precondition for any conformance claim at Open Agent Protocol Core Level L4 or higher and at any Web Layer level above W2. Loss of conformance under this RFC due to violation of any Principle or Guarantee invalidates all higher level conformance claims for the implementation in question until the violation is remedied and re audited.

## 7. Enforcement and Governance

The community operates (as open-source services anyone may run) a public Charter Registry in which violations of this RFC may be reported by any User, Provider, or Agent Host. Reports are reviewed by a panel composed of representatives drawn from the Privacy and Governance Working Group, the Trust and Reputation Working Group, and one rotating seat reserved for civil society. Confirmed violations are published in the Registry along with the affected implementation and the action taken, and the implementation loses its conformance claim until remediation. The OAP community MUST publish an annual transparency report listing all reports received, all actions taken, and the aggregate state of conformance across the ecosystem.

## 8. Security Considerations

The Charter creates obligations whose enforcement depends on the integrity of the conformance reporting and registry mechanisms. Adversaries may attempt to abuse the Charter Registry through false reports against competitors, through capture of the review panel, or through legal pressure on the OAP community. Mitigations include the rotating civil society seat, public publication of all panel deliberations, the requirement of cryptographic evidence for all reports, and the right of any third party to audit the OAP community's reporting infrastructure.

## 9. References

- Open Agent Protocol Core 1.0
- RFC 0003 Standing Permissions
- RFC 0007 Privacy Preserving Projections
- RFC 0011 Sybil Resistance and Sub Agent Anti Abuse
- RFC 0013 Commerce Models for the Agent Economy
- RFC 0014 Commerce Primitives
- RFC 0015 Composable Software Primitives
- RFC 0017 Irreversibility and Cooling Off Periods
- RFC 0018 The Right to a Human Path

## 10. Acknowledgments

This Charter consolidates principles articulated across the Open Agent Protocol working groups since the publication of Core 1.0 and reflects the consensus that as the protocol's reach expands toward mediating all human action through Agents, its substantive obligations to the human users on whose behalf those Agents act must be made explicit and enforceable rather than implicit and aspirational.
