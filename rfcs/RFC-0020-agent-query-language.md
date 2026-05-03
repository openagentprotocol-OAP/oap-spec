# RFC 0020: Agent Query Language

**Status:** Draft
**Author(s):** OAP Working Group on Data Plane
**Created:** 2026-05-03
**Working Group:** Data Plane
**Targets:** 1.2

## 1. Summary

This document specifies the Agent Query Language, a declarative constraint satisfaction language by which an Agent expresses what it wants from the open Agent Web rather than how to obtain it. The language generalizes the Procurement Intent of RFC 0013 from the commercial domain to the full surface of agent driven retrieval, action selection, and provider comparison. A query expressed in the language is a structured intent that is signed by the issuing Principal, that carries an explicit cost ceiling and a quality floor, that declares the projection it requires from the response, and that is satisfiable by any conformant Provider whose Manifest matches its constraints. The language is the canonical input to Match Brokers under RFC 0021, the canonical filter on Manifest Subscription feeds under RFC 0022, and the canonical access path to the Storage Substrate of RFC 0023.

## 2. Terminology

The key words MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, MAY, and OPTIONAL in this document are to be interpreted as described in RFC 2119 and RFC 8174.

An **Intent** is a signed structured document expressing a desired outcome together with the constraints under which the outcome is acceptable. The Procurement Intent defined in RFC 0013 section 3.4 is a special case of an Intent whose category is commercial.

A **Constraint** is a single predicate over a field of a target Manifest, a field of a candidate Offer, a field of a Knowledge Node, or a field of a Receipt produced by a candidate Provider.

A **Projection** is the subset of the response fields that the Issuer requires, expressed in the projection vocabulary of RFC 0007.

A **Budget** is the maximum amount, expressed in a declared currency, that the Issuer is willing to pay for the entire Intent across all candidates evaluated.

A **Quality Floor** is the minimum acceptable value of one or more named Quality Signals, expressed against the Performance Record format of RFC 0009 or against the Conformance Receipt format of RFC 0019.

A **Resolver** is a conformant Match Broker, Storage Substrate, or Provider that accepts an Intent at a documented endpoint and returns a structured response within the validity window the Intent declares.

## 3. Specification

### 3.1 Intent Document Structure

An Intent is a JSON document conforming to `oap-intent.schema.json`. The document includes the following normative fields. The `intent_id` is a unique identifier minted by the Issuer. The `issuer_did` is the decentralized identifier of the Principal that signed the Intent. The `category` is one of the defined intent categories enumerated in section 3.6 of this document. The `constraints` array lists the predicates that any candidate response MUST satisfy. The `projection` block declares the field set that the response MUST include and the field set that the response MUST NOT include. The `budget` block declares the cost ceiling, the currency, and the allocation policy across candidates. The `quality_floor` block declares the minimum acceptable quality signals. The `validity` block declares the window during which the Intent is open for response. The `resolution_policy` block declares whether single best, ranked set, or full set responses are acceptable. The `signature` block carries the Issuer's signature over the canonicalized intent body.

### 3.2 The Constraint Algebra

A Constraint is a triple of `path`, `operator`, and `value`. The `path` identifies a field by its position in the target Manifest or candidate response, expressed in JSON Pointer syntax extended with the wildcard segment `*` for arrays and the descendant operator `**` for arbitrary depth. The `operator` is drawn from the closed set `eq`, `ne`, `lt`, `lte`, `gt`, `gte`, `in`, `not_in`, `contains`, `matches`, `before`, `after`, `within`, `outside`, and `exists`. The `value` is a JSON value compatible with the operator and the typed range of the path.

Constraints MAY be combined through the boolean operators `all_of`, `any_of`, and `not`, which take an array of Constraints as their argument. The combination forms a constraint tree whose root is the top level `constraints` field of the Intent. The semantics of the tree is the same as the semantics of an analogous expression in propositional logic. The full constraint tree is the predicate that any candidate response MUST satisfy.

The closed set of operators is intentional. An operator that is not in the set is one for which a conformant Resolver cannot evaluate the predicate without trusting the Issuer to provide an arbitrary execution payload, which is a result the protocol declines to produce. Operators that the closed set does not cover are introduced through additive minor versions of this RFC under the Backward Compatibility Gate of RFC 0019.

### 3.3 The Projection Block

The `projection` block declares the structural shape of the response that the Issuer will accept. The block has two sub fields. The `include` field is an array of JSON Pointers that the response MUST contain. The `exclude` field is an array of JSON Pointers that the response MUST NOT contain. Pointers in either field MAY use the wildcard and descendant operators of section 3.2.

A Resolver that returns a response containing fields outside the `include` set has produced a non conformant response. The Issuer MAY discard such a response and MAY record the discard against the Resolver's Performance Record under RFC 0009. A Resolver that returns a response missing fields from the `include` set has produced a non conformant response and the same consequence applies. The Projection is therefore the contract between the Issuer and the Resolver about exactly what data crosses the boundary, and it composes with the Pre Action Confidentiality Gate defined in the Confidentiality and Compliance Context paper to ensure that no field that the Issuer's Scope Policy forbids is returned.

### 3.4 The Budget Block

The `budget` block declares the maximum total cost that the Issuer authorizes for the resolution of the Intent. The block contains the `amount` field as a decimal string, the `currency` field as an ISO 4217 code or a registered crypto symbol, and the `allocation` field describing how the budget is distributed across candidates. The defined allocation policies are `single_winner` in which the entire budget is paid to the single best candidate, `ranked_top_k` in which the budget is split across the top k candidates by a declared distribution, and `proportional_quality` in which each candidate receives a share proportional to its Quality Score above the Quality Floor.

A Resolver that proposes a candidate whose cost exceeds the Issuer's remaining budget MUST flag the candidate as `over_budget` rather than silently truncating it. The Issuer's policy engine then decides whether to relax the budget, to discard the candidate, or to withdraw the Intent.

### 3.5 The Quality Floor

The `quality_floor` block declares the minimum acceptable values of one or more quality signals. Defined signals are `performance_score` from RFC 0009, `conformance_level` from RFC 0019, `latency_p99_ms` from the Build Versus Buy Decision Protocol, `provider_reputation` aggregated from Performance Records, `cooling_off_minutes` from RFC 0017, and any signal that future RFCs introduce through additive extensions of this list. A candidate response that fails to meet any declared floor MUST be rejected by the Resolver before being returned to the Issuer.

### 3.6 Defined Intent Categories

The protocol normatively defines the following Intent categories. The `commercial` category is the Procurement Intent of RFC 0013, with the additional constraint, projection, budget, and quality semantics defined in this document. The `knowledge` category is a request for one or more Knowledge Nodes that satisfy the constraints, with metering and Citation Attribution as defined in RFC 0013 section 3.5. The `action` category is a request for the invocation of a specific Action class on any conformant Provider, with the policy stack of the Safety and Policy Stack paper applied at the Resolver. The `delegation` category is a request to delegate a sub task under the cost attribution model of RFC 0004. The `discovery` category is a request to enumerate Providers whose Manifests satisfy the constraints, returning Manifest summaries rather than Offers. The `subscription` category is a request to subscribe to a feed of Manifest changes that satisfy the constraints, with the subscription mechanics of RFC 0022. Additional categories MAY be introduced through additive minor versions of this RFC.

### 3.7 The Wire Format

An Intent is submitted by the Issuer to a Resolver over the transports defined in OAP-CORE-1.0. A synchronous Resolver responds with an `IntentResponse` document containing the matching candidates, the AQL Decision Records that document why each candidate was selected or rejected, and a Resolver Signature over the response body. An asynchronous Resolver acknowledges the Intent and returns a stream of candidate responses over server sent events or WebSocket. The streaming response carries the same per candidate AQL Decision Records and the same Resolver Signature scoped to each event.

The `IntentResponse` document is canonical. A Resolver that produces a response in any other format is non conformant. The schema is published as `oap-intent-response.schema.json`. The per candidate AQL Decision Record is published as `oap-aql-decision.schema.json` and is distinct from the four layer Policy Stack Decision Record published as `oap-decision-record.schema.json`. The two records compose: an AQL Decision Record MAY reference a Policy Stack Decision Record through the `policy_decision_ref` field when the candidate evaluation triggered policy evaluation.

## 4. Backward Compatibility

This RFC introduces three new schemas, namely `oap-intent.schema.json`, `oap-intent-response.schema.json`, and `oap-aql-decision.schema.json`. The Procurement Intent schema published under RFC 0013 is preserved as a specialization of the new Intent schema. The four layer Policy Stack Decision Record published under `oap-decision-record.schema.json` is unchanged. Existing implementations that accept Procurement Intents continue to function under their current obligations and gain the option of accepting general Intents through the same endpoint, distinguished by the `category` field. No existing field of any normative schema is altered. The change satisfies the Backward Compatibility Gate of RFC 0019.

## 5. Security Considerations

The Intent document is signed by the Issuer and is therefore non repudiable. A Resolver that returns a response citing an Intent that the named Issuer did not sign is detectable and is subject to Performance Record slashing under RFC 0009. The Decision Records returned by the Resolver are themselves signed and become part of the Issuer's Receipt chain under the accountability layer described in the Accountability paper.

A malicious Issuer could attempt to use the Intent document to enumerate fields that a Resolver's Manifest declares but does not intend to expose. The Projection block defines the contract about what fields cross the boundary, and the Resolver's Pre Action Confidentiality Gate is the enforcement point. A Resolver whose enforcement is misconfigured produces over disclosed responses, which the Conformance Test Suite of RFC 0019 detects through the projection conformance behavior tests.

A malicious Resolver could attempt to construct candidates that satisfy the structural constraints while violating the spirit of the Intent. The protocol's response is the Performance Record format of RFC 0009, which carries the Issuer's post hoc judgment of the Resolver's performance and which the Issuer's future Intents MAY consult through the `quality_floor` block. The discipline of the market is therefore the structural defense against semantic gaming.

## 6. Privacy Considerations

Intents reveal information about the Issuer's preferences, financial state, and intended actions. Issuers SHOULD route privacy sensitive Intents through an aggregating Match Broker rather than broadcasting them directly to candidate Resolvers, and SHOULD apply the projection rules of RFC 0007 to mask fields that are not strictly necessary for the targeted Resolvers to evaluate the constraints. Issuers operating under Privileged Mode as defined in OAP-CORE-1.0 section 18 MUST NOT issue Intents whose constraints reveal privileged information.

## 7. Conformance Impact

A Resolver claiming conformance with this RFC at level Q1 MUST accept Intents in at least the `discovery` and `commercial` categories, MUST evaluate the full constraint algebra of section 3.2, MUST honor the projection contract of section 3.3, and MUST sign each response. A Resolver claiming conformance at level Q2 MUST additionally accept Intents in the `knowledge`, `action`, and `delegation` categories. A Resolver claiming conformance at level Q3 MUST additionally accept Intents in the `subscription` category and MUST satisfy the streaming response requirements of section 3.7.

## 8. Implementation Experience

The Reference Server in `reference/server/` has been extended with the Intent endpoint and the Decision Record machinery described in this document. The Conformance Test Suite includes a `behavior/intent/` subdirectory exercising each category against a representative Manifest set. The AssistNet platform operates an internal Resolver that accepts Intents in the `discovery`, `commercial`, and `subscription` categories at production volumes.

## 9. Alternatives Considered

A natural language query interface in which the Issuer expresses the request in free text was considered and rejected. The Resolver would be required to interpret the free text under its own model, which destroys the verifiability of the Decision Record and which makes Resolvers incomparable. A Turing complete query language with arbitrary code execution was considered and rejected for the same reason that the operator set in section 3.2 is closed, namely that the Resolver cannot honor a query whose evaluation it cannot control. A SQL or GraphQL surface was considered and rejected because both languages assume a single trusted database operator, an assumption that the Agent Web does not satisfy.

## 10. References

* OAP-CORE-1.0, the normative Open Agent Protocol Core Specification.
* RFC 0002, Negotiation Protocol.
* RFC 0004, Sub Agent Delegation.
* RFC 0005, Canonical Entity Schemas.
* RFC 0007, Privacy Preserving Projections.
* RFC 0009, Reputation and Performance Records.
* RFC 0013, Commerce Models for the Agent Economy.
* RFC 0017, Irreversibility and Cooling Off Periods.
* RFC 0019, Conformance Testing and Implementability.
* RFC 0021, Verifiable Indexes and Match Broker Conformance.
* RFC 0022, Manifest Subscription Protocol.
* RFC 0023, Agent Native Storage Substrate.
* IETF RFC 6901, JSON Pointer.
* IETF RFC 2119 and RFC 8174.
