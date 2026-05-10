# RFC 0022: Manifest Subscription Protocol

**Status:** Draft
**Author(s):** T. Fengler (Editor)
**Working Group:** Data Plane
**Created:** 2026-05-03
**Working Group:** Data Plane
**Targets:** 1.2

## 1. Summary

This document specifies the Manifest Subscription Protocol, a push based delivery mechanism by which a consuming Agent receives notifications of changes to a set of Manifests rather than polling each Provider individually. The protocol replaces the polling pattern that the contemporary internet inherits from RSS, webhook fan out, and ad hoc REST endpoints with a uniform append only feed whose events are signed by the publishing Provider, indexed against a Verifiable Index under RFC 0021, accompanied by per event Receipts under the accountability layer of OAP, and subject to backpressure under a declared flow control regime. The protocol is the canonical change distribution mechanism for the Agent Web and is the foundation on which inventory updates, price changes, capability additions, conformance recertifications, and Match Broker rerankings are propagated to consuming Agents at machine speed.

## 2. Terminology

The key words MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, MAY, and OPTIONAL in this document are to be interpreted as described in RFC 2119 and RFC 8174.

A **Subscription** is a long lived agreement between a Subscriber and a Publisher under which the Publisher delivers events that match the Subscription's filter to the Subscriber as they occur.

A **Subscriber** is a consuming Agent that has issued a subscription Intent under RFC 0020 with category `subscription`.

A **Publisher** is a conformant Provider that exposes the subscription endpoint defined in section 3 of this document.

A **Subscription Filter** is the constraint tree of an Intent in the `subscription` category, applied to candidate events rather than to candidate Manifests at issuance time.

A **Manifest Event** is a structured record describing a change to one Manifest, including the type of change, the identifier of the Manifest, the cryptographic hash of the Manifest before the change, the cryptographic hash of the Manifest after the change, the signature of the Publisher, and the Inclusion Proof against the Publisher's Verifiable Index.

A **Backpressure Signal** is the structured indication by which a Subscriber communicates to a Publisher that its delivery rate exceeds the Subscriber's processing capacity.

## 3. Specification

### 3.1 Subscription Establishment

A Subscriber establishes a Subscription by issuing an Intent in the `subscription` category to a Publisher's `oap/subscribe` endpoint. The Intent declares the Subscription Filter, the requested Projection over event payloads, the maximum acceptable event rate, the validity window of the Subscription, and the budget under which the Subscription is funded if the Publisher's commerce model requires payment for the feed. The Publisher responds with a `SubscriptionAck` that contains the Subscription identifier, the chosen transport, the negotiated event rate cap, and the cursor at which delivery will begin. Both the Intent and the SubscriptionAck are signed by their respective parties.

The defined transports are server sent events over HTTPS, WebSocket over HTTPS, and Webhook with HMAC signed payloads. A Publisher MAY support all three and MAY support additional transports declared in its Manifest. A Publisher MUST support at least one of the three.

### 3.2 Manifest Event Format

A Manifest Event is a JSON document conforming to `oap-manifest-event.schema.json`. The document includes the `event_id` minted by the Publisher, the `subscription_id` to which the event is delivered, the `cursor` value monotonically increasing within the Subscription, the `event_type` drawn from `created`, `updated`, `withdrawn`, `recertified`, and `superseded`, the `manifest_id` identifying the affected Manifest, the `manifest_hash_before` and `manifest_hash_after` fields recording the change, the `payload` containing the Projected fields of the Manifest under the Subscription's Projection, the `inclusion_proof` linking the new Manifest hash to the Publisher's Verifiable Index root, the `event_receipt` linking the event into the Publisher's Receipt chain under the accountability layer, and the `signature` over the canonicalized event body.

A Subscriber that receives an event whose Inclusion Proof does not validate has received a non conformant event and SHOULD discard it, SHOULD report the failure through the dispute mechanism of RFC 0009, and MAY withdraw from the Subscription.

### 3.3 Cursors and Replay

Each event carries a monotonically increasing cursor scoped to the Subscription. A Subscriber that disconnects MAY reconnect with the last received cursor as a parameter to the Subscription resumption call. The Publisher MUST deliver every event from that cursor forward, in order, with no gaps and no duplicates. The Publisher MAY deliver events from before that cursor at the Subscriber's request through the `replay_from` parameter, subject to the Publisher's declared retention window. A Publisher MUST retain Manifest Events for at least seven days after their delivery and SHOULD retain them for at least thirty days. Retention longer than thirty days is OPTIONAL and MAY be priced separately.

### 3.4 Backpressure

A Subscriber that cannot keep pace with delivery MUST signal backpressure rather than silently dropping events. The signal takes one of three forms. The first form is the application level `BackpressureRequest` document submitted to the Subscription's control endpoint, which asks the Publisher to reduce the event rate to a stated value. The second form is the transport level mechanism native to the chosen transport, namely the WebSocket close with code 1009 or the HTTP 429 response on a Webhook delivery attempt. The third form is the explicit Subscription pause, which suspends delivery until the Subscriber resumes.

A Publisher that ignores Backpressure Signals is non conformant. A Publisher MAY drop a Subscription whose Subscriber is persistently unable to keep pace, in which case the Publisher MUST notify the Subscriber and MUST refund the proportional unused budget.

### 3.5 Per Event Receipts

Each Manifest Event is itself an event in the Publisher's Receipt chain under the accountability layer. The `event_receipt` field of the event document carries the receipt identifier and the chain hash. A Subscriber that aggregates events from multiple Publishers can therefore verify the position of each event in its Publisher's chain, and a regulator that inspects a Publisher's chain can identify the events that were delivered through Subscriptions independently of the Subscriptions themselves.

### 3.6 Withdrawal

A Subscription is withdrawn by either party. A Subscriber that withdraws SHALL submit a signed `WithdrawSubscription` document to the Subscription's control endpoint. A Publisher that withdraws SHALL submit a signed notification to the Subscriber's documented withdrawal channel and MUST refund the proportional unused budget. Withdrawal MUST produce a Withdrawal Receipt that becomes part of both parties' chains.

## 4. Wire Format Examples

### 4.1 Establishing a Subscription

A Subscriber issues the following Intent to the Publisher's subscription endpoint.

```json
{
  "intent_id": "intent_01H...",
  "issuer_did": "did:web:agent.example",
  "category": "subscription",
  "constraints": {
    "all_of": [
      { "path": "/category", "operator": "eq", "value": "running_shoes" },
      { "path": "/inventory/available", "operator": "gt", "value": 0 },
      { "path": "/price/amount", "operator": "lte", "value": "100.00" }
    ]
  },
  "projection": {
    "include": ["/manifest_id", "/price", "/inventory", "/seller_did"],
    "exclude": ["/internal_metadata"]
  },
  "budget": { "amount": "0.50", "currency": "EUR", "allocation": "single_winner" },
  "validity": { "from": "2026-05-03T00:00:00Z", "to": "2026-08-03T00:00:00Z" },
  "max_event_rate_per_minute": 60,
  "signature": "..."
}
```

### 4.2 Receiving a Manifest Event

The Publisher delivers the following event over the negotiated transport.

```json
{
  "event_id": "event_01H...",
  "subscription_id": "sub_01H...",
  "cursor": 1842,
  "event_type": "updated",
  "manifest_id": "manifest:running_shoe_xyz",
  "manifest_hash_before": "sha256:abc...",
  "manifest_hash_after":  "sha256:def...",
  "payload": {
    "manifest_id": "manifest:running_shoe_xyz",
    "price": { "amount": "79.99", "currency": "EUR" },
    "inventory": { "available": 14 },
    "seller_did": "did:web:shop.example"
  },
  "inclusion_proof": { "root": "sha256:root...", "path": ["...", "..."] },
  "event_receipt": { "receipt_id": "rcp_01H...", "chain_hash": "sha256:..." },
  "signature": "..."
}
```

## 5. Schema Integration

This RFC introduces two new schemas, namely `oap-manifest-event.schema.json` and `oap-subscription-ack.schema.json`. The Manifest schema of OAP-CORE-1.0 is extended with the optional `subscription_endpoint` field that declares the Subscription endpoint of the Publisher. The Intent schema of RFC 0020 already supports the `subscription` category through which Subscriptions are established. All additions are additive under the Backward Compatibility Gate of RFC 0019.

## 6. Conformance Impact

A Publisher claiming conformance at level S1 MUST accept Subscriptions in at least the server sent events transport, MUST emit valid Manifest Events with Inclusion Proofs and per event Receipts, and MUST honor Backpressure Signals. A Publisher claiming conformance at level S2 MUST additionally support cursor based replay over the declared retention window. A Publisher claiming conformance at level S3 MUST additionally support all three normative transports and MUST satisfy the event delivery latency floor declared in the Subscription conformance profile of the test suite.

## 7. Backward Compatibility

This RFC adds new schemas, new optional Manifest fields, and a new endpoint. Existing Providers continue to function without exposing a Subscription endpoint, in which case consuming Agents that require change notifications fall back to polling under the existing OAP semantics. No existing field of any normative schema is altered.

## 8. Security Considerations

A malicious Publisher could attempt to deliver fabricated events that do not correspond to any actual Manifest change. The defense is the Inclusion Proof requirement of section 3.2, which links every event to the Publisher's Verifiable Index. A Subscriber that validates Inclusion Proofs detects fabrication immediately. A Publisher that delivers events without valid Inclusion Proofs has produced non conformant output and is subject to Performance Record slashing under RFC 0009.

A malicious Subscriber could attempt to exhaust a Publisher's resources through a flood of low budget Subscriptions with broad filters. The defense is the budget requirement on Subscriptions and the Publisher's right to refuse Subscriptions whose budget does not cover the expected event volume. The Publisher's pricing for Subscription feeds is declared in its Manifest under the commerce model of RFC 0013.

A man in the middle adversary could attempt to tamper with events in flight. The defense is the per event signature, which the Subscriber MUST verify before processing. Transport level confidentiality is provided by TLS as required for all OAP traffic.

## 9. Privacy Considerations

A Subscription Filter reveals the Subscriber's interests to the Publisher. Subscribers operating under privacy sensitive Scopes SHOULD route Subscriptions through an aggregating Match Broker that holds the underlying Filter and forwards only the events that match. The aggregation pattern is the same one that the Confidentiality and Compliance Context paper recommends for Procurement Intents. Subscribers operating under Privileged Mode as defined in OAP-CORE-1.0 section 18 MUST NOT establish Subscriptions whose Filters reveal privileged interests.

## 10. Implementation Experience

The Reference Server has been extended with a Subscription endpoint supporting the server sent events transport, cursor based replay, and a backpressure handler. The Reference Agent has been extended with a Subscriber library that exercises Inclusion Proof verification and per event Receipt validation. The AssistNet platform operates Subscriptions in production for inventory feeds, price feeds, conformance recertification feeds, and Match Broker reranking notifications.

## 11. Alternatives Considered

The RSS and Atom feed model was considered and rejected because it lacks signatures, lacks Inclusion Proofs, lacks per event Receipts, and lacks structured backpressure. The Webhook only model was considered and rejected because it places the burden of delivery semantics on every Provider individually rather than on the protocol. The pull only polling model was considered and rejected on cost and latency grounds. The chosen design provides push semantics with verifiable integrity at the cost of one new endpoint per Publisher and one new schema per event type.

## 11.bis Workflow Scoped Revocation Channels (Normative Extension)

This subsection is normative and extends section 3 of this RFC with a second class of subscription, the Workflow Scoped Revocation Channel, used by Cross Broker Workflow Coordinators (RFC 0035) to receive timely notifications when a Match Receipt that contributes to a composite workflow is withdrawn, superseded, or invalidated by its issuing broker. The mechanism reuses the wire format, the cursor and replay semantics, and the backpressure semantics of section 3 and adds three category specific behaviors.

### 11.bis.1 Channel Establishment

A Workflow Coordinator establishes a Workflow Scoped Revocation Channel by issuing a Subscription Intent in the `workflow_revocation` category to each Match Broker whose Receipt is part of the workflow. The Intent carries the additional fields `workflow_id` set to the ULID of the composite workflow under RFC 0035 and `receipt_hashes` set to the SHA-256 hashes of every Match Receipt issued by the addressed broker for that workflow. The broker responds with a `WorkflowSubscriptionAck` that confirms its willingness to push revocation events filtered to the named receipts. A broker MUST refuse the Intent if the `receipt_hashes` do not all correspond to live entries in its Verifiable Index, and the refusal SHALL itself be a signed document logged in the broker's Audit Log.

### 11.bis.2 Event Types

In addition to the event types of section 3.2, the Workflow Scoped Revocation Channel emits the following two event types.

The `revoked` event indicates that a previously valid Match Receipt has been withdrawn. The event MUST carry the `revocation_reason_code` drawn from the finite vocabulary `key_compromise`, `superseded`, `policy_violation`, `expired_attestation`, `external_authority_order`, `voluntary_withdrawal`, the `effective_at` timestamp at which the revocation takes effect, the `signed_revocation_document` containing the broker's signed justification, and the `consequence_class` drawn from `workflow_invalidating`, `workflow_warning`, `workflow_informational`. A `workflow_invalidating` event MUST be delivered to every subscribed Coordinator within sixty seconds of the broker's signing of the revocation, with the timestamp recorded in both the broker's Audit Log and the Coordinator's Workflow State.

The `superseded_in_workflow` event indicates that the broker has accepted a replacement Listing or Match Receipt that supersedes one previously contributing to the workflow. The event MUST carry the `replaces_receipt_hash` and the `replacement_receipt_hash` and MUST be accompanied by an Inclusion Proof for the replacement. A Coordinator that accepts a `superseded_in_workflow` event without verifying the replacement's Inclusion Proof against the broker's most recent Tree Head is operating below conformance.

### 11.bis.3 Delivery Latency Floor

Workflow Scoped Revocation Channels are time critical. A Publisher MUST deliver `workflow_invalidating` revocation events with a transport that supports push semantics within sixty seconds. Webhook delivery with retry MAY satisfy the floor if the broker retries with exponential backoff capped at the floor and if the broker records the delivery latency in its Audit Log for each event. A broker that fails to meet the floor in more than one percent of revocation events per quarter has lapsed conformance under this subsection.

### 11.bis.4 Coordinator Failover Acknowledgment

A Workflow Coordinator's `WorkflowSubscriptionAck` carries the optional `failover_coordinator_did` field. If present, the broker MUST mirror every revocation event for the workflow to the failover Coordinator's documented push endpoint in addition to the primary. The dual delivery ensures that the failure of the primary Coordinator does not silently delay propagation of a revocation to the workflow participants, consistent with the failover protocol of RFC 0035 section 4.3.

### 11.bis.5 Schema Integration

This subsection introduces the schema `oap-workflow-revocation-event.schema.json` and extends `oap-manifest-event.schema.json` with the workflow correlation fields `workflow_id` and `receipt_hashes` as optional additive properties. The Subscription category vocabulary is extended with `workflow_revocation` as a recognized value.

### 11.bis.6 Conformance Impact

Support for Workflow Scoped Revocation Channels is REQUIRED for any Match Broker that participates in workflows under RFC 0035, which in practice means every broker that operates at conformance level M2 or above under RFC 0021 once RFC 0035 is finalized. Support is OPTIONAL for brokers that explicitly declare in their Broker Category Profile that they participate only in single broker interactions.

### 11.bis.7 Implementation Experience

The Reference Server has been extended with a workflow revocation event emitter that fires within forty milliseconds of the signing of a revocation document under controlled benchmark conditions on a dual-region deployment. The Reference Agent has been extended with a Coordinator library that subscribes to multiple brokers in parallel and merges their event streams into a single workflow state machine. The AssistNet platform's internal Cross Broker Coordinator has run end to end tests of the channel against a simulated `key_compromise` event with median delivery latency of 1.8 seconds across three geographic regions.

## 12. References

* OAP-CORE-1.0, the normative Open Agent Protocol Core Specification.
* RFC 0009, Reputation and Performance Records.
* RFC 0013, Commerce Models for the Agent Economy.
* RFC 0019, Conformance Testing and Implementability.
* RFC 0020, Agent Query Language.
* RFC 0021, Verifiable Indexes and Match Broker Conformance.
* RFC 0023, Agent Native Storage Substrate.
* IETF RFC 8895, EventStream Encoding for HTTP.
* IETF RFC 6455, The WebSocket Protocol.
* IETF RFC 2119 and RFC 8174.
