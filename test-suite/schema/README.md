# Schema Test Fixtures

This directory contains JSON documents that exercise the normative schemas in `schemas/v1.0/`.

* `valid/` contains documents that MUST validate against the inferred schema.
* `invalid/` contains documents that MUST fail validation against the inferred schema.

The runner infers the target schema from the file name. A fixture named `manifest-minimal.json` is checked against `oap-manifest.schema.json`. A fixture named `receipt-with-irreversibility.json` is checked against `oap-receipt.schema.json`. The full mapping is defined in `runner.js`.

When adding a new schema field through an RFC, add at minimum one valid fixture demonstrating the field in use and one invalid fixture demonstrating the failure mode that the new field is meant to prevent.
