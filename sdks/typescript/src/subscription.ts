/**
 * Manifest Subscriptions (RFC 0022).
 *
 * Helper to subscribe to a remote tool's manifest changes via the
 * implementation's `subscribe` endpoint, and to validate incoming
 * manifest-update notifications.
 */

import { canonicalize, sha256Hex } from './signing.js';

export interface ManifestSubscription {
  subscriber_did: string;
  target_tool_did: string;
  callback_url: string;
  watched_fields?: string[];
  created_at: string;
  id: string;
}

export interface ManifestUpdateNotification {
  subscription_id: string;
  target_tool_did: string;
  manifest_version: string;
  changed_fields: string[];
  prior_manifest_hash: string;
  new_manifest_hash: string;
  issued_at: string;
  signature?: string;
}

export async function subscribeToManifest(opts: {
  targetToolUrl: string;
  subscriberDid: string;
  callbackUrl: string;
  watchedFields?: string[];
}): Promise<ManifestSubscription> {
  const url = `${opts.targetToolUrl.replace(/\/$/, '')}/oap/subscribe`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      subscriber_did: opts.subscriberDid,
      callback_url: opts.callbackUrl,
      watched_fields: opts.watchedFields,
    }),
  });
  if (!res.ok) throw new Error(`subscribe failed: ${res.status}`);
  return (await res.json()) as ManifestSubscription;
}

export function verifyManifestUpdate(
  notification: ManifestUpdateNotification,
  newManifest: unknown,
): boolean {
  const computed = sha256Hex(canonicalize(newManifest));
  return computed === notification.new_manifest_hash;
}
