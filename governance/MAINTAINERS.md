# OAP Maintainers

A Maintainer holds commit and PR-merge rights on the `openagentprotocol-OAP/oap-spec` repository and casts a binding vote in the Peer Review Quorum (see `RFC-PROCESS.md`).

## Current Maintainers

The Maintainer roster at any moment is the union of:

1. The members of the `@openagentprotocol-OAP/maintainers` GitHub team.
2. Any user with a green entry in this file's table whose GitHub team membership is pending.

| GitHub handle | Organization (for Quorum diversity) | Term started |
|---|---|---|
| `@till-fengler` | BEEP Technologies UG | 2026-05 |

> The roster is intentionally small at bootstrap. New Maintainers are added by the procedure below.

## Becoming a Maintainer

1. Sustained, non-trivial contributions to `oap-spec` over at least three months. "Non-trivial" means at least three merged PRs that are not typo or link fixes.
2. Endorsement: Open a Pull Request adding yourself to the table in this file. The PR body MUST link to the contributions used as evidence.
3. Confirmation: The PR is merged when at least three current Maintainers from at least three distinct organizations approve, with no blocking objection.
4. The PR merge triggers an Action that adds the user to the `@openagentprotocol-OAP/maintainers` GitHub team.

If the current Maintainer roster is smaller than three, the bootstrap quorum is the existing roster plus one approving review from a recognised independent contributor (defined in the README of this directory).

## Stepping down

A Maintainer may step down at any time by opening a PR removing their entry. No approval is required to merge.

## Inactivity

If a Maintainer has not approved or commented on any RFC for 12 consecutive months, any other Maintainer may open a PR moving the entry to the `Emeritus` table below. Emeritus Maintainers do not count toward the Peer Review Quorum but retain commit access and may return to active status by approving a new RFC.

## Emeritus Maintainers

| GitHub handle | Organization | Term ended |
|---|---|---|
| _(none yet)_ | | |

## Conflict of interest

Maintainers MUST disclose any commercial interest that could be materially affected by an RFC and MUST recuse themselves from the Quorum vote on that RFC. Disclosure is made as a comment on the RFC PR.
