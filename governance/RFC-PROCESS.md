# OAP Request for Comments (RFC) Process

**Document Identifier:** OAP-RFC-PROCESS-1.0
**Status:** Public Working Draft
**Date:** 2026-05-03

## 1. Purpose

This document defines how substantive changes to the Open Agent Protocol are proposed, discussed, decided, and published. The process is designed to be open, transparent, and resistant to capture by any single participant.

## 2. When an RFC is required

An RFC is required for any change that:

1. Modifies normative behavior (introduces, removes, or alters a MUST, SHOULD, or MAY).
2. Changes the wire format of any envelope, Manifest, Receipt, or Decision Record.
3. Changes Conformance Level criteria.
4. Changes Foundation governance, services, or fee structure.
5. Adds or removes IANA registrations or registry entries.

Editorial changes, typo corrections, additional examples, and non normative clarifications do not require an RFC and may proceed through ordinary pull request review.

## 3. Stages

| Stage | Duration (minimum) | Outcome |
|-------|--------------------|---------|
| Draft | Author defined | Initial proposal published as `rfc/draft/RFC-NNNN-title.md`. |
| Discussion | 30 days | Public review on the OAP discussion forum and tracked GitHub issue. |
| Last Call | 14 days | Final comment period; substantive changes restart Discussion. |
| Decision | 7 days | Working Group vote, Board ratification if cross cutting. |
| Published | n/a | Merged into the next minor or major version. |

## 4. RFC document structure

```
# RFC NNNN: Title

Status:        Draft | Discussion | Last Call | Accepted | Rejected | Superseded
Author(s):     Name <handle> (affiliation)
Created:       YYYY-MM-DD
Working Group: Core Protocol | CCC | Wallet | Trust | Marketplace | Accessibility | Compliance
Targets:       Specification version (e.g., 1.1, 2.0)
Supersedes:    (optional)
Superseded-by: (optional)

## Summary
## Motivation
## Specification
## Backward compatibility
## Security considerations
## Privacy considerations
## Conformance impact
## Implementation experience
## Alternatives considered
## References
```

## 5. Decision rules

1. Decisions are made by rough consensus within the relevant Working Group, recorded by the Chair.
2. Where rough consensus is not achievable, the Working Group votes. A two thirds majority is required for normative changes.
3. Cross cutting changes require Board ratification by simple majority within thirty days.
4. The Ethics Board may request review of any RFC with material ethical implications. A negative opinion from the Ethics Board on the L1 Universal Prohibitions binds the Working Group.

## 5a. Mandatory advancement gates (RFC 0019)

A Request for Comments cannot advance from Discussion to Last Call until all three of the following gates have been satisfied. The gates apply in addition to, not in place of, the decision rules in section 5.

### 5a.1 Implementability Gate

A pull request that proposes any normative change MUST be accompanied by a corresponding modification to the Reference Implementation under `reference/`, to the Conformance Test Suite under `test-suite/`, or to both. A normative change is any change that introduces, removes, or alters a MUST, SHOULD, or MAY in any normative artifact, that adds or removes a field of any normative schema, or that alters the lifecycle of any envelope or receipt. The gate is enforced mechanically by the `implementability-gate` job in `.github/workflows/validate.yml`. A pull request that fails the gate cannot be merged. The Working Group may grant an exception by recorded supermajority for editorial, typographical, or non normative clarification changes, in which case the pull request body MUST contain the phrase `Implementability Gate exception` and a one paragraph justification.

### 5a.2 Backward Compatibility Gate

A pull request that modifies any schema under `schemas/v1.0/` MUST either declare the modification as `additive only` in the pull request body, accompanied by an explanation of why the change cannot affect the interpretation of any existing field, or MUST publish the change as a new schema version under `schemas/v1.1/` with a new `$id`. The original v1.0 schema MUST remain available at its original location indefinitely. The gate is enforced mechanically by the `backward-compatibility-gate` job in CI. The intent is that no implementation that was conformant on the day of attestation can have its conformance retroactively voided by a later schema edit.

### 5a.3 Charter Review Gate

A pull request that touches any user facing right established by RFC 0016, including but not limited to identity, memory, reputation, projection, persona, cooling off, escalation, deletion, replaceability, or pluralism of model and provider, MUST receive at least two explicit sign offs before entering Last Call. The first MUST come from the Working Group on Privacy and Governance and MUST be posted as a comment on the pull request bearing the phrase `Charter Review Gate cleared` and the decentralized identifier of the reviewer. The second MUST come from a User Advocacy Voter recognized by the Foundation under section 7 of RFC 0016 and MUST follow the same comment format. Working Group Chairs are responsible for verifying compliance before they record the transition to Last Call.

## 6. Voting eligibility

Working Group voting is open to all Working Group members in good standing. Members are required to disclose material conflicts of interest and to recuse where appropriate.

## 7. Publication

Accepted RFCs are merged into the specification at the next minor or major release per Section 27 of the specification. The RFC document remains in the repository under `rfc/accepted/` for historical reference.

## 8. Withdrawal and supersession

Authors may withdraw an RFC at any time before Acceptance. Accepted RFCs may be superseded by a later RFC that explicitly cites the superseded document.

## 9. Editorial style

RFCs follow the style guide in CONTRIBUTING.md. Use US English. Avoid em dashes. Use MUST, SHOULD, MAY only with the meaning of RFC 2119 and RFC 8174.
