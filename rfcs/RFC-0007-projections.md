# RFC 0007: Privacy Preserving Projections

**Status:** Draft
**Author(s):** T. Fengler (Editor)
**Working Group:** Confidentiality and Compliance
**Created:** 2026-05-03
**Working Group:** CCC
**Targets:** 1.1

## 1. Summary

This RFC introduces Projections, a normative mechanism by which a Tool returns a deterministic, trust level dependent subset of an Entity instead of the full record. A single Entity yields different views to a stranger, an acquaintance, a known contact, a trusted partner, and a member of the inner circle. Projections eliminate the recurring pattern in which Tools either return everything or nothing, and they make minimum necessary disclosure operationally cheap rather than expensive.

## 2. Motivation

Sharing data between Agents currently has two modes: full disclosure or no disclosure. The middle ground (free or busy without titles, name and role without phone number, calendar availability without subject lines) is implementable in principle but absent in practice because every Tool reinvents the rules.

Production deployments show that minimum necessary disclosure is the default expectation of users for any data shared outside the inner circle. Without a normative primitive, the choice in practice is between unsafe full disclosure and unusable no disclosure.

## 3. Specification

### 3.1 Terminology

| Term | Definition |
|------|------------|
| Projection | A deterministic, schema preserving subset of a Canonical Entity. |
| Trust Level | Integer 0 through 4 indicating the relationship strength between the data owner and the requesting party. |
| Projection Profile | A named function that maps an Entity and a Trust Level to a Projection. |
| Lawful Basis Tag | The legal ground (consent, contract, legitimate interest) under which a Projection is delivered. |

### 3.2 Trust Level Schema

Trust Levels are normative integers from 0 to 4:

| Level | Designation | Typical Counterparty |
|-------|-------------|----------------------|
| 0 | Stranger | Counterparty has no prior relationship. |
| 1 | Acquaintance | Single past interaction or weak reference. |
| 2 | Known | Recurring collaboration. |
| 3 | Trusted | Sensitive data has been shared and not abused. |
| 4 | Inner Circle | Full disclosure equivalent to the Principal themselves. |

### 3.3 Projection Profile Examples

The the OAP community publish normative Projection Profiles for each Canonical Entity (RFC 0005).

**oap.entity.contact**

| Trust Level | Visible Fields |
|-------------|----------------|
| 0 | `names.given`, `names.family` |
| 1 | adds `affiliations[].organization_id`, `affiliations[].role` |
| 2 | adds `channels[type=email][primary=true]`, `languages` |
| 3 | adds `channels[*]`, `addresses`, `social`, `skills` |
| 4 | full Entity |

**oap.entity.calendar_event**

| Trust Level | Visible Fields |
|-------------|----------------|
| 0 | `start`, `end`, `transparency=busy` only |
| 1 | adds `title` if not marked private |
| 2 | adds `participants_count` |
| 3 | adds `participant_dids[*]`, `location_general` |
| 4 | full Entity including `description`, `attachments`, `location_precise` |

**oap.entity.task**

| Trust Level | Visible Fields |
|-------------|----------------|
| 0 | `status` only |
| 1 | adds `title`, `due_at` |
| 2 | adds `priority`, `assignee_dids` |
| 3 | adds `description` |
| 4 | full Entity including linked Entities |

### 3.4 Projection Request

A requesting Agent MAY include a Trust Level claim in its Invocation:

```json
{
  "request": {
    "projection": {
      "requested_trust_level": 2,
      "evidence": [
        { "type": "OAPConnectionVouched", "credential": "..." }
      ]
    }
  }
}
```

The Tool MUST evaluate the evidence and determine the actual Trust Level using its own scoring. The Tool MUST NOT grant a Trust Level higher than the evidence supports. The Tool MAY grant a Trust Level lower than requested. 

### 3.4.1 Evidence Standardization
To prevent arbitrary interpretations, Evidence Objects MUST adhere to standard types defined by the Trust and Reputation WG (RFC 0009). For example, `OAPConnectionVouched` MUST include a cryptographic signature from a mutually trusted third party DID. `OAPMutualGroupMembership` MUST include a ZKP or signed token from the group authority. Tools MUST NOT accept unverified self-asserted Evidence.

### 3.5 Projection Response

The Response Envelope MUST disclose the Trust Level applied and the Profile used:

```json
{
  "result": {
    "projection_applied": {
      "trust_level": 2,
      "profile": "oap.profile.projection.contact.v1",
      "redacted_field_count": 9,
      "lawful_basis": "legitimate_interest"
    },
    "data": { "...": "projected entity" }
  }
}
```

### 3.6 Projection Receipt

The Receipt MUST record both the Trust Level applied and the Lawful Basis Tag, allowing audit reconstruction of which fields were disclosed under which justification.

### 3.7 Manifest Declaration

```json
{
  "projections": {
    "supported": true,
    "default_trust_level_for_unknown_did": 0,
    "supported_profiles": [
      "oap.profile.projection.contact.v1",
      "oap.profile.projection.calendar_event.v1",
      "oap.profile.projection.task.v1"
    ],
    "trust_evidence_accepted": [
      "OAPConnectionVouched",
      "OAPMutualGroupMembership",
      "OAPProfessionalCode"
    ]
  }
}
```

## 4. Backward Compatibility

Tools that do not declare `projections.supported = true` continue to return full Entities or full denial. Existing Agents that do not request a Trust Level receive the Tool's default behavior.

## 5. Security Considerations

1. **Trust Level Inflation.** Tools MUST NOT accept self asserted Trust Level claims without verifiable evidence.
2. **Cross Reference Reconstruction.** A counterparty MAY combine multiple Projections to reconstruct fields that no single Projection discloses. Tools SHOULD impose rate limits and flag suspicious access patterns.

## 6. Privacy Considerations

Projections operationalize the GDPR principle of data minimization. Tools that implement Projections SHOULD declare data minimization as their default lawful basis where applicable.

### 6.1 Global Privacy Budget and Membership Inference

While Projections reduce data exposure, an adversary may execute repeated, overlapping queries to infer protected fields (Membership Inference Attacks). To defend against this, OAP implements the $(\epsilon, \delta)$-differential privacy framework.

**Normative Requirement:** A Level 4 conformant Substrate MUST maintain a global state accumulator for the privacy loss budget $\epsilon$ per Principal DID. When a querying Agent's request sequence would cause the cumulative $\epsilon$ to exceed the Principal's predefined privacy threshold $\epsilon_{\max}$, the Substrate MUST block the query, returning an HTTP 429 (Too Many Requests) with a `budget_exhausted` error code, ensuring that the composition of queries does not degrade the privacy guarantee.

## 7. Conformance Impact

Projection support is RECOMMENDED at all Conformance Levels and REQUIRED at L4 (Collaborative). The OAP community will publish a Conformance Test Suite that verifies Projection Profile correctness against the published normative tables.

## 8. Implementation Experience

AssistNet operates Projections in production for contacts, calendar events, and shared documents. The Trust Level evaluation, Projection Profile selection, and Receipt schema described in this RFC are direct generalizations of the AssistNet Sharing System. Reference code is committed to `reference/server/projections/`.

## 9. Alternatives Considered

1. **Field level access control lists.** Rejected because per field ACLs do not scale to thousands of contacts.
2. **Differential privacy noise.** Rejected because semantic correctness of returned fields is required for downstream agent reasoning.

## 10. References

1. OAP-CORE-1.0, Sections 17 (Data Policy), 18 (CCC).
2. EU GDPR Article 5(1)(c) (Data Minimization).
3. Dwork, C., & Roth, A. (2014). The Algorithmic Foundations of Differential Privacy.
4. Shokri, R., et al. (2017). Membership Inference Attacks Against Machine Learning Models.
