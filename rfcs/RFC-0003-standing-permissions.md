# RFC 0003: Standing Permissions

**Status:** Draft
**Author(s):** OAP Working Group on Confidentiality and Compliance
**Created:** 2026-05-03
**Working Group:** CCC
**Targets:** 1.1

## 1. Summary

This RFC introduces Standing Permissions, a normative primitive that lets a Principal pre authorize specific categories of repeated Invocations between named counterparties. Standing Permissions are scoped, time bound, revocable, and produce per use Receipts that reference the originating grant. They eliminate the per call consent friction that currently makes routine agent to agent operation impractical for non trivial workloads.

## 2. Motivation

OAP-CORE-1.0 requires explicit consent for every Invocation that mutates state or shares regulated data. This is correct for high stakes operations and intolerable for routine ones. Production deployments demonstrate that without a standing grant primitive, users either disable consent prompts entirely (eliminating the safety property) or refuse to deploy autonomous agents at all.

A general purpose grant model is required that:

1. Is explicit, time bound, and granular.
2. Is revocable in real time without legal ambiguity.
3. Produces per use Receipts that reference the grant.
4. Composes with the four layer Policy Engine without overriding mandatory protections.

## 3. Specification

### 3.1 Terminology

| Term | Definition |
|------|------------|
| Standing Permission | A persistent, signed authorization issued by a Principal that pre approves a defined class of future Invocations. |
| Grant | A single Standing Permission instance with a unique identifier. |
| Granter | The Principal who issued the Grant. |
| Grantee | The DID authorized by the Grant. |
| Scope of Grant | The narrowed set of Actions, data categories, frequencies, and counterparties that the Grant covers. |
| Consumption | A single Invocation that is permitted by a Grant. |

### 3.2 Grant Schema

```json
{
  "grant_id": "grn_01HX2QF8GZRP9V3K5YXJW0AQ7M",
  "granter": "did:web:user.example#personal",
  "grantee": "did:web:contractor.example",
  "issued_at": "2026-05-03T10:00:00Z",
  "expires_at": "2026-08-03T10:00:00Z",
  "revocable": true,
  "scope": {
    "tools": ["did:web:assistant-net.vercel.app"],
    "actions": ["calendar.read", "task.create", "message.send"],
    "message_types": ["task_delegation", "status_propagation"],
    "data_categories": ["scheduling", "task_status"],
    "max_invocations_per_day": 50,
    "max_invocations_total": null,
    "counterparties": ["did:web:contractor.example"],
    "spending_cap_eur_per_month": "200.00"
  },
  "constraints": {
    "geo_jurisdiction": ["DE", "AT", "CH"],
    "hours_of_day": "09:00-18:00",
    "days_of_week": ["mon", "tue", "wed", "thu", "fri"],
    "requires_business_purpose_tag": true
  },
  "revocation_endpoint": "https://user.example/.well-known/oap-revocation",
  "signature": "..."
}
```

### 3.3 Layered Composition

Standing Permissions occupy a defined position in the Policy Engine described in OAP-CORE-1.0 Section 20:

```
Layer 1: Platform Rules        (always wins)
Layer 2: Jurisdiction Rules    (always wins for affected jurisdictions)
Layer 3: Org Policy            (set by Principal's organization)
Layer 4: Scope Policy          (set by the Scope used)
Layer 5: Standing Permissions  (NEW: pre approval grants)
Layer 6: Personal Override     (Principal's neverShare list, always wins)
```

A Standing Permission MAY pre approve an Invocation only when Layers 1 through 4 already permit it. Standing Permissions MUST NOT loosen any restriction imposed by a higher layer.

### 3.4 Consumption and Receipts

Every Consumption MUST produce a Receipt that includes:

```json
{
  "consumed_grant_id": "grn_01HX2QF8GZRP9V3K5YXJW0AQ7M",
  "consumption_index": 17,
  "remaining_today": 33,
  "remaining_total": null
}
```

The Tool MUST verify before each Consumption that:

1. The Grant has not expired.
2. The Grant has not been revoked.
3. The action and data category are within the Scope of Grant.
4. The frequency caps and spending caps are not exceeded.

### 3.5 Revocation

A Granter MUST be able to revoke any Grant in real time. The Tool MUST refresh Grant status from the `revocation_endpoint` at least once every five minutes for active Grants. Tools MAY use a push subscription mechanism to avoid polling.

A revoked Grant MUST NOT permit any further Consumption. Receipts already produced under a revoked Grant remain valid as historical records.

### 3.6 Manifest Declaration

```json
{
  "standing_permissions": {
    "supported": true,
    "max_grants_per_principal": 256,
    "max_grant_duration_days": 365,
    "minimum_revocation_check_interval_seconds": 300,
    "supports_push_revocation": true
  }
}
```

## 4. Backward Compatibility

A Tool that does not declare `standing_permissions.supported = true` continues to require explicit consent for every Invocation. Existing v1.0 Receipts remain valid.

## 5. Security Considerations

1. **Stale Revocation.** A Tool that fails to honor revocation within the declared interval MUST be downgraded by community-operated services (RFC 0019, RFC 0026) to L0 conformance.
2. **Forged Grants.** All Grants MUST be cryptographically signed by the Granter DID. Tools MUST verify signatures and DID rotation history before honoring a Grant.
3. **Cap Bypass.** Tools MUST enforce caps server side. A client side cap is not a cap.

## 6. Privacy Considerations

Grants themselves are personal data. Tools MUST NOT publish Grant metadata to the Transparency Log without redacting Granter identity at a minimum.

## 7. Conformance Impact

Standing Permissions are OPTIONAL at L2 and REQUIRED at L4 (Collaborative). A Tool that does not support Standing Permissions cannot host long lived collaborations between Agents.

## 8. Implementation Experience

AssistNet operates Standing Permissions in production under the local term `dauererlaubnis`. The mechanism described in this RFC is a generalization of that implementation. Reference code is committed to `reference/server/permissions/`.

## 9. Alternatives Considered

1. **OAuth2 scopes only.** Rejected because OAuth scopes are coarse, not revocable per Grantee, and lack frequency or spending caps.
2. **Per session blanket consent.** Rejected because it provides weaker auditability than per Grant Receipts.

## 10. References

1. OAP-CORE-1.0, Section 20 (Policy Engine and Decision Records).
2. EU GDPR Articles 6 and 7 (Lawfulness and Conditions for Consent).
