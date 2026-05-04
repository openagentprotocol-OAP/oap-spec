/**
 * Public types for the OAP TypeScript SDK.
 */

export type ConformanceLevel = 'L0' | 'L1' | 'L1-NC' | 'L2' | 'L3' | 'L4' | 'L5';

export type SideEffect = 'read' | 'write' | 'external';

export type RiskClass = 'minimal' | 'low' | 'medium' | 'high' | 'critical';

export interface JsonSchema {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;
  [key: string]: unknown;
}

export interface RateLimit {
  rpm?: number;
  concurrent?: number;
}

export interface Cost {
  type: 'free' | 'fixed' | 'metered' | 'subscription';
  amount?: string;
  currency?: string;
  unit?: string;
}

export interface ActionContext {
  /** DID of the principal on whose behalf the action is invoked. */
  principal: string;
  /** DID of the calling agent. */
  agent: string;
  /** Original request envelope for advanced inspection. */
  envelope: InvokeEnvelope;
}

export interface ActionDefinition<I = unknown, O = unknown> {
  id: string;
  intent?: string;
  version?: string;
  summary?: string;
  description?: string;
  inputSchema?: JsonSchema;
  outputSchema?: JsonSchema;
  sideEffects?: SideEffect;
  idempotent?: boolean;
  cost?: Cost;
  rateLimit?: RateLimit;
  riskClass?: RiskClass;
  /** True if this action requires a Bearer token. Defaults to true for write/external. */
  requiresAuth?: boolean;
  handler: (args: { input: I; context: ActionContext }) => Promise<O> | O;
}

export interface PolicyHook {
  /** Called before action dispatch. Return false (or throw) to deny. */
  (args: { actionId: string; input: unknown; context: ActionContext }):
    | Promise<{ allow: boolean; reason?: string; rules?: string[] }>
    | { allow: boolean; reason?: string; rules?: string[] };
}

export interface ServerConfig {
  /** DID of the tool. Should be a `did:web:<domain>` for production. */
  did: string;
  /** Conformance level claimed by this server. Use 'L1-NC' for non-commercial profile. */
  conformance: ConformanceLevel;
  /** Human-readable tool name. */
  name?: string;
  /** Tool version. Semver. */
  version?: string;
  /** Public domain (host[:port]). Defaults to derived from DID. */
  domain?: string;
  /** Categories for discovery. */
  categories?: string[];
  /** Description for human readers. */
  description?: string;
  /** Description targeted at autonomous agents. */
  descriptionForAgents?: string;
  /** PEM-encoded Ed25519 private key. If absent, an ephemeral key is generated. */
  signingKeyPem?: string;
  /** Storage adapter. Defaults to in-memory. */
  storage?: ReceiptStore;
  /** Optional admin token for /oap/incident POST. */
  adminToken?: string;
  /** Pluggable policy hook (the four-layer policy stack). */
  policy?: PolicyHook;
  /** Override jurisdictions in manifest. Defaults to ['EU']. */
  jurisdictions?: string[];
  /** Data residency regions. Defaults to ['EU']. */
  dataResidency?: string[];
  /** Contact email for governance section. */
  contactEmail?: string;
}

export interface InvokeEnvelope {
  oap_version: string;
  request_id: string;
  principal_did: string;
  agent_did: string;
  action: string;
  input: unknown;
  [key: string]: unknown;
}

export interface InvokeResponse {
  oap_version: '1.0';
  request_id: string;
  response_id: string;
  timestamp: string;
  tool_did: string;
  status: 'success' | 'error';
  output: unknown;
  error: { code: string; message: string } | null;
  metering: { duration_ms: number; units_charged: number; currency: string };
  receipt_id: string;
  receipt_hash: string;
}

export interface Receipt {
  receipt_id: string;
  type: string;
  timestamp: string;
  principal_did: string | null;
  agent_did: string | null;
  tool_did: string;
  action_id: string | null;
  input_hash: string;
  output_hash: string;
  cost: { amount: string; currency: string };
  policy_decisions: Array<{ id: string; outcome: string; rules: string[]; reason?: string }>;
  previous_receipt_hash: string;
  signatures: Array<{ by: string; alg: 'EdDSA'; value: string }>;
  self_hash?: string;
}

export interface Subscription {
  subscription_id: string;
  principal_did: string;
  agent_did: string | null;
  tool_did: string;
  tier: string;
  status: 'active' | 'canceled';
  created_at: string;
  canceled_at?: string;
  subscription_token: string;
}

export interface Incident {
  incident_id: string;
  severity: string;
  created_at: string;
  [key: string]: unknown;
}

/** Pluggable receipt + state store. The default is in-memory. */
export interface ReceiptStore {
  insertReceipt(r: Receipt): void;
  receiptsByPrincipal(principal: string, limit: number): Receipt[];
  allReceipts(limit: number): Receipt[];
  deleteByPrincipal(principal: string): number;
  getChainTip(): string;
  setChainTip(hash: string): void;
  insertSubscription(s: Subscription): void;
  cancelSubscription(id: string): boolean;
  activeSubscription(principal: string): Subscription | null;
  insertIncident(i: Incident): void;
  listIncidents(limit: number): Incident[];
  rateBucketIncrement(key: string, ttlMs: number): number;
}
