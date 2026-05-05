# OAP Schema Fuzz Harness

Property-based fuzzer for the v1.0 JSON Schemas. For each schema, generates
N minimal-valid instances and N mutated instances, then asserts AJV
acceptance/rejection symmetry.

## Usage

```bash
cd reference/validator && npm install   # one-time, brings in ajv + ajv-formats
cd ../..
node test-suite/fuzz/run.js 200
```

The argument is the number of iterations per schema (default 200). Exit
code 0 if all schemas pass, 1 if any signal is raised.

## Signals

- **valid_phase**: more than 50% of generator outputs were rejected by the
  schema. Indicates the generator does not yet match the schema (false
  positive); review the schema's `required`, `enum`, and `format` fields.
- **mutation_phase**: more than 50% of mutated outputs were still accepted.
  Indicates the schema is too loose: required fields missing, type unions
  too permissive, or `additionalProperties: true` left unintentionally.

## Limits

This harness is intentionally lightweight: no external fuzzing dependency
(no fast-check, no jsverify), no shrinking, no replay seed. It is designed
to surface obvious holes during CI; deeper structural fuzzing should layer
fast-check on top of `genFromSchema` if needed.
