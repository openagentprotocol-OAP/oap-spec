/**
 * Ed25519 signing helpers and JSON canonicalization (RFC 8785-lite).
 */

import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign as cryptoSign,
  randomBytes,
  createHash,
  type KeyObject,
} from 'node:crypto';

export interface SigningKeys {
  privateKey: KeyObject;
  publicKey: KeyObject;
  publicJwk: Record<string, unknown>;
}

export function loadSigningKey(pem?: string): SigningKeys {
  let privateKey: KeyObject;
  if (pem) {
    privateKey = createPrivateKey(pem);
  } else {
    const generated = generateKeyPairSync('ed25519');
    privateKey = generated.privateKey;
  }
  if (privateKey.asymmetricKeyType !== 'ed25519') {
    throw new Error(`OAP signing key must be Ed25519, got ${privateKey.asymmetricKeyType}`);
  }
  const publicKey = createPublicKey(privateKey);
  const publicJwk = publicKey.export({ format: 'jwk' }) as Record<string, unknown>;
  return { privateKey, publicKey, publicJwk };
}

export function exportPrivateKeyPem(privateKey: KeyObject): string {
  return privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
}

/** Stable canonical JSON: sorted keys, no whitespace, recursive. */
export function canonicalize(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const entries = Object.keys(obj as Record<string, unknown>)
    .sort()
    .map((k) => JSON.stringify(k) + ':' + canonicalize((obj as Record<string, unknown>)[k]));
  return '{' + entries.join(',') + '}';
}

export function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

export function signEd25519(privateKey: KeyObject, payload: unknown): string {
  const data = Buffer.from(canonicalize(payload), 'utf8');
  const sig = cryptoSign(null, data, privateKey);
  return sig.toString('base64');
}

export function generateUlid(): string {
  const t = Date.now().toString(36).toUpperCase().padStart(10, '0');
  const r = randomBytes(10).toString('hex').toUpperCase().substring(0, 16);
  return (t + r).substring(0, 26);
}
