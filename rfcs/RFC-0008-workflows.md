# RFC 0008: Workflow Composition

**Status:** Draft
**Author(s):** OAP Foundation, Working Group on Marketplace and Discovery
**Created:** 2026-05-03
**Working Group:** Marketplace and Discovery
**Targets:** 1.1

## 1. Summary

This RFC introduces Workflows, a normative mechanism for declaring and discovering multi step compositions of Actions. A Workflow describes an ordered or branching sequence of Action invocations, the data dependencies between them, the policy decisions that gate each step, and the expected outcome. Workflows are first class objects in the Discovery Plane: an Agent searching by intent finds entire workflows rather than only individual Actions.

## 2. Motivation

Most useful agent operations are sequences of Actions, not single Action invocations. "Book a meeting with Alice" expands into find user, retrieve availability, propose time, await confirmation, create calendar event, send invitation. "Onboard a new employee" expands into create contact, assign equipment ticket, schedule orientation, grant accounts, send welcome email.

Today these compositions are reinvented inside every Agent and inside every Tool that exposes a "macro". The cost is duplication; the risk is inconsistency. A normative Workflow primitive lets Tools and Marketplaces publish vetted compositions that Agents can discover, inspect, and execute as a single semantic unit while preserving per step audit.

## 3. Specification

### 3.1 Terminology

| Term | Definition |
|------|------------|
| Workflow | A named, versioned, declarative composition of Action invocations. |
| Step | A single Action invocation within a Workflow. |
| Step Dependency | A reference from one Step to the output of an earlier Step. |
| Workflow Instance | A specific execution of a Workflow with concrete inputs. |
| Branch | A conditional Step that selects one of several next Steps based on intermediate results. |
| Compensating Step | A Step that reverses the effect of an earlier Step on failure. |

### 3.2 Workflow Definition Schema

```json
{
  "workflow_id": "oap.workflow.book_meeting.v1",
  "name": "Book a meeting with a counterparty",
  "version": "1.0.0",
  "publisher_did": "did:web:assistant-net.vercel.app",
  "intent": "schedule a meeting with a known person",
  "intent_keywords": ["book meeting", "schedule call", "set up a meeting"],
  "expected_duration_seconds": 120,
  "estimated_cost_eur": "0.020",
  "risk_class": "minimal",
  "inputs": {
    "counterparty_query": { "type": "string", "required": true },
    "time_window": { "type": "object", "required": true },
    "duration_minutes": { "type": "integer", "default": 30 }
  },
  "steps": [
    {
      "step_id": "find_user",
      "action": "oap.entity.contact.search",
      "tool": "did:web:assistant-net.vercel.app",
      "input": { "query": "${input.counterparty_query}" },
      "output": "match"
    },
    {
      "step_id": "check_availability",
      "action": "oap.entity.calendar_event.search",
      "tool": "${steps.find_user.match.preferred_tool}",
      "input": {
        "owner_did": "${steps.find_user.match.did}",
        "between": "${input.time_window}",
        "transparency": "busy"
      },
      "output": "free_slots"
    },
    {
      "step_id": "negotiate_slot",
      "action": "oap.negotiation.open",
      "tool": "${steps.find_user.match.preferred_tool}",
      "input": {
        "category": "scheduling",
        "proposals": "${steps.check_availability.free_slots}"
      },
      "output": "agreement",
      "compensating_step": "withdraw_proposal"
    },
    {
      "step_id": "create_event",
      "action": "oap.entity.calendar_event.create",
      "tool": "${input.preferred_tool}",
      "input": {
        "start": "${steps.negotiate_slot.agreement.terms.start}",
        "end": "${steps.negotiate_slot.agreement.terms.end}",
        "participant_dids": ["${input.principal_did}", "${steps.find_user.match.did}"]
      }
    }
  ]
}
```

### 3.3 Workflow Discovery

The Discovery Plane is extended with a Workflow query mode:

```http
POST /oap/discover
Content-Type: application/oap+json

{
  "intent": "schedule a meeting with Alice next week",
  "include": ["actions", "workflows"],
  "max_results": 10
}
```

The Discovery service returns Actions and Workflows ranked by intent match score. Workflows MUST disclose their estimated cost, duration, and required Tool count so the requesting Agent can choose between a single Action and a Workflow that achieves the same end.

### 3.4 Workflow Instance Receipts

Each Step produces an ordinary Receipt. The Workflow Instance also produces a single Workflow Receipt that lists all Step Receipt identifiers, the resolved variable bindings, and the final outcome:

```json
{
  "workflow_instance_id": "wfi_01HX2QFXR0Q4S8U9V3W7X2Y0Z1",
  "workflow_id": "oap.workflow.book_meeting.v1",
  "started_at": "2026-05-03T10:00:00Z",
  "completed_at": "2026-05-03T10:01:45Z",
  "step_receipts": ["rec_001", "rec_002", "rec_003", "rec_004"],
  "outcome": "completed",
  "total_cost_eur": "0.018",
  "outcome_data_hash": "sha256-..."
}
```

### 3.5 Failure and Compensation

A Step that fails MUST trigger Compensating Steps in reverse order for any prior Steps that declared one. Compensating Steps are themselves Actions and produce ordinary Receipts. The Workflow Receipt MUST record the failure, the compensation chain, and the final consistent state.

### 3.6 Manifest Declaration

A Tool that publishes Workflows MUST declare them in its Manifest:

```json
{
  "workflows": {
    "supported": true,
    "registry_url": "https://example.com/.well-known/oap-workflows.json",
    "workflows_published": [
      "oap.workflow.book_meeting.v1",
      "oap.workflow.onboard_contact.v1"
    ]
  }
}
```

The registry document at `oap-workflows.json` lists the full Workflow definitions.

### 3.7 Vetting and Publisher Reputation

Marketplaces MAY rank Workflows by publisher reputation, success rate, and historical cost variance. Marketplaces MUST disclose ranking factors per OAP-CORE-1.0 Section 14 transparency requirements.

## 4. Backward Compatibility

Tools that do not declare `workflows.supported = true` are unaffected. Agents that do not query Workflows continue to receive Action only Discovery results.

## 5. Security Considerations

1. **Workflow Hijacking.** A Workflow definition MUST be signed by its publisher. Agents MUST verify the signature before execution.
2. **Variable Injection.** Workflow input variables MUST be type checked against declared schemas at every Step boundary.
3. **Privilege Aggregation.** A Workflow that combines low risk Actions into a high risk outcome MUST inherit the maximum risk class of its Steps.

## 6. Privacy Considerations

Workflow Receipts disclose execution structure. Workflows that handle personal data MUST honor Receipt minimization rules from OAP-CORE-1.0 Section 19.

## 7. Conformance Impact

Workflow support is OPTIONAL at all Conformance Levels. The Foundation will operate a Workflow Registry as a Foundation Service.

## 8. Implementation Experience

AssistNet operates a Workflow Engine in production with named compositions for booking, onboarding, weekly review, and document publication. The schema defined in this RFC is a normative generalization of the AssistNet implementation.

## 9. Alternatives Considered

1. **DAGs in agent code only.** Rejected because it removes Marketplace discoverability and per Step audit.
2. **BPMN 2.0.** Rejected as too heavy for typical agent compositions; OAP Workflows are intentionally simpler.

## 10. References

1. OAP-CORE-1.0, Section 14 (Capabilities Discovery).
2. RFC 0001 (Coordination Sessions), RFC 0002 (Negotiation Protocol).
