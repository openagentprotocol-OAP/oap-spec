# Verifiable Conformance

**A Whitepaper of the Open Agent Protocol**

**Version:** 1.0
**Status:** Public Working Draft
**Date:** May 2026
**Authors:** OAP Implementation and Conformance Working Group

## Abstract

A protocol that arbitrates trust between competing agents must be able to answer a question that the contemporary software ecosystem answers poorly, namely whether a given implementation actually behaves as the specification requires. The dominant answer in adjacent domains is the third party audit certificate, in which a recognized auditor inspects an implementation, issues a verdict in human readable language, and renews the verdict on a periodic schedule. The model has known weaknesses. The verdict is infrequent and is based on a snapshot. The verdict is opaque to machines. The verdict is bound to the auditor's reputation rather than to verifiable evidence. The Open Agent Protocol responds with a two tier conformance system in which the first tier, OAP Verified, is established by a self issued cryptographic receipt that any party may verify by re running the same conformance test suite, and the second tier, OAP Certified, is established by an independent witness whose attestation is itself a cryptographic receipt anchored into the same transparency log infrastructure as the rest of the protocol. This whitepaper sets out the design, examines the threat model, compares the system with the third party audit model, and explains why a self issuing tier supported by an independent verification path produces stronger guarantees than the third party audit model alone.

## 1. The Conformance Question and Why Existing Answers Fail

A buyer who proposes to integrate a tool into an autonomous agent's repertoire needs to know that the tool conforms to the protocol that the agent uses to invoke it. The buyer's concern is operational. An agent that invokes a non conformant tool will fail in production at the moment that the non conformance becomes load bearing, and the failure will be expensive both in direct cost and in the reputational consequences of the agent having behaved incorrectly. The buyer therefore wants a guarantee, and the buyer is prepared to pay for the guarantee in the form of attention, in the form of integration cost, and in some cases in the form of money.

The contemporary answer to this concern in adjacent domains is the third party audit. An auditor inspects the tool, applies a checklist, and issues a certificate. The certificate is renewed annually or on some other periodic schedule. The certificate is communicated in human readable form on a website or in a procurement document. The model is the dominant answer in domains as diverse as financial reporting, information security management, and consumer product safety, and it has produced real value in each of those domains.

The model has three weaknesses that limit its applicability to the protocol conformance question. The first weakness is temporal. The certificate is issued at a moment in time and is renewed on a periodic schedule that is long relative to the cadence at which agents make integration decisions. An agent that invokes a tool today must rely on a certificate that was issued months ago against a version of the tool that may have changed since. The second weakness is opacity. The certificate is communicated in human readable language and cannot be parsed by an agent. The agent must trust the auditor's name without being able to verify what the auditor actually checked. The third weakness is the trust transfer. The certificate moves the trust question from the tool operator to the auditor, but it does not eliminate the question. An auditor that issues a false certificate has produced a false guarantee, and the parties who relied on the certificate have no machine readable basis for detecting the falsity.

The Open Agent Protocol responds to these weaknesses with a system in which the certificate is replaced by a cryptographic receipt that is itself the evidence of conformance, in which the receipt is machine readable and verifiable by any party, and in which the issuance of the receipt is anchored into the same transparency log infrastructure that anchors the rest of the protocol's accountability layer.

## 2. The Two Tiers and Their Distinct Guarantees

The conformance system distinguishes two tiers because the cost of obtaining the higher tier is justified only for a subset of integrations and because the lower tier nevertheless provides a meaningful guarantee at low cost.

The first tier is OAP Verified. An implementation is OAP Verified when its operator has run the official conformance test suite defined in [RFC 0019](/rfcs/0019) at the declared Conformance Level, has obtained a passing result, has signed the result with the operator's decentralized identifier key, and has anchored the signed result into a public transparency log. The verification is self issued in the sense that no third party is required to participate in the issuance, and it is verifiable in the sense that any party may re run the same conformance test suite against the same target and confirm that the result matches.

The second tier is OAP Certified. An implementation is OAP Certified when, in addition to satisfying the OAP Verified criteria, an independent witness has run the conformance test suite against the same target, has obtained a matching result, and has signed and anchored its own attestation. The witness is selected by the operator from a published list of independent verification providers. The witness's attestation is structured rather than narrative and is independently verifiable by re running the suite.

The distinction between the two tiers is the distinction between an operator's own attestation that its implementation conforms and the addition of an independent witness's attestation that the operator's attestation is honest. The two tier structure is intended to provide a meaningful baseline guarantee at low cost while reserving the higher cost of independent witnessing for integrations that warrant it. An agent that is choosing between two providers of comparable function may reasonably treat OAP Verified as the floor and may reasonably treat OAP Certified as a positive signal whose marginal value depends on the stakes of the integration.

## 3. Why Self Issuance Is Stronger Than It Sounds

The strongest objection to the OAP Verified tier is that an operator could falsely claim a passing result. The objection is correct as a literal matter. The protocol does not prevent an operator from publishing a signed receipt that asserts a conformance result that the operator did not actually obtain. What the protocol does is make the false assertion verifiably false to any party that bothers to check.

The verification is mechanical. The conformance test suite is published in the canonical repository, is available to any party, and runs deterministically against any target whose endpoint is reachable. A buyer who is evaluating an OAP Verified target may run the suite against the target and obtain its own result. If the result matches the operator's published result, the buyer has confirmed the assertion. If the result does not match, the buyer has detected a misrepresentation that the operator's signature does not absolve, and the buyer may publish a counter receipt that records the discrepancy. The counter receipt is anchored into the same transparency log as the original receipt and is immediately visible to every other party that consults the log.

The combination of mechanical verifiability and a public anchoring infrastructure produces a property that the third party audit model does not have. A misrepresentation in the OAP Verified tier is detectable by any party at low cost and is publicly recorded once detected. A misrepresentation in the third party audit model is detectable only by another auditor and is recorded only if a regulator chooses to act on the detection. The threat model under which an operator would publish a false OAP Verified receipt is therefore a threat model under which the operator expects no party to check, and the protocol's design is intended to make such checking cheap enough that it routinely occurs.

The further consequence is that the OAP Verified tier does not depend on the reputation of any particular auditor. The trust is not transferred to a third party. The trust is grounded in the verifiability of the assertion itself. This is the same property that distinguishes a hash chain from a written log, and it has the same operational consequence. The system does not require the verifier to trust the issuer. It requires the verifier to be willing to check.

## 4. The Threat Model

The threat model for the conformance system is set out explicitly so that operators, witnesses, and verifiers can reason about the guarantees they are obtaining and the attacks they must defend against.

The first threat is the falsified result, in which an operator publishes a signed receipt asserting a passing result that the operator did not obtain. The defense is the public test suite and the verifier's right to re run it. The defense is asymmetric in the sense that the cost of detection is far lower than the cost of the misrepresentation, and the consequences of detection include the public counter receipt and the loss of the operator's standing in any reputation system that consults the transparency log.

The second threat is the colluding witness, in which a witness in the OAP Certified tier signs an attestation that the witness did not actually verify. The defense is the same as for the operator. Any party may re run the test suite against the target and detect a discrepancy. A witness whose attestations do not survive verification loses standing as a witness, and the loss is recorded in the same public infrastructure that records every other event.

The third threat is the moving target, in which an operator passes the test suite against a configuration that differs from the configuration that the operator exposes in production. The defense is the requirement that the conformance test be executed against the production endpoint identified in the operator's Manifest, and that the receipt cite the endpoint identifier so that a verifier can target the same endpoint. The conformance test suite includes randomized challenge cases that an operator cannot precompute, which closes the simpler versions of the moving target attack.

The fourth threat is the time of check time of use attack, in which the operator's configuration drifts after the verification has been issued. The defense is the validity period attached to the receipt. A receipt has a declared expiry, and a verifier that consults a receipt past its expiry cannot rely on it. The validity period is set to a duration that reflects the rate at which operator configurations typically drift, and the operator may issue a new receipt at any time to replace an expiring one.

The fifth threat is the suppression of unfavorable results, in which an operator runs the test suite, obtains a failing result, and chooses not to publish it. The defense is the social one. A buyer who is evaluating providers may treat the absence of a recent OAP Verified receipt as evidence that the provider has not been recently tested or that the most recent test did not pass, and may discount the provider accordingly. The defense is not absolute, but it produces a discipline under which the cost of suppression rises with the operator's market position.

The sixth threat is the compromise of the test suite itself, in which an adversary modifies the test suite to accept non conformant behaviour. The defense is the canonical repository's commit history, the multi party review of changes to the suite, and the independent execution of the suite by any verifier who chooses to clone the repository. A modification that introduces a false acceptance would be visible in the commit history and would be detectable by any verifier whose own execution of an unmodified suite produces a different result.

## 5. The Comparison with the Audit Model

The conformance system can be compared with the third party audit model on several dimensions, and the comparison shows the design choice that the protocol has made.

On the dimension of frequency, the third party audit model issues a verdict on a periodic schedule that is long relative to the cadence of integration decisions. The conformance system permits the issuance of a receipt on any cadence the operator chooses, including continuously through automated execution of the suite on every release.

On the dimension of machine readability, the third party audit model produces verdicts in human readable language that an agent cannot parse. The conformance system produces structured receipts that any conformant agent can read, verify, and act on without human interpretation.

On the dimension of trust transfer, the third party audit model moves the trust question from the operator to the auditor without eliminating it. The conformance system grounds the trust in the verifiability of the assertion itself, with optional witnessing as an additional layer.

On the dimension of cost, the third party audit model imposes a high fixed cost that is borne by the operator and that is recovered through the operator's pricing. The conformance system imposes a low fixed cost in the OAP Verified tier and a moderate additional cost in the OAP Certified tier, which the operator may choose to incur or not.

On the dimension of detectability of misrepresentation, the third party audit model relies on regulatory enforcement that is rare and slow. The conformance system permits any party to detect a misrepresentation at the cost of running the test suite, and the detection is publicly recorded as soon as it occurs.

The comparison does not suggest that third party audit is without value. There are domains in which the auditor's professional judgment is the substantive content of the verdict, and in those domains the conformance system would not be a substitute. The protocol's claim is narrower. For the question of whether an implementation conforms to a specification whose conformance is operationalized in a public test suite, the conformance system produces stronger guarantees at lower cost than the third party audit model alone.

## 6. The Conformance Levels

The conformance system distinguishes among Conformance Levels rather than treating conformance as a single binary. The levels are L0 through L4, and each level identifies a coherent subset of the specification whose obligations the implementation has accepted.

L0 is base conformance with the discovery, identity, and invocation primitives. L1 adds the accountability layer including Receipts and the per Principal chain, as described in [Accountability in the Agent Economy](/papers/accountability-in-the-agent-economy). L2 adds the commercial layer including the Wallet abstraction and Settlement Receipts of [RFC 0014](/rfcs/0014). L3 adds the policy layer including the four layer policy stack and the Decision Records of [The Safety and Policy Stack](/papers/safety-and-policy-stack). L4 adds the privileged mode obligations and the industry profile conformance for the regulated domains the operator declares, as set out in [Confidentiality and Compliance Context](/papers/confidentiality-and-compliance-context).

The levels are cumulative in the sense that conformance at a higher level implies conformance at all lower levels. A receipt declares the level at which conformance has been verified, and an agent considering the integration may evaluate the receipt against the level the agent requires for the planned use. An agent that requires only invocation may rely on an L0 receipt. An agent that requires settlement at machine speed must require at least an L2 receipt. An agent that operates on behalf of a regulated principal in a domain whose obligations are encoded in an industry profile must require an L4 receipt.

The level structure is the protocol's response to the observation that not every integration requires every primitive. The cost of conformance at the higher levels is justified only for the integrations that require the higher levels, and the level structure permits operators to pay only for the conformance they actually need.

## 7. Conclusion

The conformance question is the load bearing question on which the credibility of the agent ecosystem depends. An agent that invokes a non conformant tool produces failures whose cost is borne by the agent's principal, and the discipline that prevents such failures must be supplied by the protocol rather than left to the principal's own diligence. The Open Agent Protocol responds with a two tier conformance system in which the lower tier is established by a self issued cryptographic receipt that any party may verify by re running the same conformance test suite, and the higher tier is established by an independent witness whose attestation is itself a cryptographic receipt. The system is anchored in the same transparency log infrastructure that anchors the protocol's accountability layer, which means that the verification of conformance and the audit of behaviour share a single substrate. The result is a guarantee that is more frequent, more machine readable, more honest, and more economical than the third party audit model alone, and it is a guarantee that scales to the cadence at which agents will integrate with one another in the years ahead.

## References

[OAP-CORE-1.0](/spec). The Open Agent Protocol Core Specification, including the Conformance Levels L0 through L4.

[RFC 0009](/rfcs/0009): Reputation and Performance Records. Defines the reputation surface on which conformance receipts compose.

[RFC 0011](/rfcs/0011): Sybil Resistance and Sub Agent Anti Abuse. Defines the identity binding that grounds the signature on a conformance receipt.

[RFC 0014](/rfcs/0014): Commerce Primitives, A Generalized Commercial Layer. Defines the Settlement Receipt format that the conformance receipt mirrors structurally.

[RFC 0019](/rfcs/0019): Conformance Testing and Implementability. Defines the conformance test suite, the conformance receipt format, and the implementability gate.

Related whitepapers: [Accountability in the Agent Economy](/papers/accountability-in-the-agent-economy), [Governance of an Ownerless Protocol](/papers/governance-of-an-ownerless-protocol), [Interoperability Versus Platforms](/papers/interoperability-versus-platforms).

Sigstore Project. Rekor Transparency Log Specification.

Certificate Transparency. IETF RFC 9162, 2021.
