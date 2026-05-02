# Worked Examples

This directory contains validated end to end examples of OAP artifacts. They serve as developer references and test fixtures for conformance tooling.

## Examples

| Example | Conformance Level | Purpose |
|---------|-------------------|---------|
| `weather-pro/` | L3 (Trusted) | Complete Manifest with Receipts and Decision Records. Demonstrates billing, trust verification, and policy enforcement. |
| `legal-research-privileged/` | L5 (Certified) | High risk legal research tool operating under attorney client privilege. Demonstrates Privileged Mode CCC, insurance, SOC 2, and ISO 27001. |
| `team-crm-collaborative/` | L4 (Collaborative) | Multi agent CRM with optimistic locking and change broadcasts. Demonstrates concurrent agent coordination and conflict resolution. |

## Files per Example

| File | Schema |
|------|--------|
| `manifest.json` | `oap-manifest.schema.json` |
| `receipt.json` | `oap-receipt.schema.json` |
| `decision-record.json` | `oap-decision-record.schema.json` |
| `ccc.json` | `oap-ccc.schema.json` |

## Validation

```bash
cd reference/validator
node validate.js all ../../examples/weather-pro/
node validate.js all ../../examples/legal-research-privileged/
node validate.js all ../../examples/team-crm-collaborative/
```
