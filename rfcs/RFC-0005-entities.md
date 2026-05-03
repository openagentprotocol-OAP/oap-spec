# RFC 0005: Canonical Entity Schemas

**Status:** Draft
**Author(s):** OAP Working Group on Core Protocol
**Created:** 2026-05-03
**Working Group:** Core Protocol
**Targets:** 1.1

## 1. Summary

This RFC introduces a normative registry of Canonical Entity Schemas. Entities are the durable nouns that Agents and Tools exchange: people, organizations, tasks, calendar events, deals, documents, messages, and similar concepts. Today every Tool defines its own incompatible representation, forcing Agents to perform per Tool field mapping. Canonical Entity Schemas provide a shared vocabulary that Tools MAY adopt as their native format and that Agents can use as a translation pivot when integrating with non native Tools.

## 2. Motivation

When a user asks an Agent to "create a task in Asana, mirror it in Linear, and add the assignee to my CRM as a contact", the Agent must currently translate the same logical entity (a task) into three incompatible JSON shapes. The same problem repeats for contacts, calendar events, deals, organizations, and documents. The result is brittle integration code, lost data on round trip, and no path to deterministic deduplication across Tools.

A canonical schema layer solves three problems at once:

1. **Translation pivot.** Agents map Tool A to canonical, then canonical to Tool B.
2. **Deduplication.** A canonical contact across Tools is the same contact and can be matched.
3. **Marketplace search.** Discovery can filter Tools by the entity types they support.

## 3. Specification

### 3.1 Terminology

| Term | Definition |
|------|------------|
| Entity | A typed, identifiable object that an OAP Tool stores or exposes. |
| Canonical Schema | A normative JSON Schema published under the `oap.entity` namespace. |
| Canonical Field | A field name reserved by a Canonical Schema. |
| Extension Field | A namespaced field added by a Tool that extends but does not conflict with a Canonical Schema. |

### 3.2 Namespace and Registry

Canonical Schemas live under the IANA registry `oap.entity` and are addressable by stable identifier:

```
oap.entity.contact         (v1.0)
oap.entity.organization    (v1.0)
oap.entity.task            (v1.0)
oap.entity.calendar_event  (v1.0)
oap.entity.deal            (v1.0)
oap.entity.message         (v1.0)
oap.entity.document        (v1.0)
oap.entity.project         (v1.0)
oap.entity.note            (v1.0)
oap.entity.attachment      (v1.0)
oap.entity.location        (v1.0)
oap.entity.invoice         (v1.0)
```

The Stewards maintains the registry. New types follow the RFC process. Versioning is per type, not global.

### 3.3 Required Common Fields

Every Canonical Entity MUST expose the following fields:

```json
{
  "entity_type": "oap.entity.contact",
  "entity_version": "1.0",
  "id": "ent_01HX2QFP4N8R5T6V7W8X9Y0Z1A",
  "owner_did": "did:web:user.example#personal",
  "created_at": "2026-05-03T10:00:00Z",
  "updated_at": "2026-05-03T11:30:00Z",
  "external_ids": {
    "did:web:tool-a.example": "abc-123",
    "did:web:tool-b.example": "xyz-789"
  },
  "labels": ["customer", "vip"],
  "extensions": {
    "did:web:tool-a.example": {
      "favorite_color": "blue"
    }
  }
}
```

### 3.4 Example: Canonical Contact

```json
{
  "entity_type": "oap.entity.contact",
  "entity_version": "1.0",
  "id": "ent_...",
  "owner_did": "did:web:user.example#personal",
  "names": {
    "given": "Alice",
    "family": "Schmidt",
    "preferred_pronoun": "she_her"
  },
  "channels": [
    { "type": "email", "value": "alice@example.com", "primary": true },
    { "type": "phone", "value": "+49301234567" }
  ],
  "affiliations": [
    {
      "organization_id": "ent_org_...",
      "role": "Product Lead",
      "since": "2024-01-01",
      "until": null,
      "employment_type": "full_time"
    }
  ],
  "addresses": [],
  "social": {},
  "skills": ["product_management", "agile"],
  "languages": ["de", "en"]
}
```

### 3.5 Example: Canonical Task

```json
{
  "entity_type": "oap.entity.task",
  "entity_version": "1.0",
  "id": "ent_...",
  "owner_did": "did:web:user.example",
  "title": "Draft RFC 0005",
  "description": "Write the canonical entity schemas RFC.",
  "status": "in_progress",
  "priority": "high",
  "due_at": "2026-05-10T17:00:00Z",
  "assignee_dids": ["did:web:user.example"],
  "linked_entity_ids": ["ent_proj_..."],
  "estimated_minutes": 240,
  "actual_minutes": null,
  "blocked_by": [],
  "blocks": []
}
```

### 3.6 Manifest Declaration

A Tool that natively supports one or more Canonical Entity types MUST declare them:

```json
{
  "canonical_entities": {
    "supported": [
      { "type": "oap.entity.contact", "versions": ["1.0"], "modes": ["read", "write"] },
      { "type": "oap.entity.task", "versions": ["1.0"], "modes": ["read", "write"] },
      { "type": "oap.entity.calendar_event", "versions": ["1.0"], "modes": ["read"] }
    ],
    "translation_endpoint": "https://example.com/oap/entities/translate"
  }
}
```

### 3.7 Canonical Action Naming

Tools that support Canonical Entities SHOULD expose Actions with canonical names:

```
oap.entity.contact.create
oap.entity.contact.read
oap.entity.contact.update
oap.entity.contact.delete
oap.entity.contact.search
oap.entity.contact.merge
```

### 3.8 Translation

A Tool MAY expose a `translation_endpoint` that converts its native representation to and from a Canonical Entity. Translation MUST be lossless for Canonical fields and MUST preserve Tool specific fields under the `extensions` key.

### 3.9 Cross Tool Identity

The `external_ids` map enables cross Tool deduplication. When two Tools mirror the same entity, both SHOULD include each other's identifier in `external_ids`. Agents performing deduplication MUST treat any pair of entities that share at least one `external_ids` entry as the same entity.

## 4. Backward Compatibility

Canonical Entities are additive. Tools that do not declare `canonical_entities.supported` are unaffected.

## 5. Security Considerations

1. **Field Conflict.** Tools MUST NOT introduce extension fields that shadow canonical field names.
2. **Translation Tampering.** Translation endpoints MUST sign their output to allow Agents to verify integrity.

## 6. Privacy Considerations

Canonical Entities frequently contain personal data. Tools MUST honor the `data_delete` endpoint described in OAP-CORE-1.0 for all Canonical Entities they store.

## 7. Conformance Impact

Canonical Entity support is OPTIONAL at all Conformance Levels. The Stewards strongly RECOMMENDS adoption for Tools whose primary value is data storage or workflow management.

## 8. Implementation Experience

AssistNet exposes its native entity model under the canonical names defined in this RFC, with mapping documented in `reference/mappings/assistnet.md`. The mapping covers contacts, organizations, tasks, projects, calendar events, deals, and documents.

## 9. Alternatives Considered

1. **JSON LD with schema.org.** Rejected because schema.org lacks the workflow specific entities (task, deal, project) that agent platforms require.
2. **GraphQL federation.** Rejected because OAP is transport agnostic and SHOULD NOT mandate a query language.

## 10. References

1. OAP-CORE-1.0, Section 7 (Action Schema).
2. JSON Schema 2020-12.
