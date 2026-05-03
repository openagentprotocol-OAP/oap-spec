# OAP Request for Comments

This directory contains the open RFC backlog for the Open Agent Protocol. Each document defines a proposed extension to the specification beyond the v1.0 baseline. Drafts here are not yet normative and are subject to the process described in [governance/RFC-PROCESS.md](../governance/RFC-PROCESS.md).

## Index

| RFC | Title | Working Group | Status | Targets |
|-----|-------|---------------|--------|---------|
| [0001](RFC-0001-sessions.md) | Coordination Sessions | Core Protocol | Draft | 1.1 |
| [0002](RFC-0002-negotiation.md) | Negotiation Protocol | CCC | Draft | 1.1 |
| [0003](RFC-0003-standing-permissions.md) | Standing Permissions | CCC | Draft | 1.1 |
| [0004](RFC-0004-delegation.md) | Sub Agent Delegation | Core Protocol | Draft | 1.1 |
| [0005](RFC-0005-entities.md) | Canonical Entity Schemas | Core Protocol | Draft | 1.1 |
| [0006](RFC-0006-personas.md) | Persona and Scope Layer | CCC | Draft | 1.1 |
| [0007](RFC-0007-projections.md) | Privacy Preserving Projections | CCC | Draft | 1.1 |
| [0008](RFC-0008-workflows.md) | Workflow Composition | Marketplace and Discovery | Draft | 1.1 |
| [0009](RFC-0009-reputation.md) | Reputation and Performance Records | Trust and Reputation | Draft | 1.2 |
| [0010](RFC-0010-memory-exchange.md) | Memory Exchange Protocol | Core Protocol | Draft | 1.2 |

## Lifecycle

A new RFC is added with the next available number, with status `Draft`. It progresses through Discussion, Last Call, and Decision per the RFC Process. Accepted RFCs are merged into the next minor or major specification release and the source document is moved to `rfc/accepted/`.

## Filing a New RFC

1. Copy [TEMPLATE.md](TEMPLATE.md).
2. Use the next free number from this index.
3. Open a pull request titled `RFC-NNNN: Title`.
4. The relevant Working Group Chair assigns reviewers within seven days.

## Conventions

All RFCs use US English. Em dashes are not permitted. Normative keywords (MUST, SHOULD, MAY) follow RFC 2119 and RFC 8174 and appear only in capital letters when used normatively.
