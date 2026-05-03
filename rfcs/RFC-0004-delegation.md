# RFC 0004: Sub Agent Delegation

**Status:** Draft
**Author(s):** OAP Foundation, Working Group on Core Protocol
**Created:** 2026-05-03
**Working Group:** Core Protocol
**Targets:** 1.1

## 1. Summary

This RFC defines a normative protocol for Sub Agent Delegation. A primary Agent MAY spawn one or more child Agents to execute parallelizable subtasks, aggregate their results, and bind their costs to the parent Invocation. Each Sub Agent operates under a constrained delegation token that scopes its authority and produces Receipts that chain back to the parent Receipt. The result is a verifiable tree of Invocations that mirrors the underlying compute fan out.

## 2. Motivation

Modern agent workloads decompose naturally into parallelizable subproblems. Producing eight Web search results, querying twelve data sources, drafting four document sections, and reviewing fifteen pull requests are all map style problems whose serial execution is a bottleneck. Production deployments demonstrate ten times to twenty times wall clock improvements when these subproblems are dispatched concurrently.

Without a normative delegation primitive, every implementation invents its own concurrency model, its own cost attribution rules, and its own receipt schema. This prevents cross Tool composition (a Sub Agent spawned in Tool A cannot be billed against the parent in Tool B) and prevents cross platform audit (a regulator cannot trace a delegated decision back to the human Principal).

## 3. Specification

### 3.1 Terminology

| Term | Definition |
|------|------------|
| Parent Agent | The Agent that initiates a Delegation. |
| Sub Agent | An Agent spawned by the Parent Agent to execute a bounded subtask. |
| Delegation Token | A short lived bearer credential that constrains a Sub Agent's authority. |
| Delegation Tree | The directed acyclic graph of Receipts produced by a Parent Agent and its descendants. |
| Aggregator | The component (typically inside the Parent Agent) that combines Sub Agent results. |

### 3.2 Delegation Token

A Delegation Token MUST be a JWT signed by the Parent Agent with the following claims:

```json
{
  "iss": "did:web:parent.example",
  "sub": "did:key:z6Mkr...",
  "aud": "did:web:tool.example",
  "iat": 1717420800,
  "exp": 1717421100,
  "jti": "del_01HX2QFP4N8R5T6V7W8X9Y0Z1A",
  "parent_session_id": "ses_01HX2QF8GZRP9V3K5YXJW0AQ7M",
  "parent_invocation_id": "inv_01HX2QFXR0Q4S8U9V3W7X2Y0Z1",
  "delegation_depth": 1,
  "max_delegation_depth": 3,
  "scope": {
    "actions": ["search.web", "fetch.url"],
    "max_invocations": 10,
    "max_cost_eur": "0.50",
    "data_categories": ["public"],
    "max_wall_time_seconds": 60
  },
  "consumed_grant_id": "grn_01HX2QF8GZRP9V3K5YXJW0AQ7M"
}
```

Tools MUST verify the token signature against the Parent Agent's published key. Tools MUST refuse Invocations that exceed the declared scope.

### 3.3 Receipt Chaining

Each Sub Agent Receipt MUST include the parent linkage:

```json
{
  "delegation": {
    "parent_invocation_id": "inv_01HX2QFXR0Q4S8U9V3W7X2Y0Z1",
    "parent_agent_did": "did:web:parent.example",
    "delegation_token_jti": "del_01HX2QFP4N8R5T6V7W8X9Y0Z1A",
    "depth": 1,
    "sibling_index": 3
  }
}
```

The Parent Agent MUST emit an Aggregation Receipt that lists all child Receipts and the aggregated result:

```json
{
  "aggregation": {
    "child_invocations": [
      "inv_chld_001",
      "inv_chld_002",
      "inv_chld_003"
    ],
    "child_count": 3,
    "child_success_count": 3,
    "child_failure_count": 0,
    "aggregation_strategy": "concat | reduce | vote | first_successful",
    "aggregated_result_hash": "sha256-..."
  }
}
```

### 3.4 Cost Attribution

Costs incurred by a Sub Agent MUST be attributed to the Parent Agent's Wallet by default. A Tool MAY support direct billing of the Sub Agent's Principal if the Parent Agent's Delegation Token explicitly opts out:

```json
"billing": "parent | sub_agent"
```

When `billing = parent`, the Tool MUST issue a Settlement Receipt against the Parent Agent's Wallet for the sum of all child costs and MUST issue zero amount Settlements against the Sub Agents.

### 3.5 Depth Limits

A Tool MUST refuse Delegation Tokens whose `delegation_depth` exceeds `max_delegation_depth`. The Parent Agent SHOULD set `max_delegation_depth` to the smallest value sufficient for the task. The Foundation strongly RECOMMENDS a global ceiling of `max_delegation_depth = 5`.

### 3.6 Manifest Declaration

```json
{
  "delegation": {
    "supported": true,
    "max_concurrent_sub_agents_per_parent": 32,
    "max_delegation_depth": 5,
    "supports_aggregation_receipt": true,
    "billing_modes": ["parent", "sub_agent"]
  }
}
```

## 4. Backward Compatibility

Tools that do not declare `delegation.supported = true` reject Delegation Tokens and remain v1.0 conformant. Agents that do not spawn Sub Agents are unaffected.

## 5. Security Considerations

1. **Token Theft.** Delegation Tokens MUST have short expiry (RECOMMENDED maximum 600 seconds) to limit blast radius.
2. **Privilege Escalation.** A Sub Agent MUST NOT issue Delegation Tokens whose scope is wider than its own.
3. **Fan Out Attacks.** Tools MUST enforce per Parent concurrency caps to prevent denial of service via uncontrolled fan out.

## 6. Privacy Considerations

Sub Agent Receipts MAY reveal the structure of the Parent Agent's reasoning. Tools MUST allow Aggregation Receipts to redact sibling identifiers when the Parent Agent requests it.

## 7. Conformance Impact

Sub Agent Delegation is OPTIONAL at L2 and REQUIRED at L4 (Collaborative).

## 8. Implementation Experience

AssistNet operates Sub Agent Delegation in production via its `sub-agent-engine`, with documented wall clock improvements of six times to twelve times for parallelizable workloads. A reference implementation is committed to `reference/server/delegation/`.

## 9. Alternatives Considered

1. **Map Reduce framework.** Rejected because it constrains the aggregation strategy.
2. **No delegation primitive.** Rejected because it forces agents to run sequentially or to rebuild this mechanism out of band.

## 10. References

1. OAP-CORE-1.0, Sections 8 (Invocation), 11 (Pricing), 19 (Receipts).
2. RFC 7519, JSON Web Token.
