/**
 * AQL Constraint Evaluator
 *
 * Evaluates a parsed Intent's constraint tree against a candidate document.
 * The evaluator implements the closed operator set of RFC 0020 section 3.2
 * and produces the per leaf constraint evaluation records that go into the
 * AQL Decision Record under oap-aql-decision.schema.json.
 *
 * @license Apache-2.0
 */

'use strict';

function resolvePath(doc, pointer) {
  // Extended JSON Pointer: supports /a/b, /arr/* (any element), /**/leaf (any depth).
  if (pointer === '' || pointer === '/') return [doc];
  const segments = pointer.replace(/^\//, '').split('/');
  return walk([doc], segments);
}

function walk(nodes, segments) {
  if (segments.length === 0) return nodes;
  const [head, ...rest] = segments;
  const next = [];
  for (const node of nodes) {
    if (head === '*') {
      if (Array.isArray(node)) next.push(...node);
      else if (node && typeof node === 'object') next.push(...Object.values(node));
    } else if (head === '**') {
      collectAll(node, next);
    } else if (Array.isArray(node)) {
      const idx = Number(head);
      if (Number.isInteger(idx) && idx >= 0 && idx < node.length) next.push(node[idx]);
    } else if (node && typeof node === 'object' && head in node) {
      next.push(node[head]);
    }
  }
  return walk(next, rest);
}

function collectAll(node, sink) {
  if (node === null || node === undefined) return;
  sink.push(node);
  if (Array.isArray(node)) for (const v of node) collectAll(v, sink);
  else if (typeof node === 'object') for (const v of Object.values(node)) collectAll(v, sink);
}

function compareLeaf(values, operator, expected) {
  // Returns { passed, reason, candidateValue }.
  const reasonForEmpty = 'path resolved to no values in candidate.';
  const sample = values.length > 0 ? values[0] : undefined;
  switch (operator) {
    case 'exists': {
      const passed = expected ? values.length > 0 : values.length === 0;
      return { passed, reason: passed ? null : `expected exists=${expected}, got ${values.length} values.`, candidateValue: sample };
    }
    case 'eq':
      return decide(values.some((v) => deepEqual(v, expected)), 'no value equals expected', sample);
    case 'ne':
      return decide(values.length > 0 && values.every((v) => !deepEqual(v, expected)), 'a value equaled expected', sample);
    case 'lt':
      return numCompare(values, expected, (a, b) => a < b, '<');
    case 'lte':
      return numCompare(values, expected, (a, b) => a <= b, '<=');
    case 'gt':
      return numCompare(values, expected, (a, b) => a > b, '>');
    case 'gte':
      return numCompare(values, expected, (a, b) => a >= b, '>=');
    case 'in': {
      if (!Array.isArray(expected)) return { passed: false, reason: 'in operator requires array value', candidateValue: sample };
      return decide(values.some((v) => expected.some((e) => deepEqual(v, e))), 'no value in expected set', sample);
    }
    case 'not_in': {
      if (!Array.isArray(expected)) return { passed: false, reason: 'not_in operator requires array value', candidateValue: sample };
      return decide(values.length > 0 && values.every((v) => !expected.some((e) => deepEqual(v, e))), 'a value matched excluded set', sample);
    }
    case 'contains': {
      // String contains substring or array contains element.
      return decide(values.some((v) => {
        if (typeof v === 'string' && typeof expected === 'string') return v.includes(expected);
        if (Array.isArray(v)) return v.some((el) => deepEqual(el, expected));
        return false;
      }), 'no value contained expected', sample);
    }
    case 'matches': {
      let re;
      try { re = new RegExp(expected); } catch (err) { return { passed: false, reason: `invalid regex: ${err.message}`, candidateValue: sample }; }
      return decide(values.some((v) => typeof v === 'string' && re.test(v)), 'no value matched regex', sample);
    }
    case 'before':
      return dateCompare(values, expected, (a, b) => a < b, 'before');
    case 'after':
      return dateCompare(values, expected, (a, b) => a > b, 'after');
    case 'within': {
      if (!expected || typeof expected !== 'object' || !('from' in expected) || !('to' in expected)) {
        return { passed: false, reason: 'within requires {from,to}', candidateValue: sample };
      }
      const from = Date.parse(expected.from);
      const to = Date.parse(expected.to);
      return decide(values.some((v) => {
        const t = Date.parse(v);
        return Number.isFinite(t) && t >= from && t <= to;
      }), 'no value within window', sample);
    }
    case 'outside': {
      if (!expected || typeof expected !== 'object' || !('from' in expected) || !('to' in expected)) {
        return { passed: false, reason: 'outside requires {from,to}', candidateValue: sample };
      }
      const from = Date.parse(expected.from);
      const to = Date.parse(expected.to);
      return decide(values.length > 0 && values.every((v) => {
        const t = Date.parse(v);
        return Number.isFinite(t) && (t < from || t > to);
      }), 'a value was inside the window', sample);
    }
    default:
      return { passed: false, reason: `unknown operator ${operator}`, candidateValue: sample };
  }
  function decide(cond, fail, candidateValue) {
    if (values.length === 0 && operator !== 'exists') return { passed: false, reason: reasonForEmpty, candidateValue };
    return { passed: cond, reason: cond ? null : fail, candidateValue };
  }
}

function numCompare(values, expected, cmp, label) {
  if (typeof expected !== 'number' && !(typeof expected === 'string' && /^-?\d+(\.\d+)?$/.test(expected))) {
    return { passed: false, reason: `${label} requires numeric expected`, candidateValue: values[0] };
  }
  const e = Number(expected);
  for (const v of values) {
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n) && cmp(n, e)) return { passed: true, reason: null, candidateValue: v };
  }
  return { passed: false, reason: `no value satisfied ${label} ${expected}`, candidateValue: values[0] };
}

function dateCompare(values, expected, cmp, label) {
  const e = Date.parse(expected);
  if (!Number.isFinite(e)) return { passed: false, reason: `${label} requires ISO 8601 date`, candidateValue: values[0] };
  for (const v of values) {
    const t = Date.parse(v);
    if (Number.isFinite(t) && cmp(t, e)) return { passed: true, reason: null, candidateValue: v };
  }
  return { passed: false, reason: `no value ${label} ${expected}`, candidateValue: values[0] };
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

/**
 * Evaluate a constraint tree against a candidate document.
 *
 * @param {object} constraints - The constraints node from a parsed Intent.
 * @param {object} candidate - The candidate document to evaluate against.
 * @returns {{passed: boolean, evaluations: Array}}
 */
function evaluate(constraints, candidate) {
  const evaluations = [];
  const passed = evalNode(constraints, candidate, evaluations);
  return { passed, evaluations };
}

function evalNode(node, candidate, evaluations) {
  if ('all_of' in node) {
    let allPassed = true;
    for (const child of node.all_of) {
      if (!evalNode(child, candidate, evaluations)) allPassed = false;
    }
    return allPassed;
  }
  if ('any_of' in node) {
    let anyPassed = false;
    for (const child of node.any_of) {
      if (evalNode(child, candidate, evaluations)) anyPassed = true;
    }
    return anyPassed;
  }
  if ('not' in node) {
    const childEvals = [];
    const inner = evalNode(node.not, candidate, childEvals);
    evaluations.push(...childEvals.map((e) => ({ ...e, negated: true })));
    return !inner;
  }
  // Leaf
  const values = resolvePath(candidate, node.path);
  const { passed, reason, candidateValue } = compareLeaf(values, node.operator, node.value);
  evaluations.push({
    path: node.path,
    operator: node.operator,
    value: node.value,
    candidate_value: candidateValue,
    passed,
    reason: reason || undefined,
  });
  return passed;
}

module.exports = { evaluate, resolvePath, compareLeaf };
