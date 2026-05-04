# Open Agent Protocol (OAP)

**Specification Version:** 1.0
**Status:** Public Working Draft
**Document Identifier:** OAP-CORE-1.0
**Publication Date:** 2026-05-02
**License:** Specification text under CC BY 4.0. Reference implementations under Apache License 2.0.
**Editor:** OAP Working Group on Core Protocol
**Repository:** https://github.com/openagentprotocol-OAP/oap-spec

## Abstract

The Open Agent Protocol (OAP) defines a vendor neutral, end to end specification for the discovery, invocation, billing, governance, and accountability of tools and services consumed by autonomous artificial intelligence agents. OAP unifies the operational, commercial, legal, and ethical interfaces that have so far been implemented in fragmented and incompatible ways by the Model Context Protocol (MCP), the Agent2Agent Protocol (A2A), proprietary function calling systems, and bespoke enterprise integrations.

OAP introduces a single conformance surface that covers identity, capability description, structured invocation, monetization, multi agent coordination, confidentiality enforcement, and tamper evident auditing. The specification is designed to be the default interoperability layer for the agent economy, comparable in scope and ambition to what HTTP, OAuth, and TLS represent for the web.

## Status of This Memo

This document is a Public Working Draft of the Open Agent Protocol community. It is subject to revision through the OAP RFC process. Implementations are encouraged but should expect non breaking refinements until the Final designation is granted. Conformance claims against this document MUST cite the version identifier above.

## Table of Contents

1. Introduction
2. Conformance Language and Terminology
3. Design Goals and Non Goals
4. Architectural Overview
5. Identity Layer (DIDs and Verifiable Credentials)
6. Tool Manifest
7. Action Schema
8. Invocation Protocol
9. Streaming, Asynchronous Tasks, and Webhooks
10. Authentication and Authorization
11. Pricing, Billing, and the OAP Wallet
12. Agent Subscription Lifecycle
13. Service Level Agreements
14. Capabilities Discovery
15. Multi Agent Coordination
16. Trust, Verification, and Reputation
17. Data Policy and Provenance
18. Confidentiality and Compliance Context (CCC)
19. Receipts, Hash Chains, and the Transparency Log
20. Policy Engine and Decision Records
21. Outcome Verification and Reproducibility
22. Revocation and Incident Response
23. Insurance, Liability, and Dispute Resolution
24. Internationalization and Jurisdictional Routing
25. Accessibility
26. Carbon and Energy Accounting
27. Versioning and Backward Compatibility
28. Security Considerations
29. Privacy Considerations
30. Regulatory Conformance Mapping
31. Conformance Levels (L0 through L5)
32. Community Governance
33. References
34. Appendix A: Normative JSON Schemas
35. Appendix B: HTTP Status and Error Codes
36. Appendix C: Cryptographic Suites
37. Appendix D: IANA and Registry Considerations
38. Appendix E: Migration from MCP and A2A

## 1. Introduction

The proliferation of autonomous agents has produced an urgent need for a coherent protocol layer between the agent and the world it acts upon. Existing protocols solve narrow slices of this problem. The Model Context Protocol standardizes how a single language model invokes a single tool. The Agent2Agent Protocol standardizes how two agents exchange tasks. Neither addresses how agents pay for services, how providers enforce confidentiality obligations, how reputation propagates across platforms, how a regulator audits an autonomous decision, or how a user revokes consent at scale.

OAP fills this gap with a single specification that an implementer can adopt incrementally through six conformance levels, from a minimal compatibility shim to a fully certified deployment suitable for regulated industries. The protocol is transport agnostic, identity portable, and carrier neutral. It is designed to interoperate with MCP and A2A through normative adapters defined in Appendix E.

## 2. Conformance Language and Terminology

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in BCP 14 (RFC 2119 and RFC 8174) when, and only when, they appear in all capitals.

The following terms are normative throughout this specification.

| Term | Definition |
|------|------------|
| Agent | Software entity acting on behalf of a Principal that consumes Tools and may collaborate with other Agents. |
| Tool | Network reachable service that exposes one or more Actions and a conformant OAP Manifest. |
| Action | Single named operation exposed by a Tool with a defined input schema and output schema. |
| Principal | Natural person, legal person, or organization on whose behalf an Agent acts. |
| Scope | Bounded execution context of a Principal, frequently corresponding to a persona, role, or mandate. |
| DID | Decentralized Identifier as defined by the W3C DID Core specification. |
| Receipt | Cryptographically signed record of a single Invocation, Subscription event, or Settlement. |
| Manifest | Machine readable self description of a Tool published at a well known location. |
| OAP Community | The open community of contributors that maintains this specification through the public RFC process and CI-enforced quality gates. There is no single legal entity that owns OAP. |
| Marketplace | Any conformant directory that lists Tools and exposes them for discovery by Agents. |
| Trust Anchor | Service that signs attestations about the identity, conformance, or behavior of OAP participants. |

## 3. Design Goals and Non Goals

### 3.1 Design Goals

1. **Interoperability.** A conformant Agent invokes any conformant Tool without bilateral integration.
2. **Portability.** Identities, reputations, subscriptions, and audit records are not bound to any single platform or vendor.
3. **Accountability.** Every action attributable to an Agent produces a verifiable, tamper evident artifact.
4. **Safety.** The protocol provides mandatory enforcement points for legal, professional, and ethical constraints.
5. **Commercial neutrality.** Tools may monetize through any model the protocol defines without depending on any single payment provider.
6. **Censorship resistance.** No single jurisdiction or operator can globally suppress conformant participants.
7. **Incremental adoption.** Tiered conformance allows minimal implementations to coexist with fully certified deployments.

### 3.2 Non Goals

1. OAP does not prescribe the internal architecture of an Agent or the model that powers it.
2. OAP does not standardize natural language prompt formats.
3. OAP does not create a global currency or mandate any specific payment rail.
4. OAP does not replace domain specific protocols such as FHIR, ISO 20022, or OpenBanking. It composes with them.

## 4. Architectural Overview

OAP defines seven conceptual planes. An implementation MUST address every mandatory item across the planes that correspond to its declared Conformance Level.

1. **Identity Plane.** Decentralized identifiers, verifiable credentials, key management.
2. **Discovery Plane.** Manifests, capability indices, intent matching.
3. **Invocation Plane.** Synchronous calls, streaming, asynchronous tasks, webhooks.
4. **Commercial Plane.** Pricing models, subscriptions, wallets, settlement.
5. **Governance Plane.** Policy decisions, confidentiality enforcement, jurisdictional routing.
6. **Accountability Plane.** Receipts, transparency logs, provenance, dispute resolution.
7. **Coordination Plane.** Neutral services that anchor trust, revocation, and arbitration.

The planes are decoupled. A Tool MAY implement Identity, Discovery, and Invocation without participating in the Commercial Plane. A Tool that participates in the Commercial Plane MUST also implement the Accountability Plane.

## 5. Identity Layer

### 5.1 Decentralized Identifiers

Every OAP participant MUST be addressable by at least one DID. The protocol normatively supports the following DID methods:

| Method | Use Case |
|--------|----------|
| did:web | Default for organizations and Tools that already control a domain. |
| did:key | Lightweight ephemeral identifiers for short lived agents. |
| did:plc | Recommended for portable user identifiers across providers. |
| did:ion | Recommended for high assurance identifiers anchored to Bitcoin. |
| did:ethr | Recommended for participants requiring on chain settlement integration. |

A conformant participant MUST publish a DID Document containing at minimum: a primary signing key, a key agreement key, a service endpoint of type `OAPInvocationEndpoint`, and a service endpoint of type `OAPRevocationStatus`.

### 5.2 Verifiable Credentials

OAP uses W3C Verifiable Credentials (VC Data Model 2.0) for assertions about participants. The following credential types are normative.

| Credential Type | Issuer | Purpose |
|-----------------|--------|---------|
| `OAPPublisherVerified` | community accredited verifier | Confirms legal identity of a Tool publisher. |
| `OAPConformance` | Self-issued, peer-witnessed | States the Conformance Level achieved by a participant. Generated by the open-source OAP test suite, signed by the implementation key, and (for L4 and L5) co-signed by independent peer witnesses and anchored in the OAP Registry. |
| `OAPProfessionalCode` | Recognized bar, chamber, or guild | Asserts membership in a regulated profession. |
| `OAPDataResidency` | Independent auditor | Confirms verifiable data residency claims. |
| `OAPInsuranceCoverage` | Insurance carrier | Asserts active liability coverage and policy limits. |
| `OAPAgeAttestation` | Government recognized issuer | Attests to age category without disclosing identity. |

### 5.3 Key Rotation and Recovery

Participants MUST publish a key rotation policy and MUST support hardware backed keys at Conformance Level L3 and above. Recovery MUST follow a documented social recovery, threshold signature, or hardware enclave procedure. Loss of a primary key without a documented recovery path triggers automatic suspension of the participant DID by the Revocation Service.

## 6. Tool Manifest

### 6.1 Location

A conformant Tool MUST publish its Manifest at the canonical location:

```
https://{domain}/.well-known/oap-tool.json
```

Tools MAY also publish Manifests at additional locations referenced by their DID Document.

### 6.2 Required Top Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `oap_version` | string | yes | Specification version. MUST equal `1.0` for conformance with this document. |
| `tool` | object | yes | Tool descriptor (see 6.3). |
| `endpoints` | object | yes | Network endpoints (see 6.4). |
| `auth` | array | yes | Supported authentication methods (see Section 10). |
| `actions` | array | yes | List of Action descriptors (see Section 7). |
| `pricing` | object | conditional | REQUIRED if Tool participates in the Commercial Plane. |
| `sla` | object | yes | Service level commitments (see Section 13). |
| `trust` | object | yes | Trust and verification claims (see Section 16). |
| `data_policy` | object | yes | Data handling commitments (see Section 17). |
| `collaboration` | object | conditional | REQUIRED if Tool supports concurrent agents. |
| `risk_class` | string | yes | One of `minimal`, `limited`, `high`, `unacceptable` per the EU AI Act mapping. `unacceptable` MUST NOT be present in a published Manifest. |
| `jurisdictions` | array | yes | ISO 3166 codes of jurisdictions in which the Tool is offered. |
| `governance` | object | yes | Dispute, revocation, and contact information. |

### 6.3 Tool Descriptor

```json
{
  "tool": {
    "id": "weather-pro",
    "did": "did:web:weatherpro.example",
    "name": "Weather Pro",
    "version": "2.4.1",
    "publisher": {
      "did": "did:web:weatherpro.example",
      "legal_name": "Weather Pro GmbH",
      "registry": { "type": "Handelsregister", "id": "HRB 123456 B", "country": "DE" },
      "verified": true
    },
    "categories": ["data", "weather", "geospatial"],
    "icon": "https://weatherpro.example/assets/icon-512.png",
    "description_for_humans": "Global weather forecasts and historical climate data.",
    "description_for_agents": "Provides numerical weather prediction outputs for any geographic point. Use for short term forecasts up to 14 days, marine and aviation specific outputs, and historical observations back to 1979."
  }
}
```

The `description_for_agents` field MUST be deterministic, free of marketing language, and bounded to 4000 Unicode codepoints.

### 6.4 Endpoints

```json
{
  "endpoints": {
    "invoke":            "https://api.weatherpro.example/oap/invoke",
    "stream":            "https://api.weatherpro.example/oap/stream",
    "subscribe":         "https://api.weatherpro.example/oap/subscribe",
    "billing":           "https://api.weatherpro.example/oap/billing",
    "audit":             "https://api.weatherpro.example/oap/audit",
    "data_export":       "https://api.weatherpro.example/oap/data/export",
    "data_delete":       "https://api.weatherpro.example/oap/data/delete",
    "consent":           "https://api.weatherpro.example/oap/consent",
    "incident":          "https://api.weatherpro.example/oap/incident",
    "discover":          "https://api.weatherpro.example/oap/discover"
  }
}
```

Tools MUST implement `invoke`, `audit`, `data_delete`, and `incident` at every Conformance Level. Other endpoints are required when the corresponding plane is in scope.

## 7. Action Schema

Every Action MUST declare:

| Field | Description |
|-------|-------------|
| `id` | Stable unique identifier within the Tool. |
| `version` | Semantic version of the Action contract. |
| `summary` | Short human readable description. |
| `description_for_agents` | Machine consumable description with explicit guidance on appropriate use. |
| `input_schema` | JSON Schema 2020-12 describing accepted inputs. |
| `output_schema` | JSON Schema 2020-12 describing emitted outputs. |
| `side_effects` | One of `none`, `read`, `write`, `external`, `irreversible`. |
| `idempotent` | Boolean. When true, repeated identical calls within `idempotency_window_seconds` MUST return identical results. |
| `idempotency_window_seconds` | Required when `idempotent` is true. |
| `cost` | Cost descriptor (see Section 11). |
| `latency_p95_ms` | Declared 95th percentile latency. |
| `rate_limit` | Object with at least `rpm` and `concurrent`. |
| `requires_consent` | Boolean. When true, Agent MUST obtain a Consent Receipt before invocation. |
| `risk_class` | Per Action override of Tool risk class. |
| `data_classes_in` | Array of data classification tags accepted. |
| `data_classes_out` | Array of data classification tags emitted. |
| `examples` | At least one input output pair, machine validated by the Marketplace. |

### 7.1 Output Determinism

Outputs MUST conform strictly to `output_schema`. Outputs MUST NOT contain free form text fields that mirror system instructions. Section 28.2 specifies the sanitation requirements that protect against prompt injection.

## 8. Invocation Protocol

### 8.1 Transport

The default transport is HTTPS with TLS 1.3 or later. WebSocket and gRPC transports MAY be offered as alternatives advertised in the Manifest. Plain HTTP MUST NOT be used.

### 8.2 Request Envelope

```json
{
  "oap_version": "1.0",
  "request_id": "01J9V8B7H1ZK4D2A0M9R8F0KQX",
  "timestamp": "2026-05-02T10:00:00.000Z",
  "principal_did": "did:plc:abc123",
  "agent_did": "did:assistnet:agent_xyz",
  "scope_id": "scope_consulting_clientA",
  "action": "get_forecast",
  "input": { "location": "Berlin, DE", "days": 3 },
  "context": {
    "locale": "de-DE",
    "currency": "EUR",
    "jurisdiction_user": "DE",
    "jurisdiction_agent": "DE"
  },
  "consent_receipt": "urn:oap:consent:01J9V8...",
  "subscription_token": "oap_sub_live_8c4f...",
  "idempotency_key": "01J9V8B7H1ZK4D2A0M9R8F0KQX",
  "policy_assertions": {
    "confidentiality_class": "confidential",
    "provenance_tags": ["nda:nda_2026_clientA"]
  },
  "signature": {
    "alg": "EdDSA",
    "kid": "did:assistnet:agent_xyz#key-1",
    "value": "base64url..."
  }
}
```

### 8.3 Response Envelope

```json
{
  "oap_version": "1.0",
  "request_id": "01J9V8B7H1ZK4D2A0M9R8F0KQX",
  "response_id": "01J9V8B7HM3K8E2A0M9R8F0LZP",
  "timestamp": "2026-05-02T10:00:00.215Z",
  "status": "ok",
  "output": { "forecast": [ ... ] },
  "model_version": "ecmwf-aifs-1.2",
  "cost": { "amount": "0.001", "currency": "EUR" },
  "receipt": { "id": "urn:oap:receipt:01J9V8...", "anchored_in": ["sigstore", "ot-eu-west"] },
  "warnings": [],
  "signature": { "alg": "EdDSA", "kid": "did:web:weatherpro.example#key-1", "value": "base64url..." }
}
```

### 8.4 Mandatory Headers

| Header | Purpose |
|--------|---------|
| `OAP-Version` | Protocol version of the request. |
| `OAP-Request-Id` | ULID identifier matching the envelope. |
| `OAP-Signature` | Detached signature over the canonical JSON form. |
| `OAP-Idempotency-Key` | Required for any Action declaring `idempotent: true`. |
| `OAP-Trace` | W3C Trace Context propagation. |

## 9. Streaming, Asynchronous Tasks, and Webhooks

### 9.1 Streaming

Tools MAY expose Server Sent Events at the `stream` endpoint. Each event MUST carry a `seq` field, an `event` field, and a `data` field. The final event MUST be `event: oap.complete` and MUST include the final Receipt.

### 9.2 Asynchronous Tasks

Long running Actions return HTTP 202 Accepted with a Task descriptor:

```json
{
  "task_id": "urn:oap:task:01J9V8...",
  "status": "submitted",
  "poll_url": "https://api.weatherpro.example/oap/tasks/01J9V8...",
  "callback_url_supported": true,
  "estimated_completion": "2026-05-02T10:05:00Z"
}
```

Task lifecycle states are: `submitted`, `accepted`, `working`, `awaiting_input`, `completed`, `failed`, `canceled`, `expired`. Transitions are append only and MUST be reflected in the Audit Log.

### 9.3 Webhooks

Tools MAY accept Webhook subscriptions at the `subscribe` endpoint. All Webhooks MUST be signed using HTTP Message Signatures (RFC 9421) with the Tool key. Subscribers MUST verify signature, replay window, and DID resolution before acting on a Webhook payload.

## 10. Authentication and Authorization

### 10.1 Methods

A Tool MUST support at least one of the following and SHOULD support all that apply:

1. **Anonymous.** Rate limited public access. Only permitted for Actions declared `side_effects: none` and `risk_class: minimal`.
2. **API Key.** Static credential issued by the Tool. Required header: `Authorization: Bearer oap_apikey_...`.
3. **OAuth 2.1 with PKCE.** Required for any Action operating on user owned data.
4. **OAP Trust Token.** Short lived JWT issued by the Principal DID controller, containing `sub`, `aud`, `agent`, `scope`, `nonce`, `iat`, `exp`, and a `cnf` confirmation claim binding the token to the Agent key.
5. **mTLS.** Mutual TLS where both parties present DID bound certificates issued by an OAP recognized issuer.

### 10.2 Authorization Decisions

Authorization decisions MUST be recorded in the Decision Record (Section 20.4) accompanying the Receipt. The decision MUST cite the credential used and the policy rule that permitted the action.

## 11. Pricing, Billing, and the OAP Wallet

### 11.1 Pricing Models

OAP normatively defines five pricing models. Tools MUST express prices using one or a composition of the following.

| Model | Field |
|-------|-------|
| Free | `{ "type": "free" }` |
| Per Call | `{ "type": "per_call", "amount": "0.001", "currency": "EUR" }` |
| Subscription | `{ "type": "subscription", "tiers": [ ... ] }` |
| Usage Metered | `{ "type": "usage_metered", "unit": "tokens", "amount_per_1000": "0.05", "currency": "EUR" }` |
| Outcome | `{ "type": "outcome", "trigger": "successful_booking", "amount": "0.50", "currency": "EUR" }` |

All monetary amounts MUST be expressed as decimal strings to avoid floating point error and MUST follow ISO 4217 currency codes.

### 11.2 The OAP Wallet

The OAP Wallet is a normative interface for funding Agent activity. The Wallet exposes:

| Operation | Method | Description |
|-----------|--------|-------------|
| `wallet.balance` | GET | Returns balances per currency. |
| `wallet.authorize` | POST | Creates a hold for a maximum amount. |
| `wallet.capture` | POST | Captures a previously authorized amount. |
| `wallet.refund` | POST | Refunds a captured amount. |
| `wallet.statement` | GET | Returns signed statement of activity. |
| `wallet.limits` | GET, PUT | Reads or sets per Tool, per Agent, per period spending limits. |

Wallets MUST be portable. A Principal MUST be able to export the full ledger and import it into another conformant Wallet provider. Wallet providers MUST be regulated as electronic money institutions in their primary jurisdiction or operate through a licensed partner. Crypto denominated balances MUST conform to MiCA where applicable.

### 11.3 Settlement

Settlement between participants MUST produce a signed Settlement Receipt referencing the underlying Invocation Receipts. Settlement currency, rail, and timing MUST be disclosed in the Manifest.

## 12. Agent Subscription Lifecycle

### 12.1 Initiation

When an Agent invokes an Action that requires an unmet subscription, the Tool MUST respond with HTTP 402 Payment Required and the following body:

```json
{
  "error": "subscription_required",
  "checkout_url": "https://api.weatherpro.example/oap/checkout/...",
  "agent_subscribe_url": "https://api.weatherpro.example/oap/subscribe",
  "price_options": [ { "tier": "pro", "amount": "9.99", "currency": "EUR", "interval": "month" } ],
  "user_consent_required": true,
  "trial_available": true
}
```

### 12.2 Consent

The Agent MUST evaluate the Principal policy. If the policy permits autonomous subscription within stated limits, the Agent records a Consent Receipt and proceeds. Otherwise, the Agent MUST request explicit consent through a registered consent channel.

### 12.3 Activation

Subscription activation produces a `subscription_token` that the Agent presents on subsequent calls. The token is bound to: principal DID, agent DID, scope, tier, price hash, and expiration.

### 12.4 Modification and Termination

Pricing changes affecting active subscriptions MUST provide at least thirty days advance notice through the `billing` endpoint and MUST honor the original price for the remaining billing period or until cancellation, whichever is earlier. Termination MUST be available through both Tool and Wallet interfaces with no friction asymmetry.

## 13. Service Level Agreements

A conformant Manifest MUST declare:

```json
{
  "sla": {
    "uptime_target": 0.999,
    "latency_p95_ms": 300,
    "latency_p99_ms": 800,
    "max_call_duration_ms": 30000,
    "supports_streaming": true,
    "supports_async": true,
    "regions": ["eu-west", "eu-central", "us-east"],
    "max_concurrency_per_principal": 10,
    "incident_disclosure_within_hours": 72,
    "scheduled_maintenance_notice_hours": 168
  }
}
```

The community operates (as open-source services anyone may run) a continuous probing service. Measured values are published alongside declared values in every Marketplace listing. Persistent material divergence triggers a downgrade of the Conformance Level until corrected.

## 14. Capabilities Discovery

Tools MUST implement a `discover` endpoint that accepts a structured intent and returns matching Actions with confidence scores and estimated cost.

```json
{
  "intent": "book a domestic flight from Berlin to Munich next Tuesday morning",
  "principal_did": "did:plc:abc123",
  "constraints": { "max_cost_eur": "300", "non_stop": true }
}
```

Marketplaces aggregate `discover` responses across their listed Tools and present ranked results. Ranking algorithms used by a conformant Marketplace MUST be published openly and MUST be auditable by any community member.

## 15. Multi Agent Coordination

### 15.1 Concurrency Modes

Tools that allow concurrent Agents MUST declare a concurrency mode:

| Mode | Description |
|------|-------------|
| `optimistic` | Last write wins, version conflicts surfaced through error code. |
| `pessimistic` | Locking via `lock` and `unlock` operations. |
| `crdt` | Conflict free replicated data types, no explicit locking required. |

### 15.2 Change Broadcast

Tools that maintain shared state SHOULD broadcast change events to all Agents holding active subscription tokens through the Webhook subsystem.

### 15.3 Conflict Resolution

Tools MUST expose a `conflicts` resource that returns unresolved conflicts and accepts resolution proposals. Conflict resolution decisions MUST be recorded in Receipts.

### 15.4 Coordination Sessions

When multiple Agents collaborate on a shared Task, they MAY establish a Coordination Session identified by a session DID. Messages within the session MUST be signed and ordered through a Lamport or vector clock declared in the session manifest.

## 16. Trust, Verification, and Reputation

### 16.1 Trust Manifest

```json
{
  "trust": {
    "publisher_verified": true,
    "code_audited": [ { "by": "did:web:auditor.example", "date": "2026-01-15", "scope": "full", "report": "https://..." } ],
    "data_residency": ["EU"],
    "gdpr_compliant": true,
    "soc2_type_ii": true,
    "iso_27001": true,
    "open_source": "https://github.com/example/weather-pro",
    "trust_score": null,
    "user_reviews": null,
    "incidents_last_90d": 0
  }
}
```

`trust_score` and `user_reviews` MUST NOT be self reported. They are populated by the OAP Trust Service (an open-source service that any community member may operate) and any conformant Marketplace.

### 16.2 Reviews

Reviews MUST cite a Receipt identifier. Reviews not bound to a Receipt MUST NOT be included in any aggregate score. Reviews MUST originate from a verified Principal DID and are weighted by account age, review history, and Sybil resistance signals defined in Section 28.6.

### 16.3 Trust Score Computation

The OAP community publishes the Trust Score formula as open source code in the OAP repository. The formula combines: verified publisher status, audit recency, incident history, latency and uptime conformance, dispute rate, and weighted user reviews. Marketplaces are free to compute additional scores but MUST display the canonical Trust Score with at least equal prominence.

## 17. Data Policy and Provenance

### 17.1 Data Policy Manifest

```json
{
  "data_policy": {
    "stores_principal_data": false,
    "retention_days": 0,
    "shares_with_third_parties": false,
    "third_parties": [],
    "training_on_principal_data": "never",
    "deletion_endpoint": "/oap/data/delete",
    "export_endpoint": "/oap/data/export",
    "lawful_bases": ["contract"],
    "special_categories_handled": [],
    "international_transfers": [],
    "subprocessors_url": "https://weatherpro.example/legal/subprocessors"
  }
}
```

### 17.2 Provenance Tags

Every value emitted by a Tool MAY carry provenance tags that propagate through subsequent Actions:

```json
{
  "data": "...",
  "provenance": {
    "source_did": "did:web:clienta.example",
    "received_under": "nda:nda_2026_clientA",
    "classification": "confidential",
    "purpose_limitation": "advisory_services_only",
    "expires": "2028-12-31",
    "delete_on_event": "project_end:proj_acme_2026"
  }
}
```

Agents MUST preserve provenance tags when forwarding data and MUST refuse onward sharing that violates any tag.

### 17.3 Deletion Verification

The `data_delete` endpoint accepts a DID or principal token and MUST return a signed Deletion Receipt within the regulatory window. Failure to return a Deletion Receipt within the declared window is grounds for downgrade and may trigger automatic referral to the supervisory authority of the relevant jurisdiction.

## 18. Confidentiality and Compliance Context (CCC)

### 18.1 Purpose

The Confidentiality and Compliance Context normatively encodes the contractual, professional, regulatory, and relational obligations that constrain a Principal or a Scope. CCC is mandatory at Conformance Level L3 and above.

### 18.2 CCC Object

```json
{
  "ccc_version": "1.0",
  "scope_id": "scope_consulting_clientA",
  "active_ndas": [
    {
      "id": "nda:nda_2026_clientA",
      "counterparties": ["did:web:clienta.example"],
      "type": "mutual",
      "covered_categories": ["financials", "strategy", "personnel"],
      "valid_from": "2026-01-15",
      "valid_until": "2028-12-31",
      "jurisdiction": "DE",
      "document_hash": "sha256:..."
    }
  ],
  "non_competes": [ { "ex_employer": "did:web:formeremployer.example", "valid_until": "2026-12-31", "scope": "EU" } ],
  "non_solicits": [],
  "embargo_list": ["did:web:competitorB.example"],
  "chinese_walls": [
    { "between": ["scope_clientA", "scope_clientB"], "reason": "competing_clients" }
  ],
  "professional_codes": ["bar:de", "stb:de"],
  "fiduciary_duties": ["client_confidentiality:de:brao_43a"],
  "regulatory_classification": "attorney_client_privileged",
  "insider_lists": [],
  "sanctions_screening": "ofac_eu_un",
  "export_control_classification": null
}
```

### 18.3 Pre Action Confidentiality Gate

Before any Invocation that involves outbound data, the Agent MUST evaluate the CCC against the destination Tool DID and Action data classes. The evaluation MUST consider:

1. Is the destination on an embargo list?
2. Does an active NDA cover the data classes being shared?
3. Does sharing violate a non compete or non solicitation clause?
4. Does any active Chinese Wall isolate the data from the destination?
5. Does any professional code restrict disclosure to the destination?
6. Does the destination appear on any sanctions list?
7. Does the export classification permit transfer to the destination jurisdiction?

The result of the evaluation MUST be one of `allow`, `allow_with_conditions`, `require_consent`, `require_anonymization`, `block`. The decision and its grounds MUST be recorded in the Decision Record.

### 18.4 Privileged Mode

Scopes flagged as `attorney_client_privileged`, `medical_confidentiality`, `journalist_source_protection`, `confessional_seal`, or other recognized privileges activate Privileged Mode. In Privileged Mode the following constraints apply:

1. Receipts MUST be stored locally only and anchored only as opaque commitments in any external Transparency Log.
2. AI providers in the Action chain MUST be on the community-maintained Privileged Provider List.
3. Cross border data transfer is blocked unless an explicit privilege preserving cross border instrument is in place.
4. Subprocessor disclosure is mandatory.
5. Loss of privilege through participant misconfiguration MUST trigger an immediate user notification.

### 18.5 Information Provenance Cascade

When a Scope or NDA is terminated, the Agent MUST initiate a Provenance Cascade: every Tool that received data tagged with the terminating identifier MUST be invoked at the `data_delete` endpoint, and the resulting Deletion Receipts MUST be aggregated into a Cascade Report stored in the principal Audit Log.

## 19. Receipts, Hash Chains, and the Transparency Log

### 19.1 Receipt Object

Every Invocation, Subscription event, Settlement, Consent grant, and Deletion produces a Receipt. The Receipt object is canonically:

```json
{
  "receipt_id": "urn:oap:receipt:01J9V8...",
  "type": "invocation",
  "timestamp": "2026-05-02T10:00:00.215Z",
  "principal_did": "did:plc:abc123",
  "agent_did": "did:assistnet:agent_xyz",
  "tool_did": "did:web:weatherpro.example",
  "action_id": "get_forecast",
  "action_version": "2.4.1",
  "input_hash": "sha256:...",
  "output_hash": "sha256:...",
  "model_version": "ecmwf-aifs-1.2",
  "cost": { "amount": "0.001", "currency": "EUR" },
  "policy_decisions": [ { "id": "pol_3a7b...", "outcome": "allow", "rules": ["ccc.nda.coverage", "ccc.embargo.clear"] } ],
  "provenance_tags_in": ["nda:nda_2026_clientA"],
  "provenance_tags_out": ["nda:nda_2026_clientA"],
  "previous_receipt_hash": "sha256:...",
  "signatures": [
    { "by": "did:assistnet:agent_xyz", "alg": "EdDSA", "value": "..." },
    { "by": "did:web:weatherpro.example", "alg": "EdDSA", "value": "..." }
  ]
}
```

### 19.2 Hash Chain

Every Principal maintains an append only chain of Receipts. Each Receipt cites the SHA 256 hash of the immediately preceding Receipt. Loss or alteration of any Receipt breaks the chain and is detectable by any verifier.

### 19.3 Transparency Log Anchoring

Receipt hashes SHOULD be anchored to at least two community-operated Transparency Logs that follow the Sigstore Rekor model. Anchors MAY additionally be committed as periodic Merkle roots to public blockchains for additional censorship resistance. Privileged Mode Receipts are anchored only as commitments that do not reveal participants or contents.

## 20. Policy Engine and Decision Records

### 20.1 Layered Policy Model

OAP defines four mandatory policy layers evaluated in order. The first layer that returns a deny outcome terminates evaluation.

| Layer | Source | Examples |
|-------|--------|----------|
| L1 Platform | community maintained block list and universal prohibitions. | No assistance with weapons of mass destruction, no autonomous selection or engagement of human targets without meaningful human control, no sexual content involving minors, no real time mass biometric surveillance. |
| L2 Legal and Jurisdictional | Statutes, regulations, and case law applicable to the Principal and the Tool. | EU AI Act, GDPR, HIPAA, MiCA, OFAC sanctions, export controls. |
| L3 Organization or Profession | Industry codes and organizational rules. | Bar association conduct, medical confidentiality, antitrust safeguards. |
| L4 Personal | Principal preferences and Scope policies. | Spending limits, embargo lists, never share specific fields. |

### 20.2 Universal Prohibitions

The L1 list is normative and not subject to local override. It includes: facilitation of child sexual abuse material, real time mass biometric identification in public spaces, social scoring of natural persons, manipulation of vulnerable groups, weapons of mass destruction, the autonomous selection or engagement of human targets in the kinetic domain (Lethal Autonomous Weapon Systems) without verified meaningful human control in the sense of Article 36 of the UN Convention on Certain Conventional Weapons, and any conduct prohibited by Article 5 of the EU AI Act. The doctrine of meaningful human control over the use of force is articulated in the open letters of 2015 and 2017 organized by Walsh and others, and in Principle 18 (AI Arms Race) of the Asilomar AI Principles (Future of Life Institute, 2017). Any Action whose execution would constitute selection or engagement of a human target by an autonomous system MUST be routed through the Escalation Action of RFC 0018 §4 before execution; the human decision is recorded in the Decision Record and the action is not executable on the basis of agent inference alone.

### 20.3 Policy Sources

L2 policies are maintained by the OAP Compliance Working Group with input from accredited national correspondents. Implementations MUST track and apply updates within thirty days of publication.

### 20.4 Decision Record

Every policy evaluation produces a Decision Record:

```json
{
  "decision_id": "pol_3a7b...",
  "evaluated_at": "2026-05-02T10:00:00.100Z",
  "layers_evaluated": ["L1", "L2", "L3", "L4"],
  "applied_rules": ["l1.universal.no_csam", "l2.eu.ai_act.high_risk_oversight", "l4.principal.spending_cap"],
  "outcome": "allow_with_conditions",
  "conditions": ["require_human_review"],
  "explanation": "Action is high risk per EU AI Act. Human oversight required by Principal policy.",
  "explanation_for_principal": "Diese Aktion benoetigt Ihre Bestaetigung, weil sie als hochriskant eingestuft ist."
}
```

The `explanation_for_principal` field satisfies the EU AI Act right to explanation in the Principal preferred locale.

### 20.5 Multi Party Review

Actions classified as high risk, irreversible, or above a Principal defined monetary threshold MUST be evaluated by an independent Verifier Agent operated by a different vendor before execution. The Verifier Agent decision is recorded in the Decision Record. Disagreement between Acting Agent and Verifier Agent escalates to the Principal.

## 21. Outcome Verification and Reproducibility

### 21.1 Output Attestations

Tools MAY include in any response an `attestations` array with cryptographically verifiable evidence that a claimed effect occurred. Examples include DKIM signatures for outbound email, payment processor receipts for transfers, and on chain transaction identifiers for blockchain operations.

### 21.2 Sample Verification

The community operates (as open-source services anyone may run) a Sampling Service that submits standardized inputs to a random subset of Tools and verifies outputs against expected ranges. Material deviation triggers escalation through the Trust Service.

### 21.3 Reproducibility Score

Tools backed by stochastic models MUST publish a Reproducibility Score computed by community-operated services (RFC 0019, RFC 0026) on a rolling thirty day window. Principals MAY opt to pin a specific `model_version` to ensure stable behavior.

### 21.4 Counter Verification

Agents MAY invoke the same Action through a second independent Tool of the same category for cross verification. Counter verification results contribute to the Tool Trust Score.

## 22. Revocation and Incident Response

### 22.1 Revocation Service

The community operates (as open-source services anyone may run) a Revocation Service modeled on OCSP and Certificate Transparency. Every Agent and Tool MUST consult the Revocation Service before acting on any DID or VC older than the cache validity period stated by the issuer.

### 22.2 Incident Reports

Tools MUST publish material incidents at the `incident` endpoint within the time window declared in the SLA, and in any case within seventy two hours for Tools above ten thousand monthly active Principals. Incident reports MUST include scope, root cause, mitigation, affected Principals, and notification timeline.

### 22.3 Emergency Kill Switch

Every Principal MUST be able to invoke a Kill Switch through the Wallet or OAP Registry repository (RFC 0026) that immediately revokes all active Subscription Tokens, all OAuth grants, all Trust Tokens, and all Webhook subscriptions associated with the Principal. Kill Switch invocation is recorded as a Receipt.

### 22.4 Time Locks

Actions exceeding Principal defined thresholds MAY be subject to a Time Lock. The Action is recorded but execution is delayed by a configurable interval during which the Principal may cancel without cost.

## 23. Insurance, Liability, and Dispute Resolution

### 23.1 Liability Allocation

Default liability allocation:

1. Tool publisher is liable for breaches of declared Manifest commitments.
2. Agent operator is liable for selection of Tools inconsistent with applicable policy.
3. Principal is liable for instructions issued to the Agent within policy.
4. The OAP community is not a party to commercial transactions.

### 23.2 Insurance Tag

Tools above Conformance Level L3 SHOULD declare:

```json
{
  "insurance": {
    "carrier_did": "did:web:carrier.example",
    "policy_id": "POL-2026-1234",
    "coverage_eur": "5000000",
    "covered_perils": ["data_loss", "unavailability", "miscalculation"],
    "valid_until": "2027-12-31",
    "credential": "vc:OAPInsuranceCoverage:..."
  }
}
```

### 23.3 Insurance Pool

The OAP community MAY operate an opt in mutual Insurance Pool funded by a portion of Wallet transaction fees. The Pool indemnifies Principals against losses caused by conformant Tools that exhaust their primary coverage.

### 23.4 Refund Endpoint

Tools MUST expose a `billing/refund` operation that accepts disputes referencing one or more Receipts. The Tool MUST acknowledge within seventy two hours and resolve within thirty days or escalate to the Community Dispute Resolution Process (RFC 0014).

### 23.5 Dispute Resolution

The community operates (as open-source services anyone may run) a tiered Dispute Resolution Service:

1. **Negotiation.** Parties exchange positions through a structured channel.
2. **Mediation.** community appointed mediator, non binding.
3. **Arbitration.** community appointed arbitral tribunal applying the OAP Community Arbitration Rules (RFC 0014) and the substantive law of the Tool jurisdiction.
4. **Court referral.** Either party retains the right to seek judicial relief in any competent court. Arbitration awards are enforceable under the New York Convention where applicable.

## 24. Internationalization and Jurisdictional Routing

### 24.1 Locale and Currency

Every Invocation declares `locale` and `currency`. Tools MUST honor declared locale for any human readable field in the response and MUST quote prices in the declared currency or, if unsupported, return a structured error indicating supported currencies.

### 24.2 Jurisdictional Routing

Marketplaces MUST route discovery results to favor Tools whose declared `jurisdictions` include the Principal jurisdiction, subject to Principal preferences and applicable law. A Tool MAY refuse a Principal whose jurisdiction is not on its supported list, returning HTTP 451 Unavailable For Legal Reasons.

### 24.3 Adequacy and Transfer Instruments

Cross border transfers of personal data MUST cite a lawful transfer mechanism: an adequacy decision, standard contractual clauses, binding corporate rules, or an applicable derogation. The cited mechanism MUST appear in the Receipt.

## 25. Accessibility

### 25.1 Output Accessibility

Outputs intended for human consumption MUST be representable in plain text and MUST include alternative text for images, transcripts for audio, and captions for video. Tools SHOULD support output adaptation through a `accessibility_profile` parameter that requests simplified language, increased contrast metadata, or extended descriptions.

### 25.2 Interaction Accessibility

Consent and dispute interfaces operated by Tools, Marketplaces, and the OAP community MUST conform to WCAG 2.2 Level AA. Agents acting on behalf of users with declared accessibility needs MUST prefer Tools that publish stronger accessibility commitments.

## 26. Carbon and Energy Accounting

Tools MAY include in each Receipt:

```json
{
  "energy": {
    "compute_kwh": "0.0000123",
    "carbon_g_co2e": "0.0049",
    "method": "ghg_protocol_scope2_market_based",
    "region": "eu-west-1"
  }
}
```

Marketplaces SHOULD surface aggregated energy and carbon intensity per Tool and per Action, enabling Principals and Agents to prefer lower impact options.

## 27. Versioning and Backward Compatibility

### 27.1 Specification Versioning

OAP follows Semantic Versioning at the specification level. Major versions may introduce breaking changes. Minor versions are additive. Patch versions clarify without changing behavior.

### 27.2 Manifest and Action Versioning

Manifest and Action versions follow Semantic Versioning independently. Tools MUST support the previous minor version of any Action for at least one hundred eighty days after publishing a new minor version. Breaking changes MUST be released under a new Action `id`.

### 27.3 Deprecation

Deprecated Actions and Manifest fields MUST be flagged with `deprecated: true` and a `sunset` ISO 8601 timestamp at least one hundred eighty days in the future for L2 and above Tools.

## 28. Security Considerations

### 28.1 Transport Security

TLS 1.3 or later is mandatory. Cipher suites are enumerated in Appendix C.

### 28.2 Prompt Injection

Tools MUST NOT emit free form text that mimics control instructions. Agent runtimes MUST treat Tool outputs as untrusted data, MUST sanitize for known control sequences, and MUST NOT concatenate Tool outputs into system or developer message slots.

### 28.3 Replay Protection

Every signed message includes a nonce and a timestamp. Verifiers MUST reject messages outside a five minute window from the verifier clock and MUST reject reuse of a nonce within a ten minute window.

### 28.4 Idempotency

Idempotent Actions MUST honor the `OAP-Idempotency-Key` header for the declared window. Non idempotent Actions MUST fail closed and MUST NOT silently retry.

### 28.5 Key Compromise

A participant that suspects key compromise MUST immediately publish a revocation entry and rotate keys. All Receipts signed by the compromised key after the suspected compromise time are flagged for review by the OAP Trust Service (an open-source service that any community member may operate).

### 28.6 Sybil Resistance

Reputation contributions are weighted by: verified DID assurance level, account age, breadth and recency of unique counterparties, dispute history, and behavioral signals processed by an independently audited model whose feature set is documented in the OAP Trust Service open-source repository.

### 28.7 Canary Tokens

The OAP community periodically distributes Canary Tokens disguised as ordinary Principal data. Detection of a Canary Token outside its declared scope is treated as conclusive evidence of Manifest non conformance and triggers immediate listing suspension pending investigation.

### 28.8 Supply Chain

Reference implementations MUST publish Software Bill of Materials in CycloneDX or SPDX format and MUST sign release artifacts using Sigstore. Reproducible builds are RECOMMENDED.

## 29. Privacy Considerations

### 29.1 Data Minimization

Every Invocation MUST request only data necessary for the declared Action. Tools MUST reject Invocations whose `input` exceeds the declared `input_schema`.

### 29.2 Purpose Limitation

Provenance tags carry purpose limitation. Use of data outside its declared purpose constitutes a Manifest violation regardless of contractual silence.

### 29.3 Special Categories

Special category data within the meaning of GDPR Article 9 MUST be tagged in the input and is subject to L2 Policy enforcement. Tools that do not declare handling capability for the relevant category MUST refuse the Invocation.

### 29.4 Pseudonymization

Wherever an Action does not require a directly identifying value, the Agent SHOULD substitute a pseudonymous identifier and resolve it locally.

### 29.5 Zero Knowledge Options

Tools MAY accept zero knowledge proofs in lieu of plaintext credentials where the cryptographic capability exists. Acceptance is declared per Action.

## 30. Regulatory Conformance Mapping

The following is normative guidance for implementations. Each row identifies how OAP enables conformance with the cited regulation. It is not a substitute for legal counsel in any jurisdiction.

| Regulation | OAP Mechanism |
|------------|---------------|
| EU AI Act | Manifest `risk_class` is mandatory. High risk Tools require human oversight and Multi Party Review. Right to explanation satisfied by Decision Record. |
| GDPR | `data_policy` is mandatory. `data_delete` and `data_export` endpoints are mandatory. Provenance tags carry purpose limitation. Cross border transfers cite lawful instrument. |
| Digital Services Act | Marketplaces publish quarterly Transparency Reports. Notice and action procedures route through the Community Dispute Resolution Process (RFC 0014). |
| Digital Markets Act | Identity, Reputation, Subscriptions, and Wallet are portable. No Marketplace may foreclose interoperable participation. |
| NIS2 | Tools above ten thousand monthly active Principals publish incidents within seventy two hours through the `incident` endpoint. |
| MiCA | OAP Wallet operators are regulated electronic money institutions or operate through licensed partners. Crypto denominated balances follow MiCA disclosures. |
| HIPAA | Privileged Mode for medical confidentiality. Business Associate Agreement template published in the OAP Registry. PHI tagged through provenance. |
| SOC 2 and ISO 27001 | Mandatory at Conformance Level L5. Audit credentials issued as VCs. |
| OFAC and EU Sanctions | Pre Action Confidentiality Gate consults sanctions lists declared in CCC. |
| Export Controls (EU Dual Use, US ITAR and EAR) | Export classification carried in CCC. Transfers blocked when classification incompatible with destination jurisdiction. |
| EU Trade Secrets Directive and US DTSA | Provenance tags `trade_secret` propagate and prevent inadvertent disclosure. |
| eIDAS 2.0 and EUDI Wallet | OAP Wallet interoperable with EUDI Wallet for identity attestations. |

## 31. Conformance Levels

Implementations declare a Conformance Level through a Conformance Receipt that is generated by the open-source OAP test suite, signed by the implementation's DID key, and (for L4 and L5) peer-witnessed and anchored in the OAP Registry per RFC 0019 and RFC 0026. There is no central issuing authority. Levels are cumulative.

| Level | Designation | Requirements | Witnessing |
|-------|-------------|--------------|------------|
| L0 | Compatible | Implements MCP or A2A and publishes a minimal OAP Manifest mapping. | Self-attested. |
| L1 | Discoverable | Full Manifest, categories, examples, machine validated by the OAP test suite. | Self-signed Conformance Receipt. |
| L2 | Billable | Pricing, Auth, Subscription, Wallet integration, refund endpoint. | Self-signed Conformance Receipt. |
| L3 | Trusted | Audit Log, Data Policy, CCC, Verified Publisher, Multi Party Review for high risk Actions. | Self-signed Conformance Receipt plus DNS or DID-based publisher verification. |
| L4 | Collaborative | Multi Agent Coordination, Conflict Resolution, Change Broadcast, Coordination Sessions. | Self-signed plus at least one independent peer-witness signature anchored in the OAP Registry. |
| L5 | Peer-Certified | All L4 requirements plus an independent third-party security audit (SOC 2 Type II, ISO 27001, or an equivalent attestation published in machine-readable form). | Self-signed plus at least three independent peer-witness signatures from implementations that themselves hold a valid L4 or L5 Conformance Receipt, anchored in the OAP Registry transparency log. |

Non-Commercial implementations (BYOK platforms that do not collect revenue from their users) MAY claim the Non-Commercial Profile defined in RFC 0025: `L1-NC` and `L3-NC` correspond to L1 and L3 with the Wallet, Subscription, and refund requirements waived. Non-Commercial Receipts are produced by the same test suite under the `--profile non-commercial` flag.

Marketplaces MUST display the Conformance Level of every listed Tool with equal prominence to its name and MUST link to the underlying Conformance Receipt in the OAP Registry.

## 32. Community Governance

### 32.1 Nature of the OAP Community

The Open Agent Protocol is a community-driven specification. There is no foundation, association, corporation, or other legal entity that owns, controls, or speaks for OAP. There are no membership dues, no licensing fees, and no revenue extracted by any entity from the operation of the protocol. The protocol is maintained by an open community of contributors through the public RFC process and through CI-enforced quality gates in the open-source repositories under the `openagentprotocol-OAP` GitHub organization.

Where this specification refers to community services, those services are open-source software that any community member may deploy. Where it refers to peer review, that review happens in public on GitHub Discussions and pull requests. Where it refers to verification, that verification is performed mechanically by the open-source test suite and by independent peer witnesses (RFC 0019).

### 32.2 Community-Maintained Services

The following services are defined by this specification and are operated as open-source software. Anyone may run an instance. Multiple competing instances are encouraged. None confer monopoly status on any operator.

1. Specification text and the public RFC process (in `openagentprotocol-OAP/oap-spec`).
2. The OAP Registry, an append-only Git repository that anchors Conformance Receipts and revocations (RFC 0026, in `openagentprotocol-OAP/oap-registry`).
3. DID Resolver libraries (open-source, run client-side or self-hosted).
4. The OAP Test Suite that mechanically produces Conformance Receipts (in `openagentprotocol-OAP/oap-spec/test-suite`).
5. Reference Agent, Reference Server, Reference Marketplace, Reference Wallet, Reference Validator (in `openagentprotocol-OAP/oap-spec/reference`).
6. Trust Score computation reference implementation. Marketplaces that display Trust Scores MUST publish their formula; the reference formula is the canonical fallback.
7. Sampling and Outcome Verification reference probes.
8. Compliance and Accessibility Working Groups, which exist as GitHub Discussion categories with rotating community Coordinators.
9. WCAG and L2 policy mapping documents, maintained as files in `oap-spec/governance/policy-mappings`.

### 32.3 Working Groups and Coordinators

Working Groups are GitHub Discussion categories. Any community member may participate. Each Working Group has a Coordinator who is self-nominated through the public process described in `governance/WORKING-GROUPS.md`. Coordinator terms are fixed in length and rotate. Coordinators have no veto power; their role is to triage, facilitate consensus, and shepherd RFCs through the process. Decisions are taken by rough consensus on RFCs and confirmed by a Peer Review Quorum (at least three Maintainers from at least three distinct organizations).

### 32.4 Dispute Resolution

This specification does not establish a court, tribunal, or central arbiter. Disputes that cannot be resolved bilaterally between participants are routed through the procedure in RFC 0014 (community-elected arbitrators agreed by both parties, decisions published in the OAP Registry). Implementations may also incorporate the dispute resolution mechanisms of any jurisdiction whose law they declare in their Manifest.

### 32.5 Funding

The community has no treasury. Individual contributors may seek grants, sponsorship, or funding through their own employers, GitHub Sponsors, or public research grants. No fee, tax, or royalty is imposed on traffic, settlements, or activity that uses OAP. Implementations that operate Wallets, Marketplaces, or paid services keep all revenue from those services.

### 32.6 Anti Capture Provisions

1. No entity, foundation, or association may be chartered to own, license, or control the OAP specification, the `openagentprotocol-OAP` GitHub organization, or any reference implementation.
2. The Marketplace ranking algorithm of any conformant Marketplace MUST be open source.
3. The OAP Registry is append-only and mirrored. Any community member may operate a mirror; the canonical history is reconstructible from any mirror.
4. Conformance Receipts have a maximum validity of ninety days and MUST be re-issued through the public test suite. Revocations are likewise published in the OAP Registry.
5. Multiple competing Marketplaces, Wallets, Trust Services, and Verifiers are presumed and encouraged. No service in this specification grants its operator monopoly status.

## 33. References

### 33.1 Normative References

* RFC 2119, RFC 8174. Key words for use in RFCs.
* RFC 9421. HTTP Message Signatures.
* RFC 8949. Concise Binary Object Representation (CBOR).
* W3C Decentralized Identifiers (DIDs) v1.0.
* W3C Verifiable Credentials Data Model v2.0.
* JSON Schema 2020-12.
* ISO 4217 Currency codes.
* ISO 3166 Country codes.
* ISO 8601 Date and time format.
* W3C Trace Context.
* OpenID Connect Core 1.0 and OAuth 2.1.
* Sigstore Rekor specification.
* CycloneDX 1.5 and SPDX 2.3.

### 33.2 Informative References

* Model Context Protocol specification, Anthropic, 2024.
* Agent2Agent Protocol specification, Google, 2025.
* EU Regulation 2024/1689 (AI Act).
* EU Regulation 2016/679 (GDPR).
* EU Regulation 2022/2065 (DSA).
* EU Regulation 2022/1925 (DMA).
* EU Directive 2022/2555 (NIS2).
* EU Regulation 2023/1114 (MiCA).
* United States Health Insurance Portability and Accountability Act.
* Kantara Initiative Consent Receipt Specification.

## 34. Appendix A: Normative JSON Schemas

The following JSON Schema 2020-12 documents are normative and published in the canonical repository under `schemas/v1.0/`:

1. `oap-manifest.schema.json`
2. `oap-action.schema.json`
3. `oap-request-envelope.schema.json`
4. `oap-response-envelope.schema.json`
5. `oap-receipt.schema.json`
6. `oap-decision-record.schema.json`
7. `oap-ccc.schema.json`
8. `oap-subscription.schema.json`
9. `oap-wallet-statement.schema.json`
10. `oap-incident.schema.json`
11. `oap-deletion-receipt.schema.json`
12. `oap-attestation.schema.json`

Schemas are versioned independently and follow the conformance rules in Section 27.

## 35. Appendix B: HTTP Status and Error Codes

| HTTP Status | OAP Error Code | Meaning |
|-------------|----------------|---------|
| 200 | none | Success. |
| 202 | none | Asynchronous task accepted. |
| 400 | `invalid_input` | Input failed schema validation. |
| 401 | `auth_required` | No credential or invalid credential. |
| 402 | `subscription_required` | Payment or active subscription required. |
| 403 | `policy_block` | Policy Engine denied the Invocation. |
| 404 | `not_found` | Action or resource not found. |
| 409 | `conflict` | Concurrency or version conflict. |
| 410 | `deprecated` | Action sunset reached. |
| 412 | `precondition_failed` | CCC precondition not satisfied. |
| 422 | `output_unverifiable` | Tool cannot produce a verifiable output. |
| 429 | `rate_limited` | Rate limit exceeded. |
| 451 | `legal_unavailable` | Tool cannot serve the requested jurisdiction. |
| 500 | `internal_error` | Tool internal failure. |
| 502 | `upstream_error` | Failure in a Tool dependency. |
| 503 | `maintenance` | Tool in declared maintenance window. |
| 504 | `timeout` | Action exceeded `max_call_duration_ms`. |

## 36. Appendix C: Cryptographic Suites

| Use | Required | Recommended |
|-----|----------|-------------|
| Transport | TLS 1.3 with `TLS_AES_256_GCM_SHA384` or `TLS_CHACHA20_POLY1305_SHA256` | Hybrid post quantum key exchange via X25519Kyber768. |
| Signature | EdDSA (Ed25519) | ECDSA P 256 for FIPS profiles. Post quantum: ML DSA when standardized. |
| Hash | SHA 256 | SHA 3 family permitted. |
| Symmetric | AES 256 GCM | ChaCha20 Poly1305. |
| Key Agreement | X25519 | Hybrid post quantum as above. |

Implementations SHOULD adopt post quantum suites within twenty four months of NIST final standardization.

## 37. Appendix D: IANA and Registry Considerations

This specification requests the following registrations:

1. URI scheme prefix `urn:oap:` for identifiers used throughout the protocol.
2. Media types `application/oap+json` and `application/oap+cbor`.
3. Well known URI suffix `oap-tool` for Tool Manifests.
4. Well known URI suffix `oap-agent` for Agent Manifests.
5. HTTP header registrations for `OAP-Version`, `OAP-Request-Id`, `OAP-Signature`, `OAP-Idempotency-Key`, and `OAP-Trace`.
6. JWT claim registrations for `oap_principal`, `oap_agent`, `oap_scope`, `oap_subscription`, `oap_consent`.

The community operates (as open-source services anyone may run) the OAP Registry for non IANA identifiers including category taxonomies, professional codes, jurisdictional codes beyond ISO 3166, and approved verifiable credential issuers.

## 38. Appendix E: Migration from MCP and A2A

### 38.1 MCP Compatibility

A conformant L0 Tool MAY publish both an MCP descriptor and an OAP Manifest. The OAP community publishes a normative mapping that translates MCP `tool` and `resource` definitions to OAP Actions. The OAP Reference Adapter exposes an MCP server and Client interface that transparently routes through OAP.

### 38.2 A2A Compatibility

Agent Cards published under A2A MAY be augmented with an OAP profile referenced from the Card. The OAP Reference A2A Bridge translates A2A Tasks to OAP Coordination Sessions and vice versa. Trust Tokens issued under OAP are accepted by A2A endpoints that import the OAP root of trust.

### 38.3 OpenAI Function Calling

Function definitions for legacy function calling interfaces may be derived from OAP Action Schemas through the published transformation. Inverse transformation is provided on a best effort basis given the coarser semantics of legacy interfaces.

## Acknowledgments

This specification consolidates work and conversations across the agent platforms community. The OAP community thank the contributors who shaped the precursors to OAP including the Model Context Protocol working group, the Agent2Agent contributors, the W3C Decentralized Identifier and Verifiable Credential working groups, the Sigstore community, and the Kantara Initiative.

## Document History

| Version | Date | Notes |
|---------|------|-------|
| 1.0 PWD | 2026-05-02 | Initial Public Working Draft. |
