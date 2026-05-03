# Confidentiality and Compliance Context

**A Whitepaper of the Open Agent Protocol**

**Version:** 1.0
**Status:** Public Working Draft
**Date:** May 2026
**Authors:** OAP Confidentiality and Compliance Context Working Group

## Abstract

The dominant failure mode of autonomous agents in the next five years will not be a hallucinated answer to a trivia question. It will be a confidentiality breach committed by an agent that did not know which obligations applied to the data it was carrying. A natural person operates simultaneously as an employee bound by a non disclosure agreement, as a patient whose health information is protected by statute, as a board member whose access to material non public information is governed by securities law, and as a private individual whose family communications are no business of any other party. A legal person operates simultaneously across multiple regulated functions, multiple client relationships, multiple jurisdictions, and multiple competitive boundaries. An agent that acts on behalf of either party with no awareness of the obligations attached to the data it is moving will eventually move that data into a context in which doing so is a breach. This whitepaper introduces the Confidentiality and Compliance Context, the Open Agent Protocol primitive that makes those obligations explicit, machine readable, and enforceable at the moment of every Invocation. It explains why no narrower mechanism is sufficient, how the Context composes with the policy engine, and how it operates in four representative regulated domains.

## 1. The Inadequacy of Per Application Confidentiality

The dominant approach to confidentiality in software today is to treat each application as an isolated container of data. The application enforces its own access controls, the application records its own audit log, and the application discloses its own privacy practices. This works tolerably well when a person interacts with a small number of applications and consciously moves data between them. It collapses when an autonomous agent operates across hundreds of applications on the person's behalf and treats them as interchangeable destinations for whatever the current task requires.

The collapse is not a hypothetical. A widely used assistant pattern today is to ask an agent to summarize an email thread and post the summary to a team chat. The email thread may contain a non disclosure obligation owed to a client. The team chat may include members of a competing engagement that the same firm runs for a different client. The summary, written by an agent that has no awareness of either obligation, becomes the instrument of a breach that the person never intended and the application stack could not detect. The application that hosted the email cannot warn the agent, because the obligation is not visible to the application. The application that hosts the chat cannot refuse the message, because the obligation is not visible to the application either. Only a layer that both applications can read can carry the obligation across the boundary, and that layer does not exist in the contemporary software stack.

The Confidentiality and Compliance Context is the layer that makes the obligation visible to every application that the agent touches. It is normative at Conformance Level L3 and above, which means that any Tool that holds itself out as suitable for use by professional or organizational principals must read, propagate, and enforce it.

## 2. The Structure of the Context

The Context is a structured object attached to a Scope. The Scope, defined in [RFC 0006](/rfcs/0006), is the bounded execution context under which an Agent acts at a particular moment. A single Principal may operate under many Scopes, and the Context attached to each Scope encodes the obligations that apply to the work the Agent performs while operating in that Scope.

The Context enumerates active non disclosure agreements with their counterparties, their covered data categories, their validity windows, and their governing jurisdiction. It enumerates non compete and non solicitation obligations with their durations and territorial scope. It enumerates explicit embargo lists, which are the parties to whom the Principal has chosen not to disclose specific categories of information regardless of any other consideration. It enumerates Chinese walls between [Scopes](/rfcs/0006), which are the situations in which information held in one Scope is forbidden from reaching another Scope held by the same Principal. It enumerates the professional codes that bind the Principal, the fiduciary duties owed to other parties, the regulatory classifications that apply to the data held in the Scope, the insider lists on which the Principal sits, the sanctions screening regime that applies to the Principal's interactions, and the export control classification of the data the Scope produces. Each of these fields is structured. Each of them is machine readable. Each of them is verifiable against an independently published authority.

The Context is signed by the Principal that asserts it. A Tool that receives a request bearing a Context verifies the signature, evaluates the request against the Context, and either permits, conditions, or refuses the request before any data is transmitted. The verification and evaluation are recorded in a Decision Record that becomes part of the Receipt for the request, which means that the operator's behaviour with respect to the Context is itself auditable.

## 3. The Pre Action Confidentiality Gate

The mechanism that connects the Context to the Invocation is the Pre Action Confidentiality Gate. Before any Invocation that involves outbound data is permitted to leave the Agent, the Agent evaluates the Context against the destination Tool, the destination Tool's data policy, and the data classes that the request will carry. The data classes are expressed using the projection vocabulary of [RFC 0007](/rfcs/0007), which makes it possible to reason about which fields a Tool needs and to refuse the disclosure of fields that the Context does not authorize. The evaluation answers a fixed sequence of questions. Is the destination on an embargo list. Does an active non disclosure agreement cover the data classes being shared. Does the proposed sharing violate a non compete or non solicitation clause. Does an active Chinese wall isolate the data from the destination. Does any professional code applicable to the Principal restrict disclosure to the destination. Does any sanctions list contain the destination. Does the export classification of the data permit transfer to the destination's jurisdiction.

The evaluation produces one of five outcomes. The first is to allow the Invocation, in which case the request proceeds normally. The second is to allow the Invocation under conditions, in which case the request proceeds with additional safeguards such as redaction of specific fields or addition of provenance tags that propagate to downstream consumers. The third is to require explicit consent from the Principal, in which case the Invocation is held until the Principal authorizes it through a registered consent channel. The fourth is to require anonymization, in which case the Invocation proceeds with personally identifying or commercially sensitive content replaced by pseudonymous tokens that the Principal resolves locally. The fifth is to block the Invocation entirely, in which case the request fails and the failure is recorded with sufficient explanation that the Principal can understand why.

The Gate is not advisory. It is the protocol's mechanism for ensuring that the obligations a Principal has assumed in the world outside the software stack are honored within it.

## 4. Privileged Mode

A subset of professional contexts demand stronger protection than the general Confidentiality and Compliance Context provides. Attorney client privilege, medical confidentiality, journalist source protection, the confessional seal, and a small number of analogous privileges are characterized by the property that disclosure to any third party defeats the privilege regardless of the third party's intent. An Agent operating in such a context cannot tolerate the cryptographic proofs of activity that the rest of the protocol relies on, because those proofs themselves constitute a disclosure.

The Open Agent Protocol responds to this requirement with Privileged Mode. When a Scope is flagged as carrying a recognized privilege, the protocol switches its behaviour in five specific ways. First, Receipts produced by Invocations under the Scope are stored only on systems controlled by the Principal and are anchored externally only as opaque commitments that reveal nothing about the participants or the contents. Second, the Agent providers that may participate in the Invocation chain are restricted to those on a privileged provider list that has been independently validated for compliance with the relevant privilege. Third, cross border transfers are blocked unless an explicit privilege preserving cross border instrument is in force. Fourth, subprocessor disclosure is mandatory and must be confirmed before any Invocation proceeds. Fifth, the loss of privilege through misconfiguration triggers an immediate notification to the Principal so that the loss can be addressed before the privileged information is acted on.

Privileged Mode is the technical embodiment of the principle that some categories of information must be protected against unauthorized disclosure even at the cost of reduced auditability. The protocol does not pretend that the trade off can be avoided. It provides the mechanism by which the trade off can be made deliberately, recorded honestly, and enforced uniformly.

## 5. Industry Profiles

The Confidentiality and Compliance Context becomes operationally useful only when the obligations it encodes correspond to the actual obligations that practitioners face. The Open Agent Protocol therefore maintains a registry of Industry Profiles, each of which is a normative template that encodes the obligations of a specific profession or regulated domain.

The Medical Patient Confidentiality Profile encodes the obligations of clinicians and their employers under statutes that protect patient information. It enumerates the data categories that are subject to confidentiality, the lawful bases on which those categories may be processed, the cross border transfer restrictions that apply, and the deletion and export rights that the patient retains. A Tool that declares conformance with the profile commits to honoring those obligations as part of its Manifest.

The Legal Attorney Client Profile encodes the obligations of lawyers and their staff. It enumerates the categories of communication subject to privilege, the parties whose involvement defeats privilege, and the cross border instruments that are recognized as privilege preserving in named jurisdictions. It activates Privileged Mode for any Invocation that touches privileged communication.

The Finance Chinese Wall Profile encodes the information barrier obligations that apply to investment professionals working across competing engagements. It enumerates the categories of information that must not cross the wall, the procedures by which a barrier may be temporarily lifted under supervisory control, and the audit trail that the barrier produces in either case.

The Journalism Source Protection Profile encodes the obligations that journalists owe to confidential sources. It activates Privileged Mode for any Invocation that touches source identifying information, restricts the Agent providers that may participate in the chain, and forbids the storage of any plaintext that could lead an adversary to the source.

Additional profiles for clergy, for research subject to institutional review, and for public officials subject to fiduciary duties are defined in the registry. Profiles are versioned independently of the rest of the protocol so that changes in the regulatory environment can be reflected without forcing a global protocol revision.

## 6. The Information Provenance Cascade

Confidentiality obligations do not end when the engagement ends. A non disclosure agreement that expires must produce a deletion of the data it covered. A client engagement that terminates must produce a deletion of the data the engagement created. A non compete that lapses must produce a removal of the embargoes it imposed. The contemporary software stack handles none of these terminations cleanly, because the data has already spread across an unknown number of applications by the time the termination occurs.

The Open Agent Protocol responds to this problem with the Information Provenance Cascade. Every value emitted by a Tool may carry provenance tags that propagate through subsequent Invocations. The tags identify the source of the data, the obligation under which it was received, the classification of its sensitivity, the purpose for which it was disclosed, the date on which the obligation expires, and the event on whose occurrence the data must be deleted. Agents that forward data must preserve the tags. Agents that wish to share tagged data must evaluate the tags against the Confidentiality and Compliance Context of the destination Scope.

When a Scope or non disclosure agreement is terminated, the Agent initiates a Provenance Cascade. Every Tool that has received data tagged with the terminating identifier is invoked at its data deletion endpoint. Each invocation produces a Deletion Receipt that becomes part of the Principal's chain. The aggregated set of Deletion Receipts is assembled into a Cascade Report that demonstrates the complete fulfilment of the deletion obligation. The Cascade Report is the artifact that satisfies the right to erasure under the General Data Protection Regulation, the contractual return or destruction obligation under typical non disclosure agreements, and the equivalent obligations under domain specific statutes.

The Provenance Cascade is the protocol level answer to the problem that confidentiality obligations have temporal lifetimes that the data itself does not respect. It restores the alignment between obligation and possession that paper records once provided and that contemporary software has lost.

## 7. Conclusion

Confidentiality is not a feature that can be added to an Agent platform after the fact. It is a property that must be present at every layer of the stack, from the Manifest that the Tool publishes to the Decision Record that records each policy evaluation to the Cascade Report that demonstrates the closure of an obligation. The Confidentiality and Compliance Context is the protocol level mechanism by which that property is achieved. It encodes the obligations a Principal has assumed in the world outside software, it makes those obligations machine readable, it enforces them at the moment of every Invocation, and it produces evidence of enforcement that survives commercial dispute, regulatory inspection, and the lifetime of the obligations themselves. Without such a mechanism, the deployment of autonomous Agents into professional and organizational settings is incompatible with the obligations those settings impose. With it, the deployment becomes not merely tolerable but actively safer than the human only baseline, because the obligations are enforced consistently rather than depending on the memory of the practitioner under time pressure.

## References

[OAP-CORE-1.0](/spec). The Open Agent Protocol Core Specification, including Section 18 on Privileged Mode.

[RFC 0003](/rfcs/0003): Standing Permissions. Defines the consent model under which the Confidentiality and Compliance Context grants and revokes access.

[RFC 0006](/rfcs/0006): Persona and Scope Layer. Defines the Scope abstraction to which a Confidentiality and Compliance Context attaches.

[RFC 0007](/rfcs/0007): Privacy Preserving Projections. Defines the projection mechanism by which Tools receive only the data fields a Decision permits.

[RFC 0016](/rfcs/0016): User Sovereignty Charter. Defines the data export and erasure rights that the Provenance Cascade fulfils.

[RFC 0017](/rfcs/0017): Irreversibility and Cooling Off Periods. Defines the temporal safeguards that compose with the Pre Action Confidentiality Gate for high-stakes disclosures.

Related whitepapers: [Accountability in the Agent Economy](/papers/accountability-in-the-agent-economy), [The Safety and Policy Stack](/papers/safety-and-policy-stack), [Governance of an Ownerless Protocol](/papers/governance-of-an-ownerless-protocol).

Regulation (EU) 2016/679 (General Data Protection Regulation).

US Health Insurance Portability and Accountability Act, 45 CFR Parts 160 and 164.

American Bar Association Model Rules of Professional Conduct, Rule 1.6.
