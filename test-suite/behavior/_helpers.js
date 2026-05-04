/**
 * Shared helpers for OAP behavior probes.
 *
 * Probes import these to fetch the Manifest, fetch the Conformance Receipt,
 * gate by claimed level, and check endpoint declarations consistently. The
 * filename starts with an underscore so the runner (which globs *.test.js)
 * does not load it as a probe.
 *
 * @license Apache-2.0
 */

'use strict';

async function fetchJson(url, init) {
  try {
    const r = await fetch(url, init);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function fetchManifest(base) {
  return fetchJson(`${base}/.well-known/oap-tool.json`);
}

async function fetchReceipt(base, manifest) {
  const candidates = [`${base}/oap-conformance-receipt.json`];
  const ep = manifest && manifest.endpoints && manifest.endpoints.conformance_receipt;
  if (ep) candidates.push(ep.startsWith('http') ? ep : `${base}${ep}`);
  for (const u of candidates) {
    const j = await fetchJson(u);
    if (j) return j;
  }
  return null;
}

function claimedLevels(receipt) {
  if (!receipt) return [];
  if (Array.isArray(receipt.claimed_levels)) return receipt.claimed_levels;
  if (typeof receipt.conformance_level === 'string') return [receipt.conformance_level];
  return [];
}

function claimsAny(receipt, levels) {
  const c = claimedLevels(receipt);
  return levels.some((l) => c.includes(l));
}

function endpointUrl(base, manifest, key) {
  const ep = manifest && manifest.endpoints && manifest.endpoints[key];
  if (!ep) return null;
  return ep.startsWith('http') ? ep : `${base}${ep}`;
}

module.exports = {
  fetchJson,
  fetchManifest,
  fetchReceipt,
  claimedLevels,
  claimsAny,
  endpointUrl,
};
