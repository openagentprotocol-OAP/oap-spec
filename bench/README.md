# OAP Performance Benchmark Suite

Measures latency and throughput for the six load-bearing operations of an OAP
implementation: manifest fetch, did fetch, signed-receipt invoke, audit feed,
AQL intent resolve, conformance receipt fetch, plus local Ed25519 verification.

## Usage

```bash
# Boot the reference server in another terminal:
cd reference/server && node server.js

# Run the benchmark:
cd bench && OAP_TARGET=http://localhost:3100 node perf.js
```

## Configuration

| env | default | meaning |
|---|---|---|
| `OAP_TARGET` | `http://localhost:3100` | base URL of the implementation under test |
| `OAP_BENCH_WARMUP` | `20` | warmup iterations per operation, discarded |
| `OAP_BENCH_ITERS` | `500` | measured iterations per operation |
| `OAP_BENCH_CONCURRENCY` | `10` | concurrent in-flight requests per operation |

## Output

Results are written to `bench/results/perf-<ISO>.{json,md}` and printed as a
Markdown table to stdout. The JSON file is the canonical machine-readable
form; the Markdown file is a copy-paste-ready summary.

## Interpretation

The benchmark is a steady-state latency measurement against a local server.
Numbers are not directly comparable to a production deployment with network
latency, multi-region replication, or persistent storage at scale. They are
useful for: (a) regression detection between releases, (b) ordering of
operations by cost, and (c) confirming that the reference server delivers at
least one order of magnitude headroom over the conformance probe budget of
RFC 0019 section 7.

## CI integration

A future GitHub Actions job MAY run `node bench/perf.js` against the started
reference server and fail the build if any p95 regresses by more than 50
percent against the previous release. This is not yet wired up but the JSON
output format is stable for that purpose.
