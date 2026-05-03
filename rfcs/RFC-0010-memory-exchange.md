# RFC 0010: Memory Exchange Protocol

**Status:** Draft
**Author(s):** OAP Working Group on Core Protocol
**Created:** 2026-05-03
**Working Group:** Core Protocol
**Targets:** 1.2

## 1. Summary

This RFC defines a normative protocol for exchanging structured memory between Agents. Memory Exchange enables a Principal to grant another Agent access to a defined slice of the Principal's Agent memory store, including conversational history, learned preferences, and semantic embeddings. Memory Exchange is the substrate for delegation that requires context, hand off between assistants, and continuity across vendor changes.

## 2. Motivation

A user who wants to delegate a project to a contractor's Agent currently faces a choice between forwarding raw chat logs (excessive disclosure, no privacy filter) and rebriefing the contractor manually (defeats the purpose of agent assistance). Production deployments solve this with bespoke memory export formats, but the formats are not interoperable.

Standardizing memory exchange unlocks four scenarios:

1. **Delegated Project Briefing.** A Sub Agent receives the relevant context for a delegated project without seeing unrelated personal data.
2. **Vendor Migration.** A user moves from Assistant A to Assistant B and brings their accumulated context with them.
3. **Team Continuity.** A team member's accumulated knowledge survives their departure into a successor's Agent.
4. **Cross Tool Context.** A workflow that spans multiple Tools shares relevant context across them.

## 3. Specification

### 3.1 Terminology

| Term | Definition |
|------|------------|
| Memory Item | A single structured unit of agent memory. |
| Memory Slice | A bounded subset of Memory Items selected by query and filter. |
| Memory Grant | A signed authorization to access a Memory Slice. |
| Memory Manifest | A self description of an Agent's memory store. |
| Embedding Profile | The model and dimensionality used for vector embeddings. |

### 3.2 Memory Item Schema

```json
{
  "item_id": "mem_01HX2QFXR0Q4S8U9V3W7X2Y0Z1",
  "owner_did": "did:web:user.example",
  "scope_id": "personal",
  "kind": "fact | preference | conversation_turn | summary | observation | document_reference",
  "subject_entity_id": "ent_org_acme",
  "content": {
    "text": "User prefers morning meetings on Tuesdays and Thursdays.",
    "structured": { "preference_kind": "scheduling", "value": { "preferred_days": ["tue", "thu"], "time_of_day": "morning" } }
  },
  "embedding": {
    "model": "openai/text-embedding-3-small",
    "dimensions": 1536,
    "vector_url": "https://example.com/oap/memory/vec/mem_01HX2QFXR0Q4S8U9V3W7X2Y0Z1.bin"
  },
  "provenance": {
    "source_receipt": "rec_01HX2QF8GZRP9V3K5YXJW0AQ7M",
    "captured_at": "2026-05-01T14:00:00Z",
    "confidence": 0.92
  },
  "labels": ["preference", "scheduling"],
  "ttl_days": 365,
  "exportable": true
}
```

### 3.3 Memory Manifest

```
https://{domain}/.well-known/oap-memory.json
```

```json
{
  "principal": "did:web:user.example",
  "scopes": ["personal", "professional"],
  "embedding_profiles": [
    { "model": "openai/text-embedding-3-small", "dimensions": 1536 },
    { "model": "voyage-2", "dimensions": 1024 }
  ],
  "kinds_supported": ["fact", "preference", "conversation_turn", "summary", "observation", "document_reference"],
  "endpoints": {
    "query": "https://example.com/oap/memory/query",
    "grant": "https://example.com/oap/memory/grant",
    "export": "https://example.com/oap/memory/export"
  },
  "max_grant_size_items": 10000
}
```

### 3.4 Memory Grant

```json
{
  "grant_id": "mgr_01HX2QFXR0Q4S8U9V3W7X2Y0Z1",
  "granter": "did:web:user.example#personal",
  "grantee": "did:web:contractor.example",
  "purpose": "Brief the contractor on the website redesign project.",
  "filter": {
    "subject_entity_ids": ["ent_proj_website_redesign"],
    "kinds": ["fact", "preference", "summary"],
    "captured_after": "2026-01-01T00:00:00Z",
    "labels_any": ["website_redesign"]
  },
  "max_items": 500,
  "expires_at": "2026-06-30T23:59:59Z",
  "revocable": true,
  "redaction_profile": "oap.profile.projection.contact.v1",
  "signature": "..."
}
```

### 3.5 Query

```http
POST /oap/memory/query
Authorization: Bearer {memory_grant_jwt}
Content-Type: application/oap+json

{
  "query": "what is the user's preferred meeting cadence with the contractor?",
  "max_results": 20,
  "include_embeddings": false
}
```

The response is a list of Memory Items filtered by the Grant and ranked by query relevance. The Tool MUST apply the Projection Profile (RFC 0007) named in the Grant before returning content.

### 3.6 Provenance and Hash Chain

Each returned Memory Item MUST include a chained hash that proves it was not altered relative to its capture state. Tools that store Memory Items MUST maintain a per Item provenance log.

### 3.7 Manifest Declaration

```json
{
  "memory_exchange": {
    "supported": true,
    "max_grant_duration_days": 180,
    "max_grant_size_items": 10000,
    "supported_redaction_profiles": [
      "oap.profile.projection.contact.v1"
    ]
  }
}
```

## 4. Backward Compatibility

Memory Exchange is additive. Tools without `memory_exchange.supported` continue to operate at v1.0.

## 5. Security Considerations

1. **Grant Token Theft.** Grants are bearer tokens and MUST be transmitted only over TLS, with short expiry and rotatable signing keys.
2. **Embedding Inversion.** Tools MUST NOT return raw embeddings to Grantees by default. Embedding access is a separate Grant scope.

## 6. Privacy Considerations

Memory contains intimate personal information. Tools MUST honor deletion requests under OAP-CORE-1.0 Section 17 across all Memory Items, including those covered by active Grants.

## 7. Conformance Impact

Memory Exchange is OPTIONAL at all Conformance Levels. The Stewards will publish reference implementations and a portable export format.

## 8. Implementation Experience

AssistNet operates a Memory Engine with semantic search over conversational history and learned facts. The mechanism described in this RFC is a generalization that decouples the Memory Store from the Tool that exposes it.

## 9. Alternatives Considered

1. **Plain text export only.** Rejected because it loses semantic structure and embeddings.
2. **Vector database federation.** Rejected because it forces a particular storage substrate on all participants.

## 10. References

1. OAP-CORE-1.0, Sections 17 (Data Policy), 19 (Receipts).
2. RFC 0007 (Privacy Preserving Projections).
