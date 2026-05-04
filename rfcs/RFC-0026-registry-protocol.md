# RFC 0026: OAP Registry Protocol

**Status:** Accepted
**Date:** 2026-05-04
**Author:** OAP Community
**Affects:** OAP-CORE-1.0 Section 31 (Conformance Levels), Section 32 (Community Governance), RFC 0019 (Conformance Testing).

## 1. Summary

This RFC defines the **OAP Registry**, an append-only Git repository that anchors Conformance Receipts and revocations for OAP implementations. The Registry is the mechanism that makes the OAP-Community model auditable without a central authority. It replaces the centralized "Stewards Trust Service" of earlier drafts.

The Registry lives at `github.com/openagentprotocol-OAP/oap-registry`. Its history is the canonical transparency log. Anyone may operate a mirror; the canonical state is reconstructible from any mirror through standard Git tooling.

## 2. Motivation

OAP requires a tamper-evident way to:

1. Discover which implementations claim conformance and at what level.
2. Verify a Conformance Receipt against an immutable history.
3. Publish revocations of compromised or non-conformant Receipts.
4. Resist sybil attacks (an attacker spinning up dozens of fake implementations to pollute the Trust Score).

A centralized server would meet (1) through (3) but reintroduce the entity model the OAP community has explicitly rejected. A blockchain would meet all four but requires participants to operate or trust a chain. A Git repository under a public organization, with CI-enforced validation gates and standard mirroring, meets all four with tooling every developer already uses.

## 3. Repository layout

```
oap-registry/
├── README.md
├── schemas/
│   └── implementation.schema.json
├── implementations/
│   └── <slug>.json                  one file per implementation
├── revocations/
│   └── <slug>-<receipt-hash>.json   one file per revocation event
├── peer-witnesses/
│   └── <witness-slug>.json          self-attested L4+ witnesses
└── .github/
    └── workflows/
        └── validate.yml             CI gate, see Section 6
```

## 4. Implementation listing format

`implementations/<slug>.json`:

```json
{
  "slug": "assistant-net",
  "name": "AssistNet",
  "tool_did": "did:web:assistant-net.vercel.app",
  "manifest_uri": "https://assistant-net.vercel.app/.well-known/oap-tool.json",
  "conformance_level": "L1-NC",
  "conformance_receipt_uri": "https://assistant-net.vercel.app/api/oap/conformance-receipt",
  "conformance_receipt_sha256": "5bd9...e7c1",
  "issued_at": "2026-05-04T08:00:00Z",
  "expires_at": "2026-08-02T08:00:00Z",
  "open_source": null,
  "license": "Apache-2.0",
  "non_commercial": true,
  "contact": "oap@assistant-net.vercel.app"
}
```

The `slug` is the canonical identifier. `tool_did` is the resolvable DID document of the implementation. `conformance_receipt_sha256` pins the exact bytes of the Receipt referenced by `conformance_receipt_uri`. Re-issued Receipts are submitted as a PR that updates the same file.

## 5. Revocation format

`revocations/<slug>-<receipt-hash>.json`:

```json
{
  "slug": "example-tool",
  "revoked_receipt_sha256": "ab12...",
  "reason": "key_compromise",
  "evidence_uri": "https://example.com/incident-2026-05-12.html",
  "revoked_at": "2026-05-12T13:24:00Z",
  "revoked_by_did": "did:web:example.com",
  "signature": "ed25519:..."
}
```

Reasons MUST be one of: `key_compromise`, `manifest_non_conformance`, `superseded`, `voluntary_withdrawal`, `dispute_resolved_against`. The signature MUST verify against the `tool_did` of the revoked implementation OR against three or more peer-witness DIDs (forced revocation by community Quorum).

## 6. CI validation gate

A GitHub Actions workflow runs on every Pull Request to `oap-registry`. The PR is auto-mergeable only if every check below passes.

| Check | Tool | Pass criterion |
|---|---|---|
| Schema | Ajv 2020 against `schemas/implementation.schema.json` | All `implementations/*.json` and `revocations/*.json` validate. |
| DID resolution | `oap-spec/reference/agent/did-resolver.js` | `tool_did` resolves to a valid DID Document. |
| Manifest reachability | `curl --fail` | `manifest_uri` returns 200 within 10 seconds. |
| Manifest matches DID | `oap-spec/reference/agent/conformance-verifier.js` | Manifest's `tool_did` equals listing's `tool_did`. |
| Receipt fetch | `curl --fail` | `conformance_receipt_uri` returns 200, body SHA-256 matches `conformance_receipt_sha256`. |
| Receipt signature | `conformance-verifier.js` | Receipt signature verifies against the public key in the DID Document. |
| Receipt validity window | timestamp check | `now < expires_at` and `expires_at - issued_at <= 90 days`. |
| Peer witnesses (L4+) | signature check | At least one (L4) or three (L5) signatures by listed peer-witness DIDs that themselves hold valid L4+ Receipts. |
| Sybil filter | `whois` lookup, fail-closed | The domain in `tool_did` (for `did:web`) is at least 30 days old. New implementations younger than 30 days MAY be added with a `provisional: true` flag and are excluded from default Marketplace listings until the 30-day mark. |
| No tampering | `git log` check | The PR does not modify or delete previously merged files except the implementation's own current listing. |

If all checks pass, any Maintainer of `oap-registry` (Maintainers are listed in `oap-registry/MAINTAINERS.md`, recruited from `oap-spec/governance/MAINTAINERS.md`) may merge. There is no waiting period for valid PRs; the audit trail is the Git history itself.

## 7. Append-only enforcement

Branch protection on `main`:

* Force-push disabled.
* History rewriting disabled.
* Direct push disabled (PR-only).
* Required status checks: every check in Section 6.
* Required reviews: 1 Maintainer review.

These protections are reproducible; their configuration lives in `oap-registry/.github/repo-config.yml` and is reapplied by a CI job on a schedule.

## 8. Mirrors and verification

The Registry is a public Git repository. Mirrors MAY be hosted by anyone:

```
git clone https://github.com/openagentprotocol-OAP/oap-registry
git verify-commit HEAD                      # commit signature check
node oap-spec/reference/registry-verify.js  # full re-validation of all listings
```

A Marketplace, Trust Service, or Verifier MUST validate against its own clone. Trusting the GitHub web UI alone is insufficient. The GitHub repository is the canonical publication channel; the data is its own proof.

## 9. Lifecycle of a Receipt

1. Implementation runs `oap-spec/test-suite/runner.js` against itself.
2. Tests pass at the targeted level. `attest.js` produces a signed Conformance Receipt and writes it to a publicly hosted URL.
3. (For L4 and L5) the implementation requests peer-witness signatures from at least one (L4) or three (L5) implementations holding valid L4+ Receipts. Witnesses sign the Receipt's canonical hash and return the signature.
4. The implementation opens a PR against `oap-registry` adding or updating its `implementations/<slug>.json`.
5. CI runs every check in Section 6.
6. A Maintainer merges the PR. The merge commit is the anchor.
7. The Receipt is valid for at most 90 days. To remain listed the implementation MUST submit a new Receipt before expiry.

## 10. Bootstrap problem

Initially no implementation holds a valid L4+ Receipt that could witness another L4+ Receipt. The bootstrap rule:

* The OAP Reference Server (in `oap-spec/reference/server`) is exempted from the peer-witness requirement at L4 for the first 12 months following this RFC's acceptance, on condition that its Receipt is co-signed by all current `oap-spec` Maintainers (per `governance/MAINTAINERS.md`). After 12 months the Reference Server MUST collect peer witnesses from real production implementations, like every other implementation.
* No equivalent exemption exists for L5. L5 requires three independent peer witnesses that have themselves reached L4 through normal means, plus an external security audit.

## 11. Security and abuse considerations

* **Compromise of the Maintainer roster.** A hostile takeover of the Maintainer roster could merge fraudulent listings. Mitigation: branch protection requires a passing CI gate (Section 6), and the Append-only rule means historic Receipts cannot be retroactively forged. A community fork of the Registry remains viable as the canonical mirror in such an event.
* **Sybil farms.** Mitigated by the 30-day domain-age sybil filter (Section 6) and the peer-witness requirement at L4+.
* **Censorship.** Mitigated by mirroring (Section 8). A listing rejected from the canonical Registry can be published on a fork; downstream Verifiers may choose which mirrors they trust.
* **Key loss.** A lost signing key is recoverable through a revocation submitted by the implementation's DID Document (which MAY include a recovery key) or by three peer witnesses.

## 12. Backward compatibility

This RFC introduces a new repository and a new file format. It does not change any existing schema. The OAP Manifest gains an optional `conformance_receipt_uri` field that points to the published Receipt.
