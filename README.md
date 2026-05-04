<div align="center">

# Open Agent Protocol

**The vendor neutral standard for how autonomous agents discover, invoke, pay for, govern, and audit the tools and services they use.**

[![Spec 1.0 PWD](https://img.shields.io/badge/spec-1.0%20Public%20Working%20Draft-1f6feb)](spec/v1.0/OAP-CORE-1.0.md)
[![RFCs](https://img.shields.io/badge/RFCs-26-555)](rfcs/)
[![Papers](https://img.shields.io/badge/papers-10-555)](papers/)
[![Schemas](https://img.shields.io/badge/JSON%20Schemas-23-555)](schemas/v1.0/)
[![Adapters](https://img.shields.io/badge/adapters-MCP%20|%20A2A%20|%20OpenAI%20|%20LangGraph-555)](adapters/)
[![Code License](https://img.shields.io/badge/code-Apache%202.0-2ea44f)](LICENSE-CODE)
[![Spec License](https://img.shields.io/badge/spec-CC--BY%204.0-2ea44f)](LICENSE-SPEC)
[![Website](https://img.shields.io/badge/openagentprotocol.eu-black)](https://openagentprotocol.eu)

[Specification](spec/v1.0/OAP-CORE-1.0.md) · [RFCs](rfcs/) · [Papers](papers/) · [Reference](reference/) · [Conformance](test-suite/) · [Website](https://openagentprotocol.eu) · [Discussions](https://github.com/openagentprotocol-OAP/oap-spec/discussions)

</div>

---

## What OAP is

OAP is a single conformance surface for the agent economy. It unifies the operational, commercial, legal, and ethical interfaces that today are implemented in fragmented and incompatible ways by the Model Context Protocol, the Agent2Agent Protocol, proprietary function calling, and bespoke enterprise integrations.

OAP covers identity, capability description, structured invocation, monetization, multi agent coordination, confidentiality enforcement, and tamper evident auditing. It is designed to be the default interoperability layer for autonomous agents, comparable in scope to what HTTP, OAuth, and TLS represent for the human web.

## Why OAP exists

| Concern | MCP | A2A | OpenAI Functions | OAP |
|---|---|---|---|---|
| Tool invocation | yes | no | yes | yes |
| Agent to agent collaboration | no | yes | no | yes |
| Pricing, billing, subscriptions | no | no | no | yes |
| Identity portability via DIDs | no | partial | no | yes |
| Confidentiality and NDA enforcement | no | no | no | yes |
| Tamper evident receipts | no | no | no | yes |
| Policy engine and right to explanation | no | no | no | yes |
| Insurance and dispute resolution | no | no | no | yes |
| Verifiable indexes and inclusion proofs | no | no | no | yes |
| Standardized query language across providers | no | no | no | yes |
| Regulatory conformance mapping | no | no | no | yes |

OAP is additive. It does not replace existing protocols. It composes with them through reference adapters that ship in this repository.

## Architecture

```
                            +-------------------------------+
                            |        AGENT PRINCIPALS       |
                            |  (humans, organizations, AI)  |
                            +---------------+---------------+
                                            |
                                  signed Intents (AQL)
                                            |
       +------------------------------------v------------------------------------+
       |                           AGENT QUERY LANGUAGE                          |
       |  closed operator set, projection, budget, quality floor, signature      |
       +------------------------------------+------------------------------------+
                                            |
                          +-----------------+-----------------+
                          |                                   |
                     RESOLVER                            MATCH BROKER
                   (single provider)                  (verifiable index)
                          |                                   |
                          +-----------------+-----------------+
                                            |
                            +---------------v----------------+
                            |          MANIFESTS             |
                            |  capability, pricing, policy,  |
                            |  identity, conformance level   |
                            +---------------+----------------+
                                            |
                          +-----------------+-----------------+
                          |                 |                 |
                  REQUEST ENVELOPE   POLICY STACK      AUDIT LAYER
                  signed invocation   4 layers         tamper evident
                                                       receipts and
                                                       decision records
                                            |
                            +---------------v----------------+
                            |     COMMERCE AND SETTLEMENT    |
                            |  offers, wallets, statements,  |
                            |  refunds, dispute resolution   |
                            +--------------------------------+
```

The Policy Stack has four layers, evaluated in order: Universal Prohibitions, Organizational Policy, Persona Policy, Personal Policy. Every Action carries a Decision Record explaining which layer admitted or denied it. Every billable Action produces a Receipt that is hash chained into a tamper evident Audit Log.

## Quick start

### Validate a Manifest in 60 seconds

```bash
git clone https://github.com/openagentprotocol-OAP/oap-spec
cd oap-spec/reference/validator
npm install
node ajv-validate.js ../../examples/team-crm-collaborative/manifest.json
```

### Resolve an Intent against a candidate set

```bash
cd oap-spec/reference/aql
npm install
node bin/oap-aql.js resolve \
  ../../examples/aql/discovery-intent.json \
  ../../examples/aql/candidates.json
```

Returns a signed Intent Response with ranked candidates and a per candidate Decision Record. The same evaluator runs in the browser at [openagentprotocol.eu/aql](https://openagentprotocol.eu/aql).

### Run the full conformance suite

```bash
cd oap-spec/test-suite
npm install
node runner.js
```

Runs schema fixtures, the AQL behavior probe, and the charter assertions. Exits non zero on any failure.

### Map an existing MCP server to an OAP Manifest

```bash
cd oap-spec/adapters/mcp
node oap-mcp-adapter.js --mcp-tools ./your-mcp-tools.json --out manifest.json
```

The adapter emits a Level 0 Compatible Manifest. Add pricing, policy, and audit blocks to ascend conformance levels.

## Repository layout

```
oap-spec/
  spec/v1.0/                 Normative specification: OAP-CORE-1.0.md
  schemas/v1.0/              23 normative JSON Schemas (2020-12)
  rfcs/                      26 RFCs covering sessions, commerce, policy, AQL, indexes, NC profile, registry
  papers/                    10 whitepapers on theory, economics, governance
  reference/
    agent/                   Reference Agent runtime
    server/                  Reference Resolver server
    aql/                     Agent Query Language reference parser, evaluator, CLI
    validator/               AJV based schema validator
    mappings/                Cross protocol mappings
  adapters/
    mcp/                     Model Context Protocol adapter
    a2a/                     Agent2Agent adapter
    openai-functions/        OpenAI Function Calling adapter
    langgraph/               LangGraph adapter
  examples/                  Worked Manifests, Receipts, AQL Intents, scenarios
  test-suite/                Conformance runner, schema fixtures, behavior probes
  governance/                Charter, RFC process, Working Groups
  .github/                   Issue templates, PR template, release notes, CI
```

## Specification, RFCs, and Papers

| Layer | Document | Purpose |
|---|---|---|
| Core | [OAP-CORE-1.0](spec/v1.0/OAP-CORE-1.0.md) | The single normative document. References every RFC. |
| Sessions | [RFC-0001](rfcs/RFC-0001-sessions.md) | Session lifecycle, idempotency, replay protection. |
| Negotiation | [RFC-0002](rfcs/RFC-0002-negotiation.md) | Price, scope, and SLA negotiation. |
| Standing Permissions | [RFC-0003](rfcs/RFC-0003-standing-permissions.md) | Pre approved Action grants. |
| Delegation | [RFC-0004](rfcs/RFC-0004-delegation.md) | Sub task delegation and cost attribution. |
| Entities and Personas | [RFC-0005](rfcs/RFC-0005-entities.md), [RFC-0006](rfcs/RFC-0006-personas.md) | Identity model. |
| Projections | [RFC-0007](rfcs/RFC-0007-projections.md) | Confidentiality preserving views. |
| Workflows | [RFC-0008](rfcs/RFC-0008-workflows.md) | Multi step coordination. |
| Reputation | [RFC-0009](rfcs/RFC-0009-reputation.md) | Verifiable performance signals. |
| Memory Exchange | [RFC-0010](rfcs/RFC-0010-memory-exchange.md) | Inter agent context sharing. |
| Sybil Resistance | [RFC-0011](rfcs/RFC-0011-sybil-resistance.md) | Identity attestation requirements. |
| Agent Native Web | [RFC-0012](rfcs/RFC-0012-agent-native-web.md) | The web rebuilt for agent first traffic. |
| Commerce | [RFC-0013](rfcs/RFC-0013-commerce-models.md), [RFC-0014](rfcs/RFC-0014-commerce-primitives.md) | Procurement, offers, settlement. |
| Composable Software | [RFC-0015](rfcs/RFC-0015-composable-software-primitives.md) | Software as agent invokable primitives. |
| User Sovereignty | [RFC-0016](rfcs/RFC-0016-user-sovereignty-charter.md), [RFC-0017](rfcs/RFC-0017-irreversibility-and-cooling-off.md), [RFC-0018](rfcs/RFC-0018-right-to-human-path.md) | The user side guarantees. |
| Conformance | [RFC-0019](rfcs/RFC-0019-conformance-testing-and-implementability.md) | Levels L0 through L5. |
| Agent Query Language | [RFC-0020](rfcs/RFC-0020-agent-query-language.md) | The canonical query surface. |
| Verifiable Indexes | [RFC-0021](rfcs/RFC-0021-verifiable-indexes.md) | Match Brokers and inclusion proofs. |
| Subscription Protocol | [RFC-0022](rfcs/RFC-0022-manifest-subscription-protocol.md) | Push delivery for Manifest changes. |
| Storage Substrate | [RFC-0023](rfcs/RFC-0023-agent-native-storage-substrate.md) | The data layer queried through AQL. |
| Schema Negotiation | [RFC-0024](rfcs/RFC-0024-schema-negotiation-and-versioning.md) | Forward and backward compatible evolution. |
| Non Commercial Profile | [RFC-0025](rfcs/RFC-0025-non-commercial-conformance-profile.md) | BYOK and non commercial conformance variant. |
| Registry Protocol | [RFC-0026](rfcs/RFC-0026-registry-protocol.md) | Append only listing, validation CI, and renewal. |

The 10 [whitepapers](papers/) cover accountability, the agent web, confidentiality, databases for the agent economy, economics, governance, interoperability, the policy stack, verifiable conformance, and the storefront to manifest transition.

## Conformance levels

| Level | Designation | Summary |
|---|---|---|
| L0 | Compatible | MCP or A2A interoperability with minimal OAP Manifest mapping. |
| L1 | Discoverable | Full Manifest, categories, examples, machine validated. |
| L2 | Billable | Pricing, Auth, Subscription, Wallet, refund endpoint. |
| L3 | Trusted | Audit Log, Data Policy, CCC, Verified Publisher, Multi Party Review for high risk Actions. |
| L4 | Collaborative | Multi Agent Coordination, Conflict Resolution, Coordination Sessions. |
| L5 | Peer-Certified | All L4 requirements plus an external SOC 2 Type II, ISO 27001, ISO 42001, or equivalent third party attestation, and at least three independent peer-witness signatures from implementations that themselves hold a valid L4 or L5 Conformance Receipt and are operated by three distinct organizations, anchored in the OAP Registry. |

Conformance is machine verifiable. The reference [test suite](test-suite/) runs schema, behavior, and charter assertions against any implementation.

## Reference implementations

| Package | What it does |
|---|---|
| [reference/agent](reference/agent) | Agent runtime: signs Intents, posts to Resolvers, verifies Receipts. |
| [reference/server](reference/server) | Resolver server: serves a Manifest, evaluates Requests, emits Receipts. |
| [reference/aql](reference/aql) | AQL parser, evaluator, projection engine, CLI. 20 unit tests. |
| [reference/validator](reference/validator) | AJV based schema validator across all 23 schemas. |
| [adapters/mcp](adapters/mcp) | Model Context Protocol bridge. |
| [adapters/a2a](adapters/a2a) | Agent2Agent bridge. |
| [adapters/openai-functions](adapters/openai-functions) | OpenAI Function Calling bridge. |
| [adapters/langgraph](adapters/langgraph) | LangGraph node and edge mapping. |

All reference code is published under the Apache License 2.0. Implementers may vendor or fork without restriction.

## Governance

The Open Agent Protocol is community driven. There is no foundation, association, corporation, or other legal entity that owns, controls, or speaks for OAP. There are no membership dues and no licensing fees. The specification is maintained by an open community of contributors through the public RFC process and through CI enforced quality gates in the open source repositories under the openagentprotocol-OAP GitHub organization.

Protocol changes follow an open RFC process with publicly archived discussion. Decisions are taken by rough consensus on RFCs and confirmed by a Peer Review Quorum of at least three Maintainers from at least three distinct organizations, as defined in `governance/WORKING-GROUPS.md`. Working Group Coordinators have no veto power; their role is to triage, facilitate consensus, and shepherd RFCs through the process.

Services that the protocol depends on, including the OAP Registry (RFC 0026), the Trust Score reference implementation, the Sampling and Outcome Verification probes, and the Revocation Service, are open source software that any community member may deploy. Multiple competing instances are presumed and encouraged.

Working Groups are documented in [governance/WORKING-GROUPS.md](governance/WORKING-GROUPS.md). The RFC process is documented in [governance/RFC-PROCESS.md](governance/RFC-PROCESS.md).

## Community

| Channel | Purpose |
|---|---|
| [GitHub Discussions](https://github.com/openagentprotocol-OAP/oap-spec/discussions) | RFC drafting, design questions, implementer reports, Working Group calls. |
| [Issues](https://github.com/openagentprotocol-OAP/oap-spec/issues) | Spec defects, schema bugs, conformance failures. |
| [Pull Requests](https://github.com/openagentprotocol-OAP/oap-spec/pulls) | Editorial corrections, reference implementation improvements. |
| Mailing list | Coming with the v1.0 Final designation. |

Substantive protocol changes follow the RFC process. Editorial corrections may be proposed directly through pull requests against the latest published draft.

## Contributing

OAP is an open standard. Contributions from individuals, companies, civil society, and government participants are welcome. Begin with [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

## Licensing

The specification text is published under the Creative Commons Attribution 4.0 International License. See [LICENSE-SPEC](LICENSE-SPEC).

Reference implementations, schemas, adapters, and tooling in this repository are published under the Apache License 2.0. See [LICENSE-CODE](LICENSE-CODE).

## Citation

A machine readable citation file is provided at [CITATION.cff](CITATION.cff). The recommended human readable form is:

> Open Agent Protocol Working Groups. *Open Agent Protocol, Version 1.0 Public Working Draft*. OAP-CORE-1.0. 2026. https://openagentprotocol.eu

## Status

This is a Public Working Draft. Implementations are encouraged. Non breaking refinements are expected before the Final designation is granted.
