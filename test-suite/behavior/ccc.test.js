/**
 * @oap-test
 * @levels L3
 * @rfcs RFC-0013 (Customer Confidentiality Context)
 * @category behavior
 * @description Verifies that L3 implementations publish a CCC document and
 *   that the document validates against oap-ccc.schema.json. Skipped when
 *   the implementation does not claim L3 or higher.
 */

'use strict';

const { fetchJson, fetchManifest, fetchReceipt, claimsAny, endpointUrl } = require('./_helpers');

async function run({ target, ajv }) {
  const RESULTS = [];
  const rec = (name, passed, reason) => RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
  const base = target.replace(/\/$/, '');

  const manifest = await fetchManifest(base);
  if (!manifest) return RESULTS;
  const receipt = await fetchReceipt(base, manifest);

  if (!claimsAny(receipt, ['L3', 'L4', 'L5'])) {
    rec('ccc-not-applicable', true, 'Implementation does not claim L3 or higher. CCC publication not required.');
    return RESULTS;
  }

  const explicitUri = manifest.confidentiality && manifest.confidentiality.ccc_uri;
  const candidates = [];
  if (typeof explicitUri === 'string') candidates.push(explicitUri.startsWith('http') ? explicitUri : `${base}${explicitUri}`);
  const epUrl = endpointUrl(base, manifest, 'ccc');
  if (epUrl) candidates.push(epUrl);
  candidates.push(`${base}/.well-known/oap-ccc.json`);

  let ccc = null;
  let foundAt = null;
  for (const u of candidates) {
    const j = await fetchJson(u);
    if (j) { ccc = j; foundAt = u; break; }
  }

  rec('ccc-document-served', !!ccc, ccc ? null : `no CCC document at any candidate URL: ${candidates.join(', ')}`);
  if (!ccc) return RESULTS;
  rec('ccc-document-location', true, `served at ${foundAt}`);

  let validate;
  try { validate = ajv && ajv.getSchema && ajv.getSchema('https://openagentprotocol.eu/schemas/v1.0/oap-ccc.schema.json'); } catch { /* ignore */ }
  if (validate) {
    const ok = validate(ccc);
    rec('ccc-schema-valid', !!ok, ok ? null : ajv.errorsText(validate.errors));
  } else {
    // Structural fallback if schema is not registered.
    const required = ['ccc_id', 'principal_did', 'controller_did', 'confidentiality_class', 'created_at'];
    const missing = required.filter((k) => !(k in ccc));
    rec('ccc-shape', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : null);
  }

  return RESULTS;
}

module.exports = { run };
