# Enterprise Agent Provisioning Example

This directory contains a worked example of the agent provisioning lifecycle defined in RFC 0031.

## Scenario

Alice is a software engineer at Acme Corp. She has a personal AI agent (Anthropic Claude Opus 4.6) that she uses in her private life. Acme Corp publishes a Provisioning Manifest that permits BYOA (Bring Your Own Agent) under compliance conditions. Alice's personal agent passes Acme's compliance evaluation and receives a BYOA Attestation. Each morning Alice's agent context switches from `#personal` to `#acme-engineer`, and each evening it switches back.

## Files

| File | Schema | RFC 0031 Section |
|------|--------|------------------|
| `provisioning-manifest.json` | `oap.provisioning.v1` | 3.2 |
| `byoa-attestation.json` | `oap.byoa-attestation.v1` | 3.5 |
| `context-switch.json` | `oap.context-switch.v1` | 3.4 |
| `offboarding-receipt.json` | `oap.offboarding-receipt.v1` | 3.6 |

## Lifecycle

1. **Discovery:** Alice's personal agent fetches `https://acme.example/.well-known/oap-provisioning.json` and discovers Acme's Provisioning Manifest.
2. **BYOA Evaluation:** The Manifest declares `byoa_policy.permitted = true`. Alice's agent submits compliance evidence (SOC2, EU residency, audit log capability). Acme issues a BYOA Attestation valid for 90 days.
3. **Context Switch:** Each workday morning, a Context Mobility Envelope records the transition from `#personal` to `#acme-engineer`. Only `calendar_busy_only`, `preferred_language`, and `timezone` are transferred. Personal messages, health data, and financial data are explicitly prohibited.
4. **Daily Operation:** Alice's agent operates under Acme's Organizational Policy (Layer 2 of the Policy Stack). Standing Permissions grant access to calendar, tasks, messages, and documents within the organizational Scope.
5. **Offboarding:** When Alice leaves Acme, an Offboarding Receipt records the revocation of all credentials, the export of Alice's personal data, the wiping of organizational memory, and the transition handoff of task titles and calendar commitments to Alice's personal Scope.

## Validation

```bash
cd oap-spec/reference/validator
node ajv-validate.js ../../examples/enterprise-agent-provisioning/provisioning-manifest.json
node ajv-validate.js ../../examples/enterprise-agent-provisioning/byoa-attestation.json
node ajv-validate.js ../../examples/enterprise-agent-provisioning/context-switch.json
```
