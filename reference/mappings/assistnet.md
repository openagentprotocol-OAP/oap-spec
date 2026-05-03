# AssistNet to OAP Reference Mapping

This document records how AssistNet, the first production deployment of OAP, maps its
internal entity model and action namespace to the canonical OAP vocabulary defined in
RFC 0005 (Canonical Entity Schemas) and OAP-CORE-1.0 Section 7 (Action Schema).

It is informative, not normative. Other implementations may publish their own mapping
documents in this directory.

## 1. Entity Mapping

| AssistNet Collection or Type | OAP Canonical Entity | Notes |
|------------------------------|----------------------|-------|
| `users` (profile fields)     | `oap.entity.contact` (self) | The Principal's own profile is exposed as a self contact. |
| `connections.contact`        | `oap.entity.contact` | Counterparty contacts in the user's network. |
| `companies`                  | `oap.entity.organization` | Includes parent and related company graph. |
| `tasks`                      | `oap.entity.task` | Status set: `todo`, `in_progress`, `done`, `blocked`. |
| `events`                     | `oap.entity.calendar_event` | Includes recurring events with exceptions. |
| `pipeline.deals`             | `oap.entity.deal` | Sales, fundraising, and partnership deals. |
| `documents`                  | `oap.entity.document` | Knowledge base entries and uploaded files. |
| `projects`                   | `oap.entity.project` | Multi participant collaborative projects. |
| `notes`                      | `oap.entity.note` | Free form notes attached to other entities. |
| `messages` (DM, group)       | `oap.entity.message` | Conversation messages with thread linkage. |
| `attachments`                | `oap.entity.attachment` | Files attached to messages or documents. |
| `assistantMessages`          | (not mapped)         | Internal protocol traffic; surfaced via Receipts only. |
| `meetups`                    | `oap.entity.calendar_event` (with negotiation) | Negotiated meetups, see RFC 0002. |
| `interactions`               | (not mapped)         | Captured as Performance Records, see RFC 0009. |

## 2. Action Mapping

AssistNet's internal action registry (the `[ACTION:type]{json}[/ACTION]` convention used
by the assistant runtime) is exposed under canonical OAP names where a Canonical Entity
exists.

### 2.1 Contacts

| AssistNet Action     | OAP Canonical Action            |
|----------------------|---------------------------------|
| `create_contact`     | `oap.entity.contact.create`     |
| `update_contact`     | `oap.entity.contact.update`     |
| `delete_contact`     | `oap.entity.contact.delete`     |
| `search_contacts`    | `oap.entity.contact.search`     |
| `merge_contacts`     | `oap.entity.contact.merge`      |

### 2.2 Organizations

| AssistNet Action          | OAP Canonical Action                 |
|---------------------------|--------------------------------------|
| `create_company`          | `oap.entity.organization.create`     |
| `update_company`          | `oap.entity.organization.update`     |
| `link_company_to_company` | `oap.entity.organization.link`       |
| `search_companies`        | `oap.entity.organization.search`     |

### 2.3 Tasks

| AssistNet Action        | OAP Canonical Action          |
|-------------------------|-------------------------------|
| `create_task`           | `oap.entity.task.create`      |
| `update_task_status`    | `oap.entity.task.update`      |
| `assign_task`           | `oap.entity.task.update`      |
| `delete_task`           | `oap.entity.task.delete`      |
| `search_tasks`          | `oap.entity.task.search`      |

### 2.4 Calendar Events

| AssistNet Action               | OAP Canonical Action                       |
|--------------------------------|--------------------------------------------|
| `create_event`                 | `oap.entity.calendar_event.create`         |
| `update_event`                 | `oap.entity.calendar_event.update`         |
| `cancel_event`                 | `oap.entity.calendar_event.delete`         |
| `find_free_slots`              | `oap.entity.calendar_event.search`         |
| `negotiate_meeting`            | `oap.negotiation.open` (RFC 0002)          |

### 2.5 Deals

| AssistNet Action       | OAP Canonical Action          |
|------------------------|-------------------------------|
| `create_deal`          | `oap.entity.deal.create`      |
| `update_deal_stage`    | `oap.entity.deal.update`      |
| `close_deal`           | `oap.entity.deal.update`      |
| `search_deals`         | `oap.entity.deal.search`      |

### 2.6 Documents and Notes

| AssistNet Action     | OAP Canonical Action                |
|----------------------|-------------------------------------|
| `create_document`    | `oap.entity.document.create`        |
| `update_document`    | `oap.entity.document.update`        |
| `share_document`     | `oap.entity.document.read` (granted) |
| `create_note`        | `oap.entity.note.create`            |
| `attach_file`        | `oap.entity.attachment.create`      |

### 2.7 Projects

| AssistNet Action          | OAP Canonical Action            |
|---------------------------|---------------------------------|
| `create_project`          | `oap.entity.project.create`     |
| `update_project`          | `oap.entity.project.update`     |
| `add_project_member`      | `oap.entity.project.update`     |
| `delegate_project`        | (RFC 0004 Sub Agent Delegation) |

### 2.8 Messaging

| AssistNet Action     | OAP Canonical Action          |
|----------------------|-------------------------------|
| `send_message`       | `oap.entity.message.create`   |
| `read_thread`        | `oap.entity.message.search`   |

## 3. Protocol Feature Mapping

| AssistNet Feature                       | OAP Mechanism                                   |
|-----------------------------------------|-------------------------------------------------|
| Multi agent Relay Sessions              | RFC 0001 (Coordination Sessions)                |
| Booking Engine and meetup negotiation   | RFC 0002 (Negotiation Protocol)                 |
| `dauererlaubnis` (standing permissions) | RFC 0003 (Standing Permissions)                 |
| Sub agent spawning and aggregation      | RFC 0004 (Sub Agent Delegation)                 |
| Internal entity registry                | RFC 0005 (Canonical Entity Schemas)             |
| Personas / Scopes with industry profiles | RFC 0006 (Persona and Scope Layer)             |
| Sharing System with trust levels        | RFC 0007 (Privacy Preserving Projections)       |
| Workflow Engine                         | RFC 0008 (Workflow Composition)                 |
| Connection performance ratings          | RFC 0009 (Reputation and Performance Records)   |
| Semantic Memory store                   | RFC 0010 (Memory Exchange Protocol)             |

## 4. Identifier Mapping

AssistNet exposes its own internal IDs (Firestore document IDs) under the OAP
`external_ids` map of every Canonical Entity:

```json
{
  "entity_type": "oap.entity.contact",
  "id": "ent_01HX2QFP4N8R5T6V7W8X9Y0Z1A",
  "external_ids": {
    "did:web:assistant-net.vercel.app": "user-firestore-id-abc123"
  }
}
```

This permits round trip translation and cross Tool deduplication per RFC 0005 Section 3.9.

## 5. Confidentiality and Compliance

AssistNet operates the four layer Policy Engine described in OAP-CORE-1.0 Section 18.
Where a Scope (RFC 0006) is bound to an industry profile, AssistNet enforces the
profile's mandatory restrictions before any Action invocation. Currently active profiles:

- `oap.profile.medical.patient_confidentiality`
- `oap.profile.legal.attorney_client`
- `oap.profile.finance.chinese_wall`

## 6. Conformance Level Claim

AssistNet currently claims OAP Conformance Level **L2 (Discoverable)** with elective
support for the optional features above as RFC drafts mature toward ratification.
