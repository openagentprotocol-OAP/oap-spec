# RFC 0017: Irreversibility and Cooling Off Periods

**Status:** Draft
**Author(s):** OAP Working Group on CCC
**Created:** 2026-05-03
**Working Group:** CCC
**Targets:** 1.2

## 1. Summary

This document defines normative requirements for Actions whose effects cannot be undone after invocation. It introduces an explicit classification of irreversibility, an elevated consent threshold for Actions so classified, a mandatory cooling off period during which the User may withdraw consent, and a structured Withdrawal Receipt that records the withdrawal cryptographically. The intent is to ensure that as Agents act with growing autonomy on behalf of human Users, the most consequential and unrecoverable actions are subject to procedural protections proportionate to their stakes, while ordinary reversible actions remain frictionless.

## 2. Terminology

The key words MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, MAY, and OPTIONAL in this document are to be interpreted as described in RFC 2119 and RFC 8174.

An **Irreversible Action** is an Action whose effect cannot be undone by any subsequent Action exposed by the same Provider or by any other party. The classification is a property of the Action's effect on the world, not of the technical capacity to mark a record as deleted. A money transfer that has cleared, a marriage filed with a registry, a medical procedure consented to, and a piece of personal data published to a public log are irreversible by this definition. A subscription that can be cancelled, a draft document that can be edited, and a delivery that can be returned are not.

A **Cooling Off Period** is a defined interval between the moment a User's Agent submits consent for an Irreversible Action and the moment that Action is actually executed by the Provider, during which the User may withdraw consent without penalty.

A **Withdrawal Receipt** is a signed Receipt issued by the Provider when a User withdraws consent during the Cooling Off Period, confirming that no irreversible execution occurred and that no obligation has been incurred by the User.

## 3. Classification of Irreversibility

The existing `side_effects` field on the Action schema defined in Open Agent Protocol Core 1.0 takes the values `none`, `read`, `write`, `external`, and `irreversible`. This RFC elaborates the `irreversible` value into five sub categories that capture the qualitatively different forms irreversibility takes in practice.

The first sub category is **legal_status_change**, which covers any Action that changes the User's status under the law of any jurisdiction, including but not limited to marriage, divorce, citizenship, asylum, criminal pleas, and registration of beneficial ownership.

The second sub category is **bodily_intervention**, which covers any Action that constitutes consent to a medical, surgical, pharmaceutical, or otherwise bodily procedure on the User or any person under the User's guardianship.

The third sub category is **immovable_property**, which covers any Action that creates, transfers, or extinguishes a right in real property, including conveyance, mortgage, easement, or development consent.

The fourth sub category is **irreversible_financial**, which covers any Action that completes a transfer of value through a clearing system that does not permit reversal, including but not limited to wire transfers above defined thresholds, blockchain settlements that have reached finality, and cash equivalent settlements.

The fifth sub category is **public_disclosure**, which covers any Action that publishes data to a system from which it cannot in practice be recalled, including immutable logs, public registries, social platforms with viral propagation, and any context where the data leaves the User's policy controlled environment.

A Provider whose Action falls in any of these categories MUST declare the corresponding sub category through an additional `irreversibility_class` field on the Action manifest. A Provider that falsely classifies an Irreversible Action as reversible thereby forfeits conformance and MAY be subject to the enforcement procedures of RFC 0016.

## 4. Cooling Off Periods

### 4.1 Default Durations

Each sub category of irreversibility carries a default minimum Cooling Off Period that the Provider MUST honor unless the User has explicitly waived it under section 4.4.

| Sub category | Default minimum |
|---|---|
| legal_status_change | seventy two hours |
| bodily_intervention | twenty four hours, except in declared medical emergency |
| immovable_property | seventy two hours |
| irreversible_financial | one hour for amounts up to one thousand units of the relevant currency, twenty four hours for amounts above |
| public_disclosure | one hour |

A Provider MAY declare a longer Cooling Off Period through an `irreversibility_cooling_off_seconds` field on the Action manifest, but MUST NOT declare a shorter one. The duration MUST be expressed in seconds and MUST be at least the default minimum stated in the table above.

### 4.2 Mechanism

When an Agent invokes an Irreversible Action on behalf of a User, the Provider MUST first issue a Pending Receipt of type `irreversible_pending`, which records the consent submission, the cooling off duration, the latest moment at which the User may withdraw, and a withdrawal endpoint. The Provider MUST NOT execute the underlying effect until the cooling off duration has elapsed.

If the User withdraws within the cooling off window, the Provider MUST issue a Withdrawal Receipt of type `irreversible_withdrawn`, MUST NOT execute the underlying effect, MUST refund any payment that was conditionally collected, and MUST clear any reservation of resources made in anticipation of execution.

If the cooling off window elapses without withdrawal, the Provider MUST execute the underlying effect, MUST issue a final Receipt of the appropriate type referencing the original Pending Receipt, and MUST anchor that final Receipt to the Reconciliation Log per RFC 0013 section 3.10.

### 4.3 Elevated Consent Threshold

Consent for an Irreversible Action MUST satisfy a higher threshold than consent for a reversible Action. The Provider MUST require all of the following.

The consent token presented in the request envelope MUST be a fresh token issued specifically for this invocation. Re use of a Standing Permission token under RFC 0003 alone is insufficient.

The User MUST receive, in the User's declared natural language, a Consequence Statement describing what the irreversible effect will be, what the cooling off duration is, and how to withdraw. The Consequence Statement MUST be signed by the Provider and SHOULD be co signed by the User's Agent acknowledging that it has presented the statement to the User.

The User MUST perform an active confirmation, for example a typed phrase, a biometric confirmation, or a hardware key tap. Passive confirmation by silence or by previously granted permission alone MUST NOT satisfy this requirement.

### 4.4 Waiver

The User MAY waive the Cooling Off Period for a specific Action class through a Standing Permission of type `cooling_off_waiver`, which MUST be granted explicitly per Action and per Provider, MUST carry an expiry of no more than thirty days from issuance, MUST require the elevated consent threshold of section 4.3 at the moment of grant, and MUST be revocable at any time. A blanket waiver covering all Irreversible Actions or all Providers MUST NOT be accepted by a conformant Agent Host.

A waiver MUST NOT be available for the `bodily_intervention` and `legal_status_change` sub categories.

### 4.5 Emergency Override

A Provider MAY skip the Cooling Off Period when the Action carries the `bodily_intervention` sub category and the request envelope is accompanied by a signed Emergency Declaration from a recognized medical authority. The Emergency Declaration MUST be recorded in the resulting Receipt, and the Receipt MUST be flagged for post hoc review by an independent oversight party named in the Provider manifest.

## 5. Schema Integration

### 5.1 Action Schema

The Action schema gains two optional fields, `irreversibility_class` of enum type taking the five sub category values defined in section 3, and `irreversibility_cooling_off_seconds` of integer type. Both fields MUST be present whenever `side_effects` is set to `irreversible`.

### 5.2 Receipt Schema

The Receipt type enum gains two new values, `irreversible_pending` and `irreversible_withdrawn`. The Receipt schema gains an optional `irreversibility` block recording the sub category, the cooling off deadline, the withdrawal endpoint, and the reference to the Pending Receipt for the final or withdrawal Receipts that follow.

### 5.3 Standing Permission Schema

The Standing Permission schema defined in RFC 0003 gains an optional `cooling_off_waiver` block recording the Action and Provider for which the waiver applies and the waiver expiry.

## 6. Conformance

A Provider claiming conformance to this RFC MUST classify every Irreversible Action under one of the five sub categories of section 3, MUST honor the cooling off durations of section 4.1, MUST emit Pending and Withdrawal Receipts in the prescribed form, and MUST refuse to execute Irreversible Actions whose consent does not satisfy the elevated threshold of section 4.3. An Agent Host claiming conformance MUST surface Consequence Statements to the User in the User's natural language, MUST require active confirmation, and MUST NOT submit cooling off waivers without explicit per Action consent.

## 7. Security Considerations

The cooling off mechanism creates a window during which an attacker who has compromised the User's Agent could submit and then quickly withdraw Irreversible Actions in a denial of service pattern that exhausts the Provider's resources. Providers MAY rate limit pending Irreversible Actions per User and SHOULD require attestation from the Agent Host that the consent originated from a non compromised execution environment. Conversely, an adversarial Provider might attempt to deny that a withdrawal occurred. The Withdrawal Receipt is the mitigation. The User's Agent MUST retain the Withdrawal Receipt and MAY anchor it independently in the Reconciliation Log so that disputes can be settled by reference to the cryptographic record.

## 8. References

- Open Agent Protocol Core 1.0
- RFC 0003 Standing Permissions
- RFC 0013 Commerce Models for the Agent Economy
- RFC 0016 User Sovereignty Charter
- RFC 0018 The Right to a Human Path

## 9. Acknowledgments

This RFC operationalizes Principle Three of the User Sovereignty Charter by defining the precise structural form that reversibility takes when an Action is by its nature unrecoverable, and by ensuring that the User retains a window of meaningful withdrawal even in the presence of fully autonomous Agent action.
