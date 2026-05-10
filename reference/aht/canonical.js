'use strict';

/**
 * Minimal RFC 8785 JSON Canonicalization Scheme (JCS) for the lexicographic
 * tie-break of RFC 0027 Tier 1, step 3. Sorts object keys; preserves array
 * order; uses JSON.stringify for primitive serialization (sufficient for the
 * structured Convention representations used in the reference implementation).
 */

function canonicalizeJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalizeJson).join(',') + ']';
  }
  const keys = Object.keys(value).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalizeJson(value[k])).join(',') + '}';
}

module.exports = { canonicalizeJson };
