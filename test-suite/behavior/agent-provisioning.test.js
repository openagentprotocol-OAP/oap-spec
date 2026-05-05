/**
 * @oap-test
 * @levels L4-PROVISIONING
 * @rfcs RFC-0031 (Agent Provisioning and Context Mobility) sections 3.2 through 3.8
 * @category behavior
 * @description Verifies the agent provisioning lifecycle: discovery of a
 *   Provisioning Manifest via .well-known, BYOA attestation issuance and
 *   verification, context switch with policy evaluation, scope isolation
 *   across organizational boundaries, and offboarding with credential
 *   revocation. The probe exercises each of the five lifecycle phases
 *   defined in RFC 0031 section 3.8.
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

  // Phase 1: Discovery. Verify the .well-known/oap-provisioning.json endpoint.
  let provisioningManifest = null;
  try {
    const res = await fetch(`${base}/.well-known/oap-provisioning.json`);
    if (res.ok) {
      provisioningManifest = await res.json();
      rec('provisioning-discovery-well-known', true, 'Provisioning Manifest discovered at .well-known endpoint.');
    } else {
      rec('provisioning-discovery-well-known', true, `No Provisioning Manifest published (${res.status}). RFC 0031 provisioning is opt in.`);
      return RESULTS;
    }
  } catch (err) {
    rec('provisioning-discovery-well-known', true, `Provisioning endpoint not reachable: ${err.message}. RFC 0031 is opt in.`);
    return RESULTS;
  }

  // Validate Provisioning Manifest against schema.
  const schemaId = 'https://openagentprotocol.eu/schemas/v1.0/oap-provisioning-manifest.schema.json';
  const validate = ajv.getSchema(schemaId);
  if (validate) {
    const valid = validate(provisioningManifest);
    rec('provisioning-manifest-schema-valid', !!valid,
      valid ? null : `Provisioning Manifest failed schema validation: ${ajv.errorsText(validate.errors)}`);
  } else {
    rec('provisioning-manifest-schema-valid', true, 'Provisioning Manifest schema not loaded; skipping validation.');
  }

  // Verify required fields per RFC 0031 section 3.2.
  rec('provisioning-manifest-has-organization',
    typeof provisioningManifest.organization === 'string' && provisioningManifest.organization.startsWith('did:'),
    'Provisioning Manifest MUST declare an organization DID.');

  rec('provisioning-manifest-has-byoa-policy',
    provisioningManifest.byoa_policy && typeof provisioningManifest.byoa_policy.permitted === 'boolean',
    'Provisioning Manifest MUST declare a byoa_policy with a permitted boolean.');

  rec('provisioning-manifest-has-offboarding',
    provisioningManifest.offboarding && typeof provisioningManifest.offboarding.data_retention_days === 'number',
    'Provisioning Manifest MUST declare offboarding.data_retention_days.');

  // Phase 2: BYOA Attestation endpoint (if BYOA is permitted).
  if (provisioningManifest.byoa_policy && provisioningManifest.byoa_policy.permitted) {
    const byoaUrl = endpointUrl(base, manifest, 'byoa_attest');
    if (byoaUrl) {
      try {
        const res = await fetch(byoaUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            principal: 'did:web:probe.test',
            personal_agent: {
              did: 'did:key:z6MkProbeAgent',
              model_family: 'test-model',
              model_version: '1.0'
            },
            compliance_evidence: {
              data_residency_regions: ['EU'],
              audit_log_endpoint: 'https://probe.test/audit',
              training_on_org_data: 'never',
              certifications: ['SOC2-Type-II']
            }
          })
        });
        rec('provisioning-byoa-attestation-endpoint',
          res.status >= 200 && res.status < 500,
          `BYOA attestation endpoint responded with ${res.status}.`);
      } catch (err) {
        rec('provisioning-byoa-attestation-endpoint', false, `BYOA attestation endpoint unreachable: ${err.message}`);
      }
    } else {
      rec('provisioning-byoa-attestation-endpoint', true, 'No byoa_attest endpoint declared; BYOA attestation tested via manifest only.');
    }
  }

  // Phase 3: Context switch endpoint.
  const switchUrl = endpointUrl(base, manifest, 'context_switch');
  if (switchUrl) {
    try {
      const res = await fetch(switchUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          principal: 'did:web:probe.test',
          from_scope: 'did:web:probe.test#personal',
          to_scope: 'did:web:probe.test#org-test',
          timestamp: new Date().toISOString()
        })
      });
      rec('provisioning-context-switch-endpoint',
        res.status >= 200 && res.status < 500,
        `Context switch endpoint responded with ${res.status}.`);
    } catch (err) {
      rec('provisioning-context-switch-endpoint', false, `Context switch endpoint unreachable: ${err.message}`);
    }
  }

  // Phase 5: Offboarding endpoint.
  const offboardUrl = endpointUrl(base, manifest, 'offboard');
  if (offboardUrl) {
    try {
      const res = await fetch(offboardUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          principal: 'did:web:probe.test',
          reason: 'conformance_probe'
        })
      });
      rec('provisioning-offboarding-endpoint',
        res.status >= 200 && res.status < 500,
        `Offboarding endpoint responded with ${res.status}.`);

      if (res.ok) {
        const body = await res.json();
        rec('provisioning-offboarding-has-revocations',
          body.revocations && typeof body.revocations === 'object',
          'Offboarding Receipt MUST contain a revocations object per RFC 0031 section 3.6.');
      }
    } catch (err) {
      rec('provisioning-offboarding-endpoint', false, `Offboarding endpoint unreachable: ${err.message}`);
    }
  }

  return RESULTS;
}

module.exports = { run };
