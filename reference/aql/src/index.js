/**
 * @oap/aql
 *
 * Reference implementation of the Agent Query Language (RFC 0020).
 * Public API: parseIntent, evaluate, project, resolveIntent.
 *
 * @license Apache-2.0
 */

'use strict';

const { parseIntent, parseResponse } = require('./parser');
const { evaluate } = require('./evaluator');
const { project } = require('./projection');
const crypto = require('crypto');

/**
 * Resolve an Intent against an in memory candidate set. Suitable for tests,
 * for Match Broker implementations whose backing store is in process, and
 * for the AssistNet relay's internal Storage Substrate.
 *
 * @param {object} options
 * @param {object} options.intent - A parsed Intent.
 * @param {Array<{id: string, record: object, score?: number, cost?: string, quality?: object}>} options.candidates
 * @param {string} options.resolverDid
 * @param {string} [options.resolverRole]
 * @returns {object} An Intent Response shaped per oap-intent-response.schema.json (sans signature).
 */
function resolveIntent({ intent, candidates, resolverDid, resolverRole = 'provider' }) {
  const accepted = [];
  const rejected = [];
  for (const c of candidates) {
    const { passed, evaluations } = evaluate(intent.constraints, c.record);
    const qualityFail = checkQualityFloor(intent.quality_floor, c.quality);
    const overBudget = intent.budget && c.cost ? Number(c.cost) > Number(intent.budget.amount) : false;
    const decision = {
      decision_id: `urn:oap:decision:${crypto.randomUUID()}`,
      evaluated_at: new Date().toISOString(),
      outcome: !passed ? 'reject' : qualityFail ? 'below_quality_floor' : overBudget ? 'over_budget' : 'accept',
      constraint_evaluations: evaluations,
      explanation: !passed ? 'one or more constraints failed' : qualityFail ? `quality floor not met: ${qualityFail}` : overBudget ? 'cost exceeds budget' : 'all constraints satisfied',
    };
    if (decision.outcome === 'accept') {
      accepted.push({
        candidate_id: c.id,
        rank: 0,
        score: c.score ?? scoreFromEvaluations(evaluations),
        payload: project(c.record, intent.projection),
        decision_record: decision,
        over_budget: false,
      });
    } else if (decision.outcome === 'over_budget') {
      accepted.push({
        candidate_id: c.id,
        rank: 0,
        score: c.score ?? 0,
        payload: project(c.record, intent.projection),
        decision_record: decision,
        over_budget: true,
      });
    } else {
      rejected.push({ candidate_id: c.id, decision_record: decision });
    }
  }
  // Apply resolution_policy.
  accepted.sort((a, b) => (b.score || 0) - (a.score || 0));
  const policy = intent.resolution_policy || 'ranked_set';
  let finalCandidates = accepted;
  if (policy === 'single_best') finalCandidates = accepted.slice(0, 1);
  finalCandidates.forEach((c, i) => { c.rank = i + 1; });

  return {
    response_id: `urn:oap:intent-response:${crypto.randomUUID()}`,
    intent_id: intent.intent_id,
    resolver_did: resolverDid,
    resolver_role: resolverRole,
    evaluated_at: new Date().toISOString(),
    candidates: finalCandidates,
    rejected,
    signature: { alg: 'EdDSA', value: 'unsigned-test-fixture' },
  };
}

function checkQualityFloor(floor, quality) {
  if (!floor || !quality) return null;
  for (const key of Object.keys(floor)) {
    const required = floor[key];
    const actual = quality[key];
    if (actual === undefined) return `${key} not declared`;
    if (typeof required === 'number' && typeof actual === 'number' && actual < required) return `${key}=${actual}<${required}`;
  }
  return null;
}

function scoreFromEvaluations(evaluations) {
  if (!evaluations.length) return 0;
  return evaluations.filter((e) => e.passed).length / evaluations.length;
}

module.exports = {
  parseIntent,
  parseResponse,
  evaluate,
  project,
  resolveIntent,
};
