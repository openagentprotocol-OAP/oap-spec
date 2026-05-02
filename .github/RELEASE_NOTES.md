# Open Agent Protocol v1.0.0 — Public Working Draft 1

The first public release of the Open Agent Protocol specification.

## What's included

### Specification
- **OAP-CORE-1.0**: Full 38-section spec covering Identity, Discovery, Invocation, Commercial, Governance, Accountability, and Foundation planes

### Schemas (12 normative, JSON Schema 2020-12)
`oap-manifest`, `oap-action`, `oap-request-envelope`, `oap-response-envelope`, `oap-receipt`, `oap-decision-record`, `oap-ccc`, `oap-subscription`, `oap-wallet-statement`, `oap-incident`, `oap-deletion-receipt`, `oap-attestation`

### Protocol Adapters (bidirectional)
- **MCP** — Model Context Protocol bridge
- **A2A** — Agent-to-Agent Protocol bridge
- **OpenAI Functions** — function calling mapping
- **LangGraph** — LangChain tool wrapper

### Reference Implementations
- OAP Server (Express.js, L2 conformant)
- OAP Agent Runtime (Node.js)
- Conformance Validator (CLI + ajv)

### Examples
- `weather-pro/` — L3 Trusted Tool
- `legal-research-privileged/` — L5 Certified, attorney-client privilege
- `team-crm-collaborative/` — L4 Collaborative with optimistic locking

### Governance
- Foundation Charter (13-seat Board, anti-capture)
- RFC Process
- 8 Standing Working Groups

### First Production Implementation
**AssistNet** — live at `https://assistant-net.vercel.app/.well-known/oap-tool.json`

## Licenses
- Spec text: CC BY 4.0
- Code: Apache 2.0

## Try it now
```bash
curl -s https://assistant-net.vercel.app/.well-known/oap-tool.json | jq .tool.name
```
