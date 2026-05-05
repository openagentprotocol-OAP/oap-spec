# RFC 0021: Verifiable Indexes and Match Broker Conformance

**Status:** Draft
**Author(s):** OAP Working Group on Data Plane
**Created:** 2026-05-03
**Working Group:** Data Plane
**Targets:** 1.2

## 1. Summary

This document defines the obligations that a Match Broker assumes when it indexes Manifests on behalf of consuming Agents and the cryptographic mechanisms by which a consuming Agent can verify that the Match Broker has honored those obligations. The mechanisms include Merkle anchored index commitments, per query inclusion proofs, periodic completeness attestations, and the Disclosed Ranking Function declared in the Match Broker's Manifest. Together they ensure that an Agent that submits an Intent to a Match Broker under RFC 0020 can confirm that no satisfying Offer was suppressed, that the returned ranking corresponds to the declared algorithm, and that the Match Broker did not silently exclude competitors of a preferred Provider. The result is a market structure in which the Match Broker's role is auditable rather than trusted, and in which the gatekeeper rents that have historically attached to dominant marketplaces are foreclosed at the protocol level.

## 2. Terminology

The key words MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, MAY, and OPTIONAL in this document are to be interpreted as described in RFC 2119 and RFC 8174.

A **Match Broker** is a Resolver as defined in RFC 0020 whose declared role is to index Manifests published by other Providers and to return ranked sets of Offers in response to Intents.

A **Verifiable Index** is the data structure operated by a Match Broker that supports the inclusion proofs and completeness attestations specified in this document.

A **Disclosed Ranking Function** is the documented algorithm by which a Match Broker orders the candidates it returns in response to an Intent. The function is published in the Match Broker's Manifest and is referenced by the Decision Records that accompany each ranked response.

An **Inclusion Proof** is a Merkle proof that a particular Manifest was present in the Verifiable Index at a particular index height at a particular time.

A **Completeness Attestation** is a periodic signed statement by the Match Broker asserting the set of Manifests it has indexed in a given window, the set of categories under which they were indexed, and the cryptographic root of the Verifiable Index at the close of the window.

## 3. The Verifiable Index

### 3.1 Structural Requirements

A Match Broker's Verifiable Index MUST be an append only Merkle structure modeled on the design of Sigstore Rekor. Each entry in the Index is the canonical hash of a Manifest at the moment it was added or updated. The Index MUST publish its current Merkle root at a documented endpoint at least once per minute. The root MUST be signed by the Match Broker's signing key and MAY additionally be co signed by independent Witnesses under the witness model of RFC 0019 section 8.

### 3.2 Inclusion Proofs

For every candidate returned in an Intent Response, the Match Broker MUST attach an Inclusion Proof linking the candidate's Manifest hash to a recently published Index root. The proof is a sequence of sibling hashes that the consuming Agent can verify against the published root using the standard Merkle verification algorithm. A Match Broker that returns a candidate without an Inclusion Proof has produced a non conformant response. The Issuer MAY discard the response and SHOULD record the omission against the Match Broker's Performance Record under RFC 0009.

### 3.3 Completeness Attestations

A Match Broker MUST publish a Completeness Attestation at least once per declared window. The window length is declared in the Match Broker's Manifest and SHOULD NOT exceed twenty four hours. The Attestation contains the cryptographic root of the Index at the close of the window, the count of Manifests indexed under each category, the count of distinct Providers represented, the count of new Manifests added during the window, the count of Manifests removed during the window, and the rationale for each removal. The Attestation is signed by the Match Broker and is anchored into a Transparency Log under the same anchoring requirements as Receipts in the Accountability paper.

A Match Broker that fails to publish a Completeness Attestation within the declared window has lapsed conformance under section 7 of this document. A consuming Agent that detects a lapse SHOULD discount the Match Broker's responses for the period during which no Attestation is current and MAY record the lapse against the Match Broker's Performance Record.

### 3.4 The Negative Inclusion Property

A consuming Agent that wishes to confirm that a particular Provider has not been suppressed from a Match Broker's response MAY request a Negative Inclusion Proof. The proof asserts either that the named Provider's Manifest is not in the Index at the current root, or that the Provider's Manifest is in the Index but did not satisfy the Intent's constraints. In the second case the proof is accompanied by a Decision Record explaining which constraints the candidate failed and at which evaluation step. The Negative Inclusion Proof is the protocol's defense against the silent exclusion of inconvenient competitors, and a Match Broker that refuses to produce one on demand is non conformant.

## 4. The Disclosed Ranking Function

### 4.1 Manifest Declaration

A Match Broker MUST declare its Ranking Function in its Manifest under the `ranking_function` block. The block contains the `function_id` field naming the algorithm, the `function_version` field naming the deployed revision, the `inputs` array enumerating the signals consulted, the `weights` block declaring the relative weights applied to each input, and the `evidence_link` field pointing to the executable specification of the algorithm in the Match Broker's source repository or to the formal description published as a Working Group artifact.

The defined inputs include the Intent constraint match score, the candidate Conformance Level under RFC 0019, the candidate Performance Record aggregate under RFC 0009, the candidate latency percentile under the Build Versus Buy Decision Protocol of RFC 0014, the candidate price under the Commerce Primitive of RFC 0014, the candidate Provider's Standing Permission grants under RFC 0003, and any signal that future RFCs add through additive extensions of this list.

### 4.2 Per Response Decision Record

For every candidate returned in an Intent Response, the Match Broker MUST attach a Decision Record that lists the value each input took for that candidate, the contribution each input made to the candidate's score under the Ranking Function, and the resulting rank. The Decision Record is signed by the Match Broker and is verifiable by the consuming Agent through recomputation. A consuming Agent that recomputes the score and obtains a different result has detected a deviation from the Disclosed Ranking Function and SHOULD report the deviation through the dispute mechanism of RFC 0009.

### 4.3 Ranking Function Versioning

A change to the Ranking Function is a substantive change to the Match Broker's published behavior. The Match Broker MUST increment the `function_version` field of its Manifest before any Intent Response reflects the change, and SHOULD publish a notice describing the change at least seven days before the change takes effect. Subscribers under the Manifest Subscription Protocol of RFC 0022 receive the version change as a Manifest update and MAY adjust their reliance accordingly. A Match Broker that changes its Ranking Function silently is non conformant.

## 5. Schema Integration

This RFC introduces three new schemas, namely `oap-inclusion-proof.schema.json`, `oap-completeness-attestation.schema.json`, and `oap-ranking-function.schema.json`. The Manifest schema of OAP-CORE-1.0 is extended with the optional `ranking_function` block and with the optional `verifiable_index` block declaring the Index endpoint and the Attestation cadence. The Intent Response schema of RFC 0020 is extended with the per candidate `inclusion_proof` and `decision_record` blocks. All extensions are additive under the Backward Compatibility Gate of RFC 0019.

## 6. Anti Capture Properties

The mechanisms defined in this document together produce three anti capture properties that distinguish a conformant Match Broker from an unconstrained one. The first property is that no Provider can be silently suppressed, because the Negative Inclusion Proof of section 3.4 makes suppression detectable. The second property is that no candidate can be silently demoted, because the Decision Record of section 4.2 makes demotion verifiable. The third property is that no behavior change can be smuggled through, because the Ranking Function Versioning rule of section 4.3 makes change observable. The combination is the protocol's response to the antitrust literature on algorithmic gatekeeping in digital marketplaces, and it provides at the protocol level the discipline that the literature has otherwise asked regulators to provide.

## 7. Conformance Impact

A Match Broker claiming conformance at level M1 MUST publish a Verifiable Index, MUST attach Inclusion Proofs to all candidates in Intent Responses, and MUST publish a Completeness Attestation at least once per twenty four hours. A Match Broker claiming conformance at level M2 MUST additionally support Negative Inclusion Proofs and MUST publish a Disclosed Ranking Function with per response Decision Records. A Match Broker claiming conformance at level M3 MUST additionally support independent Witness co signing of its Index roots and MUST satisfy the latency floor for Inclusion Proof generation that is published in the Match Broker conformance profile of the test suite.

## 8. Backward Compatibility

This RFC adds new schemas and new optional Manifest blocks. Existing Match Brokers continue to function as Resolvers under RFC 0020 without claiming the conformance levels of section 7 above. Consuming Agents that require the verifiability properties may consult only Match Brokers whose Manifests declare M1 or higher conformance.

## 9. Security Considerations

The Verifiable Index relies on the soundness of the underlying Merkle structure and the integrity of the Match Broker's signing key. Implementations SHOULD use the curve and hash function set defined in OAP-CORE-1.0 section 9 and SHOULD anchor Index roots in at least two independently operated Transparency Logs. Compromise of the signing key permits forged Inclusion Proofs and forged Completeness Attestations until the compromise is detected and the key is revoked. The revocation procedure MUST follow the key revocation rules of OAP-CORE-1.0 section 22.

A malicious Match Broker could attempt to fork its Index by serving different roots to different consumers. The defense is the Witness co signing requirement at conformance level M3 and the periodic publication of Index roots to a public Transparency Log. A consumer who detects two distinct roots signed at adjacent timestamps has detected a fork attack and SHOULD report the attack through the dispute mechanism of RFC 0009.

## 10. Privacy Considerations

The Verifiable Index publishes the hashes of indexed Manifests rather than their contents, which avoids leaking proprietary Manifest data through the Index itself. The Completeness Attestation publishes counts rather than identities, which avoids leaking the population of indexed Providers to parties who have not separately discovered them. Inclusion Proofs returned in response to specific Intents reveal the identity of the candidates returned but not the identities of unsuccessful candidates. Negative Inclusion Proofs reveal the identity of the Provider being checked, which the requesting Agent already possesses by construction.

## 11. Implementation Experience

The Reference Server has been extended with a Verifiable Index implementation built on a Merkle tree of canonicalized Manifest hashes. The Reference Agent has been extended with a verifier that exercises the Inclusion Proof and Completeness Attestation paths in the conformance verifier module described in RFC 0019. The AssistNet platform operates an internal Match Broker at production scale that attests its Index hourly into the same Transparency Log infrastructure that anchors its Receipt chain.

## 12. Alternatives Considered

A trust based marketplace model in which Match Brokers are presumed honest and disputes are resolved through external regulators was considered and rejected. The model fails the basic test that a consuming Agent cannot mechanically verify the marketplace's behavior. A blockchain anchored marketplace in which the entire Index lives on a public ledger was considered and rejected on cost and latency grounds. The chosen design provides equivalent tamper evidence at substantially lower cost by anchoring only the Merkle roots and inheriting the integrity properties of the Transparency Log infrastructure.

## 13. References

* OAP-CORE-1.0, the normative Open Agent Protocol Core Specification.
* RFC 0003, Standing Permissions.
* RFC 0009, Reputation and Performance Records.
* RFC 0013, Commerce Models for the Agent Economy.
* RFC 0014, Commerce Primitives, A Generalized Commercial Layer.
* RFC 0019, Conformance Testing and Implementability.
* RFC 0020, Agent Query Language.
* RFC 0022, Manifest Subscription Protocol.
* Sigstore Rekor Transparency Log Specification.
* IETF RFC 9162, Certificate Transparency Version 2.0.
* IETF RFC 2119 and RFC 8174.
* Crosby, S. A., and Wallach, D. S. (2009). Efficient Data Structures for Tamper-Evident Logging. *USENIX Security Symposium.* The history-tree construction that grounds the append-only Merkle structure of section 4 and the per-query Inclusion Proof of section 5; the prior art on which Sigstore Rekor and Certificate Transparency are themselves built.
* Zheng, W., Dave, A., Beekman, J. G., Popa, R. A., Gonzalez, J. E., and Stoica, I. (2017). Opaque: An Oblivious and Encrypted Distributed Analytics Platform. *USENIX NSDI.* The oblivious-execution framework that grounds the Disclosed Ranking Function obligation of section 6: a Match Broker that wishes to attest ranking correctness without leaking the underlying scores MAY execute the ranking inside an oblivious-enclave engine of the Opaque family and publish the enclave attestation alongside the Index root.
* Song, D., Wagner, D., and Tian, X. (2001). Timing Analysis of Keystrokes and Timing Attacks on SSH. *USENIX Security Symposium.* The side-channel boundary that motivates the requirement of section 5 that Inclusion Proofs MUST be returned in constant time relative to the Index size, so that a Match Broker cannot leak Manifest-population statistics through proof-construction latency.
