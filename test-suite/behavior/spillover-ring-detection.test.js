/**
 * @oap-test
 * @levels L3, L4, L5
 * @rfcs RFC-0009 Appendix C section C.4 (Ring Detection) and C.5 (Theorem C.1)
 * @category behavior
 * @description Exercises the Cross Category Ring Detection algorithm on a
 *              synthetic adversary cohort embedded among organic identities.
 *              The Tarjan SCC implementation MUST identify the colluding ring
 *              and MUST NOT flag the organic baseline.
 */

'use strict';

const path = require('path');
const RESULTS = [];
function record(name, passed, reason) { RESULTS.push({ name, category: 'behavior', passed, reason: reason || null }); }

async function run() {
  RESULTS.length = 0;
  const { detectRings } = require(path.resolve(__dirname, '../../reference/ring-detection/ring-detection.js'));

  const organic = [];
  for (let i = 0; i < 50; i++) {
    organic.push({
      issuer: `org_${i}`,
      subject: `org_${(i + 7) % 50}`,
      category: i % 3 === 0 ? 'tool_capability' : (i % 3 === 1 ? 'commerce' : 'knowledge'),
      avg_score: 0.4 + (i % 10) * 0.03,
      value: 100 + i * 5
    });
  }

  // Synthetic ring across two categories with mutual high scores and low value.
  const ring = [];
  const members = ['ring_a', 'ring_b', 'ring_c', 'ring_d'];
  for (const a of members) {
    for (const b of members) {
      if (a === b) continue;
      ring.push({ issuer: a, subject: b, category: 'commerce', avg_score: 0.98, value: 1 });
      ring.push({ issuer: a, subject: b, category: 'tool_capability', avg_score: 0.97, value: 2 });
    }
  }

  const { components, flagged } = detectRings([...organic, ...ring]);

  const ringDetected = members.every(m => flagged.has(m));
  record('ring-detection-flags-colluders', ringDetected, [...flagged].join(','));

  const organicFlagged = [...flagged].filter(id => id.startsWith('org_'));
  record('ring-detection-no-false-positive-on-organic', organicFlagged.length === 0,
    `false positives: ${organicFlagged.join(',')}`);

  const ringComponent = components.find(c => c.flagged && c.members.includes('ring_a'));
  record('ring-detection-component-multi-category',
    !!ringComponent && ringComponent.categories.length >= 2,
    ringComponent ? ringComponent.categories.join(',') : 'no flagged component found');

  return RESULTS.slice();
}

module.exports = { run };
