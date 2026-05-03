# Databases for the Agent Economy

**A Whitepaper of the Open Agent Protocol**
**Version:** 1.0
**Status:** Public Working Draft
**Date:** May 2026
**Authors:** OAP Data Plane Working Group, OAP Core Protocol Working Group, and OAP Marketplace and Discovery Working Group

## Abstract

The contemporary database was designed for an era in which a single trusted operator owned the data, in which clients connected through human authored interfaces, in which queries were expressed in languages whose semantics the operator alone could change, and in which audit was an external concern handled outside the engine. The agent economy violates every one of those premises. The clients are autonomous Agents that act on behalf of Principals whose interests do not coincide with the operator's interests. Queries are expressed as signed Intents whose constraints, projections, budgets, and quality floors are part of the protocol surface. Audit is not an external concern but the central concern, because every value an Agent stores or retrieves becomes evidence in commercial, regulatory, and reputational settlements. This paper describes the database that the agent economy needs. The Open Agent Protocol calls it the Storage Substrate, defines it normatively in [RFC 0023](/rfcs/0023), queries it through the [Agent Query Language of RFC 0020](/rfcs/0020), indexes it under the [Verifiable Index obligations of RFC 0021](/rfcs/0021), distributes it through the [Manifest Subscription Protocol of RFC 0022](/rfcs/0022), and bounds it through the [Schema Negotiation rules of RFC 0024](/rfcs/0024). The combination produces a data layer whose properties differ in kind from those of the contemporary relational and document databases on which the operator centric web was built.

## 1. The Operator Era and Its Assumptions

The database technologies that dominate the contemporary web were designed under a coherent set of assumptions. The operator was presumed to be a single trusted party. The data was presumed to be the operator's property. Access was presumed to flow through human authored client applications whose queries the operator's engineering team could review. Schema evolution was presumed to be a problem the operator could schedule on its own calendar, with downstream consumers either notified by email or surprised by the change. Audit was presumed to be an external concern handled by accounting firms reading exports months after the fact. The properties the engines optimized for were therefore throughput at the operator's chosen workload, latency at the operator's chosen percentile, and storage cost at the operator's chosen retention.

The properties the engines did not optimize for, because the operator era did not require them, included verifiable record of every mutation, propagation of obligations attached to data at acquisition time, evaluation of multi party policy on every read, structural protection against vendor lock in, and uniform export of every tenant's complete state. The contemporary relational and document databases offer none of these properties as primitives. The properties have been added through external systems where they exist at all, and the external systems have been brittle, expensive, and partial.

The agent economy violates every one of the operator era assumptions. The Agent is not a human authored client whose queries the operator can review. The Agent is autonomous and acts on behalf of a Principal whose interests are foreign to the operator. The Agent's queries are not authored once and reused but composed at machine speed from the Principal's intent and the structure of the Manifest the Agent has retrieved. The Agent's tolerance for vendor lock in is zero, because the Principal can switch operators at any time without obtaining the operator's permission. The Agent's expectation of audit is total, because every value the Agent reads or writes becomes evidence in subsequent settlement. A database designed under the operator era assumptions is structurally unfit for these conditions, in the same sense that a database designed for a single user spreadsheet is structurally unfit for a multi user transactional workload.

## 2. The Ten Properties of an Agent Native Database

The Storage Substrate of [RFC 0023](/rfcs/0023) is defined by ten properties that together distinguish it from the contemporary database. Each property is a normative obligation rather than an optional feature. Each property is detectable through the Conformance Test Suite of [RFC 0019](/rfcs/0019). The combination is the protocol's specification of what a database must offer to be a credible substrate for the agent economy.

### 2.1 Receipt Anchored Writes

Every mutation produces a Mutation Receipt that becomes part of the Substrate's Receipt chain under the accountability layer described in [Accountability in the Agent Economy](/papers/accountability-in-the-agent-economy). The Receipt records the Principal who issued the mutation, the Schema Identifier under which the Record is typed, the cryptographic hash of the Record before and after the mutation, the Decision Record from the Pre Read Policy Gate evaluation that authorized the mutation, the cost of the mutation under the Substrate's commerce model, and the signatures of every party whose authority the mutation required. The Receipt is anchored into a Transparency Log under the same anchoring rules as Receipts elsewhere in the protocol. The contemporary database produces no analogous artifact, and the contemporary practice of reconstructing the equivalent through change data capture and downstream auditing tools has produced records that are partial, lagging, and unverifiable.

### 2.2 Policy Aware Reads

Every read against the Substrate evaluates the four layer Policy Stack of the [Safety and Policy Stack](/papers/safety-and-policy-stack) before any field crosses the boundary. The evaluation answers, for each field in the requested Projection, whether the Platform Rules permit the disclosure, whether the Organizational Policy permits the disclosure, whether the Scope Policy under [RFC 0006](/rfcs/0006) permits the disclosure, and whether the requesting Principal's Personal Preference permits the disclosure. The Substrate composes the four answers into a permitted Projection that may be narrower than the requested Projection. The contemporary database evaluates row level security at best, leaves field level security to application code, and treats multi party policy as an integration concern. The Substrate inverts the relationship and treats policy as a primitive of the engine.

### 2.3 Provenance Tagged Values

Every value in the Substrate may carry a Provenance Tag that travels with the value through subsequent mutations and projections. The Tag identifies the source of the value, the obligation under which it was received, the classification of its sensitivity, the purpose for which it was disclosed, and the conditions under which it must be deleted. When a value is derived from a tagged value, the Substrate attaches a derivation tag that cites the original Tag and preserves its obligations. The recursion produces a verifiable lineage of every value in the Substrate, which is the property that the [Confidentiality and Compliance Context](/papers/confidentiality-and-compliance-context) paper relies on for cross professional confidentiality enforcement.

### 2.4 Projection Native Queries

The Substrate is queried through the [Agent Query Language of RFC 0020](/rfcs/0020), which expresses every query as an Intent with an explicit constraint tree, an explicit Projection, an explicit budget, and an explicit quality floor. The contemporary database accepts queries whose results are unbounded by default and whose projections are determined by the client's discipline rather than by the engine's contract. The Substrate refuses queries whose Projection is not declared, returns only the fields the Projection authorizes, and produces a Decision Record alongside the result that records the Projection that was applied. The contract is the protocol's defense against the over disclosure that has characterized the contemporary database surface.

### 2.5 Self Describing Surface

Every Substrate publishes a Manifest under [OAP-CORE-1.0](/spec) that declares the Schema Identifiers it accepts, the Schema Versions it produces, the operations it exposes, the commerce model under which it is priced, the deletion time bound it commits to, and the Subscription endpoint at which change feeds are available. A consuming Agent can therefore reason mechanically about the Substrate without prior integration, which is the property that the [Agent Web](/papers/agent-web-whitepaper) paper relies on for cold start interaction.

### 2.6 Decentralized Identity

Every Record in the Substrate is owned by a single Principal identified by its decentralized identifier. The identifier is the unit of access control, of receipt attribution, and of portable export. The Substrate evaluates authority against the identifier rather than against an internal user record, which is the property that allows a Principal to move between Substrates without losing identity continuity. The contemporary database manages identity internally and treats portability as an export problem.

### 2.7 Verifiable Indexes

A Substrate that offers query semantics across multiple Records also publishes a Verifiable Index under the [Verifiable Index obligations of RFC 0021](/rfcs/0021). The Index supports per query Inclusion Proofs, periodic Completeness Attestations, Negative Inclusion Proofs on demand, and a Disclosed Ranking Function with per response Decision Records. The combination ensures that no Record is silently suppressed and that no candidate is silently demoted, which are the conditions on which an open marketplace depends. The contemporary search index treats its ranking as proprietary and its completeness as unverifiable, both of which are conditions under which the operator era achieved gatekeeper rents that the agent economy is built to dissolve.

### 2.8 Subscription Native

A Substrate exposes a Subscription endpoint under the [Manifest Subscription Protocol of RFC 0022](/rfcs/0022) at which consuming Agents subscribe to change feeds rather than poll. Each Manifest Event carries a per event Receipt linking the event into the Substrate's Receipt chain, an Inclusion Proof linking the new Manifest hash to the Substrate's Verifiable Index root, and a signature by the Substrate. Subscriptions are bounded by declared event rate caps, are subject to backpressure under a structured signal, and are funded under the Subscription category of the Substrate's commerce model. The contemporary database leaves change distribution to external systems and produces neither signatures nor inclusion proofs for the events those systems carry.

### 2.9 Cooling Off and Reversibility

Every mutation may be marked reversible under the [Irreversibility and Cooling Off rules of RFC 0017](/rfcs/0017). A reversible mutation produces a Reversal Receipt on undo that is symmetric with the original Mutation Receipt, restoring the prior state and updating any derived values whose Provenance Tags cite the reversed value. The protocol treats irreversibility as a deliberate choice declared in the Manifest rather than as a default, which is the property the consumer protection literature has long called for and that the contemporary database has structurally resisted because its mutations are designed for finality.

### 2.10 Wallet Portable

Every Substrate accepts an export from any other conformant Substrate through `oap/storage/import` and integrates the export into the requesting Principal's Tenant. The integration preserves Receipt chain continuity by attaching the imported chain to the receiving Substrate's chain through a Migration Receipt. The Principal therefore has at all times the option to move to a competing Substrate without obtaining the current Substrate's permission, which is the protocol's structural defense against vendor lock in and the data layer counterpart to the wallet portability requirement of the [Economics of the Agent Economy](/papers/economics-of-the-agent-economy) paper.

## 3. The Four Primitives

The ten properties of section 2 are realized through four primitives that the Substrate exposes at its surface. Every other operation a consuming Agent performs against the Substrate is composed from these primitives, and a Substrate that does not offer them does not claim conformance under [RFC 0023](/rfcs/0023).

### 3.1 The Manifest

The Manifest is the self describing artifact that announces the Substrate's identity, its schemas, its operations, its commerce model, its deletion bound, its Subscription endpoint, and its Compatibility Profile under [Schema Negotiation rules of RFC 0024](/rfcs/0024). A consuming Agent fetches the Manifest before any substantive interaction and uses it as the basis for the Agent Query Language Intents it subsequently issues.

### 3.2 The Receipt Log

The Receipt Log is the append only chain that records every mutation, every reversal, every export, every import, every deletion, and every cascade. The chain is anchored into a Transparency Log on a documented cadence and is the verifiable record on which all subsequent settlement, dispute resolution, and audit depend.

### 3.3 The Projection

The Projection is the contract between the Issuer of an Intent and the Substrate about which fields cross the boundary. The Substrate computes the Projection at evaluation time, applies the four layer Policy Stack to narrow it where required, and returns the result with a Decision Record that documents the evaluation. The Projection is the unit of disclosure and the unit of cost attribution.

### 3.4 The Subscription

The Subscription is the long lived agreement under which a consuming Agent receives change events from the Substrate. Each event carries a per event Receipt, an Inclusion Proof, and a Substrate signature. Subscriptions compose with Intents, with Wallet portability, and with the four layer Policy Stack to produce a uniform delivery surface for ambient awareness of the parts of the agent economy a Principal cares about.

## 4. What Falls Away

A database that satisfies the ten properties and exposes the four primitives renders obsolete several large categories of contemporary infrastructure. The change data capture pipeline is replaced by the Subscription primitive, which delivers signed events directly from the engine to the consumer. The audit log management system is replaced by the Receipt Log primitive, which is part of the engine itself. The data lineage tool is replaced by the Provenance Tag system, which is propagated by the engine on every mutation and projection. The data export integration is replaced by the Portable Export operation, which is uniform across Substrates. The vendor specific search index is replaced by the Verifiable Index, which is uniform across Match Brokers. The application level row policy framework is replaced by the Pre Read Policy Gate, which is part of the engine. The application level rate limiter that protects the database from over enthusiastic clients is replaced by the budget mechanism of the Agent Query Language, which the consuming Agent declares in every Intent it issues.

The aggregate effect is a substantial simplification of the data plane that contemporary deployments operate. The simplification is not the product of consolidating vendors but of moving capabilities into the protocol so that the surface of every conformant Substrate is uniform. The result is the property that the [Interoperability versus Platforms](/papers/interoperability-versus-platforms) paper describes as the structural defense against the platform pattern, applied to the data layer.

## 5. The Migration Path

Existing relational and document databases continue to serve human authored applications and continue to serve internal workloads that do not require the properties of section 2. The Substrate is deployed alongside them rather than in place of them, exposed through an OAP Manifest while the underlying engine remains whatever the operator already operates. The Substrate may be implemented as a layer over PostgreSQL, over DynamoDB, over a key value store, or over a purpose built engine. The implementer's freedom is preserved by the choice in [RFC 0023](/rfcs/0023) to specify operations and obligations rather than the engine itself.

A deployment that wishes to expose its existing data through a Substrate begins by publishing the Manifest, by implementing the seven required operations of section 3.1 of [RFC 0023](/rfcs/0023), by attaching a Receipt Log to the mutation path, by introducing the Pre Read Policy Gate to the read path, by publishing a Verifiable Index over the data the Substrate intends to expose to discovery, and by exposing a Subscription endpoint for the change feed the deployment intends to publish. The order is a matter of operational convenience and is not normative. Each step independently moves the deployment closer to a conformance level under [RFC 0019](/rfcs/0019), and the cumulative effect is a Substrate whose surface is interchangeable with any other conformant Substrate without further integration.

## 6. The Database the Agent Economy Was Always Going to Need

The contemporary database is the artifact of the operator era. The Substrate is the artifact of the era after it. The properties that distinguish the Substrate are not novel in isolation. Receipt logs exist in append only ledgers. Policy aware reads exist in row level security frameworks. Provenance propagation exists in research databases. Verifiable indexes exist in transparency log infrastructures. Subscription native engines exist as message brokers. Each property has been demonstrated. What the Open Agent Protocol contributes is the assembly of all ten properties into a single engine surface, governed by a single set of conformance obligations, published through a single Manifest contract, and addressed through a single query language. The assembly is what makes the Substrate an addressable substrate rather than a collection of integrations.

The contemporary debate about the future of databases concerns whether vector search, distributed transactions, or operational analytics will dominate the next product cycle. The agent economy's question is different. The question is whether the database can become a verifiable, portable, policy aware, receipt anchored substrate that an autonomous Agent can interact with on behalf of a Principal whose interests are foreign to the operator. The answer the Open Agent Protocol gives is yes, and the document that defines it is [RFC 0023](/rfcs/0023). This paper is the case for why the question matters.

## 7. References

* [OAP-CORE-1.0](/spec), the normative Open Agent Protocol Core Specification.
* [RFC 0006](/rfcs/0006), Persona and Scope Layer.
* [RFC 0007](/rfcs/0007), Privacy Preserving Projections.
* [RFC 0017](/rfcs/0017), Irreversibility and Cooling Off Periods.
* [RFC 0019](/rfcs/0019), Conformance Testing and Implementability.
* [RFC 0020](/rfcs/0020), Agent Query Language.
* [RFC 0021](/rfcs/0021), Verifiable Indexes and Match Broker Conformance.
* [RFC 0022](/rfcs/0022), Manifest Subscription Protocol.
* [RFC 0023](/rfcs/0023), Agent Native Storage Substrate.
* [RFC 0024](/rfcs/0024), Schema Negotiation and Versioning.
* [Accountability in the Agent Economy](/papers/accountability-in-the-agent-economy).
* [Confidentiality and Compliance Context](/papers/confidentiality-and-compliance-context).
* [Economics of the Agent Economy](/papers/economics-of-the-agent-economy).
* [Interoperability versus Platforms](/papers/interoperability-versus-platforms).
* [Safety and Policy Stack](/papers/safety-and-policy-stack).
* [The Agent Web](/papers/agent-web-whitepaper).
* [Verifiable Conformance](/papers/verifiable-conformance).
