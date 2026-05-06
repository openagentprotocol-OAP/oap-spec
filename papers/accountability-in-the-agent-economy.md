# Accountability in the Agent Economy

**A Whitepaper of the Open Agent Protocol**

**Version:** 1.0
**Status:** Public Working Draft
**Date:** May 2026
**Authors:** T. Fengler (Editor)
**Working Groups:** Core Protocol WG and Trust and Reputation WG

## Abstract

The accountability infrastructure of the existing internet was designed for a world in which a person typed and a person clicked. When a transaction went wrong, the person who issued the instruction could be identified through their account, their session, their browser fingerprint, and their payment instrument, and the dispute could be resolved by reading the server log. That model has been quietly load bearing for thirty years, and it is now under acute pressure. The instructions that drive an increasing share of online activity are no longer issued by a person directly. They are issued by autonomous agents that act on a person's behalf, that compose with other agents, that consume third party tools, and that produce effects whose causal chain crosses dozens of independent operators within a single second. The traditional log based account of what happened is no longer adequate as evidence, no longer adequate as a basis for billing, and no longer adequate as a record of compliance. The Open Agent Protocol responds to this pressure with a single normative artifact, the Receipt, and an append only structure built on top of it, the Receipt chain, anchored into independently operated Transparency Logs. This whitepaper explains why that structure is necessary, what it provides that traditional logging does not, and how it composes into a tamper evident substrate that supports billing, dispute resolution, regulatory inspection, and reputation independently of any single platform operator.

## 1. The Failure Modes of Server Logs in Multi Agent Systems

Server logs were sufficient when each request originated with a person. The person could be authenticated through a session cookie, the request could be timestamped and stored, and the operator could later reconstruct what the person had asked for and what the system had done in response. The model assumed that the operator was the authoritative witness of its own behaviour, that the person trusted the operator, and that disputes between the person and the operator were the dominant form of disagreement.

None of these assumptions survive the move to multi agent systems. A typical Agent Invocation today crosses at least three operational boundaries. The user instructs an Agent operated by one provider. That Agent invokes a Tool operated by a second provider. The Tool delegates a sub task to an Agent operated by a third provider, which in turn invokes a fourth Tool. Each operator possesses a partial log. None of them possesses the complete causal chain. When the user asks why a particular outcome occurred, no operator can answer authoritatively, because no operator can reconstruct the inputs and outputs of operators upstream or downstream of itself. When the user disputes a charge, the operators must trust each other's logs, which they have no reason to do. When a regulator asks for evidence, the operators must produce a coordinated reconstruction that none of them is incentivized to invest in.

The protocol level response to this fragmentation is to make the evidentiary substrate independent of any single operator. Every step of the causal chain produces a small, signed, hash chained record that is meaningful even when no other party trusts the operator that produced it. That record is the Receipt.

## 2. The Receipt as the Atomic Unit of Accountability

A Receipt is a structured JSON document that captures one event in the causal chain. The event may be an Invocation of an Action, the activation of a Subscription, the settlement of a payment, the granting of consent, the deletion of personal data, the opening or closing of a Coordination Session, or any other event for which an evidentiary record is required by the specification. The Receipt records the participants by their decentralized identifiers, the action that occurred by its identifier and version, the input and output by their cryptographic hashes rather than their plaintexts, the cost of the event in a declared currency, the policy decisions that authorized the event, the provenance tags that travel with any data the event consumed or produced, and the signature of every party whose authority was required.

The Receipt does not contain the data of the event. It contains a commitment to the data. The commitment is sufficient to verify that the data has not changed and is sufficient to detect that a particular Receipt is the Receipt for a particular interaction, but it reveals nothing about the contents of the interaction to a party that does not already hold the data. This separation is essential to the privacy properties of the system. A Receipt can be published, anchored, mirrored, and inspected without exposing the personal information of any participant. The plaintext lives where it must live, on the systems of the parties that legitimately hold it, governed by the data policies that those parties have published in their Manifests.

The Receipt is signed by all parties whose authority was necessary for the event. An Invocation Receipt carries the signature of the Agent that issued the Invocation and the signature of the Tool that executed it. A Settlement Receipt carries the signature of the Wallet operator and the signatures of both counterparties. A Deletion Receipt carries the signature of the Tool that performed the deletion and is countersigned by the Principal that requested it. The signature requirement makes a Receipt non repudiable in both directions. Neither party can later claim that the event did not occur, and neither party can claim that the event occurred on terms different from the terms recorded in the Receipt.

## 3. The Receipt Chain and the Per Principal Audit Log

A Receipt in isolation answers the question of whether a single event occurred. A causal chain of Receipts answers the more important question of how a particular outcome was reached. The Open Agent Protocol requires every Principal to maintain an append only chain of Receipts in which each Receipt cites the cryptographic hash of the immediately preceding Receipt. The mechanism is identical in spirit to the hash chains used in version control systems and in transparency logs, and it inherits the same properties. Removing any Receipt from the chain alters every subsequent hash and makes the alteration detectable to any verifier. Inserting a Receipt out of order alters the same hashes and is detectable for the same reason.

The chain is per Principal rather than per operator. This is a deliberate choice. The Principal is the only party whose interest is consistently aligned with completeness of the chain. Operators have an interest in their own portion of the chain. Adversaries have an interest in confusion. Only the Principal has an interest in the entire causal record being preserved, and the protocol therefore vests the chain in the Principal. Operators contribute the Receipts that they are entitled to produce. The Principal aggregates them. The aggregation is verifiable by any party that can resolve the relevant decentralized identifiers and verify the relevant signatures.

The per Principal chain is the ground truth that disputes resolve to. When a Principal disputes a charge, the chain demonstrates which Tool produced which output for which input under which policy decision, and the dispute is reduced to a question of whether the recorded behaviour conformed to the published Manifest. When a regulator inspects an Agent, the chain demonstrates which decisions were made on whose behalf and under which policy layer, and the inspection is reduced to a question of whether the recorded decisions match the regulator's expectations. The chain does not eliminate disputes. It gives them a shared evidentiary foundation, which is the prerequisite for resolving them at machine speed.

## 4. Transparency Log Anchoring

A per Principal chain solves the problem of internal completeness, but it does not by itself defend against the case in which the Principal becomes the adversary. A Principal could in principle delete part of the chain and reconstitute the remainder with new hashes, and an external observer would have no way of knowing that the deletion had occurred. The defense against this attack is to anchor Receipt hashes into Transparency Logs operated by parties other than the Principal.

A Transparency Log in the sense used here is a public, append only Merkle structure modeled on the Sigstore Rekor design. Each Receipt hash is added as a leaf. The log periodically publishes the root of its Merkle tree. A consumer who wishes to verify that a particular Receipt is part of the recorded history fetches an inclusion proof from the log and verifies it against the published root. A consumer who wishes to verify that a Principal has not silently rewritten history compares the chain that the Principal presents against the inclusion proofs in the log and rejects any chain whose Receipts do not appear.

The Open Agent Protocol RECOMMENDS that Receipt hashes be anchored into at least two independently operated Transparency Logs in geographically diverse regions. The redundancy ensures that no single log operator can suppress evidence by refusing to anchor or by going offline. Implementations that require the highest level of censorship resistance MAY additionally commit periodic Merkle roots to public blockchains, which provides an external time stamp that no single operator controls.

Transparency Log anchoring also enables a property that traditional logs cannot provide, which is selective disclosure. A Receipt anchored as a hash reveals nothing to an observer who does not hold the corresponding Receipt. A Principal who later wishes to prove that a particular event occurred can present the Receipt and the inclusion proof, and the observer can verify the proof without ever requiring the Principal to disclose the rest of the chain. This is the technical basis for the Privileged Mode defined in OAP-CORE-1.0 Section 18, which is the mechanism by which the protocol supports professional secrecy obligations in domains such as legal practice, medical care, journalism, and pastoral care.

## 5. From Accountability to Billing, Reputation, and Regulation

The Receipt and the Receipt chain are not designed only for after the fact dispute resolution. They are the substrate from which several adjacent systems derive their integrity.

Billing in the Agent Economy is performed by reading the Receipt chain. A Settlement Receipt under [RFC 0014](/rfcs/0014) cites the Invocation Receipts that it covers, and the Wallet that processes the settlement verifies that each cited Invocation occurred and that the cost recorded in the Invocation Receipt matches the cost asserted by the Settlement. The Wallet does not need to trust the Tool's invoice, because the invoice is constructed from Receipts that the Wallet can verify independently. This eliminates an entire class of disputes that today consume substantial human attention.

Reputation in the Agent Economy is computed by reading the Receipt chain. A Performance Record under [RFC 0009](/rfcs/0009) cites the Receipt of the Invocation that the record describes, which means that no Performance Record can refer to an event that did not actually occur. This eliminates the class of fake reviews that has corroded the credibility of every consumer rating system built on top of unauthenticated text. Aggregate reputation scores are derived from authentic Performance Records by an open algorithm published under `oap.reputation.aggregation.v1`, and any consuming Agent can recompute the score from the underlying records to satisfy itself that the aggregate is honest.

Regulatory inspection in the Agent Economy is performed by reading the Receipt chain. The Decision Records that the protocol attaches to each Receipt enumerate the policy layers that were evaluated and the rules that were applied. A regulator examining a particular outcome can determine in seconds whether the policy stack permitted the outcome, whether the relevant Conformance Level was honored, and whether the reasoning recorded in the explanation field is consistent with the obligations of the cited regulation. The right to explanation under the EU Artificial Intelligence Act is satisfied by the explanation_for_principal field. The right of access under the General Data Protection Regulation is satisfied by the chain itself, which the Principal can export at any time under the portability mandate of [RFC 0016](/rfcs/0016). The right to erasure is satisfied by the data_delete endpoint, whose successful execution produces a Deletion Receipt that becomes part of the chain.

## 6. Comparison with Existing Approaches

The existing accountability infrastructure of the internet falls into three broad categories, and each of them is structurally inadequate for the Agent Economy in a different way.

The first category is operator side server logs. Server logs are unilateral, unsigned, and revisable. They are sufficient for an operator who needs to answer questions about its own behaviour to itself. They are not sufficient as evidence in any dispute that crosses an operational boundary, because no party other than the operator has any reason to trust them.

The second category is third party audit. Third party audit substitutes the trust relationship from the operator to a named auditor, which is an improvement in some domains but introduces a different problem. Audits are infrequent, expensive, and produce verdicts in human readable language that no Agent can parse. They are useful as a quarterly check on operator behaviour and useless as a real time substrate for inter Agent commerce.

The third category is blockchain anchored ledgers. Blockchain anchored ledgers provide strong tamper evidence at the cost of throughput, latency, and unit economics that are incompatible with the Agent Economy's volumes. They also entangle the protocol with the volatility and regulatory exposure of specific blockchains, which violates the principle of vendor neutrality.

The Receipt and Receipt chain occupy a position that none of these approaches occupies. They are signed by every party whose authority was required, which makes them non repudiable. They are anchored into independently operated Transparency Logs, which makes them tamper evident at low cost. They are produced inline with the Invocation, which makes them suitable for high volume use. They are structured rather than free text, which makes them machine verifiable. They are designed from the outset to compose with billing, reputation, regulation, and privileged disclosure, which makes them load bearing across the ecosystem rather than a niche tool for a single function.

## 7. Implementation Experience

The Receipt design described in this whitepaper is operating in production. The reference server in `reference/server` of the OAP specification repository implements the full Receipt schema, the per Principal hash chain, and the Transparency Log anchoring path. The conformance test suite in `test-suite/behavior` verifies that any reference target produces valid Receipts and that the chain hashes correctly link to the previous Receipt. The AssistNet platform uses Receipts in production for the entire Agent to Agent message bus. Implementation experience confirms that the storage cost of the Receipt chain is negligible at typical Agent volumes, that the verification cost is dominated by signature verification and is in the low milliseconds per Receipt, and that the Transparency Log anchoring cost is bounded by the periodicity of the log, which is configurable.

## 8. Conclusion

The unit of trust in the Agent Economy is not the operator, not the platform, and not the auditor. The unit of trust is the cryptographically signed Receipt and the chain that links Receipts into a verifiable history. This shift is comparable in scope to the shift from physical receipts to electronic billing, and it is comparable in necessity to the shift from unauthenticated email to authenticated email after the rise of phishing. The Open Agent Protocol provides the normative artifacts and the reference implementations that make the shift possible, and the conformance test suite provides the evidence that the implementations are honest. The result is an accountability substrate that operates at machine speed, that survives the failure or absence of any single party, and that produces evidence which holds up in commercial dispute, in regulatory inspection, and in court. The substrate is also the precondition for any meaningful response to the existential-risk concerns articulated by Tegmark (2017) and the Future of Life Institute: a civilization that cannot reconstruct after the fact what its agents did cannot govern them at all, and the tamper-evident Receipt chain is the artifact through which the reconstruction becomes possible at the cadence at which agents act.

## References

[OAP-CORE-1.0](/spec). The Open Agent Protocol Core Specification, version 1.0.

[RFC 0001](/rfcs/0001): Coordination Sessions. Defines the session abstraction whose lifecycle events produce Receipts.

[RFC 0004](/rfcs/0004): Sub Agent Delegation. Defines the delegation tree whose cost attribution is anchored in the Receipt chain.

[RFC 0009](/rfcs/0009): Reputation and Performance Records. Defines the Performance Record format that cites Receipts as evidence.

[RFC 0011](/rfcs/0011): Sybil Resistance and Sub Agent Anti Abuse. Defines the identity binding that gives Receipt signatures their non-repudiation property.

[RFC 0014](/rfcs/0014): Commerce Primitives, A Generalized Commercial Layer. Defines the Settlement Receipt that the anti-invoice property depends on.

[RFC 0016](/rfcs/0016): User Sovereignty Charter. Defines the export and erasure rights that the Receipt chain operationalizes.

[RFC 0019](/rfcs/0019): Conformance Testing and Implementability. Defines the conformance test suite that exercises Receipt production.

Related whitepapers: [Verifiable Conformance](/papers/verifiable-conformance), [Confidentiality and Compliance Context](/papers/confidentiality-and-compliance-context), [The Economics of the Agent Economy](/papers/economics-of-the-agent-economy), [The Safety and Policy Stack](/papers/safety-and-policy-stack).

Sigstore Project. Rekor Transparency Log Specification.

W3C Decentralized Identifiers (DIDs) v1.0. World Wide Web Consortium, 2022.

W3C Verifiable Credentials Data Model v2.0. World Wide Web Consortium, 2025.

Tegmark, M. (2017). *Life 3.0: Being Human in the Age of Artificial Intelligence*. Knopf. The book-length argument that the deployment of increasingly capable autonomous systems requires civilization-scale accountability infrastructure if it is to remain governable; the Receipt chain and Transparency Log anchoring described in this paper are the protocol-level realization of that infrastructure for the Agent Economy.

Future of Life Institute (2023). Pause Giant AI Experiments: An Open Letter. The argument that frontier AI deployment without verifiable accountability and oversight is a category of risk distinct from ordinary technology deployment; the conformance receipt of this paper, combined with the Frontier Capability Evaluation of [RFC 0028 §3.5.3](/rfcs/0028) and the Registry revocation mechanism of [RFC 0026](/rfcs/0026), is the protocol-level instantiation of the verifiable-accountability requirement the letter calls for.

Dalrymple, D., Skalse, J., Bengio, Y., Russell, S., Tegmark, M., Seshia, S., Omohundro, S., Szegedy, C., Goldhaber, B., Ammann, N., Abate, A., Halpern, J., Barrett, C., Zhao, D., Zhi-Xuan, T., Wing, J., Tenenbaum, J. (2024). Towards Guaranteed Safe AI: A Framework for Ensuring Robust and Reliable AI Systems. *arXiv:2405.06624*. The argument that high-stakes AI systems require formally verifiable safety properties rather than statistical assurances; the verifiable Receipt and the Conformance Receipt of [Verifiable Conformance](/papers/verifiable-conformance) realize this requirement at the protocol layer through cryptographic rather than purely statistical evidence.
