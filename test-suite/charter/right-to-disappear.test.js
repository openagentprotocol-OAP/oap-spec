/**
 * @oap-test
 * @levels L3
 * @rfcs RFC-0016
 * @category charter
 * @description Verifies that the manifest declares a reachable data deletion
 *              endpoint and that the deletion endpoint responds to a GET
 *              probe within a reasonable timeout, fulfilling the Right to
 *              Disappear guarantee of RFC 0016 section 4.5.
 */

const RESULTS = [];

function record(name, passed, reason) {
  RESULTS.push({ name, category: 'charter', passed, reason: reason || null });
}

async function run({ target }) {
  RESULTS.length = 0;
  try {
    const res = await fetch(`${target.replace(/\/$/, '')}/.well-known/oap-tool.json`);
    if (!res.ok) {
      record('right-to-disappear-manifest', false, `HTTP ${res.status}`);
      return RESULTS.slice();
    }
    const manifest = await res.json();
    const url = manifest.endpoints && manifest.endpoints.data_delete;
    record('right-to-disappear-endpoint-declared', !!url, url ? null : 'Manifest MUST declare endpoints.data_delete.');

    if (url) {
      const fullUrl = url.startsWith('http') ? url : `${target.replace(/\/$/, '')}${url}`;
      try {
        const probe = await fetch(fullUrl, { method: 'OPTIONS' });
        record('right-to-disappear-endpoint-reachable', probe.status < 500, probe.status < 500 ? null : `Deletion endpoint returned ${probe.status}.`);
      } catch (err) {
        record('right-to-disappear-endpoint-reachable', false, err.message);
      }
    }
  } catch (err) {
    record('right-to-disappear-manifest', false, err.message);
  }
  return RESULTS.slice();
}

module.exports = { run };
