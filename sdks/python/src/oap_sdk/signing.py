"""Ed25519 signing and JSON canonicalization for OAP."""

from __future__ import annotations

import base64
import hashlib
import json
import secrets
import time
from dataclasses import dataclass
from typing import Any

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)


@dataclass
class SigningKeys:
    private_key: Ed25519PrivateKey
    public_key: Ed25519PublicKey
    public_jwk: dict[str, Any]


def load_signing_key(pem: str | bytes | None = None) -> SigningKeys:
    """Load an Ed25519 private key from PEM, or generate an ephemeral one."""
    if pem is None:
        private_key = Ed25519PrivateKey.generate()
    else:
        if isinstance(pem, str):
            pem = pem.encode("utf-8")
        loaded = serialization.load_pem_private_key(pem, password=None)
        if not isinstance(loaded, Ed25519PrivateKey):
            raise ValueError(
                f"OAP signing key must be Ed25519, got {type(loaded).__name__}"
            )
        private_key = loaded
    public_key = private_key.public_key()
    raw_public = public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    public_jwk = {
        "kty": "OKP",
        "crv": "Ed25519",
        "x": _b64url(raw_public),
    }
    return SigningKeys(private_key=private_key, public_key=public_key, public_jwk=public_jwk)


def export_private_key_pem(private_key: Ed25519PrivateKey) -> bytes:
    return private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )


def canonicalize(obj: Any) -> str:
    """Stable canonical JSON: sorted keys, no whitespace, UTF-8."""
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def sign_ed25519(private_key: Ed25519PrivateKey, payload: Any) -> str:
    """Sign canonical JSON of payload with Ed25519, return base64-encoded signature."""
    data = canonicalize(payload).encode("utf-8")
    sig = private_key.sign(data)
    return base64.b64encode(sig).decode("ascii")


def generate_ulid() -> str:
    """Lightweight ULID-like identifier (26 chars, time-prefixed)."""
    t = format(int(time.time() * 1000), "x").upper().rjust(10, "0")[:10]
    r = secrets.token_hex(10).upper()[:16]
    return (t + r)[:26]


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")
