# RFC 0019: Conformance Testing and Implementability

**Status:** Draft
**Author(s):** OAP Working Group on Implementation and Conformance
**Created:** 2026-05-03
**Working Group:** Implementation and Conformance
**Targets:** 1.2

## 1. Summary

This document establishes the executable counterpart to the normative Open Agent Protocol specification. It defines the Conformance Test Suite that lives at `test-suite/`, the Conformance Receipt that any implementation can issue to demonstrate that it has executed the suite, the Conformance Verification procedure by which any consuming Agent can validate such a receipt autonomously, and three governance gates that bind every future Request for Comments to the same standard of executable evidence as the present one. The intent is to make it impossible for the protocol to drift away from what implementers can build, deploy, and verify, and to make it equally impossible for an implementation to claim conformance without producing cryptographically verifiable evidence that any other Agent in the network can independently reproduce.

## 2. Terminology

The key words MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, MAY, and OPTIONAL in this document are to be interpreted as described in RFC 2119 and RFC 8174.

The **Conformance Test Suite** is the executable test corpus published in `test-suite/` of this repository. It is composed of four sub suites named schema, behavior, level, and charter.

A **Conformance Receipt** is a signed JSON document that conforms to `oap-conformance-receipt.schema.json` and asserts that a particular implementation, identified by its decentralized identifier, has executed a particular version of the Conformance Test Suite against a particular target deployment and has demonstrated conformance with a particular set of Conformance Levels.

The **Reference Implementation** is the in tree pair of Reference Server and Reference Agent published under `reference/` and maintained by the Working Group on Implementation and Conformance.

A **Self Verifying Agent** is an Agent that is capable of executing the Conformance Verification procedure described in section 6 against any other Agent or Provider it encounters, with no external coordination beyond fetching public artifacts.

The **Implementability Gate**, the **Backward Compatibility Gate**, and the **Charter Review Gate** are three governance preconditions that any new RFC MUST satisfy before it can advance to Last Call. They are defined in sections 3, 4, and 5 of this document and are enforced both by Continuous Integration and by Working Group review.

## 3. The Implementability Gate

A Request for Comments that proposes a normative change to the Open Agent Protocol MUST be accompanied by a corresponding modification to either the Reference Implementation, the Conformance Test Suite, or both. A normative change is any change that introduces, removes, or alters a MUST, SHOULD, or MAY in any normative artifact, that adds or removes a field of any normative schema, or that alters the lifecycle of any envelope or receipt. The Implementability Gate is enforced automatically by the `implementability-gate` job in `.github/workflows/validate.yml`, which inspects the set of changed files in the pull request and rejects any pull request that modifies `schemas/v1.0/`, `spec/v1.0/`, or `rfcs/RFC-` artifacts without modifying `test-suite/` or `reference/` accordingly.

The intent of the Implementability Gate is that no concept may enter the normative protocol surface unless at least one implementer has demonstrated, in code, that the concept is implementable, and at least one test has demonstrated, in code, that an implementation can be checked against it. Theoretical work that does not yet meet this bar is welcome to live in `papers/`, where it can mature, but it does not occupy any field of any schema and no implementer is bound by it. A Working Group may, by recorded supermajority of two thirds, grant an exception to the Implementability Gate for a particular pull request when the change is editorial, when the change is a typographical correction, or when the change is a non normative clarification. Exceptions MUST be documented in the pull request body with the phrase `Implementability Gate exception` and a one paragraph justification.

## 4. The Backward Compatibility Gate

The schemas published under `schemas/v1.0/` are immutable in their semantics. The `$id` field of each schema is a permanent, citable URL. Any change that alters the meaning of an existing field, that removes an existing field, that tightens an existing constraint, or that changes the value range of an existing enumeration MUST be published as a new schema version under `schemas/v1.1/` with a new `$id`, and the previous version MUST remain available at its original location for as long as the Stewards continues to operate. Additive changes that introduce new optional fields are permitted within the existing schema version provided that they do not interact in any way with the meaning of existing fields, and provided that the pull request body explicitly declares the change as `additive only`.

The Backward Compatibility Gate is enforced automatically by the `backward-compatibility-gate` job in CI. The job inspects the diff against the base branch and rejects any pull request that modifies a v1.0 schema without an explicit additive only declaration in the pull request body. The intent is that an implementation that was conformant with the protocol on the day it was attested remains forever entitled to claim that level of conformance, and that no future Working Group can retroactively void that entitlement by editing a schema underneath it. This guarantee is essential for the long term economic viability of the agentic ecosystem because the alternative, in which conformance can be revoked through silent schema mutation, would make every Conformance Receipt a perishable promise rather than a durable contract.

## 5. The Charter Review Gate

A Request for Comments that touches any of the user facing rights established by RFC 0016, including but not limited to identity, memory, reputation, projection, persona, cooling off, escalation, deletion, replaceability, or pluralism of model and provider, MUST receive an explicit signed off review from the Working Group on Privacy and Governance and from at least one User Advocacy Voter recognized by the Stewards under the procedure described in section 7 of RFC 0016. The signed off review takes the form of a comment on the pull request bearing the phrase `Charter Review Gate cleared` and the decentralized identifier of the reviewer. Without two such comments the pull request cannot enter Last Call.

The Charter Review Gate is enforced procedurally rather than mechanically because the question of whether an RFC respects user sovereignty is irreducible to a syntactic check. Working Group Chairs are responsible for verifying compliance before they record the transition to Last Call. The intent is to ensure that every change to the protocol that touches a user right is reviewed by a party whose institutional incentive is to defend that right, and not solely by parties whose institutional incentive is to ship the change.

## 6. Conformance Verification by Consuming Agents

Any consuming Agent SHOULD perform the following procedure before engaging another Agent or Provider for any Action that the consuming Agent's policy classifies as Consequential, and MAY perform it for any other Action.

The consuming Agent first fetches the target Manifest from `/.well-known/oap-tool.json`. The Agent reads the `conformance` block introduced by this RFC. The block contains the claimed Conformance Levels, a URI at which the signed Conformance Receipt is published, the version of the Conformance Test Suite under which the receipt was issued, and the date of the most recent attestation. If the conformance block is absent the Agent treats the target as unattested and applies whatever default policy its principal has configured for unattested counterparties.

The consuming Agent then fetches the Conformance Receipt from the published URI. The Agent validates the receipt against `oap-conformance-receipt.schema.json`. The Agent verifies that the suite version named in the receipt is one the Agent trusts, that the not after timestamp in the validity block has not elapsed, that the signatures array contains at least one signature, and that no signature has the placeholder value reserved for development. The Agent verifies the cryptographic signature against the published key of the implementation DID using whichever resolution method the DID method specifies.

The consuming Agent then OPTIONALLY re executes a randomized subset of behavior tests against the live target to confirm that the target's currently observable behavior matches the behavior that the Conformance Receipt asserts. This live re verification step is what distinguishes the Open Agent Protocol from purely declarative trust frameworks. The reference implementation of this procedure is published as `reference/agent/conformance-verifier.js` and is callable as a library function. Implementations of the Conformance Verifier in other languages SHOULD follow the same algorithm.

The consuming Agent then produces a Verification Report capturing each step of the procedure, the steps that succeeded, the steps that failed, and the resulting set of accepted Conformance Levels. The consuming Agent's policy engine consumes the Verification Report to decide whether to engage. The Verification Report itself MAY be persisted as part of the consuming Agent's audit log so that the decision is reviewable.

## 7. Conformance Receipts

A Conformance Receipt is the artifact through which an implementation makes its conformance claim cryptographically auditable. The receipt is generated by `test-suite/attest.js` after a successful run of the test suite against a target deployment. The receipt asserts the identity of the implementation, the identity and version of the suite, the identity of the target, the set of Conformance Levels claimed, the summary of test results, the hash of the fixtures used during the run, the hash of the canonicalized full results, and the validity period during which the receipt is to be considered current. The receipt is signed by the implementation's signing key. Receipts MAY additionally be signed by an independent Attestor who has either witnessed the run or replayed it, in which case the attestor field declares the relationship.

A Conformance Receipt has a default validity period of ninety days. An implementation SHOULD re attest at least every ninety days, and MUST re attest after any change to the implementation that touches any code path exercised by the test suite. Attempting to claim a Conformance Level on the basis of an expired receipt is a forfeiture of conformance under section 7 of RFC 0016.

## 8. Adversarial Testing

The Working Group on Implementation and Conformance maintains a continuously growing subdirectory `test-suite/behavior/adversarial/` of tests that intentionally attempt to subvert the protocol. The categories include receipt forgery, signature stripping, cooling off bypass through timestamp manipulation, escalation routing through additional Agents, replaceability obfuscation through deliberately misleading replaceability scores, and Sybil identity creation under RFC 0011. Any adversarial test that succeeds against the Reference Implementation triggers a SECURITY issue against the specification per the procedure described in `SECURITY.md`. The intent is to keep the protocol under permanent internal attack so that external attackers find the surface already hardened by the time they reach it.

## 9. Backward Compatibility

This RFC adds a new schema (`oap-conformance-receipt.schema.json`), a new optional manifest block (`conformance`), a new directory (`test-suite/`), a new reference library (`reference/agent/conformance-verifier.js`), and three new CI jobs. None of these additions alter the meaning of any existing field of any existing schema. Implementations that do not yet publish a Conformance Receipt continue to be valid OAP implementations under their currently claimed Conformance Levels until those claims are challenged, at which point the burden of producing a verifiable Conformance Receipt shifts to the implementation per section 7 of RFC 0016.

## 10. Security Considerations

The Conformance Receipt is a cryptographic statement that can be replayed by any party who possesses it. Implementations MUST therefore choose a validity period commensurate with the rate at which their behavior changes, and MUST publish a revocation endpoint at which any receipt that has been superseded by a later attestation can be marked withdrawn. The signing key used for Conformance Receipts SHOULD be the same key listed in the manifest's publisher block so that consuming Agents can resolve it through the same DID resolution path they already use for the manifest itself.

The live re verification step described in section 6 introduces an attack surface in which a malicious target could attempt to differentiate its responses based on whether it believes it is being audited. To mitigate this, the Conformance Verifier is REQUIRED to randomize the order in which it executes sample tests, to include a small fraction of nonsense requests interleaved with real tests, and to use a fresh principal DID for each verification run when supported by the Agent's identity layer. The Reference Verifier implements all three measures.

## 11. Privacy Considerations

The execution of the Conformance Test Suite against a live target produces logs that include the principal DID and the agent DID used during the run. These DIDs MAY be ephemeral and SHOULD be ephemeral when the verifier is performing live re verification rather than attesting its own implementation. The Conformance Receipt itself MUST NOT contain principal data of any third party that was incidentally interacted with during the run. The fixtures shipped with the test suite are synthetic and contain no real personal data.

## 12. Conformance Impact

This RFC does not alter the criteria for any existing Conformance Level. It introduces a new artifact, the Conformance Receipt, which becomes the canonical evidence by which any Conformance Level claim is established or contested. From the publication date of this RFC, the Working Group on Implementation and Conformance MAY require a current Conformance Receipt as a precondition for listing in any official OAP registry maintained by the Stewards.

## 13. Implementation Experience

The Reference Implementation in this repository has been extended in concert with this RFC. The Conformance Test Suite contains schema, behavior, and charter tests that exercise the Reference Server. The Reference Agent has been extended with `conformance-verifier.js`, which any consuming Agent can import and call. The CI workflow `validate.yml` runs the suite on every push and on every pull request, and enforces the Implementability Gate and the Backward Compatibility Gate.

## 14. Alternatives Considered

A purely declarative trust framework in which Providers self attest conformance without any executable verification was considered and rejected because it reduces the protocol to a marketing claim that consuming Agents cannot mechanically check. A mandatory third party certification framework in which only an accredited body could issue Conformance Receipts was considered and rejected because it creates a single point of capture and contradicts the pluralism principle of RFC 0016. The chosen design preserves the right of any implementer to self attest, while preserving the right of any consuming Agent to independently verify, which yields the same audit guarantees as third party certification without the centralization cost.

## 15. References

* OAP-CORE-1.0, the normative Open Agent Protocol Core Specification.
* RFC 0016, User Sovereignty Charter.
* RFC 0017, Irreversibility and Cooling Off Periods.
* RFC 0018, The Right to a Human Path.
* `schemas/v1.0/oap-conformance-receipt.schema.json`.
* `test-suite/README.md`.
* `reference/agent/conformance-verifier.js`.
* `governance/RFC-PROCESS.md`.
* IETF RFC 2119 and RFC 8174.
