# RFC 0009: Reputation and Performance Records

**Status:** Draft
**Author(s):** OAP Working Group on Trust and Reputation
**Created:** 2026-05-03
**Working Group:** Trust and Reputation
**Targets:** 1.2

## 1. Summary

This RFC introduces Performance Records, signed attestations of how an OAP participant performed on past Invocations, Workflows, and Agreements. Performance Records compose into a portable Reputation profile that travels with the participant DID across Marketplaces and platforms. The mechanism is designed to resist Sybil inflation, to permit legitimate forgetting, and to expose its scoring function so that participants can contest unfair ratings.

## 2. Motivation

Trust between Agents currently depends on platform local reputation systems that do not survive a switch to another Marketplace. A Tool that earns a strong track record on Marketplace A starts at zero on Marketplace B. The user pays this cost in worse Discovery rankings and worse default trust grants.

A portable Reputation primitive solves three problems:

1. Reputation survives platform migration.
2. Marketplaces can rank Tools by behavior, not only by listing fee.
3. Bad actors are visible across the ecosystem rather than only on the platform that catches them first.

## 3. Specification

### 3.1 Terminology

| Term | Definition |
|------|------------|
| Performance Record | A signed attestation about a single past interaction. |
| Reputation Profile | The aggregation of Performance Records for a single subject DID. |
| Issuer | The party that signs a Performance Record. |
| Subject | The DID that the Performance Record describes. |
| Dimension | A named axis of evaluation (timeliness, accuracy, courtesy, etc.). |

### 3.2 Performance Record Schema

```json
{
  "record_id": "rep_01HX2QFXR0Q4S8U9V3W7X2Y0Z1",
  "issuer": "did:web:agent-a.example",
  "subject": "did:web:tool-b.example",
  "interaction_receipt": "rec_01HX2QFP4N8R5T6V7W8X9Y0Z1A",
  "interaction_type": "invocation | session | agreement | workflow",
  "dimensions": {
    "timeliness": { "score": 5, "max": 5 },
    "accuracy": { "score": 4, "max": 5 },
    "courtesy": { "score": 5, "max": 5 },
    "value_delivered": { "score": 4, "max": 5 }
  },
  "free_text": "Delivered on time. Output was complete and correct.",
  "issued_at": "2026-05-03T10:00:00Z",
  "issuer_signature": "..."
}
```

### 3.3 Aggregation

The Reputation Profile is computed by the Stewards Trust Anchor as the time decayed weighted average of all Performance Records, with explicit handling for:

1. **Issuer Diversity.** A high score from many independent issuers weighs more than the same score from a few.
2. **Issuer Reputation.** Records from issuers with their own strong Reputation count more.
3. **Recency.** Records older than 365 days decay exponentially.
4. **Interaction Stake.** Records produced from Agreements with non zero financial value count more than free interactions.

The exact aggregation formula MUST be published by the Stewards under `oap.reputation.aggregation.v1` and MUST be reproducible by any Marketplace that wishes to verify Reputation independently.

### 3.4 Sybil Resistance

To prevent Sybil inflation:

1. Records are valid only if both Issuer and Subject have a verified `OAPPublisherVerified` credential.
2. Records from Issuers without an `OAPPublisherVerified` credential are aggregated separately and labelled as "unverified".
3. Marketplaces MUST disclose how they weight verified versus unverified records.
4. **Sub Tree Aggregation.** All Issuers that share a common root Principal in their Delegation
   Tree MUST be aggregated as a single Issuer for the purposes of Reputation weighting. The
   Trust Anchor walks the `parent_invocation_id` chain to determine the root. Sibling decay
   per RFC 0011 Section 3.6 applies before all other weighting steps. This closes the attack
   in which a Principal spawns many Sub Agents that each issue a Performance Record about the
   same Subject.

### 3.5 Right to Respond and Right to Be Forgotten

Subjects MUST be able to:

1. Attach a public response to any Performance Record.
2. Initiate a dispute through the Stewards Dispute Resolution service.
3. Request deletion of Records that are factually incorrect, with adjudication by the Stewards.

The Right to Be Forgotten MUST NOT be used to suppress accurate records of harmful behavior.

### 3.6 Manifest Declaration

```json
{
  "reputation": {
    "publishes_records": true,
    "accepts_records_about_self": true,
    "response_endpoint": "https://example.com/oap/reputation/respond",
    "dispute_endpoint": "https://example.com/oap/reputation/dispute"
  }
}
```

## 4. Backward Compatibility

Reputation is additive. Tools and Agents that ignore Reputation continue to interoperate at v1.0 levels.

## 5. Security Considerations

1. **Coordinated Defamation.** Bursts of negative Records from a single cohort SHOULD be flagged by the Trust Anchor for human review.
2. **Reciprocal Inflation.** The Trust Anchor SHOULD detect mutual rating rings and discount their contribution.

## 6. Privacy Considerations

Performance Records about natural person Subjects are personal data. Subjects MUST be able to exercise GDPR rights through standard endpoints.

## 7. Conformance Impact

Reputation publication is OPTIONAL at L2 and L3. Reputation publication is REQUIRED at L4 and L5.

## 8. Implementation Experience

AssistNet records interaction performance on connection objects with rating dimensions for completion quality and reliability. The mechanism described here is a generalization across implementations.

## 9. Alternatives Considered

1. **Marketplace local star ratings.** Rejected because they are not portable.
2. **On chain reputation.** Rejected because it forces public disclosure of all interactions.

## 10. References

1. OAP-CORE-1.0, Section 16 (Trust, Verification, and Reputation).
2. EU GDPR Article 17 (Right to Erasure).
