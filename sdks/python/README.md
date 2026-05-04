# oap-sdk

Official Python SDK for the [Open Agent Protocol (OAP)](https://openagentprotocol.eu).

Build OAP-conformant tool servers with manifest publishing, signed invocation, hash-chained receipts, and conformance attestation. Apache 2.0 licensed.

## Install

```bash
pip install oap-sdk
```

## Quick start

```python
from oap_sdk import OapServer

server = OapServer(
    did="did:web:tool.example",
    conformance="L1-NC",
    name="My Tool",
)

@server.action(
    id="create_task",
    intent="create a task with title and due date",
    input_schema={
        "type": "object",
        "properties": {"title": {"type": "string"}, "due": {"type": "string"}},
        "required": ["title"],
    },
    output_schema={
        "type": "object",
        "properties": {"id": {"type": "string"}, "title": {"type": "string"}},
        "required": ["id", "title"],
    },
    risk_class="low",
    side_effects="write",
)
async def create_task(args):
    return {"id": "task_1", "title": args["input"]["title"]}

server.serve(port=8080)
```

## What you get

- Auto-generated `/.well-known/oap-tool.json` manifest with DID and signatures.
- Auto-generated `/.well-known/did.json` (did:web key publication).
- Built-in invocation, audit, GDPR delete, discovery, billing, subscription, and conformance receipt endpoints.
- Hash-chained Ed25519-signed receipts with a pluggable storage adapter.
- Pluggable policy hook for the four-layer governance stack.
- Action definitions with JSON Schema.
- Self-attested conformance receipts (RFC-0019).

## Conformance levels

| Level | Designation | Notes |
|---|---|---|
| `L0` | Compatible | MCP/A2A interop, minimal manifest. |
| `L1` | Discoverable | Full manifest, signed receipts. |
| `L1-NC` | Non-Commercial | Same as L1, BYOK / non-commercial profile (RFC-0025). |
| `L2` | Billable | Pricing, subscription, wallet, refund. |
| `L3` | Trusted | Audit log, data policy, CCC, multi-party review. |
| `L4` | Collaborative | Multi-agent coordination, conflict resolution. |
| `L5` | Certified | External SOC 2 / ISO 27001 plus OAP community audit. |

Set the level via the `conformance` argument. Higher levels require additional configuration to be fully compliant; consult the [spec](https://openagentprotocol.eu/spec) and run `oap-spec/test-suite` to verify.

## Endpoints served

| Path | Method | Purpose |
|---|---|---|
| `/.well-known/oap-tool.json` | GET | Manifest |
| `/.well-known/did.json` | GET | DID document |
| `/oap/invoke` | POST | Signed action invocation |
| `/oap/audit` | GET | Receipt feed |
| `/oap/data/delete` | POST | GDPR Article 17 with signed deletion receipt |
| `/oap/incident` | GET, POST | Incident disclosure |
| `/oap/discover` | POST | Intent matching |
| `/oap/billing` | GET | Pricing + active subscription |
| `/oap/subscribe` | POST, DELETE | Subscription management |
| `/oap/conformance-receipt` | GET | Self-attested conformance receipt |

## Custom storage

The default `MemoryStore` is for development. For production use, implement the `ReceiptStore` protocol against your durable backend:

```python
from oap_sdk import OapServer, ReceiptStore

class PostgresStore:
    # implement the ReceiptStore protocol
    ...

server = OapServer(
    did="did:web:tool.example",
    conformance="L2",
    storage=PostgresStore(),
)
```

## Policy hook

```python
from oap_sdk import OapServer, PolicyDecision

def policy(args):
    if args["actionId"] == "delete_account" and args["context"].principal != "did:web:admin.example":
        return PolicyDecision(allow=False, reason="Admin only.", rules=["org.policy.admin_only"])
    return PolicyDecision(allow=True)

server = OapServer(
    did="did:web:tool.example",
    conformance="L3",
    policy=policy,
)
```

## Status

This is a `0.x` preview release. The API surface tracks the OAP v1.0 Public Working Draft and may evolve during the FCP. Pin a version in production.

## License

Apache 2.0
