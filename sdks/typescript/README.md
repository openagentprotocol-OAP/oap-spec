# @openagentprotocol/sdk

Official TypeScript SDK for the [Open Agent Protocol (OAP)](https://openagentprotocol.eu).

Build OAP-conformant tool servers with manifest publishing, signed invocation, hash-chained receipts, and conformance attestation. Apache 2.0 licensed.

## Install

```bash
npm install @openagentprotocol/sdk
```

## Quick start

```ts
import { OapServer } from '@openagentprotocol/sdk';

const server = new OapServer({
  did: 'did:web:tool.example',
  conformance: 'L1-NC',
  name: 'My Tool',
});

server.action({
  id: 'create_task',
  intent: 'create a task with title and due date',
  inputSchema: {
    type: 'object',
    properties: { title: { type: 'string' }, due: { type: 'string' } },
    required: ['title'],
  },
  outputSchema: {
    type: 'object',
    properties: { id: { type: 'string' }, title: { type: 'string' } },
    required: ['id', 'title'],
  },
  riskClass: 'low',
  sideEffects: 'write',
  handler: async ({ input, context }) => {
    return { id: 'task_1', title: (input as any).title };
  },
});

server.serve({ port: 8080 });
```

## What you get

- Auto-generated `/.well-known/oap-tool.json` manifest with DID and signatures.
- Auto-generated `/.well-known/did.json` (did:web key publication).
- Built-in invocation, audit, GDPR delete, discovery, billing, subscription, and conformance receipt endpoints.
- Hash-chained Ed25519-signed receipts with a pluggable storage adapter.
- Pluggable policy hook for the four-layer governance stack.
- Type-safe action definitions with JSON Schema.
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

Set the level via the `conformance` option. Higher levels require additional configuration to be fully compliant; consult the [spec](https://openagentprotocol.eu/spec) and run `oap-spec/test-suite` to verify.

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

The default in-memory store is for development. For production use, implement the `ReceiptStore` interface against your durable backend (SQLite, Postgres, S3 + queue, etc.):

```ts
import { OapServer, type ReceiptStore } from '@openagentprotocol/sdk';

class PostgresStore implements ReceiptStore { /* ... */ }

const server = new OapServer({
  did: 'did:web:tool.example',
  conformance: 'L2',
  storage: new PostgresStore(),
});
```

## Policy hook

```ts
const server = new OapServer({
  did: 'did:web:tool.example',
  conformance: 'L3',
  policy: async ({ actionId, input, context }) => {
    if (actionId === 'delete_account' && context.principal !== 'did:web:admin.example') {
      return { allow: false, reason: 'Admin only.', rules: ['org.policy.admin_only'] };
    }
    return { allow: true };
  },
});
```

## Status

This is a `0.x` preview release. The API surface tracks the OAP v1.0 Public Working Draft and may evolve during the FCP. Pin a version in production.

## License

Apache 2.0
