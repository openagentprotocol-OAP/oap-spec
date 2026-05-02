# OAP Reference Server

Minimal conformant OAP Tool server demonstrating all mandatory and optional endpoints. Conformance Level: L2 (Billable).

## Quick Start

```bash
cd reference/server
npm install
npm start
```

The server runs at `http://localhost:3100`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/.well-known/oap-tool.json` | Tool Manifest |
| POST | `/oap/invoke` | Invoke an Action |
| GET | `/oap/audit` | Audit log |
| POST | `/oap/data/delete` | Data deletion |
| GET | `/oap/incident` | Incident reports |
| POST | `/oap/discover` | Capabilities discovery |
| GET | `/oap/billing` | Billing status |
| POST | `/oap/subscribe` | Subscribe |
| DELETE | `/oap/subscribe/:id` | Cancel subscription |
| GET | `/oap/receipts` | Receipt chain (diagnostic) |

## Test Invocation

```bash
curl -X POST http://localhost:3100/oap/invoke \
  -H 'Content-Type: application/oap+json' \
  -d '{
    "oap_version": "1.0",
    "request_id": "TEST001",
    "timestamp": "2026-05-03T10:00:00Z",
    "principal_did": "did:plc:test",
    "agent_did": "did:web:testagent",
    "action": "echo",
    "input": { "hello": "OAP" },
    "context": { "locale": "en-US", "currency": "EUR", "jurisdiction_user": "DE", "jurisdiction_agent": "DE" },
    "signature": { "alg": "EdDSA", "kid": "did:web:testagent#key-1", "value": "" }
  }'
```

## Production Notes

This is a reference implementation. For production use:

1. Replace in memory stores with a database.
2. Implement real EdDSA signatures (Ed25519).
3. Add TLS 1.3 termination.
4. Connect to a Transparency Log for receipt anchoring.
5. Implement rate limiting and authentication.
6. Add real policy engine evaluation.
