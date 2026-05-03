/**
 * @oap-test
 * @levels Q1
 * @rfcs RFC-0020
 * @category behavior
 * @description Verifies that a Resolver claiming RFC 0020 conformance accepts
 *              a discovery Intent at /oap/intent and returns a response that
 *              conforms to oap-intent-response.schema.json with a per
 *              candidate AQL Decision Record. This test is skipped when the
 *              target Provider's Manifest does not declare the intent
 *              endpoint.
 */

const RESULTS = [];

function record(name, passed, reason) {
  RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
}

async function run({ target, ajv }) {
  RESULTS.length = 0;
  const base = target.replace(/\/$/, '');
  let manifest;
  try {
    const res = await fetch(`${base}/.well-known/oap-tool.json`);
    if (!res.ok) {
      record('aql-manifest-fetch', false, `HTTP ${res.status}`);
      return RESULTS.slice();
    }
    manifest = await res.json();
  } catch (err) {
    record('aql-manifest-fetch', false, err.message);
    return RESULTS.slice();
  }

  const intentEndpoint = (manifest.endpoints || {}).intent;
  if (!intentEndpoint) {
    record('aql-not-applicable', true, 'Manifest does not declare an intent endpoint. RFC 0020 conformance not claimed.');
    return RESULTS.slice();
  }

  const url = intentEndpoint.startsWith('http') ? intentEndpoint : `${base}${intentEndpoint}`;
  const intent = {
    intent_id: `urn:oap:intent:probe-${Date.now()}`,
    issuer_did: 'did:web:probe.example',
    category: 'discovery',
    constraints: { path: '/oap_version', operator: 'exists', value: true },
    projection: { include: ['/'] },
    validity: { from: new Date(Date.now() - 60_000).toISOString(), to: new Date(Date.now() + 60_000).toISOString() },
    signature: { alg: 'EdDSA', value: 'probe-signature' },
  };

  let response;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/oap+json' },
      body: JSON.stringify(intent),
    });
    if (!res.ok) {
      record('aql-intent-accepted', false, `HTTP ${res.status}`);
      return RESULTS.slice();
    }
    response = await res.json();
  } catch (err) {
    record('aql-intent-accepted', false, err.message);
    return RESULTS.slice();
  }

  record('aql-intent-accepted', true);

  const validate = ajv.getSchema('https://openagentprotocol.org/schemas/v1.0/oap-intent-response.schema.json');
  if (!validate) {
    record('aql-response-schema-loaded', false, 'oap-intent-response.schema.json not registered with ajv.');
    return RESULTS.slice();
  }
  const ok = validate(response);
  record('aql-response-schema-conformant', !!ok, ok ? null : ajv.errorsText(validate.errors));

  if (Array.isArray(response.candidates)) {
    const allHaveDecisions = response.candidates.every((c) => c && c.decision_record && Array.isArray(c.decision_record.constraint_evaluations));
    record('aql-candidates-have-decision-records', allHaveDecisions, allHaveDecisions ? null : 'one or more candidates missing decision_record.constraint_evaluations');
  }

  return RESULTS.slice();
}

module.exports = { run };
