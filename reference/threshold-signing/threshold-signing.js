/**
 * OAP Reference Threshold Signing Wrapper
 *
 * This module is the integration adapter required by RFC 0021 Appendix B.6.
 * It does not implement FROST-Ed25519 from primitives. Production deployments
 * MUST plug in a vetted library such as ZF FROST (Zcash Foundation) or
 * frost-ed25519 from secp256k1-zkp; the wrapper here exposes the API surface
 * those libraries expose and provides a software-only stub used by the
 * reference test suite to exercise the surrounding state machinery.
 *
 * Production checklist (see operations/HSM-PROCUREMENT-RUNBOOK.md):
 *   - At least N=5 share holders in distinct geographic regions
 *   - Threshold M chosen such that M >= floor(2N/3) + 1
 *   - Each share resident in a FIPS 140-3 Level 2 or higher HSM
 *   - Key generation through a witnessed ceremony with signed transcript
 *   - Key rotation procedure tested at least once before go-live
 *
 * @license Apache-2.0
 */

const crypto = require('crypto');

class FrostStub {
  constructor({ n, m }) {
    if (m > n) throw new Error('threshold above N');
    if (m < Math.floor((2 * n) / 3) + 1) {
      throw new Error(`threshold ${m} below floor(2N/3)+1 = ${Math.floor((2 * n) / 3) + 1}`);
    }
    this.n = n;
    this.m = m;
    this.shares = [];
    for (let i = 0; i < n; i++) {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
      this.shares.push({ index: i + 1, publicKey, privateKey });
    }
    this.groupId = 'frost-stub:' + crypto.randomBytes(8).toString('hex');
  }

  signWithShares(message, participatingIndices) {
    if (participatingIndices.length < this.m) {
      throw new Error(`participating ${participatingIndices.length} below threshold ${this.m}`);
    }
    const buf = Buffer.from(message);
    const aggregated = [];
    for (const idx of participatingIndices) {
      const share = this.shares.find(s => s.index === idx);
      if (!share) throw new Error(`unknown share index ${idx}`);
      aggregated.push({
        index: idx,
        sig: crypto.sign(null, buf, share.privateKey).toString('base64')
      });
    }
    return {
      group_id: this.groupId,
      scheme: 'FROST-Ed25519-stub',
      threshold: this.m,
      n: this.n,
      participants: participatingIndices,
      partial_signatures: aggregated
    };
  }

  verify(message, sig) {
    if (sig.group_id !== this.groupId) return false;
    if (sig.participants.length < this.m) return false;
    const buf = Buffer.from(message);
    for (const part of sig.partial_signatures) {
      const share = this.shares.find(s => s.index === part.index);
      if (!share) return false;
      const ok = crypto.verify(null, buf, share.publicKey, Buffer.from(part.sig, 'base64'));
      if (!ok) return false;
    }
    return true;
  }
}

module.exports = { FrostStub };
