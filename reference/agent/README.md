# OAP Reference Agent Runtime

Minimal agent runtime demonstrating OAP Tool discovery, policy evaluation, invocation with receipts, and the kill switch.

## Usage

```javascript
const { OapAgent } = require('./agent');

const agent = new OapAgent({
  principalDid: 'did:plc:myuser',
  agentDid: 'did:web:myagent.example',
  ccc: {
    ccc_version: '1.0',
    scope_id: 'scope_work',
    embargo_list: ['did:web:competitor.example'],
    active_ndas: [],
    chinese_walls: [],
  },
  personalPolicy: { max_cost_per_call_eur: 1.0 },
});

// Discover tool
const manifest = await agent.discover('https://weatherpro.example');

// Find matching actions
const discovery = await agent.discoverActions(manifest, 'weather forecast Berlin');

// Invoke (policy evaluated, receipt created automatically)
const result = await agent.invoke(manifest, 'get_forecast', { location: 'Berlin', days: 3 });

// Check audit log
const audit = await agent.getAuditLog(manifest);

// Verify local receipt chain
const chainStatus = agent.verifyReceiptChain();

// Emergency: revoke everything
await agent.killSwitch();
```

## Features

1. Tool discovery via `.well-known/oap-tool.json`.
2. Intent based action matching via `discover` endpoint.
3. Four layer policy engine (L1 universal, L2 jurisdictional, L3 CCC, L4 personal).
4. CCC enforcement (embargo lists, Chinese walls, professional codes).
5. Local receipt chain with hash chain integrity verification.
6. Prompt injection detection in tool outputs.
7. Subscription management.
8. Kill switch (revokes all active subscriptions).
9. Data deletion requests (GDPR right to erasure).
