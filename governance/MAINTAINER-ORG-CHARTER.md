# Maintainer Organization Charter

The OAP specification asserts ownerless governance. The substantive requirement behind that assertion is the presence of three independent maintainer organizations whose Maintainers populate the Peer Review Quorum required by `governance/WORKING-GROUPS.md`. This charter is the template by which a candidate organization formally joins the maintainer set.

## 1. Eligibility

A Maintainer Organization is a legal entity (corporation, foundation, university, public agency, or registered non profit) that operates an OAP implementation at Conformance Level L3 or above and that has staffed a Working Group Coordinator role for at least two consecutive quarters.

The entity MUST:

1. Be incorporated and in good standing in its home jurisdiction.
2. Hold a valid OAP Conformance Receipt at L3 or above, listed in `oap-registry`.
3. Have at least two Maintainers contributing to OAP for at least six months each.
4. Have no controlling shareholder relationship with another maintainer organization (independence test).
5. Have no current litigation against any other maintainer organization or against the protocol itself.

## 2. Application process

A candidate organization opens a pull request against this repository adding `governance/maintainer-organizations/<slug>.md` with the following structured fields: legal name, jurisdiction of incorporation, registration number, controlling shareholders (or `none-controlling` if no single shareholder holds more than 25 percent), declared OAP implementation, conformance receipt URL, named Maintainers with their DID and role, conflict declaration.

Existing Maintainer Organizations vote on the PR with one approval per organization. Approval by at least two existing organizations is required; the third by definition is the applicant. The PR is merged after a 30 day public comment period.

## 3. Obligations

A Maintainer Organization assumes these obligations:

1. Provide at least one Maintainer to the Peer Review Quorum on demand for any RFC vote.
2. Attend at least 80 percent of public Working Group calls in any quarter.
3. Disclose any commercial agreement with another Maintainer Organization or with any subject of an OAP Conformance Receipt.
4. Maintain independence: a Maintainer who joins a controlling relationship with another Maintainer Organization MUST resign one of the two roles within 60 days.
5. Fund a proportional share of community infrastructure (registry hosting, monitor services, audit budget) according to the schedule published annually by the Working Group Coordinators.

## 4. Resignation and removal

An organization MAY resign with 60 days notice. The resignation is recorded by appending `resigned_at` to its file.

An organization MAY be removed by unanimous vote of the other Maintainer Organizations if the independence test fails, if a Maintainer is found to have falsified an attestation, or if the organization persistently fails its quorum attendance obligation. The removal vote requires a 30 day public notice period.

## 5. Current applicants

The maintainer organization set is currently empty pending the application process described in section 2. The first three approvals will establish the founding set; the third application is approved by the prior two organizations following a 30 day comment period.

The Working Group is actively soliciting applications from organizations in distinct jurisdictions (recommended distribution: one EU, one North America, one Asia Pacific) to maximize the independence test of section 1 clause 4.
