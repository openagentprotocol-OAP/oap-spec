/**
 * Charter wrapper that surfaces the schema soundness probe at
 * schema/commerce-primitive-soundness.test.js to the standard runner.
 * The runner currently scans charter/*.test.js and behavior/*.test.js;
 * this thin wrapper re-exports the soundness `run` function so that
 * Theorem 4 of RFC 0014 Appendix A is mechanically checked on every
 * conformance run without modifying the runner.
 *
 * @license Apache-2.0
 */

const inner = require('../schema/commerce-primitive-soundness.test.js');

async function run(ctx) {
  const results = await inner.run(ctx);
  // Re-tag results as charter-category so they surface alongside other
  // charter probes. The underlying assertions are unchanged.
  return results.map((r) => ({ ...r, category: 'charter' }));
}

module.exports = { run };
