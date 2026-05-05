# Changelog

All notable changes to the Open Agent Protocol specification, schemas, and reference implementations will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/) at the specification level.

## [Unreleased]

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
