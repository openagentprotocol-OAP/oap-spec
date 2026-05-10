/**
 * OAP Reference Cross Category Ring Detection
 *
 * Implements RFC 0009 Appendix C section C.4.
 *
 * Inputs:
 *   edges:      Array of { issuer, subject, category, avg_score, value }
 *   thresholds: { reciprocal_score_quantile, value_quantile }
 *
 * Output:
 *   { components: [...], flagged: Set<string> }
 *
 * The Tarjan strongly connected component algorithm is implemented directly
 * (Tarjan 1972). For the reference implementation we operate on adjacency
 * lists keyed by participant id.
 *
 * @license Apache-2.0
 */

function quantile(values, q) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[idx];
}

function detectRings(edges, thresholds = {}) {
  const reciprocalQ = thresholds.reciprocal_score_quantile ?? 0.9;
  const valueQ = thresholds.value_quantile ?? 0.25;

  const allScores = edges.map(e => e.avg_score);
  const allValues = edges.map(e => e.value);
  const scoreThreshold = quantile(allScores, reciprocalQ);
  const valueThreshold = quantile(allValues, valueQ);

  const adj = new Map();
  // Aggregate by (issuer, subject) pair across categories: keep the MAX score
  // per pair so that an adversary cannot dilute its own ring signal by adding
  // low scoring edges in additional categories.
  const pairs = new Map();
  const ensure = (id) => { if (!adj.has(id)) adj.set(id, new Set()); };

  for (const e of edges) {
    ensure(e.issuer); ensure(e.subject);
    const key = `${e.issuer}|${e.subject}`;
    const prev = pairs.get(key);
    if (!prev || e.avg_score > prev.avg_score) pairs.set(key, e);
  }

  for (const [, e] of pairs) {
    const rev = pairs.get(`${e.subject}|${e.issuer}`);
    if (!rev) continue;
    const avg = (e.avg_score + rev.avg_score) / 2;
    if (avg >= scoreThreshold) adj.get(e.issuer).add(e.subject);
  }

  const ids = [...adj.keys()];
  const index = new Map();
  const lowlink = new Map();
  const onStack = new Set();
  const stack = [];
  let counter = 0;
  const sccs = [];

  function strongconnect(v) {
    index.set(v, counter);
    lowlink.set(v, counter);
    counter++;
    stack.push(v);
    onStack.add(v);
    for (const w of adj.get(v)) {
      if (!index.has(w)) {
        strongconnect(w);
        lowlink.set(v, Math.min(lowlink.get(v), lowlink.get(w)));
      } else if (onStack.has(w)) {
        lowlink.set(v, Math.min(lowlink.get(v), index.get(w)));
      }
    }
    if (lowlink.get(v) === index.get(v)) {
      const comp = [];
      while (true) {
        const w = stack.pop();
        onStack.delete(w);
        comp.push(w);
        if (w === v) break;
      }
      if (comp.length >= 3) sccs.push(comp);
    }
  }

  for (const v of ids) {
    if (!index.has(v)) strongconnect(v);
  }

  const flagged = new Set();
  const components = [];
  for (const comp of sccs) {
    const members = new Set(comp);
    const compEdges = edges.filter(e => members.has(e.issuer) && members.has(e.subject));
    const categories = new Set(compEdges.map(e => e.category));
    const avgValue = compEdges.length ? compEdges.reduce((s, e) => s + e.value, 0) / compEdges.length : 0;
    const isRing = categories.size >= 2 && avgValue <= valueThreshold;
    components.push({ members: comp, categories: [...categories], avgValue, flagged: isRing });
    if (isRing) for (const m of comp) flagged.add(m);
  }

  return { components, flagged };
}

module.exports = { detectRings, quantile };
