# Changelog

All notable changes to the Open Agent Protocol specification, schemas, and reference implementations will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/) at the specification level.

## [Unreleased]

### Added
- RFC 0011 Sybil Resistance and Sub Agent Anti Abuse (Trust and Reputation, targets 1.1).
- RFC 0012 The Agent Native Web (Web Integration, targets 1.2).
- RFC 0013 Commerce Models for the Agent Economy (Commercial Layer, targets 1.2).
- RFC 0014 Commerce Primitives, A Generalized Commercial Layer (Commercial Layer, targets 1.2).
- RFC 0015 Composable Software Primitives (Marketplace and Discovery, targets 1.2).
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
