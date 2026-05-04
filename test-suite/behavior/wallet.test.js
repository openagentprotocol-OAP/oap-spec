/**
 * @oap-test
 * @levels L2
 * @rfcs RFC-0014 (Commerce Primitives), RFC-0021 (Wallet Statements)
 * @category behavior
 * @description Verifies that an L2 implementation publishes a Wallet
 *   surface (manifest must declare endpoints.wallet OR endpoints.billing)
 *   and that responses validate against oap-wallet-statement.schema.json.
 *   Skipped when the implementation does not claim L2 or higher.
 */

'use strict';

const { fetchManifest, fetchReceipt, claimsAny, endpointUrl } = require('./_helpers');

async function run({ target, ajv }) {
  const RESULTS = [];
  const rec = (name, passed, reason) => RESULTS.push({ name, category: 'behavior', passed, reason: reason || null });
  const base = target.replace(/\/$/, '');

  const manifest = await fetchManifest(base);
  if (!manifest) return RESULTS;
  const receipt = await fetchReceipt(base, manifest);

  if (!claimsAny(receipt, ['L2', 'L3', 'L4', 'L5'])) {
    rec('wallet-not-applicable', true, 'Implementation does not claim L2 or higher. Wallet surface not required.');
    return RESULTS;
  }

  const url = endpointUrl(base, manifest, 'wallet') || endpointUrl(base, manifest, 'billing');
  rec('wallet-endpoint-declared', !!url, url ? null : 'Manifest declares neither endpoints.wallet nor endpoints.billing.');
  if (!url) return RESULTS;

  let res;
  let body = null;
  try {
    res = await fetch(`${url}?principal_did=did:web:probe-wallet.example`, { headers: { accept: 'application/json' } });
    if (res.ok) body = await res.json();
  } catch (err) {
    rec('wallet-reachable', false, err.message);
    return RESULTS;
  }
  rec('wallet-reachable', !!res && res.ok, res ? `HTTP ${res.status}` : null);
  if (!body) return RESULTS;

  // The response is either a Wallet Statement directly, or wraps one under
  // .statement. Accept both shapes.
  const statement = body.statement && typeof body.statement === 'object' ? body.statement : body;

  let validate;
  try { validate = ajv && ajv.getSchema && ajv.getSchema('https://openagentprotocol.eu/schemas/v1.0/oap-wallet-statement.schema.json'); } catch { /* ignore */ }
  if (validate) {
    const ok = validate(statement);
    rec('wallet-statement-schema-valid', !!ok, ok ? null : ajv.errorsText(validate.errors));
  } else {
    // Fall back to structural checks if schema not registered under that $id.
    const requiredKeys = ['principal_did', 'currency', 'balance', 'period_start', 'period_end'];
    const missing = requiredKeys.filter((k) => !(k in statement));
    rec('wallet-statement-shape', missing.length === 0,
      missing.length ? `wallet statement missing required keys: ${missing.join(', ')}` : null);
  }

  return RESULTS;
}

module.exports = { run };
