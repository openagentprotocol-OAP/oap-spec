# RFC 0006: Persona and Scope Layer

**Status:** Draft
**Author(s):** OAP Foundation, Working Group on Confidentiality and Compliance
**Created:** 2026-05-03
**Working Group:** CCC
**Targets:** 1.1

## 1. Summary

This RFC introduces a normative Persona and Scope layer for OAP. A single Principal MAY operate under multiple Scopes, each representing a bounded identity, role, or mandate. Each Scope has its own confidentiality boundary, its own data visibility rules, its own approval thresholds, and its own industry profile. Scopes are addressable as DID fragments, are independently revocable, and prevent unintentional leakage between distinct life or work contexts.

## 2. Motivation

A natural person operates as a parent, an employee, a patient, a board member, and a private individual at different moments. A legal person operates under multiple business units, departments, regulated functions, and joint ventures. A single global identity for either is both legally inadequate and operationally dangerous: medical context bleeds into employer context, family conversations leak into colleagues' notifications, attorney client privilege is compromised by adjacent project work.

Production deployments demonstrate that without a normative Scope layer, the only available defense is to operate multiple disconnected accounts, which prevents Agent assistance entirely. A Scope primitive that the protocol enforces removes this trade off.

## 3. Specification

### 3.1 Terminology

| Term | Definition |
|------|------------|
| Scope | A named, bounded execution context of a Principal. |
| Persona | A Scope that corresponds to a coherent identity narrative (e.g. personal, professional, patient). |
| Industry Profile | A predefined Scope template that encodes the regulatory obligations of a profession. |
| Cross Scope Leak | The transmission of data tagged with one Scope into a context tagged with a different Scope. |

### 3.2 Scope Identifier

Scopes are addressed as DID fragments:

```
did:web:user.example#personal
did:web:user.example#legal-practice
did:web:user.example#patient-relationships
did:web:user.example#board-member-acme
```

A Scope identifier MUST conform to the W3C DID Fragment grammar. The fragment portion is opaque to non Principal parties.

### 3.3 Scope Manifest

Each Principal MUST publish a Scope Manifest at:

```
https://{domain}/.well-known/oap-scopes.json
```

The Scope Manifest enumerates active Scopes, their industry profile, and their disclosure rules:

```json
{
  "principal": "did:web:user.example",
  "scopes": [
    {
      "id": "personal",
      "name": "Personal",
      "industry_profile": "default",
      "visible_to": ["family", "friends"],
      "approval_required_for": [],
      "data_minimization": "strict"
    },
    {
      "id": "legal-practice",
      "name": "Legal Practice",
      "industry_profile": "oap.profile.legal.attorney_client",
      "visible_to": ["clients"],
      "approval_required_for": ["data_share", "task_delegation"],
      "data_minimization": "strict",
      "regulatory_obligations": ["DE.BRAO.43a", "DE.StPO.53"]
    },
    {
      "id": "patient-relationships",
      "name": "Patient Care",
      "industry_profile": "oap.profile.medical.patient_confidentiality",
      "visible_to": ["treating_team"],
      "approval_required_for": ["data_share", "data_export"],
      "data_minimization": "minimum_necessary",
      "regulatory_obligations": ["EU.GDPR.9", "DE.StGB.203"]
    }
  ]
}
```

### 3.4 Industry Profiles

The Foundation maintains a registry of normative Industry Profiles:

| Profile Identifier | Domain |
|--------------------|--------|
| `oap.profile.medical.patient_confidentiality` | Health professionals subject to medical secrecy. |
| `oap.profile.legal.attorney_client` | Lawyers subject to attorney client privilege. |
| `oap.profile.finance.chinese_wall` | Investment professionals subject to information barriers. |
| `oap.profile.journalism.source_protection` | Journalists subject to source protection. |
| `oap.profile.clergy.confessional` | Clergy subject to confessional privilege. |
| `oap.profile.research.irb` | Research subject to institutional review board obligations. |
| `oap.profile.public_office.fiduciary` | Public officials subject to fiduciary duties. |

Each Profile defines mandatory restrictions that compose with the Policy Engine.

### 3.5 Scope Tagging

Every Entity, Receipt, Decision Record, and Session MUST carry a `scope_id` tag identifying the Scope under which it was produced. Tools MUST enforce that:

1. An Action invoked under Scope X cannot read data tagged with Scope Y unless explicit cross Scope authorization exists.
2. A Receipt produced under Scope X cannot be aggregated into an audit query that targets Scope Y.
3. A Sub Agent inherits the Scope of its Parent Agent at the time of the Delegation Token issuance.

### 3.6 Cross Scope Authorization

A Principal MAY explicitly authorize cross Scope visibility through a signed Cross Scope Bridge:

```json
{
  "bridge_id": "brg_01HX2QFXR0Q4S8U9V3W7X2Y0Z1",
  "principal": "did:web:user.example",
  "from_scope": "personal",
  "to_scope": "professional",
  "data_categories": ["calendar_busy_only"],
  "valid_until": "2026-12-31T23:59:59Z",
  "revocable": true,
  "signature": "..."
}
```

Bridges MUST NOT loosen a Profile mandated restriction.

### 3.7 Manifest Declaration

A Tool that supports Scopes MUST declare it:

```json
{
  "personas": {
    "supported": true,
    "max_scopes_per_principal": 32,
    "supports_industry_profiles": [
      "oap.profile.medical.patient_confidentiality",
      "oap.profile.legal.attorney_client",
      "oap.profile.finance.chinese_wall"
    ],
    "scope_inheritance_for_sub_agents": "always"
  }
}
```

## 4. Backward Compatibility

A Tool that does not declare `personas.supported = true` operates with a single implicit Scope per Principal. v1.0 Receipts that lack a `scope_id` are implicitly tagged with the default Scope.

## 5. Security Considerations

1. **Cross Scope Leak.** Tools MUST refuse Invocations that cross Scope boundaries without a valid Cross Scope Bridge.
2. **Industry Profile Forgery.** Profile bindings MUST be issued as Verifiable Credentials by recognized issuers (medical chambers, bar associations, regulators).

## 6. Privacy Considerations

Scope information itself is sensitive. Tools MUST NOT expose the full Scope Manifest of a Principal to counterparties without explicit consent. Counterparties only learn the Scope identifiers necessary to interact.

## 7. Conformance Impact

Scope support is OPTIONAL at L2 and L3. Scope support is REQUIRED at L4 (Collaborative) for any Tool that hosts data subject to a regulated profession. Scope support is REQUIRED at L5 (Certified).

## 8. Implementation Experience

AssistNet operates Scopes (under the local term "Personas") in production with industry profiles for medical, legal, and financial professionals. The mechanism described in this RFC is a generalization of the AssistNet Scope Engine. Reference code is committed to `reference/server/personas/`.

## 9. Alternatives Considered

1. **Multiple DIDs per Principal.** Rejected because it breaks reputation portability across Scopes.
2. **Tags only without enforcement.** Rejected because tags without enforcement provide no security guarantee.

## 10. References

1. OAP-CORE-1.0, Section 18 (Confidentiality and Compliance Context).
2. W3C DID Core, Section 3.2 (DID Syntax: Fragment).
