# RFC 0023: Agent Native Storage Substrate

**Status:** Draft
**Author(s):** T. Fengler (Editor)
**Working Group:** Data Plane
**Created:** 2026-05-03
**Working Group:** Data Plane
**Targets:** 1.2

## 1. Summary

This document specifies the Agent Native Storage Substrate, the data layer abstraction that conformant Providers expose to autonomous Agents in the Open Agent Protocol. The Substrate generalizes the contemporary database from a passive store of records into a structured surface that produces a Receipt for every mutation, that propagates Provenance Tags with every value, that evaluates the four layer Policy Stack on every read, that returns Projections rather than raw rows, and that supports portable export of every tenant's complete state under the User Sovereignty Charter. The Substrate is queried through the Agent Query Language of RFC 0020, indexed under the Verifiable Index obligations of RFC 0021, distributed through the Manifest Subscription Protocol of RFC 0022, and bounded by the Schema Negotiation rules of RFC 0024. Together these documents replace the database surface that the contemporary web inherits from the operator centric era with a substrate suited to a population of consumers that does not trust any single operator and that requires verifiable evidence of every interaction.

## 2. Terminology

The key words MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, MAY, and OPTIONAL in this document are to be interpreted as described in RFC 2119 and RFC 8174.

A **Storage Substrate** is the conformant data layer exposed by a Provider that supports the operations defined in section 3 of this document.

A **Record** is a single addressable entity within a Storage Substrate. Each Record is owned by a single Principal identified by its decentralized identifier and carries a Schema Identifier under which its fields are typed.

A **Mutation** is the creation, update, or deletion of a Record. Each Mutation produces a Mutation Receipt that becomes part of the Substrate's Receipt chain.

A **Provenance Tag** is the structured annotation that travels with a value through subsequent Mutations and Projections, identifying the source of the value, the obligation under which it was received, the classification of its sensitivity, the purpose for which it was disclosed, and the conditions under which it must be deleted.

A **Projection** in the context of this document is the response shape declared by an Intent under RFC 0020 and computed by the Substrate at evaluation time. The result of a Projection is a derived view of the underlying Records that includes only the fields the Intent's Projection block authorizes and that the four layer Policy Stack permits.

A **Tenant** is the set of Records owned by a single Principal across all Schemas exposed by a Substrate.

## 3. Specification

### 3.1 Required Operations

A conformant Storage Substrate MUST expose the following operations at the documented endpoints. The `oap/storage/put` operation creates or updates a Record. The `oap/storage/get` operation returns the current value of a Record under a declared Projection. The `oap/storage/delete` operation removes a Record and produces a Deletion Receipt. The `oap/storage/query` operation evaluates an Intent under RFC 0020 against the Substrate and returns matching Records under the Intent's Projection. The `oap/storage/subscribe` operation establishes a Subscription under RFC 0022 against the Substrate. The `oap/storage/export` operation produces a cryptographically verifiable export of the requesting Principal's full Tenant. The `oap/storage/import` operation accepts an export from another Substrate and integrates it into the Principal's Tenant on the receiving Substrate.

### 3.2 The Mutation Receipt

Every Mutation MUST produce a Mutation Receipt that becomes part of the Substrate's Receipt chain under the accountability layer described in the Accountability paper. The Receipt records the Principal who issued the Mutation, the Schema Identifier under which the Record is typed, the Record identifier, the cryptographic hash of the Record before the Mutation, the cryptographic hash of the Record after the Mutation, the Decision Record from the four layer Policy Stack evaluation that authorized the Mutation, the cost of the Mutation under the Substrate's commerce model, and the signatures of every party whose authority the Mutation required. The Receipt is anchored into a Transparency Log under the same anchoring rules as Receipts in the rest of the protocol.

A Substrate that fails to produce a Mutation Receipt for any Mutation has produced non conformant behavior and is subject to Performance Record slashing under RFC 0009.

### 3.3 Provenance Tag Propagation

Every value stored in a Substrate MAY carry a Provenance Tag. When a value is read through a Projection, the Tag travels with the value into the response. When a value derived from a tagged value is stored as part of a subsequent Mutation, the Substrate MUST attach a derivation tag that cites the original Tag, that records the Mutation in which the derivation occurred, and that preserves the obligations the original Tag carried. The derivation tag is itself a Provenance Tag, and the recursion produces a tree that records the lineage of every value in the Substrate.

A Substrate that strips Provenance Tags during Projection or Mutation has destroyed evidence on which downstream consumers and regulators rely. The behavior is detectable by the Conformance Test Suite of RFC 0019 through the provenance preservation tests, and a Substrate that fails the tests does not claim conformance at the levels of section 7 of this document.

### 3.4 The Pre Read Policy Gate

Every read against a Substrate MUST evaluate the four layer Policy Stack of the Safety and Policy Stack paper before any field crosses the boundary. The evaluation answers, for each field in the requested Projection, whether the Platform Rules permit the disclosure, whether the Organizational Policy permits the disclosure, whether the Scope Policy under RFC 0006 permits the disclosure, and whether the requesting Principal's Personal Preference permits the disclosure. The Substrate composes the four answers into a permitted Projection, which MAY be narrower than the requested Projection. The Substrate returns the permitted Projection together with a Decision Record that records the layers that were evaluated and the rules that were triggered. A Substrate that returns the requested Projection without evaluating the Policy Stack has violated section 5 of this document and is non conformant.

### 3.5 Tenant Isolation

A Substrate MUST enforce strict isolation between Tenants. A read by Principal A MUST NOT return any Record owned by Principal B unless Principal B has explicitly granted access to Principal A through the Standing Permission framework of RFC 0003 or through a per Mutation grant recorded as a Provenance Tag on the Record. A Substrate that violates Tenant Isolation has produced a confidentiality breach of the highest severity, and the breach triggers immediate suspension of the Substrate's conformance under section 7 below until the breach is remediated and a new Conformance Receipt is issued under RFC 0019.

### 3.6 The Portable Export

A Principal MAY at any time invoke `oap/storage/export` to obtain a complete, cryptographically verifiable copy of the Principal's Tenant. The export contains every Record the Principal owns at the time of the call, the full Receipt chain for those Records, the Provenance Tags attached to every value, the Schema Identifiers under which the Records are typed, and a Substrate Signature over the canonicalized export body. The export is the artifact that satisfies the data portability obligation of the User Sovereignty Charter of RFC 0016 at the data layer.

A Substrate MUST accept an export from any other conformant Substrate through `oap/storage/import` and MUST integrate the export into the requesting Principal's Tenant. The integration preserves Receipt chain continuity by attaching the imported chain to the receiving Substrate's chain through a Migration Receipt that cites the export and records the new chain head. A Substrate that refuses an export from another conformant Substrate is non conformant and is subject to Performance Record slashing under RFC 0009.

### 3.7 The Right to Erasure

A Principal MAY at any time invoke `oap/storage/delete` against any Record the Principal owns, and the Substrate MUST honor the request within the time bound declared in its Manifest under the data deletion obligation of the User Sovereignty Charter. The deletion produces a Deletion Receipt. The Substrate MUST cascade the deletion to any Record that derives from the deleted Record under the Provenance Cascade described in the Confidentiality and Compliance Context paper, producing a Deletion Receipt for each cascade step. The aggregate Cascade Report is returned to the Principal as evidence of full erasure.

## 4. Schema Integration

This RFC introduces six new schemas, namely `oap-storage-record.schema.json`, `oap-mutation-receipt.schema.json`, `oap-provenance-tag.schema.json`, `oap-tenant-export.schema.json`, `oap-cascade-report.schema.json`, and `oap-substrate-manifest.schema.json`. The Manifest schema of OAP-CORE-1.0 is extended with the optional `storage_substrate` block declaring the endpoints of section 3.1, the supported Schema Identifiers, the deletion time bound, the export and import portability commitments, and the Subscription endpoint defined by RFC 0022. All additions are additive under the Backward Compatibility Gate of RFC 0019.

## 5. Conformance Impact

A Substrate claiming conformance at level D1 MUST expose the operations of section 3.1, MUST produce Mutation Receipts under section 3.2, MUST evaluate the Pre Read Policy Gate under section 3.4, and MUST enforce Tenant Isolation under section 3.5. A Substrate claiming conformance at level D2 MUST additionally propagate Provenance Tags under section 3.3 and MUST honor the right to erasure under section 3.7. A Substrate claiming conformance at level D3 MUST additionally support the Portable Export and Import operations under section 3.6 and MUST satisfy the import latency floor declared in the Substrate conformance profile of the test suite.

A Substrate at any conformance level that suffers a Tenant Isolation breach immediately loses its claimed level until a remediation is recorded and a new Conformance Receipt is issued under RFC 0019. The suspension is the protocol's expression of the principle that confidentiality breaches are the most consequential failure a Substrate can suffer.

## 6. Backward Compatibility

This RFC adds new schemas, new optional Manifest blocks, and new endpoints. Providers that do not expose a Storage Substrate continue to function as conformant Providers under their currently claimed Conformance Levels. Consumers that require Substrate semantics may consult only Providers whose Manifests declare D1 or higher conformance.

## 7. Security Considerations

A Substrate is the largest target for compromise in any deployment that relies on it. Implementations MUST encrypt Records at rest using the cryptographic primitives declared in OAP-CORE-1.0 section 9, MUST encrypt Records in transit using TLS 1.3 or higher, and MUST partition signing keys per Tenant where the Substrate is a multi tenant deployment. A Substrate operator that suffers a key compromise MUST follow the key revocation procedure of OAP-CORE-1.0 section 22 and MUST notify every affected Principal within seventy two hours.

The Pre Read Policy Gate is the protocol's defense against over disclosure. Implementations SHOULD execute the Gate in a separate execution context from the storage engine itself so that a vulnerability in the storage engine cannot be used to bypass the Gate. The Conformance Test Suite of RFC 0019 includes adversarial behavior tests that attempt to bypass the Gate through field name confusion, through type confusion, through pointer arithmetic, and through buffered response manipulation.

## 8. Privacy Considerations

The Substrate is the canonical home of personal data within an OAP deployment. The four layer Policy Stack and the Pre Read Policy Gate together ensure that personal data is returned only to consumers whose access is permitted by the Principal's Scope and Personal Preference layers and by the Organizational Policy and Platform Rules above them. The Provenance Tag system ensures that obligations attached to data at acquisition time travel with the data through subsequent Mutations and Projections. The Right to Erasure and the Portable Export ensure that Principals can move or remove their data at any time without obtaining the Substrate operator's permission, which is the condition the User Sovereignty Charter requires.

## 9. Implementation Experience

The Reference Server has been extended with a Storage Substrate built on a transactional key value store with a Receipt chain and a Provenance Tag index. The Reference Agent has been extended with a Substrate client that exercises every operation of section 3.1 and that participates in the conformance verifier described in RFC 0019. The AssistNet platform operates an internal Substrate at production scale that backs its inventory, conversation, and receipt storage layers under the obligations of this RFC.

## 10. Alternatives Considered

The model in which the Substrate is left implementation defined and only the Manifest contract is normative was considered and rejected. The result of leaving the Substrate undefined would be an ecosystem of partially conformant data layers that consuming Agents cannot mechanically reason about, which defeats the purpose of having a protocol at all. The model in which the Substrate is bound to a particular database technology, such as PostgreSQL or DynamoDB, was considered and rejected because it would foreclose competition among Substrate implementers and would tie the protocol to the lifecycle of a particular vendor. The chosen design specifies the operations and obligations at the protocol level and leaves the underlying engine to the implementer, which preserves competition while ensuring uniform behavior.

## 11. References

The Per Principal Tenant boundary of section 3.1, the Pre Read Policy Gate of section 7, and the Portable Export and Right to Erasure obligations of section 3.6 are the agent native realization of the personal data store architecture introduced by the Solid Project (Mansour, Sambra, Hawke, Zereba, Capadisli, Ghanem, Aboulnaga, Berners-Lee 2016), in which a Principal's data lives in a Principal controlled pod, applications are interchangeable clients against it, and access is mediated by an explicit policy layer (Web Access Control). OAP extends this model by binding every read and every write into the Receipt chain of the Accountability paper, so that the Principal's data store is not only Principal owned and application portable but also forensically reconstructible.

- Mansour, E., Sambra, A. V., Hawke, S., Zereba, M., Capadisli, S., Ghanem, A., Aboulnaga, A., Berners-Lee, T. (2016). A Demonstration of the Solid Platform for Social Web Applications. Proceedings of the 25th International Conference Companion on World Wide Web.
- W3C Solid Community Group (2024). Solid Protocol, Version 0.11.0.
* OAP-CORE-1.0, the normative Open Agent Protocol Core Specification.
* RFC 0003, Standing Permissions.
* RFC 0006, Persona and Scope Layer.
* RFC 0007, Privacy Preserving Projections.
* RFC 0009, Reputation and Performance Records.
* RFC 0016, User Sovereignty Charter.
* RFC 0019, Conformance Testing and Implementability.
* RFC 0020, Agent Query Language.
* RFC 0021, Verifiable Indexes and Match Broker Conformance.
* RFC 0022, Manifest Subscription Protocol.
* RFC 0024, Schema Negotiation and Versioning.
* IETF RFC 8446, The Transport Layer Security (TLS) Protocol Version 1.3.
* IETF RFC 2119 and RFC 8174.
