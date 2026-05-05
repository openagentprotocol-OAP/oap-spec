# oap-receipt-chain

Disaster-recovery and verification CLI for OAP Receipt Chains, per RFC 0019
section 6 (Conformance Verification) and the Accountability whitepaper.

## Install (local)

```bash
cd oap-spec/tools/oap-receipt-chain
chmod +x cli.js
ln -s "$(pwd)/cli.js" /usr/local/bin/oap-receipt-chain
```

## Subcommands

### verify

Verifies a JSONL Receipt Chain end-to-end:
- hash continuity (`prev_receipt_hash` matches the SHA-256 of the previous canonicalized receipt)
- monotonic `issued_at` timestamps
- Ed25519 signatures (when `--target` is given so the public key can be fetched from `.well-known/did.json`)

```bash
oap-receipt-chain verify ./chain.jsonl --target https://tool.example.com
```

Exit code 0 on a clean chain, 1 on any issue. Output is a JSON report listing
every issue indexed by position in the file.

### replay

Streams a verified chain back into a fresh implementation, useful after a
disaster-recovery rebuild from cold storage:

```bash
oap-receipt-chain replay https://tool-restored.example.com ./chain.jsonl
```

### export

Exports the receipts table from the SQLite reference server to JSONL on
stdout:

```bash
cd oap-spec/reference/server
node ../../tools/oap-receipt-chain/cli.js export ./oap-server.db > chain.jsonl
```

### anchor-check

Verifies that every receipt carries at least one transparency-log inclusion
proof and reports the number of distinct logs the implementation is
anchoring to (RFC 0021 RECOMMENDS at least 2 independently operated logs):

```bash
oap-receipt-chain anchor-check ./chain.jsonl --target https://tool.example.com
```

## Interpretation

- **chain_break**: a `prev_receipt_hash` does not match the canonicalized hash of the previous receipt; this is irrecoverable evidence of receipt deletion or reordering.
- **non_monotonic_timestamp**: a receipt's `issued_at` precedes its predecessor; backdating attempt or clock skew exceeding the implementation's stated tolerance.
- **signature_invalid**: signature does not verify against the public key fetched from `did.json`; key rotation without proper key registry update or forgery.
- **missing_anchors**: receipts not yet anchored to any transparency log; allowed transiently within the implementation's stated `anchor_latency_seconds`, otherwise a conformance violation.
