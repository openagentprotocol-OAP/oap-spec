# Reference Implementation: Agent Query Language (RFC 0020)

This package is the reference implementation of the Agent Query Language defined in [RFC 0020](../../rfcs/RFC-0020-agent-query-language.md). It is published under the Apache License 2.0 and is intended for direct embedding in conformant Resolvers, Match Brokers, Storage Substrates, and consuming Agents.

## Contents

- `src/parser.js`: Schema and structural validation of an Intent.
- `src/evaluator.js`: Constraint tree evaluation against candidate documents.
- `src/projection.js`: Application of an Intent's projection block to a record.
- `src/index.js`: Public API and the `resolveIntent` convenience entry point.
- `bin/oap-aql.js`: Command line tool with `validate`, `evaluate`, `project`, `resolve` subcommands.
- `test/aql.test.js`: Unit tests covering the closed operator set, the boolean combinators, the projection rules, and the resolution policies.

## Install

```bash
cd reference/aql
npm install
```

## CLI Examples

```bash
# Validate an Intent
node bin/oap-aql.js validate ../../examples/aql/discovery-intent.json

# Evaluate constraints against a candidate
node bin/oap-aql.js evaluate \
  ../../examples/aql/discovery-intent.json \
  ../../examples/aql/candidate-running-shoe.json

# Resolve an Intent against an array of candidates
node bin/oap-aql.js resolve \
  ../../examples/aql/discovery-intent.json \
  ../../examples/aql/candidates.json
```

## Library Usage

```js
const { parseIntent, resolveIntent } = require('@oap/aql');

const { ok, intent, errors } = parseIntent(myIntent);
if (!ok) throw new Error(errors.join('\n'));

const response = resolveIntent({
  intent,
  candidates: myCandidates,
  resolverDid: 'did:web:my-resolver.example',
  resolverRole: 'match_broker',
});
```

## Conformance

Implementations claiming RFC 0020 conformance at level Q1, Q2, or Q3 are encouraged to vendor or fork this package. The package is small, dependency light (`ajv`, `ajv-formats`), and fully covered by the unit tests in `test/`.

The conformance test suite under [`../../test-suite/behavior/aql.test.js`](../../test-suite/behavior/aql.test.js) probes a Resolver's `oap/intent` endpoint with a representative Intent set and verifies that the responses conform to `oap-intent-response.schema.json` and that the per candidate AQL Decision Records conform to `oap-aql-decision.schema.json`.

## License

Apache License 2.0. See `../../LICENSE-CODE`.
