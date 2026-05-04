# OAP Community Governance

This directory documents how the Open Agent Protocol community works.

## Principles

1. **No legal entity.** OAP is not owned by any foundation, association, corporation, or individual. There is no charter, no membership dues, no licensing fees, and no central treasury. The specification and reference implementations are open source under Apache 2.0 (code) and CC-BY 4.0 (text).
2. **Public, asynchronous, in writing.** All decisions are taken in public on GitHub (Pull Requests, Issues, Discussions). There are no private meetings of record, no closed mailing lists, and no off-platform decision channels.
3. **Mechanism over hierarchy.** Wherever possible, governance is enforced by mechanism (CI checks, schema validation, cryptographic peer-witnessing) rather than by a person or committee. The OAP Registry, the Conformance test suite, and the RFC peer-review quorum are the enforcement layer.
4. **Multiple competing implementations.** Reference implementations exist to bootstrap the ecosystem and to make Conformance auditable. They are not privileged. Multiple competing Marketplaces, Wallets, and Verifiers are presumed and encouraged.
5. **Rough consensus, recorded in writing.** RFCs are accepted by Peer Review Quorum (at least three Maintainers from at least three distinct organizations), with discussion archived in the Pull Request thread.

## Documents

| File | Purpose |
|---|---|
| `RFC-PROCESS.md` | How to propose, discuss, and merge a normative change to OAP. |
| `WORKING-GROUPS.md` | Discussion categories, Coordinator role, rotation. |
| `MAINTAINERS.md` | List of current Maintainers and how to become one. |
| `policy-mappings/` | L2 jurisdictional and WCAG accessibility mappings (community-maintained reference data). |

## What this is not

This document does not establish a foundation. It does not appoint a board. It does not set fees. It does not grant any party authority to speak for OAP. It documents the community process by which an open specification is maintained.

If you would like to contribute, the easiest entry points are:

* Open a Discussion in `openagentprotocol-OAP/oap-spec` (Discussions tab).
* Open a draft Pull Request against the spec or an RFC.
* Run the Conformance test suite against your implementation and submit your Conformance Receipt to `openagentprotocol-OAP/oap-registry`.
