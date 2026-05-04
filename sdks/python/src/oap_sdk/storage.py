"""Default in-memory ReceiptStore."""

from __future__ import annotations

import random
import time
from typing import Any


class MemoryStore:
    def __init__(self) -> None:
        self._receipts: list[dict[str, Any]] = []
        self._subscriptions: dict[str, dict[str, Any]] = {}
        self._incidents: list[dict[str, Any]] = []
        self._chain_tip = "genesis"
        self._buckets: dict[str, dict[str, float]] = {}

    def insert_receipt(self, receipt: dict[str, Any]) -> None:
        self._receipts.append(receipt)

    def receipts_by_principal(self, principal: str, limit: int) -> list[dict[str, Any]]:
        filtered = [r for r in self._receipts if r.get("principal_did") == principal]
        return list(reversed(filtered[-limit:]))

    def all_receipts(self, limit: int) -> list[dict[str, Any]]:
        return list(reversed(self._receipts[-limit:]))

    def delete_by_principal(self, principal: str) -> int:
        before = len(self._receipts)
        self._receipts = [r for r in self._receipts if r.get("principal_did") != principal]
        return before - len(self._receipts)

    def get_chain_tip(self) -> str:
        return self._chain_tip

    def set_chain_tip(self, h: str) -> None:
        self._chain_tip = h

    def insert_subscription(self, sub: dict[str, Any]) -> None:
        self._subscriptions[sub["subscription_id"]] = sub

    def cancel_subscription(self, sub_id: str) -> bool:
        sub = self._subscriptions.get(sub_id)
        if not sub:
            return False
        sub["status"] = "canceled"
        sub["canceled_at"] = _now_iso()
        return True

    def active_subscription(self, principal: str) -> dict[str, Any] | None:
        for sub in self._subscriptions.values():
            if sub.get("principal_did") == principal and sub.get("status") == "active":
                return sub
        return None

    def insert_incident(self, incident: dict[str, Any]) -> None:
        self._incidents.append(incident)

    def list_incidents(self, limit: int) -> list[dict[str, Any]]:
        return list(reversed(self._incidents[-limit:]))

    def rate_bucket_increment(self, key: str, ttl_ms: int) -> int:
        now = time.time() * 1000
        existing = self._buckets.get(key)
        if existing and existing["expires_at"] > now:
            existing["count"] += 1
            return int(existing["count"])
        self._buckets[key] = {"count": 1, "expires_at": now + ttl_ms}
        if random.random() < 0.01:
            self._buckets = {
                k: v for k, v in self._buckets.items() if v["expires_at"] > now
            }
        return 1


def _now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
