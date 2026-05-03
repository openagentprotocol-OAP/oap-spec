'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { parseIntent, evaluate, project, resolveIntent } = require('../src/index');

const baseIntent = {
  intent_id: 'urn:oap:intent:test-1',
  issuer_did: 'did:web:agent.example',
  category: 'discovery',
  constraints: {
    all_of: [
      { path: '/category', operator: 'eq', value: 'running_shoes' },
      { path: '/inventory/available', operator: 'gt', value: 0 },
      { path: '/price/amount', operator: 'lte', value: '100.00' },
    ],
  },
  projection: { include: ['/manifest_id', '/price', '/inventory'] },
  validity: { from: '2026-05-03T00:00:00Z', to: '2026-08-03T00:00:00Z' },
  signature: { alg: 'EdDSA', value: 'sig' },
};

const candidateA = {
  manifest_id: 'm:a',
  category: 'running_shoes',
  inventory: { available: 5 },
  price: { amount: '79.99', currency: 'EUR' },
  internal_metadata: { secret: 'hidden' },
};

const candidateB = {
  manifest_id: 'm:b',
  category: 'running_shoes',
  inventory: { available: 0 },
  price: { amount: '60.00', currency: 'EUR' },
};

const candidateC = {
  manifest_id: 'm:c',
  category: 'hiking_boots',
  inventory: { available: 10 },
  price: { amount: '120.00', currency: 'EUR' },
};

test('parseIntent accepts a valid intent', () => {
  const r = parseIntent(baseIntent);
  assert.strictEqual(r.ok, true, JSON.stringify(r.errors));
});

test('parseIntent rejects unknown operator', () => {
  const bad = JSON.parse(JSON.stringify(baseIntent));
  bad.constraints = { path: '/x', operator: 'starts_with', value: 'y' };
  const r = parseIntent(bad);
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('starts_with') || e.includes('operator')));
});

test('parseIntent rejects subscription without rate cap', () => {
  const bad = JSON.parse(JSON.stringify(baseIntent));
  bad.category = 'subscription';
  const r = parseIntent(bad);
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('max_event_rate_per_minute')));
});

test('parseIntent rejects validity with to <= from', () => {
  const bad = JSON.parse(JSON.stringify(baseIntent));
  bad.validity = { from: '2026-08-03T00:00:00Z', to: '2026-05-03T00:00:00Z' };
  const r = parseIntent(bad);
  assert.strictEqual(r.ok, false);
});

test('parseIntent rejects ranked_top_k without top_k', () => {
  const bad = JSON.parse(JSON.stringify(baseIntent));
  bad.budget = { amount: '1.00', currency: 'EUR', allocation: 'ranked_top_k' };
  const r = parseIntent(bad);
  assert.strictEqual(r.ok, false);
});

test('evaluate accepts candidate that satisfies all constraints', () => {
  const r = evaluate(baseIntent.constraints, candidateA);
  assert.strictEqual(r.passed, true);
  assert.ok(r.evaluations.every((e) => e.passed));
});

test('evaluate rejects candidate with zero inventory', () => {
  const r = evaluate(baseIntent.constraints, candidateB);
  assert.strictEqual(r.passed, false);
});

test('evaluate rejects candidate with wrong category', () => {
  const r = evaluate(baseIntent.constraints, candidateC);
  assert.strictEqual(r.passed, false);
});

test('evaluate handles any_of', () => {
  const constraints = {
    any_of: [
      { path: '/category', operator: 'eq', value: 'running_shoes' },
      { path: '/category', operator: 'eq', value: 'hiking_boots' },
    ],
  };
  assert.strictEqual(evaluate(constraints, candidateC).passed, true);
});

test('evaluate handles not', () => {
  const constraints = { not: { path: '/category', operator: 'eq', value: 'hiking_boots' } };
  assert.strictEqual(evaluate(constraints, candidateA).passed, true);
  assert.strictEqual(evaluate(constraints, candidateC).passed, false);
});

test('evaluate handles in operator', () => {
  const constraints = { path: '/category', operator: 'in', value: ['running_shoes', 'sandals'] };
  assert.strictEqual(evaluate(constraints, candidateA).passed, true);
  assert.strictEqual(evaluate(constraints, candidateC).passed, false);
});

test('evaluate handles matches operator', () => {
  const constraints = { path: '/manifest_id', operator: 'matches', value: '^m:[a-c]$' };
  assert.strictEqual(evaluate(constraints, candidateA).passed, true);
});

test('evaluate handles wildcard path', () => {
  const constraints = { path: '/inventory/*', operator: 'gt', value: 0 };
  assert.strictEqual(evaluate(constraints, candidateA).passed, true);
});

test('evaluate handles within date operator', () => {
  const doc = { released_at: '2026-06-01T12:00:00Z' };
  const constraints = { path: '/released_at', operator: 'within', value: { from: '2026-05-01T00:00:00Z', to: '2026-07-01T00:00:00Z' } };
  assert.strictEqual(evaluate(constraints, doc).passed, true);
});

test('project includes only requested fields', () => {
  const result = project(candidateA, { include: ['/manifest_id', '/price'] });
  assert.deepStrictEqual(Object.keys(result).sort(), ['manifest_id', 'price']);
  assert.strictEqual(result.internal_metadata, undefined);
});

test('project respects exclude over include', () => {
  const result = project(candidateA, { include: ['/'], exclude: ['/internal_metadata'] });
  assert.strictEqual(result.internal_metadata, undefined);
  assert.strictEqual(result.manifest_id, 'm:a');
});

test('project supports wildcard descendant', () => {
  const doc = { a: { b: { c: 1 }, d: 2 } };
  const result = project(doc, { include: ['/a/**'] });
  assert.deepStrictEqual(result, { a: { b: { c: 1 }, d: 2 } });
});

test('resolveIntent returns ranked accepted candidates and rejected list', () => {
  const intent = parseIntent(baseIntent).intent;
  const r = resolveIntent({
    intent,
    candidates: [
      { id: 'a', record: candidateA, score: 0.9 },
      { id: 'b', record: candidateB, score: 0.8 },
      { id: 'c', record: candidateC, score: 0.7 },
    ],
    resolverDid: 'did:web:test-resolver.local',
  });
  assert.strictEqual(r.candidates.length, 1);
  assert.strictEqual(r.candidates[0].candidate_id, 'a');
  assert.strictEqual(r.candidates[0].rank, 1);
  assert.strictEqual(r.rejected.length, 2);
  assert.ok(r.candidates[0].payload);
  assert.strictEqual(r.candidates[0].payload.internal_metadata, undefined);
});

test('resolveIntent flags over_budget candidates without rejecting them', () => {
  const intent = parseIntent({
    ...baseIntent,
    budget: { amount: '70.00', currency: 'EUR', allocation: 'single_winner' },
  }).intent;
  const r = resolveIntent({
    intent,
    candidates: [{ id: 'a', record: candidateA, cost: '79.99' }],
    resolverDid: 'did:web:test-resolver.local',
  });
  assert.strictEqual(r.candidates[0].over_budget, true);
  assert.strictEqual(r.candidates[0].decision_record.outcome, 'over_budget');
});

test('resolveIntent enforces single_best resolution policy', () => {
  const intent = parseIntent({ ...baseIntent, resolution_policy: 'single_best' }).intent;
  const r = resolveIntent({
    intent,
    candidates: [
      { id: 'a1', record: { ...candidateA, manifest_id: 'm:a1' }, score: 0.9 },
      { id: 'a2', record: { ...candidateA, manifest_id: 'm:a2' }, score: 0.95 },
    ],
    resolverDid: 'did:web:test-resolver.local',
  });
  assert.strictEqual(r.candidates.length, 1);
  assert.strictEqual(r.candidates[0].candidate_id, 'a2');
});
