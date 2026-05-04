#!/usr/bin/env node
/**
 * oap-aql command line tool.
 *
 * Subcommands:
 *   validate <intent.json>            Validate an Intent against the schema and structural rules.
 *   evaluate <intent.json> <candidate.json>   Evaluate constraints against a candidate.
 *   project <projection.json> <record.json>   Apply a projection to a record.
 *   resolve <intent.json> <candidates.json>   Resolve an Intent against a candidate array.
 *
 * @license Apache-2.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { parseIntent, evaluate, project, resolveIntent } = require('../src/index');

function readJson(p) {
  return JSON.parse(fs.readFileSync(path.resolve(p), 'utf-8'));
}

function out(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

const [cmd, ...rest] = process.argv.slice(2);

(async () => {
  switch (cmd) {
    case 'validate': {
      const result = parseIntent(readJson(rest[0]));
      out({ ok: result.ok, errors: result.errors });
      process.exit(result.ok ? 0 : 1);
    }
    case 'evaluate': {
      const intent = parseIntent(readJson(rest[0]));
      if (!intent.ok) { out({ ok: false, errors: intent.errors }); process.exit(1); }
      const candidate = readJson(rest[1]);
      out(evaluate(intent.intent.constraints, candidate));
      return;
    }
    case 'project': {
      out(project(readJson(rest[1]), readJson(rest[0])));
      return;
    }
    case 'resolve': {
      const intent = parseIntent(readJson(rest[0]));
      if (!intent.ok) { out({ ok: false, errors: intent.errors }); process.exit(1); }
      const candidates = readJson(rest[1]);
      out(resolveIntent({
        intent: intent.intent,
        candidates,
        resolverDid: process.env.RESOLVER_DID || 'did:web:example-resolver.local',
        resolverRole: process.env.RESOLVER_ROLE || 'provider',
      }));
      return;
    }
    default:
      console.error('usage: oap-aql <validate|evaluate|project|resolve> ...');
      process.exit(2);
  }
})();
