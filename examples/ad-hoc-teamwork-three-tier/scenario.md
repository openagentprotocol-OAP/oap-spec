# Scenario: Marketplace Fulfillment Substitution under Three-Tier Convention Discovery

## Setup

A consumer Agent has a Workflow `wf_01HX7K8RZJX0001AHTDEMO` for parcel fulfillment with the primary supplier `did:web:fulfillment-alpha.example`. Mid-execution, the consumer Agent posts an open Step `stp_01HX7K8RZJX0002AHTSHIP` declaring `admission_mode = "capability_match"` and `required_capabilities = ["fulfillment.ship.parcel"]`.

Three carriers are observable to the host Tool:

| Carrier DID | Class | Behavior |
|-------------|-------|----------|
| `did:web:fulfillment-alpha.example` | P (Protocol-Follower) | Already in the Workflow; publishes its Convention Space. |
| `did:web:fulfillment-bravo.example` | P (Protocol-Follower) | Sends a Capability Announcement; requests Late Join. |
| `did:web:fulfillment-charlie.example` | O (Observable Non-Follower) | Does not publish; its actions in prior Workflows are observable in the audit log. |

## Step 1 — Capability Announcement (RFC 0027 §3.2)

`fulfillment-bravo` POSTs `capability-announcement.json` to `/oap/aht/capability-announcement`. The server validates the schema and signature, returns the canonical SHA-256 hash.

## Step 2 — Late Join (RFC 0027 §3.3)

`fulfillment-bravo` POSTs `late-join-request.json` to `/oap/aht/late-join`. The server checks `required_capabilities` (matched: `fulfillment.ship.parcel`), checks `reputation_threshold` (0.92 ≥ 0.50), and emits the signed `LateJoinReceipt` shown in `late-join-receipt.json`. The Workflow Receipt for the eventual Step output will list `fulfillment-bravo` as an Ad Hoc Participant per RFC 0008 §3.4 composition.

## Step 3 — Tier 1 Convention Discovery (RFC 0027 §3.4.1)

Both Protocol-Followers publish their Convention Spaces via `/oap/aht/convention/propose`:

* `alpha` admits `{ delivery_window=PT24H, label_format=PDF_A4 }` and `{ PT48H, PDF_A4 }`.
* `bravo` admits `{ PT24H, PDF_A4, regional+national+international }` and `{ PT12H, ZPL_4x6, regional }`.

The Schelling reduction yields the singleton intersection `{ PT24H, PDF_A4, regional+national+international }`. The lex tie-break is trivial; the committed Convention is recorded in `convention-receipt-tier1.json` with `tier_used = "tier1"`.

If `charlie` had also been a Protocol-Follower with disjoint Convention Space, the intersection would have been empty and the procedure would have proceeded to Tier 2 inference followed by Tier 3 minimax-regret selection (`tier_used = "tier2+3"`).

## Step 4 — Convention Drift (RFC 0027 §3.4b)

After 24 observed actions in the active Workflow, the host Tool computes the KL divergence between its Tier 2 posterior over `charlie`'s implicit Convention Space and the empirical action distribution. The divergence is 0.84, exceeding the Manifest-declared `drift_threshold_kl = 0.50`. The Tool emits `convention-drift-receipt.json` with `decision = "re-infer"`, resets the posterior to a recency-decayed prior, and re-runs Tier 3.

## Step 5 — Hypothetical Adversarial Case (RFC 0027 §5)

If `charlie` had been an Adversarial Peer (A-class) and the population satisfied $|N| < 3t + 1$, the Tool would have refused to commit any Convention and emitted a `CoordinationAbortReceipt` with `abort_reason = "byzantine-bound-violated"`, composing with RFC 0017 cooling-off Reversal Receipts.

## Validation against schemas

Every artifact in this directory validates against its corresponding JSON Schema in `schemas/v1.0/`. Run the validation commands in [README.md](README.md).

## What this example proves

1. The Manifest declaration of `convention_discovery_v2 = true` is paired with a populated `aht_fallback_policy` (RFC 0027 §3.5 conditional, enforced by both the manifest schema and the `oap-registry` CI gate).
2. The Three-Tier Handshake produces a deterministic, signed, schema-valid `ConventionReceipt` from a non-trivial population.
3. Drift detection does not silently break coordination: it produces an auditable receipt and a re-inference decision.
4. The bounded-round termination of Theorem A.1 holds in the worked path: 1 round publication + 1 round Schelling reduction + 1 round Receipt signature = 3 rounds for $|N| = 2$, well within the $|N| + 1$ bound.
