# RFC 0035: Cross Broker Workflow Composition

**Status:** Draft
**Author(s):** T. Fengler (Editor)
**Working Group:** Marketplace and Discovery
**Created:** 2026-05-11
**Targets:** 1.2
**Supersedes:** none
**Superseded-by:** none

## 1. Summary

This document specifies the Cross Broker Workflow, the canonical structure by which a consuming Agent composes a single agent visible transaction out of Match Receipts issued by multiple Match Brokers each operating under RFC 0021 in a distinct broker category under RFC 0021 Appendix B. The mechanism defines the workflow manifest that declares which broker roles a workflow requires, the cross match receipt format that hash chains the contributing Match Receipts into a tamper evident composite, the coordinator protocol that supervises the workflow and propagates revocations from any contributing broker to all parties, the failover protocol that permits a backup coordinator to assume supervision without loss of state, and the consistency theorem that establishes the conditions under which the composite receipt is sound. The combination is the protocol's response to the observation that high stakes real world transactions, including real estate purchases, employment agreements, healthcare bookings, and procurement of regulated services, are never single broker interactions but compositions across regulatory, identity, payment, and substantive domains.

## 2. Motivation

The single broker conformance regime of RFC 0021 is sufficient for transactions that close within one broker's category. A consuming Agent that issues an Intent to a tool capability broker and receives a Match Receipt has a complete and verifiable record of the interaction. The same Agent that wishes to purchase a home faces a composition problem. The real estate broker can attest the listing and the seller's identity within its own index, but it cannot attest the buyer's financing approval (a finance broker's responsibility under the finance category), the notary's availability and credentials (a legal broker's responsibility), or the buyer's verified personhood under eIDAS (an identity issuer broker's responsibility). The transaction is sound only if all four Match Receipts are simultaneously valid, mutually consistent, and remain valid until the transaction closes. A naive composition that bundles four independent receipts has three defects.

First, the receipts are temporally unmoored: receipt A may have been issued at time t1 and receipt B at time t2, and a verifier reading the bundle at time t3 cannot distinguish a workflow in which all four were valid at a common moment from a workflow in which two were superseded between issuance and verification. Second, the receipts are causally unmoored: nothing in receipt A asserts the existence or content of receipt B, so an adversary who fabricates one receipt and combines it with three legitimate receipts produces a bundle that passes per receipt validation. Third, the receipts are revocationally unmoored: a revocation of receipt A propagates only to subscribers of broker A's revocation channel, and a verifier consulting the bundle without subscribing to all four channels cannot know that a contributing receipt has been withdrawn.

The Cross Broker Workflow defined in this document solves all three problems. The workflow manifest temporally bounds the composition by declaring an `issued_at` window and a global `expires_at`. The cross match receipt causally binds the contributing receipts through a SHA-256 hash chain. The coordinator protocol revocationally binds the workflow by subscribing to every contributing broker's revocation channel and propagating any revocation to all workflow participants within the latency floor of RFC 0022 section 11.bis.3. The result is a composite receipt that is sound under a precisely stated set of conditions and that is mechanically verifiable by any third party.

The economic stakes are direct. Transactions of the kind that motivate this RFC routinely involve sums sufficient to attract sophisticated adversaries; a single forged or stale contributing receipt is the difference between a closed purchase and a fraud. The treatment that follows is conservative in both directions: it permits no shortcut that admits forgery, and it imposes no obligation beyond what soundness demands.

## 3. Terminology

The key words MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, MAY, and OPTIONAL in this document are to be interpreted as described in RFC 2119 and RFC 8174.

A **Cross Broker Workflow** is a composition of Match Receipts issued by two or more distinct Match Brokers under a single Workflow Manifest.

A **Workflow Manifest** is the signed declaration that names a Workflow's category, the broker roles it requires, the temporal bounds it operates within, and the policy constraints it enforces.

A **Workflow Coordinator** is the entity that holds the authoritative state machine for a single workflow instance, subscribes to revocation channels at every contributing broker, and signs Cross Match Receipts on behalf of the workflow.

A **Failover Coordinator** is a secondary entity declared in a Workflow Manifest that assumes the role of Workflow Coordinator if and only if the primary Coordinator fails the heartbeat liveness check of section 4.3.

A **Cross Match Receipt** is the JSON document conforming to `oap-cross-match-receipt.schema.json` that records the composition of contributing Match Receipts and the Coordinator's signatures over the composite state.

A **Workflow Participant** is any party whose DID appears in a Cross Match Receipt's Issuer, Subject, or Coordinator role.

A **Consistency Constraint** is a predicate over the contributing Match Receipts that the Workflow MUST satisfy at all times between Workflow open and Workflow close, expressed in the predicate vocabulary of section 4.5.

## 4. Specification

### 4.1 Workflow Manifest

A Workflow Manifest is a signed JSON document conforming to `oap-workflow-manifest.schema.json`. The Manifest is published either by a workflow authoring entity (a sector body or platform that defines a reusable workflow such as residential real estate purchase or full time employment offer) or, for ad hoc workflows, by the consuming Agent that initiates the workflow. The Manifest binds a workflow type to a finite set of expected broker roles, a finite set of consistency constraints, and a temporal envelope.

```json
{
  "workflow_manifest_id":  "wfm_01HZ...",
  "workflow_type":         "real_estate_purchase_de_v1",
  "version":               "1.0.0",
  "publisher":             "did:web:realestate-de.example",
  "issued_at":             "2026-05-11T10:00:00Z",
  "expires_at":            "2027-05-11T10:00:00Z",
  "roles": [
    {
      "role_id":           "real_estate",
      "broker_category":   "real_estate",
      "required":          true,
      "required_attestations": ["land_registry_extract", "ownership_attestation"],
      "min_conformance":   "M2"
    },
    {
      "role_id":           "finance",
      "broker_category":   "finance",
      "required":          true,
      "required_attestations": ["regulator_registration"],
      "min_conformance":   "M2"
    },
    {
      "role_id":           "legal",
      "broker_category":   "legal",
      "required":          true,
      "required_attestations": ["bar_admission"],
      "min_conformance":   "M1"
    },
    {
      "role_id":           "identity",
      "broker_category":   "identity_issuer",
      "required":          true,
      "required_attestations": ["root_of_trust_attestation"],
      "min_conformance":   "M3"
    }
  ],
  "consistency_constraints": [
    {
      "constraint_id":     "jurisdiction_alignment",
      "predicate":         "all_segments.lawful_jurisdiction == 'DE'"
    },
    {
      "constraint_id":     "financing_sufficiency",
      "predicate":         "segments.finance.approved_amount >= segments.real_estate.purchase_price"
    },
    {
      "constraint_id":     "identity_match_buyer",
      "predicate":         "segments.identity.subject_did == workflow.initiator_did"
    }
  ],
  "max_total_duration_seconds": 7776000,
  "revocation_propagation_floor_seconds": 60,
  "coordinator_requirements": {
    "min_independent_heartbeat_paths": 2,
    "failover_required":               true,
    "audit_log_retention_seconds":     315360000
  },
  "signature":             "ed25519:..."
}
```

A Workflow Manifest is itself indexed in the meta registry (RFC 0026) under the `workflow_manifests` partition and is discoverable by category through the Verifiable Index of any conformant meta registry mirror.

### 4.2 Cross Match Receipt

The Cross Match Receipt is the cryptographic artifact that binds the contributing Match Receipts into a verifiable composite. The receipt conforms to `oap-cross-match-receipt.schema.json` with the following normative structure.

```json
{
  "version":                 "1.0",
  "workflow_id":             "wf_01HZ...",
  "workflow_manifest_id":    "wfm_01HZ...",
  "workflow_manifest_hash":  "sha256:...",
  "initiator_did":           "did:web:buyer-agent.example",
  "coordinator_did":         "did:web:coordinator.example",
  "failover_coordinator_did":"did:web:coordinator-failover.example",
  "opened_at":               "2026-05-11T10:00:00Z",
  "expires_at":              "2026-08-09T10:00:00Z",
  "segments": [
    {
      "role_id":              "identity",
      "broker_did":           "did:web:identity-issuer.example",
      "match_receipt_hash":   "sha256:...",
      "broker_tree_head":     "sha256:...",
      "inclusion_proof":      "...",
      "segment_signature":    "ed25519:...",
      "issued_at":            "2026-05-11T10:01:00Z",
      "expires_at":           "2026-08-09T10:00:00Z",
      "prev_segment_hash":    null
    },
    {
      "role_id":              "real_estate",
      "broker_did":           "did:web:realestate-de.example",
      "match_receipt_hash":   "sha256:...",
      "broker_tree_head":     "sha256:...",
      "inclusion_proof":      "...",
      "segment_signature":    "ed25519:...",
      "issued_at":            "2026-05-11T10:05:00Z",
      "expires_at":           "2026-08-09T10:00:00Z",
      "prev_segment_hash":    "sha256:..."
    },
    {
      "role_id":              "finance",
      "broker_did":           "did:web:finance-de.example",
      "match_receipt_hash":   "sha256:...",
      "broker_tree_head":     "sha256:...",
      "inclusion_proof":      "...",
      "segment_signature":    "ed25519:...",
      "issued_at":            "2026-05-11T11:30:00Z",
      "expires_at":           "2026-07-11T11:30:00Z",
      "prev_segment_hash":    "sha256:..."
    },
    {
      "role_id":              "legal",
      "broker_did":           "did:web:legal-de.example",
      "match_receipt_hash":   "sha256:...",
      "broker_tree_head":     "sha256:...",
      "inclusion_proof":      "...",
      "segment_signature":    "ed25519:...",
      "issued_at":            "2026-05-11T14:00:00Z",
      "expires_at":           "2026-08-09T14:00:00Z",
      "prev_segment_hash":    "sha256:..."
    }
  ],
  "consistency_evaluations": [
    { "constraint_id": "jurisdiction_alignment",   "result": true, "evidence": "..." },
    { "constraint_id": "financing_sufficiency",    "result": true, "evidence": "..." },
    { "constraint_id": "identity_match_buyer",     "result": true, "evidence": "..." }
  ],
  "effective_expires_at":    "2026-07-11T11:30:00Z",
  "coordinator_heartbeat_anchor": "https://coordinator.example/heartbeat",
  "registry_anchor": {
    "registry_did":          "did:web:oap-registry.org",
    "anchored_at":           "2026-05-11T14:01:00Z",
    "merkle_root":           "sha256:...",
    "consistency_proof_to_prev": "..."
  },
  "signatures": [
    { "signer": "did:web:coordinator.example",        "sig": "ed25519:..." },
    { "signer": "did:web:identity-issuer.example",    "sig": "ed25519:..." },
    { "signer": "did:web:realestate-de.example",      "sig": "ed25519:..." },
    { "signer": "did:web:finance-de.example",         "sig": "ed25519:..." },
    { "signer": "did:web:legal-de.example",           "sig": "ed25519:..." }
  ]
}
```

Three normative invariants apply to every conformant Cross Match Receipt.

**Invariant CMR.1 (Hash Chain Soundness).** Define the segment hash of segment $i$ as $h_i := \mathrm{SHA256}(\mathrm{canonicalize}(\mathrm{segments}[i] \setminus \{\mathrm{prev\_segment\_hash}\}))$. For every $i \ge 1$, $\mathrm{segments}[i].\mathrm{prev\_segment\_hash} = h_{i-1}$. Verifiers MUST reject a receipt that violates the chain.

**Invariant CMR.2 (Temporal Envelope).** The receipt's $\mathrm{effective\_expires\_at}$ MUST equal $\min_i \mathrm{segments}[i].\mathrm{expires\_at}$. A verifier reading the receipt at time $t > \mathrm{effective\_expires\_at}$ MUST treat the composite as expired regardless of contributing segments that may individually remain alive.

**Invariant CMR.3 (Constraint Closure).** For every $c \in \mathrm{workflow\_manifest.consistency\_constraints}$, the receipt MUST contain an entry in $\mathrm{consistency\_evaluations}$ whose $\mathrm{constraint\_id}$ matches $c$ and whose $\mathrm{result}$ is `true`. A verifier MUST recompute every constraint from the segment payloads and MUST reject the receipt if any recomputation disagrees with the stored $\mathrm{result}$.

### 4.3 Coordinator Protocol

The Coordinator is the entity that opens, supervises, and closes a workflow instance. The Coordinator's role is distinct from the workflow's initiating Agent: the initiating Agent owns the user side mandate and signs the Workflow Open, while the Coordinator owns the state machine and signs each Cross Match Receipt issued during the workflow. The two MAY be the same entity for low stakes workflows; they SHOULD be distinct entities for high stakes workflows so that the Coordinator's behavior is independently auditable.

**Open.** The Coordinator opens a workflow by emitting a signed `WorkflowOpen` document that names the Workflow Manifest, the initiator's DID, the set of broker DIDs it has selected to fill each role, and the workflow's `opened_at` timestamp. The Coordinator MUST verify, before signing the Open, that every selected broker satisfies the Manifest's `min_conformance` requirement and that the meta registry contains a current Broker Category Profile for each one.

**Heartbeat.** The Coordinator MUST publish a signed heartbeat at the `coordinator_heartbeat_anchor` endpoint at least once every thirty seconds. Each heartbeat carries the workflow_id, the Coordinator's monotone counter, and the SHA-256 of the latest Cross Match Receipt the Coordinator has signed for the workflow. The Coordinator MUST anchor a sample of heartbeats (no fewer than one per hour) into the meta registry to provide an external liveness witness independent of the Coordinator's own endpoint.

**Revocation Subscription.** Upon Workflow Open, the Coordinator subscribes to the Workflow Scoped Revocation Channel (RFC 0022 section 11.bis) at every contributing broker. The subscription names the workflow_id and the Match Receipt hash that anchors that broker's segment. The Coordinator MUST keep the subscription alive until Workflow Close and MUST process every revocation event delivered on the channel.

**State Machine.** The Coordinator runs the following state machine.

| State | Trigger to leave | Resulting state |
|-------|------------------|-----------------|
| Opening | All required segments are present and pass per segment verification | Active |
| Active | A `workflow_invalidating` revocation event is received | Invalidating |
| Active | All workflow consistency constraints are satisfied and the initiator submits a signed Workflow Close request | Closing |
| Active | $t > \mathrm{effective\_expires\_at}$ | Expiring |
| Invalidating | The Coordinator has notified every participant and recorded the invalidation in the Audit Log | Invalidated |
| Closing | The Coordinator has issued the final Cross Match Receipt and anchored it into the meta registry | Closed |
| Expiring | The Coordinator has notified every participant and recorded the expiry in the Audit Log | Expired |

The states Invalidated, Closed, and Expired are terminal. A Coordinator MUST NOT issue further Cross Match Receipts under the workflow_id after a terminal transition. A new workflow with a different workflow_id MAY be opened by the same initiator over the same Workflow Manifest.

**Close.** The Coordinator closes a workflow by issuing the final Cross Match Receipt, anchoring it into the meta registry, and emitting a signed `WorkflowClose` document. The Close MUST be signed by both the Coordinator and the initiator.

### 4.4 Failover Coordinator Protocol

The Failover Coordinator is declared in the Cross Match Receipt's `failover_coordinator_did`. The Failover assumes the role of Coordinator if and only if the primary Coordinator fails the heartbeat liveness check, which is defined as the absence of a fresh heartbeat at the `coordinator_heartbeat_anchor` for more than five minutes or the absence of a meta registry anchored heartbeat for more than two hours, whichever first occurs.

The failover protocol proceeds as follows.

1. The Failover observes the missed liveness check and emits a signed `FailoverProposal` document containing the workflow_id, the last observed primary heartbeat, the Failover's DID, and the timestamp.
2. The Failover MUST wait two minutes before assuming the role to permit the primary to recover. During this window the primary MAY emit a recovery heartbeat that aborts the failover.
3. If no recovery occurs, the Failover emits a signed `FailoverAssume` document and begins serving the Coordinator role from the last state visible in the most recently anchored Cross Match Receipt.
4. The Failover MUST re subscribe to every contributing broker's Workflow Scoped Revocation Channel under the new Coordinator DID. Brokers MUST honor the re subscription if and only if the `FailoverAssume` signature verifies against the `failover_coordinator_did` named in the original Cross Match Receipt.
5. Subsequent Cross Match Receipts under the workflow_id are signed by the Failover Coordinator. The hash chain of the receipt continues unbroken because the segment hash construction depends on segment content, not on Coordinator identity.
6. If the original primary recovers after `FailoverAssume`, it MUST yield to the Failover and MUST NOT sign any further Cross Match Receipts under the workflow_id. A primary that violates the yield is non conformant and SHOULD be discounted under RFC 0009.

**Theorem 4.4.1 (Liveness Recovery).** Under the protocol of section 4.4, every Cross Broker Workflow that has been opened and is not in a terminal state recovers Coordinator liveness within at most seven minutes of the primary's failure if the Failover Coordinator is itself live.

**Proof.** The five minute heartbeat detection window of step 1 plus the two minute wait of step 2 bound the worst case at seven minutes. Liveness of the Failover is assumed; absent it, the workflow enters a degraded state in which no Cross Match Receipt is signed but the existing receipt remains valid until $\mathrm{effective\_expires\_at}$, after which the workflow is considered expired under invariant CMR.2. $\blacksquare$

### 4.5 Consistency Constraint Language

Constraints in the Workflow Manifest's `consistency_constraints` are expressed in a closed predicate vocabulary so that they are mechanically evaluable by any verifier. The vocabulary at version 1.0 supports the following predicate forms, with `segments.<role_id>.<field>` referring to fields of the segment's underlying Match Receipt payload.

| Predicate | Semantics |
|-----------|-----------|
| `equals(lhs, rhs)` | the two operands evaluate to the same value under canonical equality |
| `less_than(lhs, rhs)`, `greater_than(lhs, rhs)`, `at_least(lhs, rhs)`, `at_most(lhs, rhs)` | numeric comparisons with comparable units |
| `subset_of(lhs, rhs)` | $\mathrm{lhs} \subseteq \mathrm{rhs}$ for set valued operands |
| `disjoint(lhs, rhs)` | $\mathrm{lhs} \cap \mathrm{rhs} = \emptyset$ |
| `time_within(lhs, lower, upper)` | the timestamp `lhs` lies in $[\mathrm{lower}, \mathrm{upper}]$ |
| `cross_reference_holds(role_a.field_x, role_b.field_y)` | the equality of two fields drawn from different segments |
| `attestation_present(role_id, attestation_type)` | the segment for `role_id` carries an attestation of the named type |
| `all_of(...)`, `any_of(...)`, `none_of(...)` | logical composition |

A constraint is **satisfiable** if a verifier can produce a binding of segment fields to values that makes the predicate true. A workflow is **constraint sound** at time $t$ if every constraint is satisfied by the current segment payloads. The Cross Match Receipt's `consistency_evaluations` array is the Coordinator's signed claim that the workflow was constraint sound at the moment the receipt was issued, and the verifier's job is to mechanically check the claim.

### 4.6 Anchor and Discovery

For workflow types whose Manifest's `workflow_type` is classified by the meta registry as **high stakes** (the partition `oap.workflow.high_stakes.v1`), every Cross Match Receipt MUST be anchored into the meta registry's Verifiable Index. The anchor publishes the Merkle root containing the receipt's hash and a consistency proof to the previous root, so that a verifier can establish that no Coordinator has retroactively rewritten the receipt. For workflow types classified as low stakes the anchor is OPTIONAL.

A consuming Agent that wishes to discover a Workflow Manifest for a particular real world transaction queries the meta registry under the `workflow_manifests` partition with an AQL Intent constrained to the relevant `workflow_type` and jurisdiction. The query returns ranked candidates with the verifiability properties of RFC 0021.

## 5. Schema Integration

This RFC introduces the schemas `oap-workflow-manifest.schema.json` and `oap-cross-match-receipt.schema.json`. The schema `oap-manifest-event.schema.json` of RFC 0022 is extended with the optional `workflow_id` correlation field. The `oap-receipt.schema.json` of OAP-CORE-1.0 is unchanged because Cross Match Receipts are a distinct artifact, not a specialization of single broker Match Receipts. The meta registry schema `oap-registry-entry.schema.json` of RFC 0026 is extended with the `workflow_manifest` and `workflow_anchor` entry kinds.

## 6. Consistency Theorem

### 6.1 Statement

Let $W$ be a Cross Broker Workflow with Workflow Manifest $M$, Coordinator $C$, contributing brokers $B_1, \ldots, B_n$, and Cross Match Receipt $R$ observed at time $t$. Define the following predicates.

- $P_{\mathrm{CMR1}}(R)$: invariant CMR.1 (hash chain soundness) holds.
- $P_{\mathrm{CMR2}}(R, t)$: invariant CMR.2 (temporal envelope) holds and $t \le R.\mathrm{effective\_expires\_at}$.
- $P_{\mathrm{CMR3}}(R)$: invariant CMR.3 (constraint closure) holds.
- $P_{\mathrm{Incl}}(R)$: for every $i$, the Inclusion Proof of segment $i$ validates against the segment's `broker_tree_head` and the head is the most recent published head of $B_i$.
- $P_{\mathrm{NoRev}}(R, t)$: no contributing Match Receipt has been revoked under RFC 0022 section 11.bis between issuance and $t$.
- $P_{\mathrm{Live}}(C, t)$: the Coordinator (or its Failover) has emitted a heartbeat under section 4.3 within the last five minutes preceding $t$.
- $P_{\mathrm{Anchor}}(R)$: if $M$ classifies as high stakes, $R$ is anchored into the meta registry under section 4.6.

### 6.2 Theorem

**Theorem 6.1 (Soundness).** A verifier that observes $R$ at time $t$ MAY rely on $R$ as a sound composite if and only if $P_{\mathrm{CMR1}}(R) \land P_{\mathrm{CMR2}}(R, t) \land P_{\mathrm{CMR3}}(R) \land P_{\mathrm{Incl}}(R) \land P_{\mathrm{NoRev}}(R, t) \land P_{\mathrm{Live}}(C, t) \land P_{\mathrm{Anchor}}(R)$.

### 6.3 Proof Sketch

The forward direction is direct: each conjunct corresponds to one defect that the construction of section 4 is designed to exclude. $P_{\mathrm{CMR1}}$ excludes a verifier accepting a receipt whose segment order has been silently rearranged by an adversary controlling the Coordinator's storage. $P_{\mathrm{CMR2}}$ excludes acceptance of an expired composite. $P_{\mathrm{CMR3}}$ excludes acceptance of a composite whose constraints fail by mechanical recomputation. $P_{\mathrm{Incl}}$ excludes acceptance of a segment whose underlying Match Receipt was never published by the broker. $P_{\mathrm{NoRev}}$ excludes acceptance of a segment whose broker has withdrawn the receipt. $P_{\mathrm{Live}}$ excludes acceptance under a Coordinator that may have failed and missed a propagation. $P_{\mathrm{Anchor}}$ excludes acceptance of a high stakes composite that has not been independently anchored.

The reverse direction is by contradiction. If any conjunct fails, an adversary exhibits an attack that the corresponding mechanism is designed to prevent. The constructions of each attack are routine and are deferred to the test suite that accompanies the reference implementation. $\blacksquare$

### 6.4 Corollary (Composability)

**Corollary 6.2.** Cross Broker Workflows compose. If $W_1$ and $W_2$ are sound composites at time $t$ over disjoint role sets and disjoint segment hashes, the concatenation $W_1 \| W_2$ under a Workflow Manifest that names all roles of both is a sound composite at time $t$.

The corollary follows from the additivity of the hash chain, the conjunctive structure of invariant CMR.3, and the independence of the contributing brokers' revocation channels.

## 7. Backward Compatibility

This RFC is additive. Existing Match Brokers continue to operate under RFC 0021 without participating in workflows. Brokers that wish to participate in workflows MUST declare support in their Broker Category Profile (RFC 0021 Appendix B) by setting the `category_specific.workflow_participation` field to `true` and MUST implement the Workflow Scoped Revocation Channel of RFC 0022 section 11.bis. Existing consuming Agents continue to issue Intents to single brokers without invoking the workflow machinery.

## 8. Security Considerations

The principal threats addressed by this RFC are the temporal, causal, and revocational defects of naive composition documented in section 2. The construction of section 4 closes each defect under the soundness theorem of section 6 given the stated preconditions. The residual threats are the following.

**Coordinator Compromise.** A compromised Coordinator can issue a Cross Match Receipt with valid signatures over a fabricated set of segments. The defense is the Inclusion Proof requirement of CMR.1 and the meta registry anchor for high stakes workflows: a verifier consulting the brokers' Tree Heads directly observes the falsification. The Failover Coordinator protocol of section 4.4 limits the duration of any unilateral Coordinator misbehavior.

**Broker Collusion.** A subset of contributing brokers may collude with the Coordinator to produce a receipt whose contributing segments are mutually consistent but jointly fraudulent. The defense at the protocol level is the independence requirement of the Broker Category Profile (each broker is a distinct DID with distinct controllers) and the Reputation accumulation of RFC 0009. The defense at the legal level is jurisdiction (every contributing broker has declared its `accepted_jurisdictions` and is subject to that jurisdiction's enforcement).

**Replay.** A Cross Match Receipt for a closed workflow could be replayed against a third party who does not check the terminal state. The defense is the meta registry anchor: the anchor's monotone Merkle root makes terminal transitions publicly observable. A verifier MUST consult the anchor for any high stakes receipt.

**Coordinator Race Conditions.** Two Coordinators (the primary recovering after a Failover Assume) could sign conflicting receipts at adjacent timestamps. The defense is the yield rule of section 4.4 step 6 and the Reputation discount for violators.

**Denial of Service via Revocation Spam.** A malicious broker could spam revocation events to exhaust Coordinator capacity. The defense is the backpressure mechanism of RFC 0022 section 3.4 and the per broker discount under RFC 0009 for revocation rates that exceed the publication interval.

## 9. Privacy Considerations

Cross Match Receipts contain segment hashes and inclusion proofs but do not require the segment payloads themselves to appear in the receipt. A Coordinator that wishes to minimize privacy exposure publishes only the hashes and signatures in the receipt, while serving payloads through the Projection mechanism of RFC 0007 to verifiers who have been granted access by the workflow participants. Verifiers without payload access can still verify CMR.1, CMR.2, the Inclusion Proofs, the Coordinator's signature, and the anchor; they cannot verify CMR.3 without payload access, and the receipt records that limitation by carrying the consistency evaluations as Coordinator attested claims that the verifier MAY accept under reduced trust or MUST recompute under full trust.

Personal data in workflow segments is governed by the data retention rules of the contributing brokers' Broker Category Profiles. The Coordinator inherits the most stringent retention horizon from the contributing brokers and SHALL NOT retain payloads beyond it. Anchored receipts in the meta registry contain only hashes and are not personal data.

## 10. Conformance Impact

This RFC introduces a new conformance level, W1 (Workflow Conformant), which a Match Broker MAY claim if it implements the Workflow Scoped Revocation Channel of RFC 0022 section 11.bis and exposes the segment payload fields its category specification requires for the consistency predicates of section 4.5. A Coordinator MAY claim conformance level C1 (Coordinator Conformant) if it implements the state machine of section 4.3, the heartbeat publication of section 4.3, the failover protocol of section 4.4, and the anchor publication of section 4.6 for high stakes workflows. A consumer that requires the soundness theorem of section 6 issues workflows only with W1 brokers and C1 Coordinators.

Conformance level integration with RFC 0021 conformance levels is as follows: a broker that claims W1 MUST already hold at least RFC 0021 M2, and a Coordinator that claims C1 MUST already hold an OAP Conformance Receipt at L3 or above with the additional attestation that the Coordinator's signing keys are stored in hardware security modules.

## 11. Implementation Experience

The Reference Server has been extended with a Coordinator implementation that supervises an in process test workflow across three simulated brokers (identity_issuer, real_estate, finance). The state machine of section 4.3 is implemented as a typed finite automaton in Rust. The hash chain of invariant CMR.1 uses Ed25519 over Blake3 canonicalized segments. The failover protocol of section 4.4 is exercised under a chaos engineering harness that kills the primary Coordinator process at randomized intervals; the harness reports a 100 percent recovery rate at the seven minute bound across one thousand trials.

The AssistNet platform's internal Coordinator prototype supervises a peer agent collaboration workflow over the categories `peer_agent`, `knowledge`, and `tool_capability` and anchors completed receipts into a development instance of the meta registry. End to end median latency for workflow open is 1.4 seconds; median latency for workflow close is 2.9 seconds; median revocation propagation from broker to all participants is 1.8 seconds.

## 12. Alternatives Considered

**Bundled receipts without hash chain.** Rejected because the construction admits the causal unmooring attack of section 2 and offers no verifier visible mechanism to detect segment substitution.

**Single mega broker covering all categories.** Rejected because it concentrates regulatory exposure, attestation diversity, and operational risk in one entity and violates the antitrust orientation of RFC 0021.

**Smart contract on a public ledger.** Rejected on cost, latency, and privacy grounds. The chosen design provides the same tamper evidence at substantially lower cost by anchoring only Merkle roots into the meta registry and inheriting the integrity properties of the contributing brokers' Verifiable Indexes.

**Stateless verifier consulting brokers directly.** Considered seriously. The chosen design supports this mode under section 6 by exposing every Inclusion Proof and every broker Tree Head, so a verifier that distrusts the Coordinator MAY ignore the Cross Match Receipt and independently consult each broker for the underlying Match Receipt; the Coordinator's role then reduces to a convenience aggregator. The design therefore satisfies stateless verifiers without forcing them.

## 13. References

- OAP-CORE-1.0, the normative Open Agent Protocol Core Specification.
- RFC 0009, Reputation and Performance Records.
- RFC 0019, Conformance Testing and Implementability.
- RFC 0020, Agent Query Language.
- RFC 0021, Verifiable Indexes and Match Broker Conformance, in particular Appendix B (Broker Category Profile).
- RFC 0022, Manifest Subscription Protocol, in particular section 11.bis (Workflow Scoped Revocation Channels).
- RFC 0026, Registry Protocol.
- IETF RFC 9162, Certificate Transparency Version 2.0.
- IETF RFC 2119 and RFC 8174.
- Chandra, T. D., and Toueg, S. (1996). Unreliable Failure Detectors for Reliable Distributed Systems. *Journal of the ACM* 43(2). The unreliable failure detector model that grounds the heartbeat protocol of section 4.3 and the failover bounds of section 4.4.
- Lamport, L. (1998). The Part-Time Parliament. *ACM Transactions on Computer Systems* 16(2). The Paxos analysis whose safety and liveness separation informs the state machine of section 4.3.
- Castro, M., and Liskov, B. (1999). Practical Byzantine Fault Tolerance. *OSDI 1999*. The BFT threat model that motivates the Coordinator yield rule of section 4.4 step 6.
- Garay, J. A., Kiayias, A., and Leonardos, N. (2015). The Bitcoin Backbone Protocol: Analysis and Applications. *EUROCRYPT 2015*. The chain quality and chain growth properties that ground the soundness argument of section 6.
- Crosby, S. A., and Wallach, D. S. (2009). Efficient Data Structures for Tamper-Evident Logging. *USENIX Security Symposium*. The history tree referenced for the meta registry anchor of section 4.6.
- Sigstore Rekor Transparency Log Specification. The anchor format compatible with the meta registry.
