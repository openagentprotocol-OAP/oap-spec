# OAP Working Groups

Working Groups are GitHub Discussion categories scoped to a coherent area of the specification. Anyone may participate. Each Working Group has a Coordinator, a self-nominated and rotating role.

## Standing Working Groups

| Working Group | Scope | Discussion Category |
|---|---|---|
| Core Protocol | Sections 4 through 9 of OAP-CORE-1.0 (Architecture, Identity, Manifest, Action, Invocation, Streaming, Versioning). | `wg-core` |
| Confidentiality and Compliance (CCC) | Section 18 (CCC), Section 20 (Policy Engine), professional codes mapping, NDA enforcement, Chinese Wall logic. | `wg-ccc` |
| Wallet, Subscription, Settlement | Sections 14 through 17 (commerce plane). | `wg-commerce` |
| Conformance and Testing | Section 31, RFC 0019, the test suite. | `wg-conformance` |
| Registry | RFC 0026, the `oap-registry` repository. | `wg-registry` |
| Adapters | MCP, A2A, OpenAI Functions, LangGraph adapters in `reference/adapters`. | `wg-adapters` |
| Accessibility | WCAG mapping, accessible consent and dispute interfaces. | `wg-accessibility` |
| Security and Privacy | Sections 28, 29, key rotation, threat modelling. | `wg-security` |

New Working Groups may be created by an RFC that defines the scope and rationale.

## Coordinator role

A Coordinator's responsibilities:

1. Triage incoming Issues and Discussions in the Working Group's category.
2. Tag RFCs that fall within the Working Group's scope.
3. Facilitate consensus, identify blocking objections, and ask the Peer Review Quorum to consider an RFC.
4. Publish a quarterly status note as a Discussion in the category.

A Coordinator's authority:

1. None beyond facilitation. Coordinators do not vote with greater weight, do not have veto, and do not approve PRs in their Coordinator capacity.
2. A Coordinator may also be a Maintainer; in that capacity they vote like any other Maintainer.

## Selection and rotation

* Term: 6 months.
* Self-nomination: Open a Discussion in the Working Group's category titled `Coordinator nomination: <handle> (<period>)`.
* Confirmation: A Coordinator nomination is confirmed if at least three Maintainers from at least three distinct organizations approve in the Discussion thread within 14 days, with no blocking objection from another Maintainer.
* Rotation: A Coordinator may not serve more than two consecutive terms in the same Working Group. After a one-term break they may stand again.
* Recall: A Coordinator may be recalled mid-term by a Public Vote (see `RFC-PROCESS.md`, Section 6).

## Vacancies

If a Working Group has no Coordinator for 30 days, any Maintainer may act as interim Coordinator until a self-nomination is confirmed.

## Communication

* Synchronous calls are not part of the decision process. They MAY happen, but no decision binds the community unless it is also made in writing on the relevant GitHub thread.
* Working Group meeting notes, if any, MUST be posted as a Discussion in the Working Group's category within 48 hours.
