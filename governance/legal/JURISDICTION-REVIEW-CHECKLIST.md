# Jurisdiction Legal Review Checklist

This checklist is the input package that a broker operator hands to local counsel before claiming conformance under RFC 0021 Appendix B in a given jurisdiction. It is not a substitute for the legal review; it is the structured set of questions that the review MUST answer.

## A. General data protection

1. Confirm that the broker's declared `data_retention_policy` for each personal data field satisfies the local data protection regime's storage limitation principle.
2. Identify the lawful basis under which each personal data field is processed. Document the basis in the Broker Category Profile under `category_specific.lawful_bases`.
3. Confirm that the cryptographic erasure mechanism of OAP-CORE-1.0 section 19 satisfies the local right to erasure standard, or document the gap and the additional procedural step required.
4. Identify the supervisory authority, the broker's controller designation, and the appointed Data Protection Officer if local law requires one.
5. Confirm that the audit log retention horizons for the relevant categories (315360000 seconds for finance, legal, health, real estate; 94608000 seconds otherwise) are compatible with local statutory retention duties.

## B. Category specific regimes

For each broker category that the operator intends to claim, confirm the applicable category specific regime mapping in the Broker Category Profile under `category_specific.regulatory_regimes` and obtain counsel sign off:

- `commerce`: distance selling rules, withdrawal rights under Directive 2011/83/EU for EU jurisdictions, consumer protection bond requirements if any.
- `labor`: AGG or local equivalent equal treatment law, EU Pay Transparency Directive 2024 obligations on salary band disclosure, posted worker requirements for cross border listings.
- `real_estate`: notary monopoly statutes (BNotO in Germany), pre emption rights of municipalities (Vorkaufsrecht), real estate broker licensing (Maklergesetz).
- `finance`: PSD2 implementation, MiFID II classification, DORA operational resilience requirements, sanctions and KYC requirements (AMLD6 for EU, BSA for US).
- `health`: HIPAA for US, special category data under GDPR Article 9 for EU, BAfin equivalent if telemedicine.
- `legal`: bar admission verification, RVG fee schedule disclosure for German legal services.
- `government`: any sovereign requirements for offering services adjacent to public administration.
- `dataset`: training data licensing under TDM exception, copyright exhaustion, EU AI Act provider obligations.
- `media`: editorial responsibility designation, press council jurisdiction, C2PA provenance handling.

## C. Cross border

1. Confirm that the `accepted_jurisdictions` list reflects only jurisdictions where the broker has either established a controller, appointed a representative, or relies on a defensible cross border transfer mechanism.
2. Identify the standard contractual clauses or adequacy decisions that authorize each personal data transfer.
3. Confirm dispute resolution forum selection clauses for cross border disputes.

## D. Threshold signing operations

1. Confirm that the HSM key shares stored in each jurisdiction comply with local cryptographic export and storage requirements.
2. Confirm that the threshold signing ceremony complies with local electronic signature law if signatures are intended to satisfy local form requirements; under eIDAS 2 the FROST-Ed25519 signature does NOT count as a Qualified Electronic Signature absent an additional QTSP certification path.
3. Identify whether share holder operators in each jurisdiction face local key escrow demands.

## E. Sign off

The local counsel signs the completed checklist and the signed document is committed to the broker's `governance/legal/<jurisdiction>/` directory in the broker's source repository. The Broker Category Profile records the SHA-256 of the signed document under `category_specific.legal_review_anchor`.

A broker SHALL NOT claim conformance in a jurisdiction whose checklist is not completed and signed.
