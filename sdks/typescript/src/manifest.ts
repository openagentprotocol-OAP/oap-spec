/**
 * Manifest and DID document construction.
 */

import type { ActionDefinition, ConformanceLevel, ServerConfig } from './types.js';

export interface ManifestAction {
  id: string;
  version: string;
  summary: string;
  description_for_agents: string;
  input_schema: unknown;
  output_schema: unknown;
  side_effects: string;
  idempotent: boolean;
  cost: unknown;
  rate_limit: unknown;
  risk_class: string;
}

export function buildManifest(
  config: ServerConfig,
  actions: Map<string, ActionDefinition>,
  domain: string,
): Record<string, unknown> {
  const manifestActions: ManifestAction[] = Array.from(actions.values()).map((a) => ({
    id: a.id,
    version: a.version || '1.0.0',
    summary: a.summary || a.intent || a.id,
    description_for_agents: a.description || a.intent || a.summary || a.id,
    input_schema: a.inputSchema || { type: 'object', additionalProperties: true },
    output_schema: a.outputSchema || { type: 'object', additionalProperties: true },
    side_effects: a.sideEffects || 'read',
    idempotent: a.idempotent ?? (a.sideEffects !== 'write'),
    cost: a.cost || { type: 'free' },
    rate_limit: a.rateLimit || { rpm: 60, concurrent: 5 },
    risk_class: a.riskClass || 'low',
  }));

  return {
    oap_version: '1.0',
    tool: {
      id: config.name?.toLowerCase().replace(/[^a-z0-9-]+/g, '-') || 'oap-tool',
      did: config.did,
      name: config.name || 'OAP Tool',
      version: config.version || '0.1.0',
      publisher: { did: config.did, legal_name: config.name || 'OAP Tool', verified: false },
      categories: config.categories || ['general'],
      description_for_humans: config.description || 'An OAP-conformant tool.',
      description_for_agents: config.descriptionForAgents || config.description || 'An OAP-conformant tool.',
    },
    endpoints: {
      invoke: '/oap/invoke',
      audit: '/oap/audit',
      data_delete: '/oap/data/delete',
      incident: '/oap/incident',
      discover: '/oap/discover',
      billing: '/oap/billing',
      subscribe: '/oap/subscribe',
      conformance_receipt: '/oap/conformance-receipt',
    },
    auth: [{ method: 'anonymous' }, { method: 'bearer' }],
    actions: manifestActions,
    pricing: { free_tier: { calls_per_day: 100000 }, models: [{ type: 'free' }] },
    sla: {
      uptime_target: 0.99,
      latency_p95_ms: 200,
      max_call_duration_ms: 30000,
      supports_streaming: false,
      supports_async: false,
      regions: config.dataResidency || ['EU'],
      max_concurrency_per_principal: 50,
      incident_disclosure_within_hours: 72,
    },
    trust: { publisher_verified: false, data_residency: config.dataResidency || ['EU'], gdpr_compliant: true },
    data_policy: {
      stores_principal_data: true,
      retention_days: 30,
      shares_with_third_parties: false,
      training_on_principal_data: 'never',
      deletion_endpoint: '/oap/data/delete',
      lawful_bases: ['contract', 'consent'],
    },
    risk_class: 'minimal',
    jurisdictions: config.jurisdictions || ['EU'],
    conformance: {
      level: config.conformance,
      spec_version: '1.0',
      profile: config.conformance === 'L1-NC' ? 'non-commercial' : 'standard',
    },
    governance: {
      dispute_resolution_url: '/legal/disputes',
      contact_email: config.contactEmail || `contact@${domain.replace(/:.*$/, '')}`,
    },
  };
}

export function buildDidDocument(
  did: string,
  domain: string,
  publicJwk: Record<string, unknown>,
): Record<string, unknown> {
  const protocol = domain.startsWith('localhost') || /^(127\.|0\.0\.0\.0)/.test(domain) ? 'http' : 'https';
  return {
    '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/suites/jws-2020/v1'],
    id: did,
    verificationMethod: [
      {
        id: `${did}#oap-signing`,
        type: 'JsonWebKey2020',
        controller: did,
        publicKeyJwk: { ...publicJwk, alg: 'EdDSA', use: 'sig', kid: 'oap-signing' },
      },
    ],
    assertionMethod: [`${did}#oap-signing`],
    authentication: [`${did}#oap-signing`],
    service: [
      {
        id: `${did}#oap-tool`,
        type: 'OAPTool',
        serviceEndpoint: `${protocol}://${domain}/.well-known/oap-tool.json`,
      },
    ],
  };
}

export function deriveDomain(config: ServerConfig, fallbackPort: number): string {
  if (config.domain) return config.domain;
  // Parse did:web:<domain>
  if (config.did.startsWith('did:web:')) {
    const raw = config.did.slice('did:web:'.length);
    return decodeURIComponent(raw.split(':')[0]);
  }
  return `localhost:${fallbackPort}`;
}

export const VALID_LEVELS: readonly ConformanceLevel[] = [
  'L0',
  'L1',
  'L1-NC',
  'L2',
  'L3',
  'L4',
  'L5',
] as const;
