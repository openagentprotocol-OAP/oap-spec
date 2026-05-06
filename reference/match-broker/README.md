# OAP Reference Match Broker

**RFC 0021 M2 Conformant** | BM25 Multi-Factor Retrieval | Verifiable Index

The Reference Match Broker is the production-ready reference implementation of an OAP-conformant Match Broker as specified in [RFC 0021](../../rfcs/RFC-0021-verifiable-indexes.md). It implements M2 conformance: a Merkle Verifiable Index with Inclusion Proofs, Negative Inclusion Proofs, a Completeness Attestation endpoint, and a Disclosed Ranking Function with per-response signed Decision Records.

## Architecture

```
AQL Intent
    │
    ▼
[1. Constraint Filter]     — AQL predicates: jurisdiction, risk_class,
    │                        conformance_level, price ceiling, categories
    ▼
[2. BM25 Sparse Retrieval] — Robertson & Zaragoza (2009), k1=1.5, b=0.75
    │                        over: description + categories + action names
    ▼
[3. Multi-Factor Re-Rank]  — BM25(0.45) + Reputation(0.25) +
    │                        Conformance(0.15) + Cost(0.10) + Freshness(0.05)
    ▼
[4. Disclosure Layer]      — Signed Decision Record + Inclusion Proof
    │                        per candidate (RFC 0021 M2)
    ▼
Intent Response
```

## Endpoints

| Method | Path | Purpose | M-Level |
|---|---|---|---|
| `GET` | `/health` | Health + Disclosed Ranking Function | M1 |
| `POST` | `/oap/manifests` | Register/update a manifest | M1 |
| `POST` | `/oap/resolve` | Resolve an AQL Intent | M2 |
| `GET` | `/oap/index/proof?did=` | Inclusion or Negative Inclusion Proof | M2 |
| `GET` | `/oap/index/attestation` | Completeness Attestation | M1 |
| `GET` | `/oap/index/roots` | Index root history | M1 |
| `GET` | `/oap/manifests/:did` | Retrieve a registered manifest | M1 |
| `GET` | `/oap/ranking-function` | Signed Disclosed Ranking Function | M2 |

## Quick Start

```bash
# Install
npm install

# Start broker (default: http://localhost:3100)
npm start

# Seed with example manifests (requires broker running)
node seed.js

# Run smoke tests (42 tests, all M2 features)
npm test
```

## Resolve Example

```bash
curl -s -X POST http://localhost:3100/oap/resolve \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "legal research EU law GDPR compliance",
    "top_k": 3,
    "filters": {
      "min_conformance_level": 2,
      "risk_class": "medium",
      "jurisdiction": "EU"
    }
  }' | jq '.candidates[] | {rank, provider_did, final_score}'
```

Each candidate in the response includes:
- `final_score` — weighted composite score
- `inclusion_proof` — Merkle path from leaf to root (verifiable)
- `decision_record` — signed breakdown of all ranking inputs and their contributions

## Verifying an Inclusion Proof

```js
const crypto = require('crypto');
const sha256 = d => crypto.createHash('sha256').update(d).digest('hex');

function verify(leafHash, proofPath, rootHash) {
  let current = sha256('\x00' + leafHash);
  for (const step of proofPath) {
    current = step.position === 'right'
      ? sha256('\x01' + current + step.hash)
      : sha256('\x01' + step.hash + current);
  }
  return current === rootHash;
}
```

## Negative Inclusion Proof

```bash
curl "http://localhost:3100/oap/index/proof?did=did:web:nonexistent.example"
# Returns: { "type": "negative_inclusion_proof", "assertion": "provider_not_indexed", ... }
```

## Ranking Function

The Disclosed Ranking Function is published at `/oap/ranking-function` as a signed JSON document. The formula is:

```
final_score = 0.45 * bm25_normalized
            + 0.25 * reputation_score     (RFC 0009)
            + 0.15 * conformance_score    (L0..L4 / 4)
            + 0.10 * cost_score           (1 - normalized_cost)
            + 0.05 * freshness_score      (1 - age_days/365)
```

BM25 parameters: k1 = 1.5, b = 0.75 (Robertson & Zaragoza 2009 optimal values).

## References

- Qin et al. (2023). ToolLLM. ICLR 2024.
- Robertson & Zaragoza (2009). BM25. Foundations and Trends in IR.
- Crosby & Wallach (2009). Tamper-Evident Logging. USENIX Security.
- RFC 0021: Verifiable Indexes and Disclosed Ranking Functions.
