# RFC 0024: Schema Negotiation and Versioning

**Status:** Draft
**Author(s):** OAP Working Group on Data Plane
**Created:** 2026-05-03
**Working Group:** Data Plane
**Targets:** 1.2

## 1. Summary

This document specifies the Schema Negotiation and Versioning protocol by which two conformant Agents establish a shared understanding of the Schemas under which they will exchange Records, Manifests, Intents, Receipts, and any other structured artifact. The protocol replaces the contemporary practice in which schema drift is handled through ad hoc client side compatibility shims, undocumented field aliases, and brittle version sniffing. The protocol provides a uniform handshake by which a Subscriber and a Publisher agree on a Schema Identifier, a Schema Version, and a set of optional Mappings for fields that have been renamed, deprecated, or extended. The protocol composes with the Backward Compatibility Gate of RFC 0019 and ensures that the additive evolution the Gate protects at the specification level is mirrored by an additive evolution at the implementation level.

## 2. Terminology

The key words MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, MAY, and OPTIONAL in this document are to be interpreted as described in RFC 2119 and RFC 8174.

A **Schema** is a JSON Schema document published at a permanent URL. The URL is the Schema Identifier.

A **Schema Version** is the value of the `version` keyword of a Schema, expressed as a semantic version per the conventions of OAP-CORE-1.0 section 27.

A **Schema Negotiation** is the handshake in which two parties agree on a Schema Identifier, a Schema Version, and any Mappings that translate fields between adjacent versions.

A **Mapping** is a typed translation from a field of one Schema Version to a field of another Schema Version. Mappings are bidirectional or unidirectional. Mappings are signed by the publisher of the destination Schema.

A **Compatibility Profile** is the published statement by a Publisher of the Schema Versions it accepts, the Schema Versions it produces, and the Mappings it has prepared. The Profile is part of the Publisher's Manifest.

## 3. Specification

### 3.1 Compatibility Profile

A conformant Provider MUST publish a Compatibility Profile in its Manifest under the `schema_compatibility` block. The block contains, for every Schema Identifier the Provider uses, the set of Schema Versions the Provider accepts as input, the set of Schema Versions the Provider produces as output, the default Schema Version the Provider produces when the consumer does not specify one, and the set of Mappings the Provider has prepared to translate between Versions in the accepted set.

The Compatibility Profile is the basis of the negotiation handshake of section 3.2. A consuming Agent that requests a Schema Version outside the accepted set receives a structured error rather than a silent translation, which is the protocol's defense against undocumented behavior change.

### 3.2 The Negotiation Handshake

When a consuming Agent first interacts with a Provider for a given Schema Identifier, the consuming Agent SHOULD execute the negotiation handshake. The handshake proceeds in three steps. First, the consuming Agent fetches the Compatibility Profile from the Provider's Manifest. Second, the consuming Agent computes the intersection of its supported Schema Versions and the Provider's accepted Schema Versions, and selects the highest Version in the intersection. Third, the consuming Agent records the selected Version in the `schema_version` field of its subsequent requests to the Provider for that Schema Identifier. The Provider responds in the same Version unless the request explicitly authorizes the Provider to upgrade or downgrade through the `version_negotiation` block of the request.

A consuming Agent that omits the handshake operates at the Provider's default Version, which is the Version the Provider considers least likely to surprise the consumer. A consuming Agent that requires a particular Version other than the default MUST execute the handshake to establish the Version explicitly.

### 3.3 Mappings

A Mapping is a structured translation between two Schema Versions of the same Schema Identifier. The Mapping document conforms to `oap-schema-mapping.schema.json` and contains the source Schema Identifier and Version, the destination Schema Identifier and Version, the directionality of the Mapping, the per field translation rules, the constants the Mapping introduces, the fields the Mapping leaves unset, the fields the Mapping derives from a function of source fields, and the publisher signature over the canonicalized Mapping body.

A Mapping is verifiable. A consumer that holds a source document and the corresponding Mapping can compute the destination document and verify that the result conforms to the destination Schema. A consumer that obtains the destination document independently and obtains the same result has confirmed the Mapping. The verifiability of Mappings is the protocol's response to the historical practice in which compatibility shims have been treated as implementation details outside the standards process and have therefore drifted out of step with the schemas they translate.

A Mapping is signed by the publisher of the destination Schema. A consumer that receives a Mapping signed by any other party SHOULD treat the Mapping as untrusted and SHOULD verify the translation by an independent path before relying on it.

### 3.4 Additive Evolution

A Schema MAY evolve additively without changing its identifier or version, provided that the addition introduces only optional fields and does not alter the meaning of any existing field. A Schema that evolves additively is republished at its original Schema Identifier with the new optional fields. Consumers that did not request the new fields receive the existing response shape. Consumers that request the new fields through their Projection receive the existing fields plus the new fields.

A Schema that requires a non additive change is republished at a new Schema Identifier and at a new Schema Version. The original Schema remains available at its original identifier indefinitely under the immutability rule of RFC 0019 section 4. The Provider's Compatibility Profile is updated to declare both Versions as accepted, with a Mapping connecting them where the migration permits.

### 3.5 Deprecation

A Provider that wishes to retire support for a Schema Version MUST mark the Version as deprecated in its Compatibility Profile, MUST publish a deprecation date that is at least ninety days in the future, and MUST emit a `deprecation_warning` field in every response that uses the Version after the deprecation is announced. The deprecation date MUST NOT be reduced once announced. A Provider that withdraws a deprecated Version before the announced date is non conformant.

The deprecation procedure ensures that consumers receive sufficient notice to migrate, that the migration path is documented through the Mapping system of section 3.3, and that no consumer is surprised by the silent unavailability of a Version it has been relying on.

### 3.6 Cross Provider Convergence

The protocol does not require that all Providers support the same Schema Versions at the same time. The market discipline of the Performance Record system of RFC 0009 and the Build Versus Buy Decision Protocol of RFC 0014 create incentives for Providers to converge on widely supported Versions. A Provider that lags behind the prevailing Versions by more than one major version SHOULD expect to lose traffic to better aligned competitors, which is the discipline the protocol relies on rather than a centrally imposed migration schedule.

## 4. Wire Format

### 4.1 Compatibility Profile in a Manifest

```json
{
  "schema_compatibility": {
    "https://schemas.openagentprotocol.org/v1.0/oap-action.schema.json": {
      "accepts": ["1.0", "1.1", "1.2"],
      "produces": ["1.2"],
      "default": "1.2",
      "mappings": [
        { "from": "1.1", "to": "1.2", "url": "https://provider.example/mappings/action-1.1-to-1.2.json" }
      ]
    }
  }
}
```

### 4.2 Negotiated Request

```json
{
  "schema_version": "1.2",
  "version_negotiation": { "permit_upgrade": false, "permit_downgrade": false },
  "payload": { "...": "..." }
}
```

## 5. Schema Integration

This RFC introduces two new schemas, namely `oap-schema-mapping.schema.json` and `oap-compatibility-profile.schema.json`. The Manifest schema of OAP-CORE-1.0 is extended with the optional `schema_compatibility` block. All requests defined by other RFCs are extended with the optional `schema_version` and `version_negotiation` fields under the same envelope structure. All additions are additive under the Backward Compatibility Gate of RFC 0019.

## 6. Conformance Impact

A Provider claiming conformance at level V1 MUST publish a Compatibility Profile, MUST honor the negotiation handshake of section 3.2, and MUST emit deprecation warnings under section 3.5. A Provider claiming conformance at level V2 MUST additionally publish signed Mappings between every pair of accepted Versions for every supported Schema. A Provider claiming conformance at level V3 MUST additionally accept Mappings published by counterparties for translation in the inbound direction and MUST satisfy the negotiation latency floor declared in the Versioning conformance profile of the test suite.

## 7. Backward Compatibility

This RFC adds new schemas, new optional Manifest fields, and new optional request fields. Existing Providers continue to function under their default Schema Versions without exposing a Compatibility Profile, in which case consuming Agents fall back to the default Version of each Schema. No existing field of any normative schema is altered.

## 8. Security Considerations

A maliciously crafted Mapping could translate a benign source document into a malicious destination document. The defense is the requirement that Mappings be signed by the publisher of the destination Schema. A consumer that receives an unsigned or improperly signed Mapping has been served a Mapping it cannot trust and SHOULD reject the translation. A Mapping signed by the destination Schema publisher is verifiable in the same sense that any other signed protocol artifact is verifiable, and any deviation between the Mapping output and the destination Schema is detectable through the Conformance Test Suite of RFC 0019.

A negotiation downgrade attack in which an adversary in the middle forces the parties to agree on the lowest commonly supported Version was considered. The defense is that the negotiated Version is recorded in every subsequent request and response, the records are signed by the parties, and either party that detects an unexpected downgrade may withdraw from the interaction. The Compatibility Profile is fetched over TLS as required for all OAP traffic, which prevents the adversary from manipulating the Profile in transit.

## 9. Privacy Considerations

The Compatibility Profile and the Schema Versions exchanged during the negotiation handshake do not contain personal data. The Mapping documents do not contain personal data. The negotiation handshake therefore introduces no new privacy considerations beyond those already covered by OAP-CORE-1.0 for the Manifest fetch and for the surrounding requests.

## 10. Implementation Experience

The Reference Server has been extended with a Compatibility Profile generator that publishes the accepted and produced Versions of every Schema the server uses. The Reference Agent has been extended with a negotiation handshake module that selects the highest commonly supported Version of every Schema before issuing the first substantive request. The AssistNet platform operates Schema negotiation in production for its inter agent message bus and has produced Mappings for two minor version transitions of the receipt schema and one minor version transition of the manifest schema.

## 11. Alternatives Considered

The model in which schema drift is handled implicitly through tolerant readers and forgiving writers was considered and rejected. The model produces silent semantic drift that consuming Agents cannot detect and that regulators cannot audit. The model in which only one Schema Version is supported at any time, with mandatory cutover dates, was considered and rejected as incompatible with the heterogeneous adoption rates of a global ecosystem. The chosen design preserves the discipline of additive evolution at the specification level while accommodating heterogeneous adoption at the implementation level.

## 12. References

* OAP-CORE-1.0, the normative Open Agent Protocol Core Specification.
* RFC 0009, Reputation and Performance Records.
* RFC 0014, Commerce Primitives, A Generalized Commercial Layer.
* RFC 0019, Conformance Testing and Implementability.
* RFC 0020, Agent Query Language.
* RFC 0023, Agent Native Storage Substrate.
* IETF RFC 9110, HTTP Semantics.
* IETF RFC 2119 and RFC 8174.
