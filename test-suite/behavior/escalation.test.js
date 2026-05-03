/**
 * @oap-test
 * @levels L4
 * @rfcs RFC-0018
 * @category behavior
 * @description Verifies that a Provider that declares itself a Consequential
 *              Provider exposes a free escalate_to_human Action with a
 *              published Service Level.
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
      record('escalation-manifest-fetch', false, `HTTP ${res.status}`);
      return RESULTS.slice();
    }
    manifest = await res.json();
  } catch (err) {
    record('escalation-manifest-fetch', false, err.message);
    return RESULTS.slice();
  }

  if (!manifest.consequential_provider) {
    record('escalation-not-applicable', true, 'Provider is not a Consequential Provider. RFC 0018 does not apply.');
    return RESULTS.slice();
  }

  const escalation = (manifest.actions || []).find((a) => a.id === 'escalate_to_human');
  record('escalation-action-present', !!escalation, escalation ? null : 'Consequential Provider MUST expose escalate_to_human Action.');

  if (escalation) {
    const isFree = escalation.cost && escalation.cost.type === 'free';
    record('escalation-action-free', isFree, isFree ? null : 'escalate_to_human MUST declare cost.type = "free" for active customers.');
  }

  const sl = manifest.escalation_service_level;
  record('escalation-service-level-declared', !!sl, sl ? null : 'Consequential Provider MUST publish escalation_service_level block.');

  if (sl) {
    record('escalation-response-times-declared', !!sl.response_seconds_by_urgency, sl.response_seconds_by_urgency ? null : 'escalation_service_level.response_seconds_by_urgency missing.');
    record('escalation-channels-declared', Array.isArray(sl.channels) && sl.channels.length > 0, (Array.isArray(sl.channels) && sl.channels.length > 0) ? null : 'escalation_service_level.channels missing or empty.');
  }

  return RESULTS.slice();
}

module.exports = { run };
