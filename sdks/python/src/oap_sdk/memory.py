"""Memory grants and Customization Receipts (RFC 0010)."""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import List, Optional, Union


@dataclass
class MemoryGrant:
    user_id: str
    scope: str  # one of: preference, profile, history, inference
    fields: List[str]
    ttl_seconds: int
    reason: str
    granted_at: Optional[str] = None


@dataclass
class MemoryFilter:
    field: str
    op: str  # eq, neq, in, contains
    value: Union[str, int, List[str]]


def build_customization_receipt(
    user_id: str,
    tool_did: str,
    grants: List[MemoryGrant],
    reason: str,
    filters: Optional[List[MemoryFilter]] = None,
) -> dict:
    issued_at = datetime.now(timezone.utc).isoformat()
    return {
        "schema": "https://openagentprotocol.eu/schemas/v1.0/oap-customization-receipt.schema.json",
        "receipt_id": f"cust_{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        "user_id": user_id,
        "tool_did": tool_did,
        "issued_at": issued_at,
        "grants": [
            {**asdict(g), "granted_at": g.granted_at or issued_at} for g in grants
        ],
        "filters": [asdict(f) for f in (filters or [])],
        "reason": reason,
    }


def is_grant_expired(g: MemoryGrant, now: Optional[datetime] = None) -> bool:
    if not g.granted_at:
        return False
    now = now or datetime.now(timezone.utc)
    age = (now - datetime.fromisoformat(g.granted_at.replace("Z", "+00:00"))).total_seconds()
    return age > g.ttl_seconds
