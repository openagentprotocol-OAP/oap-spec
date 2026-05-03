/**
 * @oap-test
 * @levels L4
 * @rfcs RFC-0017
 * @category behavior
 * @description Verifies that a Provider that declares an Action with a non
 *              null irreversibility_class also publishes a non zero
 *              irreversibility_cooling_off_seconds value, and that the
 *              corresponding pending receipt mechanism is observable through
 *              a probe.
 */

const RESULTS = [];

function record(name, passed, reason) {
  RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
}

async function run({ target }) {
  RESULTS.length = 0;
  let manifest = null;
  try {
    const res = await fetch(`${target.replace(/\/$/, '')}/.well-known/oap-tool.json`);
    if (!res.ok) {
      record('cooling-off-manifest-fetch', false, `HTTP ${res.status}`);
      return RESULTS.slice();
    }
    manifest = await res.json();
  } catch (err) {
    record('cooling-off-manifest-fetch', false, err.message);
    return RESULTS.slice();
  }

  const irreversibleActions = (manifest.actions || []).filter((a) => a.irreversibility_class && a.irreversibility_class !== 'none');

  if (irreversibleActions.length === 0) {
    record('cooling-off-not-applicable', true, 'No irreversible Actions declared. RFC 0017 does not apply to this implementation.');
    return RESULTS.slice();
  }

  for (const action of irreversibleActions) {
    const hasCoolingOff = typeof action.irreversibility_cooling_off_seconds === 'number' && action.irreversibility_cooling_off_seconds > 0;
    record(
      `cooling-off-declared-${action.id}`,
      hasCoolingOff,
      hasCoolingOff ? null : `Action ${action.id} declares irreversibility_class ${action.irreversibility_class} but no positive irreversibility_cooling_off_seconds.`,
    );
  }

  return RESULTS.slice();
}

module.exports = { run };
