# Conformance Level Coverage Map

This directory maps every test in the suite to the Conformance Levels it exercises. The mapping is computed automatically from the `@levels` annotations declared in each test file's header comment. The aggregated map is published as `levels.json` after every CI run and is consumed by the Conformance Receipt generator (`attest.js`) to determine which Levels an implementation may legitimately claim.

A Conformance Level is considered covered when every normative requirement of that Level documented in `spec/v1.0/OAP-CORE-1.0.md` is exercised by at least one passing test against the Reference Implementation. Coverage gaps are tracked as open issues against the Working Group responsible for the Level.

## Level Inventory

* **L0** Discoverable. Manifest at well known location, schema valid.
* **L1** Invocable. Anonymous free Action callable through invoke.
* **L2** Billable. Pricing declared, billing endpoint operational.
* **L3** Auditable. Receipts signed and chained, audit endpoint exposes log.
* **L4** Consequential. Charter mandates honored, cooling off and escalation observable.
* **L5** Federated. Cross Provider trust tokens, multi party receipts.

* **W1, W2, W3** Web Integration profiles per RFC 0012.
* **C1, C2, C3** Commercial Layer profiles per RFC 0013 and RFC 0014.
