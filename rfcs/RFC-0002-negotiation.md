# RFC 0002: Negotiation Protocol

**Status:** Draft
**Author(s):** OAP Foundation, Working Group on Confidentiality and Compliance
**Created:** 2026-05-03
**Working Group:** CCC
**Targets:** 1.1

## 1. Summary

This RFC introduces a normative Negotiation Protocol for OAP. Negotiation enables two or more Agents to converge on mutually acceptable terms over multiple structured turns, with each turn signed, time bound, and binding upon acceptance. Negotiation is the protocol substrate for pricing discussions, scheduling, scope definition, service level agreements, and any other commercial or operational arrangement that cannot be unilaterally imposed.

## 2. Motivation

OAP-CORE-1.0 specifies Pricing in the Manifest as a published, take it or leave it offer. This is sufficient for commodity services but not for the long tail of agent to agent commerce. Production deployments demonstrate four patterns that v1.0 cannot express:

1. **Time Bound Counter Offers.** A Tool offers a service at a list price. The Agent counters with a lower price contingent on a higher volume commitment. Both sides need a binding handshake.
2. **Conditional Acceptance.** A Tool accepts a proposed meeting only if the rate exceeds a threshold. The conditional needs a structured representation.
3. **Multi Round Refinement.** A scheduling negotiation traverses three or more rounds of proposed time slots before convergence.
4. **Walk Away Rights.** Either side needs a normative way to withdraw without producing legal exposure.

Without a standardized Negotiation Protocol, every Tool reinvents these primitives, creating both implementation cost and security risk.

## 3. Specification

### 3.1 Terminology

| Term | Definition |
|------|------------|
| Negotiation | A bounded sequence of Proposals and Counter Proposals between exactly two Negotiating Parties. |
| Party | A Participant in a Negotiation, identified by a DID. |
| Proposal | A signed, structured offer with explicit Terms, Validity, and Withdrawal rules. |
| Counter Proposal | A Proposal that explicitly references and modifies a prior Proposal. |
| Acceptance | A signed assent to a specific Proposal that creates a binding Agreement. |
| Agreement | The bound, hash chained outcome of a successful Negotiation. |
| Walk Away | A signed withdrawal that terminates a Negotiation without an Agreement. |

### 3.2 State Machine

```
                +--------+   propose    +----------+
   start ---->  | OPEN   | -----------> | PROPOSED |
                +--------+              +----------+
                                             |
                       counter (n times)     |
                            +----------------+
                            v                |
                       +-----------+         |
                       | COUNTERED |---------+
                       +-----------+
                            |
                            +-- accept --> ACCEPTED (terminal)
                            +-- reject --> REJECTED (terminal)
                            +-- expire --> EXPIRED (terminal)
                            +-- withdraw -> WITHDRAWN (terminal)
```

A Tool that supports Negotiation MUST implement this state machine and MUST refuse transitions that violate it.

### 3.3 Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/oap/negotiation/open` | POST | Initiate a Negotiation. |
| `/oap/negotiation/{id}/propose` | POST | Submit a Proposal or Counter Proposal. |
| `/oap/negotiation/{id}/accept` | POST | Accept the most recent Proposal. |
| `/oap/negotiation/{id}/reject` | POST | Reject the most recent Proposal. |
| `/oap/negotiation/{id}/withdraw` | POST | Walk away. |
| `/oap/negotiation/{id}` | GET | Retrieve the Negotiation history. |

### 3.4 Proposal Schema

```json
{
  "proposal_id": "prp_01HX2QFP4N8R5T6V7W8X9Y0Z1A",
  "negotiation_id": "neg_01HX2QF8GZRP9V3K5YXJW0AQ7M",
  "previous_proposal_id": null,
  "from": "did:web:agent-a.example",
  "to": "did:web:agent-b.example",
  "round": 1,
  "category": "pricing",
  "terms": {
    "action": "weather.forecast.detailed",
    "calls_per_month": 100000,
    "price_per_call_eur": "0.0040",
    "billing_interval": "month",
    "minimum_commitment_months": 6,
    "early_termination_fee_eur": "200.00"
  },
  "valid_until": "2026-05-10T12:00:00Z",
  "signature": "..."
}
```

### 3.5 Acceptance Produces an Agreement

A successful Acceptance MUST produce a signed Agreement document with the following structure:

```json
{
  "agreement_id": "agr_01HX2QFXR0Q4S8U9V3W7X2Y0Z1",
  "negotiation_id": "neg_01HX2QF8GZRP9V3K5YXJW0AQ7M",
  "parties": ["did:web:agent-a.example", "did:web:agent-b.example"],
  "terms": { "...": "from accepted Proposal" },
  "effective_from": "2026-05-04T00:00:00Z",
  "effective_until": "2026-11-04T00:00:00Z",
  "agreement_hash": "sha256-...",
  "signatures": {
    "did:web:agent-a.example": "...",
    "did:web:agent-b.example": "..."
  }
}
```

Agreements MUST be appended to the Transparency Log of the Tool that hosted the Negotiation.

### 3.6 Manifest Declaration

```json
{
  "negotiation": {
    "supported": true,
    "categories": ["pricing", "scheduling", "scope", "sla"],
    "max_rounds": 8,
    "default_validity_minutes": 60,
    "binding_acceptance": true,
    "withdrawal_penalty_terms": "https://example.com/legal/walk-away.pdf"
  }
}
```

### 3.7 Confidentiality

Negotiation content MUST inherit the CCC of the most restrictive Party. A Negotiation between a regulated profession (medical, legal, financial) and an unregulated counterparty MUST flag the regulated obligations in the resulting Agreement metadata.

## 4. Backward Compatibility

Tools that do not declare `negotiation.supported = true` continue to operate under v1.0 take it or leave it pricing. Existing pricing entries in the Manifest remain valid as opening Proposals.

## 5. Security Considerations

1. **Replay of Withdrawn Proposals.** Tools MUST enforce monotonic round numbers and reject any Proposal whose `previous_proposal_id` is not the most recent live Proposal.
2. **Signature Theft.** Acceptance MUST be co signed by the receiving Party from a key bound to its DID Document.
3. **Race Conditions.** A Tool MUST treat the first valid Acceptance as terminal and reject all subsequent state transitions.

## 6. Privacy Considerations

Negotiations between natural persons MAY contain personal data such as scheduling preferences. Tools MUST allow Parties to redact non material content from public Transparency Log entries while preserving the integrity hash.

## 7. Conformance Impact

Negotiation is OPTIONAL at L2. Negotiation MUST be supported at L3 if any Tool offering involves variable terms.

## 8. Implementation Experience

The AssistNet Booking Engine operates a comparable mechanism in production for meeting scheduling and partnership negotiation. A reference implementation is committed to `reference/server/negotiation/`.

## 9. Alternatives Considered

1. **Free text negotiation in chat messages.** Rejected because outcomes are not machine verifiable.
2. **Bilateral smart contracts.** Rejected because they introduce settlement coupling that conflicts with the Wallet abstraction.
3. **Auction protocols only.** Rejected because most production negotiations are not auctions.

## 10. References

1. OAP-CORE-1.0, Section 11 (Pricing).
2. UN/CEFACT Buy Ship Pay Reference Data Model.
