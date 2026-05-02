# Open Agent Protocol (OAP)

> The vendor neutral standard for how AI agents discover, invoke, pay for, govern, and audit the tools and services they use.

[![Specification](https://img.shields.io/badge/spec-1.0%20PWD-blue)](spec/v1.0/OAP-CORE-1.0.md)
[![Spec License](https://img.shields.io/badge/spec%20license-CC--BY%204.0-lightgrey)](LICENSE-SPEC)
[![Code License](https://img.shields.io/badge/code%20license-Apache%202.0-green)](LICENSE-CODE)
[![Status](https://img.shields.io/badge/status-Public%20Working%20Draft-orange)]()

## What is OAP

The Open Agent Protocol defines a single conformance surface for the agent economy. It unifies the operational, commercial, legal, and ethical interfaces that have so far been implemented in fragmented and incompatible ways by the Model Context Protocol, the Agent2Agent Protocol, proprietary function calling systems, and bespoke enterprise integrations.

OAP covers identity, capability description, structured invocation, monetization, multi agent coordination, confidentiality enforcement, and tamper evident auditing. It is designed to be the default interoperability layer for autonomous agents, comparable in scope to what HTTP, OAuth, and TLS represent for the web.

## Why it exists

| Concern | MCP | A2A | OAP |
|---------|-----|-----|-----|
| Tool invocation | yes | no | yes |
| Agent to agent collaboration | no | yes | yes |
| Pricing, billing, subscriptions | no | no | yes |
| Identity portability (DIDs) | no | partial | yes |
| Confidentiality and NDA enforcement | no | no | yes |
| Tamper evident receipts | no | no | yes |
| Policy engine and right to explanation | no | no | yes |
| Insurance and dispute resolution | no | no | yes |
| Regulatory conformance mapping | no | no | yes |

## Read the specification

The normative specification lives at:

[spec/v1.0/OAP-CORE-1.0.md](spec/v1.0/OAP-CORE-1.0.md)

Normative JSON Schemas live at:

[schemas/v1.0/](schemas/v1.0/)

## Conformance levels

| Level | Designation | Summary |
|-------|-------------|---------|
| L0 | Compatible | MCP or A2A interoperability with minimal OAP Manifest mapping. |
| L1 | Discoverable | Full Manifest, categories, examples, machine validated. |
| L2 | Billable | Pricing, Auth, Subscription, Wallet, refund endpoint. |
| L3 | Trusted | Audit Log, Data Policy, CCC, Verified Publisher, Multi Party Review for high risk Actions. |
| L4 | Collaborative | Multi Agent Coordination, Conflict Resolution, Coordination Sessions. |
| L5 | Certified | External SOC 2 Type II or ISO 27001, declared SLA contract, Insurance Tag, Foundation audit. |

## Repository layout

```
oap-spec/
  spec/v1.0/              Normative specification documents
  schemas/v1.0/           Normative JSON Schemas (2020-12)
  examples/               Worked Manifests, Receipts, Decision Records
  adapters/               Reference adapters (MCP, A2A, OpenAI Functions)
  reference/              Reference implementations (planned)
  governance/             Foundation charter, RFC process, working group rules
  LICENSE-SPEC            Creative Commons Attribution 4.0
  LICENSE-CODE            Apache License 2.0
  README.md               This file
```

## Governance

The Open Agent Protocol is stewarded by the Open Agent Protocol Foundation, a neutral non profit organization. The Foundation maintains the specification, operates the trust anchoring services that the protocol depends on, and adjudicates disputes that participants cannot resolve directly.

No single corporate participant may hold more than fifteen percent of voting weight. Specification changes follow an open RFC process with publicly archived discussion. The Ethics Board includes practitioners from law, medicine, journalism, accessibility advocacy, and labor representation.

See [governance/CHARTER.md](governance/CHARTER.md) and [governance/RFC-PROCESS.md](governance/RFC-PROCESS.md).

## Contributing

OAP is an open standard. We welcome contributions from individuals, companies, civil society, and government participants. Begin with [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

Substantive protocol changes follow the RFC process. Editorial corrections may be proposed directly through pull requests against the latest published draft.

## Licensing

The specification text is published under the Creative Commons Attribution 4.0 International License. See [LICENSE-SPEC](LICENSE-SPEC).

Reference implementations, schemas, adapters, and tooling in this repository are published under the Apache License 2.0. See [LICENSE-CODE](LICENSE-CODE).

## Citation

When citing the specification, please use:

> Open Agent Protocol Foundation. *Open Agent Protocol, Version 1.0 Public Working Draft*. OAP-CORE-1.0. 2026.

## Status

This is a Public Working Draft. Implementations are encouraged. Non breaking refinements are expected before the Final designation is granted.
