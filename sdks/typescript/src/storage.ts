/**
 * Default in-memory receipt store. Production deployments should pass a
 * persistent ReceiptStore (e.g. SQLite, Postgres) via ServerConfig.storage.
 */

import type { Incident, Receipt, ReceiptStore, Subscription } from './types.js';

export class MemoryStore implements ReceiptStore {
  private receipts: Receipt[] = [];
  private subscriptions = new Map<string, Subscription>();
  private incidents: Incident[] = [];
  private chainTip = 'genesis';
  private buckets = new Map<string, { count: number; expiresAt: number }>();

  insertReceipt(r: Receipt): void {
    this.receipts.push(r);
  }

  receiptsByPrincipal(principal: string, limit: number): Receipt[] {
    return this.receipts
      .filter((r) => r.principal_did === principal)
      .slice(-limit)
      .reverse();
  }

  allReceipts(limit: number): Receipt[] {
    return this.receipts.slice(-limit).reverse();
  }

  deleteByPrincipal(principal: string): number {
    const before = this.receipts.length;
    this.receipts = this.receipts.filter((r) => r.principal_did !== principal);
    return before - this.receipts.length;
  }

  getChainTip(): string {
    return this.chainTip;
  }

  setChainTip(hash: string): void {
    this.chainTip = hash;
  }

  insertSubscription(s: Subscription): void {
    this.subscriptions.set(s.subscription_id, s);
  }

  cancelSubscription(id: string): boolean {
    const s = this.subscriptions.get(id);
    if (!s) return false;
    s.status = 'canceled';
    s.canceled_at = new Date().toISOString();
    return true;
  }

  activeSubscription(principal: string): Subscription | null {
    for (const s of this.subscriptions.values()) {
      if (s.principal_did === principal && s.status === 'active') return s;
    }
    return null;
  }

  insertIncident(i: Incident): void {
    this.incidents.push(i);
  }

  listIncidents(limit: number): Incident[] {
    return this.incidents.slice(-limit).reverse();
  }

  rateBucketIncrement(key: string, ttlMs: number): number {
    const now = Date.now();
    const existing = this.buckets.get(key);
    if (existing && existing.expiresAt > now) {
      existing.count += 1;
      return existing.count;
    }
    this.buckets.set(key, { count: 1, expiresAt: now + ttlMs });
    if (Math.random() < 0.01) {
      for (const [k, v] of this.buckets) {
        if (v.expiresAt <= now) this.buckets.delete(k);
      }
    }
    return 1;
  }
}
