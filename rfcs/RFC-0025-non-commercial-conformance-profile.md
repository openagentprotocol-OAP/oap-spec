# RFC 0025: Non-Commercial Conformance Profile

**Status:** Accepted
**Date:** 2026-05-04
**Author:** OAP Community
**Affects:** OAP-CORE-1.0 Section 31 (Conformance Levels), Section 14 through 17 (Commerce Plane).

## 1. Summary

This RFC defines the **Non-Commercial Profile** of the Conformance Levels: `L1-NC` and `L3-NC`. These profiles correspond to L1 and L3 with the Wallet, Subscription, and refund requirements waived. They are intended for implementations that do not collect revenue from their users.

## 2. Motivation

The base Conformance Levels assume an implementation may charge for actions through the OAP Commerce Plane (Wallet, Subscription, refund endpoint). Many production-grade open-source implementations do not. Examples:

* **Bring-your-own-key (BYOK) platforms.** Users connect their own AI provider keys (OpenAI, Anthropic, Google) and pay those providers directly. The platform itself does not bill the user.
* **Self-hosted deployments.** A deployment a user runs on their own infrastructure for their own use.
* **Public-good services** funded by grants, donations, or sponsorship rather than user fees.

Forcing these implementations to publish a Wallet, a refund endpoint, and Subscription tiers in order to claim L1 or L3 conformance creates a meaningless implementation burden and produces a Manifest that misrepresents the service. Without a Non-Commercial Profile, these implementations stay at L0 (or, worse, falsely claim L1/L2 with stub endpoints that never receive traffic), which weakens the conformance signal across the ecosystem.

## 3. Profile definition

A Non-Commercial Profile claim is signalled by the `conformance_level` field in the Manifest taking one of the values defined in this RFC and by `pricing.models` containing exactly the singleton `[{"type": "free"}]`.

### 3.1 L1-NC

All requirements of L1 (Discoverable) apply, with the following waivers and additions:

| Requirement | Status | Notes |
|---|---|---|
| Full Manifest, categories, examples | Required | Identical to L1. |
| Machine-validated Manifest schema | Required | Identical to L1. |
| `discover` endpoint | Required | Identical to L1. |
| `invoke` endpoint | Required | Identical to L1. |
| `audit` endpoint | Required | Identical to L1. |
| `pricing.models` | Required | MUST be exactly `[{"type": "free"}]`. Any other entry invalidates the L1-NC claim. |
| `endpoints.subscribe` | Waived | Not required. If present, MUST return HTTP 200 with a body that documents that the service is non-commercial. |
| `endpoints.wallet` | Waived | Not required. |
| `endpoints.billing` (`refund`) | Waived | Not required. |
| `revenue.source` (manifest field) | **New, required for L1-NC** | One of `byok`, `self-hosted`, `grant`, `donation`, `sponsorship`. Free-text justification in `revenue.note`. |

### 3.2 L3-NC

All requirements of L3 (Trusted) apply, with the same Commerce Plane waivers as L1-NC (section 3.1) and the following:

* L3-NC additionally requires Audit Log, Data Policy, CCC declaration, Verified Publisher, and Multi-Party Review for high-risk Actions, exactly as L3.
* L3-NC does not waive any non-commercial requirement.

There is no L2-NC. L2 is itself the Billable level; an implementation that wishes to remain non-commercial skips L2 entirely.

There is no L4-NC or L5-NC. Implementations that operate at L4 or L5 are operating coordinated multi-agent infrastructure or are externally audited; if they choose to do so non-commercially they MUST still meet the standard L4 and L5 requirements (peer witnessing, third-party security audit). The Profile suffix only suspends Commerce Plane requirements.

## 4. Conformance Receipt

The Conformance Receipt produced by the OAP test suite (RFC 0019, `oap-spec/test-suite/attest.js`) MUST honour the Profile via the `--profile` flag:

```
node test-suite/attest.js --target https://example.com --profile non-commercial --signing-key <path>
```

The resulting Receipt sets `claimed_level` to `L1-NC` or `L3-NC` and includes a `profile` field with value `non-commercial`. The Receipt is otherwise structurally identical to a base-Profile Receipt and is anchored in the OAP Registry by the same procedure (RFC 0026).

## 5. Marketplace and Trust Service display

Conformant Marketplaces MUST display Non-Commercial Profile suffixes (`-NC`) with equal prominence to the base level. Marketplaces MUST NOT silently strip the suffix or filter Non-Commercial implementations from default search results. Trust Score formulas MAY weight commercial and non-commercial implementations differently, but MUST publish the weighting.

## 6. Backward compatibility

This RFC is additive. Existing L1, L2, L3 claims remain valid. The Manifest schema gains an optional `revenue` object that is only required when `conformance_level` ends in `-NC`.

## 7. Security and abuse considerations

Falsely claiming a Non-Commercial Profile while charging users is a Manifest non-conformance and grounds for revocation through the OAP Registry. Sampling probes operated by community Trust Services MUST verify that any `invoke` call from a Non-Commercial implementation does not redirect to a payment flow.

## 8. Reference implementation

The first known L1-NC implementation is `assistant-net.vercel.app` (a BYOK personal-AI assistant reference implementation). Its Conformance Receipt is published at `https://assistant-net.vercel.app/oap-conformance-receipt.json` and anchored in `openagentprotocol-OAP/oap-registry/implementations/assistant-net.json`.
