"""Manifest Subscriptions (RFC 0022)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

from .signing import canonicalize, sha256_hex


@dataclass
class ManifestSubscription:
    id: str
    subscriber_did: str
    target_tool_did: str
    callback_url: str
    watched_fields: List[str]
    created_at: str


@dataclass
class ManifestUpdateNotification:
    subscription_id: str
    target_tool_did: str
    manifest_version: str
    changed_fields: List[str]
    prior_manifest_hash: str
    new_manifest_hash: str
    issued_at: str
    signature: Optional[str] = None


def verify_manifest_update(notification: ManifestUpdateNotification, new_manifest: dict) -> bool:
    """Return True if the canonicalized manifest hashes to the value the notification claims."""
    return sha256_hex(canonicalize(new_manifest)) == notification.new_manifest_hash
