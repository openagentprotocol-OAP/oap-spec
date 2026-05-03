# AQL Examples (RFC 0020)

End to end Intent and candidate fixtures for the Agent Query Language reference implementation in [`reference/aql/`](../../reference/aql/).

## Files

- `discovery-intent.json`: Find Manifests for running shoes under 100 EUR.
- `commercial-intent.json`: Single best procurement Intent with strict delivery window.
- `subscription-intent.json`: Push feed of running shoe inventory and price changes.
- `knowledge-intent.json`: Top 5 EU renewable energy knowledge nodes with permissive licenses.
- `candidates.json`: Sample candidate set for use with `discovery-intent.json`.

## Run

```bash
cd ../../reference/aql && npm install
node bin/oap-aql.js validate ../../examples/aql/discovery-intent.json
node bin/oap-aql.js resolve  ../../examples/aql/discovery-intent.json ../../examples/aql/candidates.json
```

The resolve output is a complete `oap-intent-response.schema.json` document with per candidate Decision Records. Two candidates are rejected (wrong category, over budget) and the remaining candidates are returned ranked.
