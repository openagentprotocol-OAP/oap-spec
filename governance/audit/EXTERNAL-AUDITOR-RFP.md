# External Auditor RFP Template for OAP Specification Review

This RFP template solicits two independent external reviews of the OAP normative specification, the RFCs, and the reference implementations. The reviews satisfy the third party attestation requirement of conformance level L5 under RFC 0019 section 8 and the spec stability gate for the 1.0 Final designation.

## 1. Scope

The reviewers are asked to assess one of the two review tracks:

**Track 1: Cryptographic and Protocol Soundness.** The reviewer reads OAP-CORE-1.0, RFC 0009, RFC 0011, RFC 0021, RFC 0022, RFC 0026, RFC 0034, and RFC 0035, and assesses: protocol soundness against the stated threat models, cryptographic primitive selection, key management proposals, completeness of the test suite, and the soundness of the formal theorems stated in the appendices of RFC 0009 (boundedness, Sybil influence bound, Theorem C.1), RFC 0029 (axiomatic foundations), and RFC 0035 (soundness theorem, liveness recovery).

**Track 2: Legal and Compliance.** The reviewer reads the same RFCs plus the jurisdiction checklist of `governance/legal/JURISDICTION-REVIEW-CHECKLIST.md` and assesses: the alignment of the data retention defaults with GDPR storage limitation, the alignment of the erasure mechanism with the right to erasure, the alignment of the Broker Category Profile per category attestation requirements with the named regulatory regimes, and the gaps between the protocol level guarantees and the legal recognition of the resulting artifacts (signatures, receipts, attestations) in EU and US courts.

## 2. Reviewer qualifications

Track 1 reviewers MUST be either tenured academic faculty in cryptography or distributed systems, or principals at recognized commercial firms in the same domain (Trail of Bits, NCC Group, Cure53, Galois, equivalents). At least one published peer reviewed paper in the past five years on transparency logs, threshold signatures, or multi agent reputation systems is REQUIRED.

Track 2 reviewers MUST be admitted attorneys in at least one EU member state and one of the United States, with at least seven years of practice in privacy and technology law. Senior counsel from a top tier privacy practice (Hogan Lovells, Linklaters, Bird and Bird, equivalents) is acceptable.

## 3. Deliverables

Each reviewer delivers within sixteen weeks:

- A written report between 30 and 80 pages identifying every finding, classified as Critical, High, Medium, Low, Informational.
- A summary executive memo of at most 4 pages suitable for publication.
- A signed attestation that the reviewer has no undisclosed conflict of interest.
- Optional: contributed pull requests to `oap-spec/test-suite/` that exercise findings.

## 4. Independence

The reviewers MUST be independent of the OAP maintainer set: no current or past contract with any OAP maintainer organization within the past 24 months, no equity in any OAP implementation, no familial or romantic relationship with any maintainer. The reviewer signs the standard ISACA or AICPA independence declaration before engagement begins.

## 5. Compensation

Track 1: EUR 60k to EUR 120k flat fee per reviewer.
Track 2: EUR 80k to EUR 160k flat fee per reviewer.

The OAP Working Group MAY pool maintainer contributions and a publicly listed sponsor pool to fund the reviews, with the sponsor list and amounts published before reviewer selection begins to prevent capture.

## 6. Publication

All reports are published in full at openagentprotocol.eu/audit/ under CC-BY 4.0 within 30 days of delivery. Critical and High findings trigger an RFC revision process; the spec MUST NOT be marked Final until all Critical findings are resolved or formally accepted with a published mitigation.

## 7. Schedule (target)

- Week 0: RFP published.
- Week 4: Proposals due.
- Week 6: Reviewers selected.
- Week 22: Draft reports.
- Week 24: Final reports published.
- Week 28 onward: Spec revision process for unresolved findings.
