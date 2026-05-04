# OAP Request for Comments (RFC) Process

**Document Identifier:** OAP-RFC-PROCESS-1.1
**Status:** Active
**Date:** 2026-05-04

## 1. Purpose

This document defines how substantive changes to the Open Agent Protocol are proposed, discussed, decided, and published. The process is designed to be open, asynchronous, in writing, and resistant to capture by any single participant. Everything happens on GitHub. There are no closed channels.

## 2. When an RFC is required

An RFC is required for any change that:

1. Modifies normative behavior (introduces, removes, or alters a MUST, SHOULD, or MAY).
2. Changes the wire format of any envelope, Manifest, Receipt, or Decision Record.
3. Changes Conformance Level criteria or the Conformance test suite.
4. Adds or removes a JSON Schema, error code, or registered claim.
5. Changes this RFC process or the Working Group structure.

An RFC is not required for: editorial fixes, typos, broken-link fixes, dead-code removal in reference implementations, dependency bumps, or non-normative example updates.

## 3. Roles

| Role | Selection | Authority |
|---|---|---|
| **Author** | Anyone. | Drafts the RFC. |
| **Reviewer** | Anyone. | Comments on the RFC pull request. |
| **Coordinator** | Self-nominated for a fixed term in the relevant Working Group (see `WORKING-GROUPS.md`). | Triages, requests revisions, marks an RFC ready for the Peer Review Quorum. No veto. |
| **Maintainer** | Listed in `MAINTAINERS.md`. Becomes a Maintainer through the procedure in that file. | Casts a binding vote in the Peer Review Quorum. Merges the RFC if Quorum is met. |

There is no Board, Steering Committee, Foundation, or other body above these roles.

## 4. RFC numbering and lifecycle

RFCs live in `oap-spec/rfcs/RFC-NNNN-short-slug.md` where `NNNN` is the next free number. Status is tracked in the document front matter: `Draft`, `Discussion`, `Final Comment Period`, `Accepted`, `Rejected`, `Superseded`.

```
Draft
  | (PR opened, Coordinator triage, normative diff, schema update)
Discussion
  | (asynchronous public review for at least 14 days)
Final Comment Period
  | (Coordinator marks ready, 7 days for last objections)
Accepted
  | (Peer Review Quorum reached, PR merged, version bumped)
Active
```

A Final Comment Period requires at least 14 days in `Discussion` to start. The Final Comment Period itself is at least 7 days long.

## 5. Peer Review Quorum

To merge, an RFC PR MUST collect:

1. At least three approving reviews from current Maintainers.
2. From at least three distinct organizations (no two approvers may be from the same organization, GitHub-org membership is the indicator).
3. Zero unresolved objections from any other Maintainer.

A blocking objection from a Maintainer keeps the RFC in Discussion until the objection is resolved or the objector withdraws it. If the objection is unresolvable after 30 days, any Maintainer may call for a Public Vote.

## 6. Public Vote (rare path)

When consensus cannot be reached, the Coordinator opens a Public Vote as a GitHub Discussion linked from the RFC. Voting period is 14 days. Eligible voters are anyone who has had a non-trivial commit merged into `oap-spec` in the previous 12 months. Each eligible voter has one vote. A Public Vote is decided by simple majority. Sybil resistance is enforced by GitHub identity plus the commit-history filter.

## 7. CI gates that must pass before merge

* Schema validation across all changed `.schema.json` files.
* Conformance test suite passes against the reference server.
* Markdown link check.
* No new `Stewards`, `Foundation`, `Board`, or other entity-establishing language outside historical-context sections.
* Backward-compatibility check on receipt and manifest schemas (additive-only or major-version bump).

## 8. After merge

* The accepted RFC is appended to the spec changelog in the next normative release.
* If the RFC bumps a schema version, the test suite and reference implementations are updated in the same release tag.
* The RFC is referenced from the relevant section of `OAP-CORE-1.0.md`.

## 9. Withdrawal and revision

The Author may withdraw a Draft RFC at any time. Once Accepted, an RFC may only be modified by a superseding RFC that explicitly references and replaces it.

## 10. References

* `WORKING-GROUPS.md` (Coordinator selection and rotation).
* `MAINTAINERS.md` (Maintainer roster and onboarding).
* RFC 0019 (Conformance Testing and Implementability).
* RFC 0026 (OAP Registry Protocol).
