/**
 * Memory Grants and Filters (RFC 0010 Customization Receipts).
 *
 * Helpers for declaring user-scoped memory grants and rendering them as
 * Customization Receipts that downstream tools can verify before honoring
 * personalization signals.
 */

export interface MemoryGrant {
  user_id: string;
  scope: 'preference' | 'profile' | 'history' | 'inference';
  fields: string[];
  ttl_seconds: number;
  reason: string;
  granted_at?: string;
}

export interface MemoryFilter {
  field: string;
  op: 'eq' | 'neq' | 'in' | 'contains';
  value: string | number | string[];
}

export function buildCustomizationReceipt(opts: {
  userId: string;
  toolDid: string;
  grants: MemoryGrant[];
  filters?: MemoryFilter[];
  reason: string;
}) {
  const issuedAt = new Date().toISOString();
  return {
    schema: 'https://openagentprotocol.eu/schemas/v1.0/oap-customization-receipt.schema.json',
    receipt_id: `cust_${Date.now()}`,
    user_id: opts.userId,
    tool_did: opts.toolDid,
    issued_at: issuedAt,
    grants: opts.grants.map((g) => ({ ...g, granted_at: g.granted_at || issuedAt })),
    filters: opts.filters || [],
    reason: opts.reason,
  };
}

export function isGrantExpired(g: MemoryGrant, now: Date = new Date()): boolean {
  if (!g.granted_at) return false;
  const ageMs = now.getTime() - Date.parse(g.granted_at);
  return ageMs > g.ttl_seconds * 1000;
}
