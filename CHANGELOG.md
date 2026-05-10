# Changelog

All notable changes to the Open Agent Protocol specification, schemas, and reference implementations will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/) at the specification level.

## [Unreleased]

### Changed
- **RFC 0027 Ad Hoc Teamwork (revision 2, 2026-05-10):** substantive restructuring to align with the canonical AHT problem definition (Stone, Kaminka, Kraus, Rosenschein 2010), in which protocol-following teammates may not be assumed. The single-tier Convention Discovery Handshake of revision 1 is replaced by a **Three-Tier Handshake** (Tier 1 explicit Schelling reduction over publishers; Tier 2 Bayesian observational inference over silent peers; Tier 3 minimax-regret robust selection over the joint posterior, with t-byzantine-trimmed worst-case selection per Lamport-Shostak-Pease 1982). The Manifest gains an `aht_fallback_policy` field with five recognized policy classes (POAM, PLASTIC, AATEAM, ROTATE, Custom), an `unilateral_timeout_ms`, a `regret_tolerance`, a `drift_threshold_kl`, and a `max_byzantine_fraction`. New theorems: A.1 Unilateral Bounded Termination (works at |N_P| = 0), A.3 Unilateral Participation Dominance with critical adopter density p* → 0 as protocol overhead → 0, A.4 Robustness under Private and Partial Type Spaces (composes with POAM-style private types), plus **strengthened theorems** A.3' (Endogenous Peer Selection via Markov selection kernel with base-rate bound β > 0), A.4' (Lipschitz constant L derived from regret structure as L ≤ U·|A|), C.1' (Posterior Convergence under Misspecified Realizability via KL-projection). New conformance probes: `behavior/ad-hoc-tier3-unilateral-adoption.test.js` (unilateral-adoption probe), `behavior/ad-hoc-capability-announcement.test.js`, `behavior/ad-hoc-late-join.test.js`, `behavior/ad-hoc-tier1-convention-discovery.test.js`, `behavior/ad-hoc-drift-detection.test.js` — 25 sub-assertions total, all green against the Reference Server. Reference implementation at `reference/aht/three-tier.js` with stubs for all five policy classes at `reference/aht/fallback-policies/`. Manifest schema extended with the `ad_hoc_teamwork` block including a conditional `convention_discovery_v2 → required aht_fallback_policy` rule. Five new schema files: `oap-capability-announcement.schema.json`, `oap-convention-receipt.schema.json`, `oap-late-join-receipt.schema.json`, `oap-coordination-abort-receipt.schema.json`, `oap-convention-drift-receipt.schema.json`. Reference server exposes `/oap/aht/capability-announcement`, `/oap/aht/late-join`, `/oap/aht/convention/propose`, `/oap/aht/convention/drift`. Worked example at `examples/ad-hoc-teamwork-three-tier/`. Cross-references in RFC-0001, RFC-0008, RFC-0030, RFC-0031 updated to mention the Three-Tier Handshake and Theorem A.3. SDK modules: `aht` in TypeScript (`@openagentprotocol/sdk`) and Python (`oap-sdk`). Registry CI gate (`oap-registry/.github/workflows/validate.yml`) enforces the conditional `convention_discovery_v2 → aht_fallback_policy` rule.

### Added
- **Test suite 1.3.0:** New conformance probes `behavior/receipt-chain-integrity.test.js` (L4+, hash-chain, monotonic timestamps, signature validity) and `behavior/multi-region-anchoring.test.js` (L5, RFC 0021 Accountability whitepaper RECOMMENDATION of two independently operated transparency logs in distinct regions). Reference server now declares `accountability.recovery`, `accountability.transparency_logs`, `sybil_resistance.fresh_identity_influence_cap`, and exposes `/oap/receipt-verify` and `/oap/receipt-chain/export`. End-to-end probe count against the reference server is 101/101.
- **Performance benchmark suite (`bench/perf.js`):** Steady-state p50/p95/p99 latency and throughput for manifest fetch, did fetch, signed-receipt invoke, audit feed, AQL intent resolve, conformance receipt fetch, plus local Ed25519 verify. JSON + Markdown reports written to `bench/results/`. Reference numbers on Apple M-series @ N=300, c=10: invoke p95 ≈ 12 ms, audit p95 ≈ 11 ms, manifest p95 ≈ 8 ms, Ed25519 verify p95 ≈ 0.7 ms.
- **Schema fuzz harness (`test-suite/fuzz/run.js`):** Property-based generator + structural mutator over all 22 v1.0 schemas, AJV-2020. Mutation-rejection rate ≥ 80% across the entire schema set; cross-schema $ref resolution wired up.
- **Disaster-recovery CLI (`tools/oap-receipt-chain/`):** `verify`, `replay`, `export`, `anchor-check` subcommands operating on JSONL Receipt Chains. Detects chain breaks, non-monotonic timestamps, signature invalidation, and missing transparency-log anchors.
- **SDKs 1.0.0-rc.2:** Both TypeScript (`@openagentprotocol/sdk`) and Python (`oap-sdk`) gain RFC-aligned modules: `memory` (RFC 0010 customization receipts), `subscription` (RFC 0022 manifest-update notifications), `modelRisk` / `model_risk` (RFC 0028 model inventory, symbiotic escalation, counterfactual explanation, adverse action notice), `organization` (RFC 0030 roles, scenes, deontic norms with consistency checker).

### Added
- **Test suite 1.2.0:** L5-FINANCE adversarial probe set fully implemented (RFC 0028): `behavior/model-inventory.test.js`, `behavior/symbiotic-escalation.test.js`, `behavior/disparate-impact.test.js`, `behavior/adverse-action-notice.test.js`, `behavior/champion-challenger.test.js`, `behavior/counterfactual-explanation.test.js`, `behavior/regulated-peer-witness.test.js`.
- **Test suite 1.2.0:** L5-ORG profile (RFC 0030) introduced with `behavior/organization-manifest.test.js`, `behavior/deontic-consistency.test.js`, `behavior/role-scene-enforcement.test.js`. Registry `implementation.schema.json` `conformance_level` pattern extended to accept `-ORG` suffix.
- **Test suite 1.2.0:** Adversarial subdirectory `test-suite/behavior/adversarial/` populated per RFC 0019 section 8: `receipt-forgery.test.js`, `signature-stripping.test.js`, `cooling-off-bypass.test.js`, `escalation-routing.test.js`, `replaceability-obfuscation.test.js`, `sybil-creation.test.js`. Runner now walks `behavior/` recursively so subcategories are picked up automatically.
- **SDKs 1.0.0-rc.1:** Python SDK (`oap-sdk` on PyPI) and TypeScript SDK (`@openagentprotocol/sdk` on npm) bumped from 0.1.0 (Beta) to 1.0.0-rc.1 (Production/Stable). New CI workflow `.github/workflows/publish-sdks.yml` publishes on tags `sdk-py-v*` (PyPI Trusted Publishers) and `sdk-ts-v*` (npm with provenance).
- RFC 0011 Sybil Resistance and Sub Agent Anti Abuse (Trust and Reputation, targets 1.1).
- RFC 0012 The Agent Native Web (Web Integration, targets 1.2).
- RFC 0013 Commerce Models for the Agent Economy (Commercial Layer, targets 1.2).
- RFC 0014 Commerce Primitives, A Generalized Commercial Layer (Commercial Layer, targets 1.2).
- RFC 0015 Composable Software Primitives (Marketplace and Discovery, targets 1.2).
- RFC 0016 User Sovereignty Charter (Privacy and Governance, targets 1.2).
- RFC 0017 Irreversibility and Cooling Off Periods (CCC, targets 1.2).
- RFC 0018 The Right to a Human Path (Privacy and Governance, targets 1.2).
- Whitepaper From the Document Web to the Agent Web (Foundation publication).
- Manifest schema extended with top level `commerce` block: `default_model`, `settlement_window_days`, `reconciliation_log`, `match_broker`, `knowledge_metering`.
- Action schema `cost.type` enum extended with the five RFC 0013 commerce model identifiers and new fields `unit`, `quote_endpoint`, `procurement_endpoint`, `delegation_endpoint`, `budget_window_days`, `renewal_behavior`, `stake_required`.
- Action schema `cost_disclosure` block for the Build versus Buy Decision Protocol (RFC 0013 § 3.7).
- Receipt schema extended with new types `procurement_offer`, `procurement_acceptance`, `delivery_proof`, `citation_attribution`, `task_completion`.
- Receipt schema `consumption_proof` and `citations` substructures (RFC 0013 § 3.5).
- New schema `oap-procurement-intent.schema.json`.
- New schema `oap-offer.schema.json`.
- New schema `oap-settlement-statement.schema.json`.
- New schema `oap-commerce-primitive.schema.json` (RFC 0014).
- Manifest `commerce.primitives` array, action `cost.primitive`, receipt `commerce_primitive` block (RFC 0014 § 5).
- Action `replaceability` block (RFC 0015 § 6); new schemas `oap-composition-manifest.schema.json` and `oap-customization-receipt.schema.json`.
- Action `irreversibility_class` and `irreversibility_cooling_off_seconds` (RFC 0017 § 5.1).
- Receipt new types `irreversible_pending`, `irreversible_withdrawn`, `escalation_response` and `irreversibility` and `escalation` blocks (RFC 0017 § 5.2, RFC 0018 § 6.3).
- Manifest `consequential_provider` and `escalation_service_level` (RFC 0018 § 6.1).
- RFC 0019 Conformance Testing and Implementability (Implementation and Conformance, targets 1.2).
- New schema `oap-conformance-receipt.schema.json` (RFC 0019 § 7).
- Manifest `conformance` block with `claimed_levels`, `receipt_uri`, `suite_version`, `last_attested_at`, `next_attestation_due`, and `attestor` (RFC 0019 § 4).
- New `test-suite/` directory containing schema, behavior, level, and charter sub suites, the runner, and the attest CLI.
- New library `reference/agent/conformance-verifier.js` enabling any consuming Agent to verify another Agent's conformance autonomously per RFC 0019 § 6.
- CI workflow extended with three new jobs: `conformance-test-suite`, `implementability-gate`, `backward-compatibility-gate` (RFC 0019 § 3 and § 4).
- RFC Process updated with section 5a binding all future RFCs to the Implementability Gate, the Backward Compatibility Gate, and the Charter Review Gate.
- Whitepaper chapter 9 "From Shipped Products to Shipped Primitives" added.
- Working Group 9 Web Integration and Working Group 10 Commercial Layer added to governance.
- Initial Public Working Draft of OAP-CORE-1.0 specification.
- 12 normative JSON Schemas (2020-12).
- Foundation Charter and RFC Process.
- Worked example: Weather Pro (Manifest, Receipt, Decision Record).
- MCP adapter (reference implementation).
- A2A adapter (reference implementation).
- OpenAI Functions adapter (derivation utility).
- LangGraph adapter (node wrapper).
- Reference OAP server (Node.js, Express).
- Reference agent runtime (Node.js).
- Conformance test suite and CLI validator.
- SECURITY.md with disclosure and bounty program.
- CODE_OF_CONDUCT.md.
- CONTRIBUTING.md.

## [1.0.0-pwd.1] - 2026-05-02

### Added
- Initial publication of OAP-CORE-1.0 as Public Working Draft.
