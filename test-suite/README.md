# OAP Conformance Test Suite

**Document Identifier:** OAP-TEST-SUITE-1.0
**Status:** Public Working Draft
**Date:** 2026-05-03

This directory contains the official Open Agent Protocol Conformance Test Suite. It is the executable counterpart to the normative specification. Any implementation that claims conformance with a particular Conformance Level MUST pass the corresponding subset of this test suite. Any Request for Comments that proposes normative changes to the protocol MUST add or update tests here as a precondition for adoption per the Implementability Gate defined in [RFC 0019](../rfcs/RFC-0019-conformance-testing-and-implementability.md).

## 1. Purpose

The test suite serves four purposes that together prevent the specification from drifting away from what implementers can actually build, deploy, and verify in production.

First, it provides a deterministic mechanical check that every JSON document exchanged through the protocol is structurally valid against the published schemas. Second, it provides a behavioral check that an implementation honors the protocol lifecycle, including signature verification, receipt chaining, cooling off enforcement, and human escalation. Third, it provides a level conformance check that every test is tagged with the Conformance Level it exercises so that an implementation can demonstrate exactly which levels it satisfies. Fourth, it provides a charter conformance check that the user sovereignty mandates of RFC 0016, the irreversibility safeguards of RFC 0017, and the right to a human path of RFC 0018 are not merely declared in prose but are observably present in the runtime behavior of any implementation that claims to honor them.

## 2. Directory Layout

```
test-suite/
├── README.md                       This document.
├── package.json                    Node dependencies and scripts.
├── runner.js                       Test runner that executes all suites.
├── schema/                         Schema validation tests.
│   ├── README.md
│   ├── valid/                      Documents that MUST validate.
│   └── invalid/                    Documents that MUST fail validation.
├── behavior/                       Lifecycle tests against a live server.
│   ├── README.md
│   ├── lifecycle.test.js           Full request, invoke, receipt cycle.
│   ├── signatures.test.js          Signature presence and verification.
│   ├── receipt-chain.test.js       Chain integrity across multiple calls.
│   ├── cooling-off.test.js         RFC 0017 enforcement.
│   └── escalation.test.js          RFC 0018 enforcement.
├── levels/                         Conformance level test maps.
│   ├── README.md
│   └── levels.json                 Maps every test to L0 to L5, W1 to W3, C1 to C3.
├── charter/                        RFC 0016 charter conformance tests.
│   ├── README.md
│   ├── right-to-disappear.test.js
│   ├── right-to-explanation.test.js
│   ├── replaceability.test.js
│   └── plurality.test.js
└── fixtures/                       Shared test data and key material.
    ├── keys/
    └── manifests/
```

## 3. Running the Suite

The suite is implemented in Node.js with no compiled dependencies. To run the full suite against the in tree reference server:

```bash
cd test-suite
npm install
npm run start-reference-server &
npm test
```

To run only schema tests:

```bash
npm run test:schema
```

To run behavior tests against an arbitrary OAP server:

```bash
OAP_TARGET=https://your-tool.example npm run test:behavior
```

To produce a signed Conformance Receipt that can be published as part of a manifest:

```bash
npm run attest -- --target https://your-tool.example --signing-key path/to/key.pem
```

The signed Conformance Receipt is a JSON document that conforms to [`oap-conformance-receipt.schema.json`](../schemas/v1.0/oap-conformance-receipt.schema.json) and contains the implementation identifier, the test suite version, the levels for which conformance is claimed, the hash of the test fixtures used, the hash of the test results, and the cryptographic signature of the implementer. Any consuming Agent can verify the receipt independently by re running the suite or by validating the signature against the published key of the implementer.

## 4. How Tests Are Tagged

Every test file declares the Conformance Levels it exercises through a structured comment header at the top of the file.

```js
/**
 * @oap-test
 * @levels L0, L1, L2
 * @rfcs RFC-0017, RFC-0018
 * @category behavior
 * @description Verifies that a Provider rejects a request to an irreversible
 *              Action when the cooling off period has not yet elapsed.
 */
```

The runner aggregates these annotations to produce a coverage report that maps every Conformance Level to the set of tests that cover it. A Conformance Level is considered covered only when every normative requirement of the Levels documented in the specification is exercised by at least one test that is currently passing in the reference implementation.

## 5. Adding a New Test

Tests are added through the same Pull Request that introduces or modifies the underlying RFC. The Pull Request MUST include at least one valid example and at least one invalid example for every new schema field, at least one behavioral test for every new runtime requirement, and an update to `levels/levels.json` mapping the new test to the affected Conformance Level. The Pull Request MUST also include the modifications to the Reference Implementation that allow the new test to pass. A Pull Request that modifies the protocol without modifying the test suite is rejected automatically by the Implementability Gate enforced in CI.

## 6. Adversarial Tests

A subdirectory `behavior/adversarial/` contains tests that intentionally try to subvert the protocol. The adversarial subdirectory is maintained by the Working Group on Implementation and Conformance acting as a continuous internal Red Team. Categories include receipt forgery, signature stripping, cooling off bypass attempts, escalation routing through additional Agents, replaceability obfuscation, and Sybil identity creation. Each adversarial test that succeeds in subverting an existing implementation triggers a SECURITY issue against the specification and a corresponding RFC patch, per the procedure described in `SECURITY.md`.

## 7. Self Verification by Agents

Any Agent that consumes another Agent's Manifest can perform conformance verification autonomously by following the procedure described in section 6 of [RFC 0019](../rfcs/RFC-0019-conformance-testing-and-implementability.md). The Agent fetches the published Conformance Receipt from the Manifest's `conformance` block, validates the receipt signature, fetches the test suite at the version pinned in the receipt, and re executes a sample subset to confirm that the claimed behavior matches observed behavior. This procedure is implemented in [`reference/agent/conformance-verifier.js`](../reference/agent/conformance-verifier.js) and is callable as a library function.

## 8. License

The test suite is published under the Apache License 2.0 (`LICENSE-CODE`). The expected outputs and fixtures that are derived from the specification are published under the OAP Specification License (`LICENSE-SPEC`).
