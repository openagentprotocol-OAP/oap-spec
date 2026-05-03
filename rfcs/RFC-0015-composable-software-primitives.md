# RFC 0015: Composable Software Primitives

**Status:** Draft
**Author(s):** OAP Working Group on Marketplace and Discovery
**Created:** 2026-05-03
**Working Group:** Marketplace and Discovery
**Targets:** 1.2
**Supersedes:** None
**Extends:** RFC 0008

## 1. Summary

This document defines the normative requirements for software providers that ship their products as composable primitives rather than as finished applications with a single canonical user interface. Before the maturation of coding agents, every user of a piece of software received the same interface and the same feature set, with customization limited to whatever the provider chose to expose as configuration. Coding agents are now sufficiently capable that the typical end user can act as their own forward deployed engineer and assemble a personal version of any product from primitive building blocks. This RFC describes how an Open Agent Protocol provider declares such primitives, how a user or their agent composes them into a personal surface, how the resulting customization is made auditable, and how primitives from different providers can be substituted for one another without breaking the composition.

## 2. Terminology

The key words MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, MAY, and OPTIONAL in this document are to be interpreted as described in RFC 2119 and RFC 8174.

A **Primitive** is the smallest unit of useful software functionality that a provider exposes as an OAP Action. A primitive is intentionally narrow in scope, has a single well defined input contract, a single well defined output contract, and no implicit dependencies on other primitives that are not explicitly declared.

A **Composition** is a directed acyclic arrangement of primitives, possibly drawn from multiple providers, that together produce a higher level user experience. A Composition is itself a first class artifact that can be stored, signed, shared, version controlled, and audited.

A **Customization** is a Composition created or modified by an end user, typically with the assistance of a coding agent acting under the user's authority. The Customization belongs to the user and not to the provider whose primitives it incorporates.

A **Replaceability Index** is a numerical and structural declaration by a provider of the degree to which any of its primitives can be substituted by an alternative primitive from another provider without behavioral regression.

## 3. Motivation

For five decades software was distributed as a finished good, in the sense that the provider determined the complete shape of the experience and the user accepted that shape with marginal customization. The economic logic was sound when the marginal cost of producing software for a single user exceeded what that user could spend, because the only viable strategy was to amortize a single design across millions of identical seats. Coding agents collapse that marginal cost to a level where every user can plausibly afford to commission their own version. The provider that continues to ship a finished good is therefore competing against a market in which the user can have exactly what they want, assembled from interchangeable parts, at a price that approaches the underlying capability cost rather than the brand premium.

Open Agent Protocol already supports this transition implicitly through its manifest based capability description. RFC 0015 makes the requirement explicit and adds the structural elements necessary for high quality composition by third party agents, in particular the substitution semantics that allow a user to replace one provider's primitive with another's without rewriting the rest of the composition.

## 4. Provider Obligations for Primitive First Distribution

A provider claiming conformance to this RFC MUST satisfy each of the following obligations.

### 4.1 Granularity

Every Action declared in the manifest MUST be a single primitive in the sense defined above. A provider MUST NOT bundle multiple unrelated capabilities into a single Action with mode flags or option enums that change the fundamental shape of the input or output contract. When a capability has multiple genuinely distinct shapes, each shape SHOULD be exposed as a separate Action.

### 4.2 Self Contained Description

Every Action MUST include a `description_for_agents` field that allows a coding agent to understand the primitive without reference to external documentation, including its purpose, its inputs, its outputs, its side effects, the conditions under which it should be used in preference to alternatives, and at least one worked example. This requirement was already advisory in OAP Core 1.0 and becomes mandatory under this RFC.

### 4.3 Replaceability Declaration

Every Action MUST include a `replaceability` block that declares the degree to which the primitive can be substituted, the canonical capability category against which substitution is meaningful, the input and output schema fingerprints that a substituting primitive must match, and any side effects that a substitute would need to reproduce. The structure of this block is defined in section 6.

### 4.4 Composition Compatibility

A provider MUST NOT introduce manifest changes that silently break previously composed user customizations. Breaking changes MUST be communicated through the existing OAP Core deprecation and sunset fields, and MUST be accompanied by a migration note that tells coding agents how to rewrite affected Compositions.

### 4.5 No Hidden Coupling

A provider MUST NOT design primitives whose correct functioning depends on other primitives from the same provider being invoked in a particular order, unless that ordering is explicitly declared as a workflow per RFC 0008. The intent is to prevent providers from forcing bundle adoption through implementation side channels.

## 5. The Composition Manifest

A Composition is described by a Composition Manifest, a separate JSON document distinct from the provider's Tool Manifest. A Composition Manifest declares which primitives are included, from which providers, in which order, with which input bindings, and with which output sinks. The Composition Manifest is owned by the user and signed by the user's agent, not by any provider.

A Composition Manifest contains the following normative fields. Each Composition has a stable `composition_id`, a human readable `name`, an `owner_did` identifying the user, a list of `nodes` where each node references a primitive by provider DID and Action identifier, a list of `edges` describing how outputs flow into inputs, optional `policy` references identifying which user, scope, or organization policies apply, an optional `surface` block describing the user interface that is rendered on top of the composition, and a `signatures` array containing at minimum the user agent's signature.

When a Composition is executed, every invocation of a primitive within it MUST emit a standard OAP Receipt, and the executing agent MUST additionally emit a single Composition Receipt that references the composition_id and aggregates the per primitive receipt hashes. The Composition Receipt allows a user to audit not only individual primitive calls but the precise way in which their personal customization assembled them.

## 6. The Replaceability Index

The `replaceability` block on every Action declares its substitution semantics. The block contains a `category` string drawn from a registry of canonical capability categories, an `input_fingerprint` and `output_fingerprint` that are stable hashes of the input and output schemas after normalization, a `side_effect_class` enumerated value that classifies what changes in the world the primitive causes, a `replaceability_score` between zero and one, and an optional `equivalence_uri` that points to a published equivalence proof or test suite.

A `replaceability_score` of one means that any other primitive declaring the same category, identical input and output fingerprints, identical side effect class, and an equivalent quality claim can be substituted by a coding agent with no human in the loop required. A score below one indicates that substitution is permitted but requires explicit user confirmation, with values closer to zero indicating greater behavioral risk in substitution.

A coding agent acting on a user's behalf MUST consult the Replaceability Index before substituting one primitive for another in an existing Composition, MUST present the score to the user when it falls below a threshold determined by the user's policy, and MUST record the substitution decision in the Composition Receipt for that invocation.

## 7. User Customization Receipts

Whenever a user, or a coding agent acting under the user's authority, creates or modifies a Composition, the agent MUST emit a User Customization Receipt. This receipt records the composition_id, the prior version hash if any, the new version hash, the natural language intent expressed by the user that prompted the change, the diff of nodes and edges, and the agent identity that produced the change. User Customization Receipts allow the user to retrace the history of how their personal version of a product evolved over time, and they allow disputes over the behavior of a Composition to be resolved by reference to a deterministic record rather than to undocumented memory.

User Customization Receipts MUST NOT be visible to the providers whose primitives are incorporated in the Composition, unless the user has explicitly opted to share them. The default visibility is the user's own audit log only.

## 8. Provider Surface Optionality

A provider conforming to this RFC MAY ship its own canonical user interface as a hosted Surface in the sense of RFC 0012, but the provision of that Surface MUST NOT be a precondition for using the underlying primitives. A user who chooses to use the provider's Surface receives the experience the provider designed, while a user who chooses to compose the primitives into their own Customization receives an experience they designed themselves, and both paths execute against the same underlying Action implementations on the provider's infrastructure. This requirement prevents providers from maintaining a privileged path through their own UI that exposes capabilities not available through the manifest.

## 9. Conformance

A provider claims conformance to this RFC by satisfying every requirement in section 4, by publishing a `replaceability` block on every Action per section 6, and by ensuring that every primitive can be invoked without requiring traversal of a provider hosted Surface. A coding agent claims conformance by emitting Composition Receipts and User Customization Receipts as defined in sections 5 and 7, and by consulting the Replaceability Index before performing any substitution within an existing Composition.

## 10. Schema Integration

This RFC introduces two new normative schemas. The first, `oap-composition-manifest.schema.json`, describes the structure of a Composition Manifest as set out in section 5. The second, `oap-customization-receipt.schema.json`, describes the structure of a User Customization Receipt as set out in section 7. The Action schema in OAP Core is extended with a required `replaceability` block as described in section 6 for any provider claiming conformance to this RFC, while remaining optional for providers that do not claim conformance.

## 11. Security Considerations

Composability creates an attack surface in which a malicious primitive substituted into a long lived Composition could exfiltrate data or cause unintended side effects. Coding agents MUST therefore evaluate substitution candidates against the policy stack defined in OAP Core and against the Sybil resistance signals defined in RFC 0011 before performing any automatic substitution. User Customization Receipts MUST be signed by the agent that produced them, so that an unauthorized modification to a user's Composition is detectable.

A second consideration is that excessive substitution by an aggressive coding agent could degrade a user's Composition in ways the user does not perceive until later. Coding agents SHOULD therefore expose a reversible substitution log to the user and SHOULD prefer additive composition over destructive replacement when the user's intent permits.

## 12. References

- RFC 0003 Standing Permissions
- RFC 0007 Privacy Preserving Projections
- RFC 0008 Workflow Composition
- RFC 0011 Sybil Resistance and Sub Agent Anti Abuse
- RFC 0012 The Agent Native Web
- OAP Core 1.0, sections on Manifests, Actions and Receipts

## 13. Acknowledgments

This RFC formalizes a thesis that has emerged in industry observation, namely that as coding agents become reliable enough for ordinary users to commission their own software, the provider's economic role shifts from shipping a finished product to shipping a set of well behaved primitives that the user composes into a personal solution.
