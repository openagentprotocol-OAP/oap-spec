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

export const SDK_VERSION = '0.1.0';
export const OAP_SPEC_VERSION = '1.0';
