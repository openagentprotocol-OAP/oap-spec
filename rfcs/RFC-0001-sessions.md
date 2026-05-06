# RFC 0001: Coordination Sessions

**Status:** Draft
**Author(s):** T. Fengler (Editor)
**Working Group:** Core Protocol
**Created:** 2026-05-03
**Working Group:** Core Protocol
**Targets:** 1.1
**Supersedes:** none
**Superseded-by:** none

## 1. Summary

This RFC introduces Coordination Sessions, a normative mechanism for grouping multiple OAP Invocations into a single, addressable, multi turn interaction with shared state, shared participants, and a shared lifecycle. Sessions are the foundation for any agent collaboration that cannot be expressed as a single request and response, including project delegation, joint planning, iterative deliverable refinement, and persistent task ownership across multiple Tools.

## 2. Motivation

OAP-CORE-1.0 defines invocation as stateless. An Agent invokes an Action, receives a Response Envelope and a Receipt, and the interaction concludes. This is sufficient for atomic Tool calls but is structurally inadequate for the patterns observed in production multi agent deployments.

Three concrete patterns are not expressible under v1.0:

1. **Project Delegation.** An Agent delegates a project that requires multiple steps over multiple days. The receiving Agent needs to reference the original delegation when submitting partial results, requesting clarification, or reporting blocked status.
2. **Joint Planning.** Two or more Agents jointly elaborate a plan over multiple turns. Each turn refines proposals from previous turns. Without a shared session identifier the Tools cannot disambiguate concurrent planning threads.
3. **Persistent Tool Engagement.** A user instructs an Agent to "keep this contractor briefed for the next two weeks". The Agent needs a stable handle to a long lived collaboration that survives process restarts and can be resumed by either party.

Production implementations have invented bespoke session mechanisms. AssistNet uses opaque `sessionId` fields with custom Firestore documents. The MCP community has discussed extension proposals. None of these are interoperable. This RFC standardizes the primitive.

## 3. Specification

### 3.1 Terminology

| Term | Definition |
|------|------------|
| Session | A persistent, addressable container for related Invocations between two or more Participants. |
| Participant | A DID that has been admitted to a Session. |
| Convener | The Participant that created the Session and holds administrative rights. |
| Session State | A schema constrained, monotonically versioned object that all Participants can read and propose updates to. |
| Turn | A single Invocation within a Session that updates Session State or appends to the Session log. |

### 3.2 Session Lifecycle

A conformant Tool that supports Sessions MUST expose the following endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/oap/session/create` | POST | Create a new Session. |
| `/oap/session/{id}/join` | POST | Add a Participant. |
| `/oap/session/{id}/leave` | POST | Remove a Participant. |
| `/oap/session/{id}/state` | GET | Retrieve current Session State. |
| `/oap/session/{id}/update` | POST | Propose an update to Session State. |
| `/oap/session/{id}/close` | POST | Close the Session. |
| `/oap/session/{id}/log` | GET | Retrieve the receipt chain for the Session. |

Session State MUST be addressed by a monotonically increasing integer `state_version` that prevents lost updates. A Tool MUST reject any update whose `expected_version` does not equal the current `state_version`.

### 3.3 Session Manifest Field

A Tool that supports Sessions MUST declare a `sessions` block in its Manifest:

```json
{
  "sessions": {
    "supported": true,
    "max_participants": 16,
    "max_duration_hours": 720,
    "state_schema": "https://example.com/schemas/project-session-v1.json",
    "concurrency_model": "optimistic",
    "resumable_after_disconnect": true,
    "supports_pause": true,
    "supports_handoff": true
  }
}
```

### 3.4 Request Envelope Extension

The OAP Request Envelope is extended with an OPTIONAL `session` member:

```json
{
  "envelope_version": "1.0",
  "session": {
    "session_id": "ses_01HX2QF8GZRP9V3K5YXJW0AQ7M",
    "expected_version": 12,
    "turn_id": "trn_01HX2QFP4N8R5T6V7W8X9Y0Z1A"
  }
}
```

When `session` is present, the Tool MUST associate the resulting Receipt with the Session log and MUST atomically increment `state_version` on success.

### 3.5 Receipt Extension

Each Receipt produced inside a Session MUST include the Session identifier and the prior Turn identifier:

```json
{
  "session_id": "ses_01HX2QF8GZRP9V3K5YXJW0AQ7M",
  "turn_id": "trn_01HX2QFP4N8R5T6V7W8X9Y0Z1A",
  "previous_turn_id": "trn_01HX2QF8GZRP9V3K5YXJW0AQ7M"
}
```

This produces a per Session hash chain that is verifiable independently of the Tool wide Transparency Log.

### 3.6 Convener Authority

The Convener MAY:

1. Admit Participants by issuing a signed `SessionAdmission` credential.
2. Revoke a Participant by signing a `SessionRevocation` credential.
3. Close the Session.
4. Transfer Convener authority to another Participant by signing a `SessionHandoff` credential.

A non Convener Participant MUST NOT perform these operations. A Tool MUST verify the Convener signature before accepting any of these requests.

### 3.7 Confidentiality

Session State is REQUIRED to inherit the Confidentiality and Compliance Context (CCC) of the most restrictive participating Scope. A Tool MUST refuse to add a Participant whose Scope cannot satisfy the Session CCC.

## 4. Backward Compatibility

This RFC is fully backward compatible. Tools that do not declare `sessions.supported = true` operate as v1.0 stateless Tools. Agents that do not include a `session` block in the Request Envelope receive v1.0 stateless behavior.

## 5. Security Considerations

1. **Session Hijacking.** Tools MUST verify the Participant DID against the Session admission ledger on every request.
2. **Replay.** The `expected_version` mechanism prevents replay of stale updates.
3. **Denial of Service.** Tools MUST enforce per Convener Session quotas to prevent resource exhaustion.

## 6. Privacy Considerations

Session logs are personal data when Participants are natural persons. Tools MUST honor the Session Convener as the controller of the Session log and MUST support deletion through the standard `data_delete` endpoint.

## 7. Conformance Impact

Session support is OPTIONAL at L2 and L3. Session support is REQUIRED at L4 (Collaborative). Section 31 (Conformance Levels) is amended to make this explicit.

## 8. Implementation Experience

AssistNet operates Coordination Sessions in production for project delegation between independent Agents. The mechanism described in this RFC is a generalization of the AssistNet Relay Session model. A reference implementation is committed to `reference/server/sessions/`.

## 9. Alternatives Considered

1. **Stateless conversation IDs only.** Rejected because they do not provide concurrency safety or shared state.
2. **WebSocket bound sessions.** Rejected because OAP is transport agnostic and Sessions must survive disconnection.
3. **Server Sent Events streams as session containers.** Rejected for the same reason.

## 10. References

1. OAP-CORE-1.0, Sections 8 (Invocation Protocol) and 19 (Receipts).
2. RFC 8174, Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words.
3. RFC 0027 (Ad Hoc Teamwork and Convention Discovery), for Sessions that admit Participants on capability match rather than Convener signature. The Convener gated admission model of section 3.6 of the present RFC remains the default; capability match and open admission are the additive extensions defined in section 3.3 of RFC 0027.
4. RFC 0028 (Model Risk and Symbiotic Autonomy), for Sessions that involve consequential decisions: Decision Records produced within a Session inherit the confidence threshold and counterfactual explanation requirements of section 3.5 and 3.7 of RFC 0028.
