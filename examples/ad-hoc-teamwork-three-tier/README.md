# Worked Example: Three-Tier Convention Discovery (RFC 0027 rev 2)

This example demonstrates the full RFC 0027 revision 2 flow against the OAP Reference Server. It exercises:

1. A Manifest declaring `ad_hoc_teamwork.convention_discovery_v2 = true` with an `aht_fallback_policy` (RFC 0027 §3.5).
2. A signed Capability Announcement (RFC 0027 §3.2).
3. Late Join admission emitting a `LateJoinReceipt` (RFC 0027 §3.3).
4. Tier 1 explicit Convention Discovery emitting a `ConventionReceipt` with the expected lex-first selection from the Schelling intersection (RFC 0027 §3.4.1).
5. Convention Drift detection emitting a `ConventionDriftReceipt` (RFC 0027 §3.4b).

## Files

| File | RFC § | Schema |
|------|-------|--------|
| `manifest-host-tool.json` | §3.5 | `oap-manifest.schema.json` |
| `capability-announcement.json` | §3.2 | `oap-capability-announcement.schema.json` |
| `late-join-receipt.json` | §3.3 | `oap-late-join-receipt.schema.json` |
| `convention-receipt-tier1.json` | §3.4.1 | `oap-convention-receipt.schema.json` |
| `convention-drift-receipt.json` | §3.4b | `oap-convention-drift-receipt.schema.json` |
| `scenario.md` | — | walkthrough narrative |

## Run against the Reference Server

```bash
cd reference/server && node server.js &
cd ../../examples/ad-hoc-teamwork-three-tier
curl -fsS http://127.0.0.1:3100/.well-known/oap-tool.json | jq '.ad_hoc_teamwork'
curl -fsS -X POST http://127.0.0.1:3100/oap/aht/capability-announcement \
  -H "Content-Type: application/json" \
  -d @capability-announcement.json | jq
curl -fsS -X POST http://127.0.0.1:3100/oap/aht/late-join \
  -H "Content-Type: application/json" \
  -d @late-join-request.json | jq
curl -fsS -X POST http://127.0.0.1:3100/oap/aht/convention/propose \
  -H "Content-Type: application/json" \
  -d @convention-propose-request.json | jq
```

## Validate against schemas

```bash
cd test-suite && node -e "
const Ajv = require('ajv/dist/2020').default;
const fs = require('fs');
const path = require('path');
const ajv = new Ajv({strict:false, allErrors:true});
require('ajv-formats').default(ajv);
for (const f of fs.readdirSync('../schemas/v1.0').filter(x=>x.endsWith('.schema.json'))) {
  ajv.addSchema(JSON.parse(fs.readFileSync(path.join('../schemas/v1.0', f))));
}
for (const f of ['capability-announcement','late-join-receipt','convention-receipt-tier1','convention-drift-receipt']) {
  const data = JSON.parse(fs.readFileSync('../examples/ad-hoc-teamwork-three-tier/'+f+'.json'));
  const schemaName = f.replace(/-tier1$/, '');
  const v = ajv.getSchema('https://openagentprotocol.eu/schemas/v1.0/oap-'+schemaName+'.schema.json');
  console.log(f, v(data) ? 'VALID' : JSON.stringify(v.errors).slice(0,200));
}
"
```
