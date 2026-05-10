/**
 * @openagentprotocol/sdk
 *
 * Official TypeScript SDK for the Open Agent Protocol (OAP).
 *
 * Build OAP-conformant tool servers with manifest publishing, signed
 * invocation, hash-chained receipts, and conformance attestation.
 *
 * @see https://openagentprotocol.eu/sdks
 * @see https://openagentprotocol.eu/spec
 */

export { OapServer, type ServeOptions } from './server.js';
export { MemoryStore } from './storage.js';
export {
  canonicalize,
  sha256Hex,
  signEd25519,
  loadSigningKey,
  exportPrivateKeyPem,
  generateUlid,
  type SigningKeys,
} from './signing.js';
export { buildManifest, buildDidDocument } from './manifest.js';
export type {
  ActionContext,
  ActionDefinition,
  ConformanceLevel,
  Cost,
  Incident,
  InvokeEnvelope,
  InvokeResponse,
  JsonSchema,
  PolicyHook,
  RateLimit,
  Receipt,
  ReceiptStore,
  RiskClass,
  ServerConfig,
  SideEffect,
  Subscription,
} from './types.js';

export {
  buildCustomizationReceipt,
  isGrantExpired,
  type MemoryGrant,
  type MemoryFilter,
} from './memory.js';

export {
  subscribeToManifest,
  verifyManifestUpdate,
  type ManifestSubscription,
  type ManifestUpdateNotification,
} from './subscription.js';

export {
  shouldEscalate,
  buildCounterfactual,
  buildAdverseActionNotice,
  type ModelInventoryEntry,
  type ModelRiskTier,
  type SymbioticEscalation,
  type CounterfactualExplanation,
  type AdverseActionNotice,
} from './modelRisk.js';

export {
  evaluate as evaluateDeontic,
  checkConsistency as checkOrgConsistency,
  type Role,
  type Scene,
  type Norm,
  type DeonticOperator,
  type DeonticDecision,
  type OrganizationManifest,
} from './organization.js';

export {
  runThreeTierHandshake,
  detectConventionDrift,
  capabilityAnnouncementHash,
  ahtCanonicalize,
  type AhtPolicyClass,
  type AhtFallbackPolicy,
  type CapabilityAnnouncement,
  type Peer,
  type PeerClass,
  type ThreeTierInputs,
  type ThreeTierParams,
  type ThreeTierResult,
} from './aht.js';

export const SDK_VERSION = '1.0.0-rc.2';
export const OAP_SPEC_VERSION = '1.0';
