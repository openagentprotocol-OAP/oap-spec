"""Type definitions and protocols for the OAP Python SDK."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Literal, Protocol, TypedDict


ConformanceLevel = Literal["L0", "L1", "L1-NC", "L2", "L3", "L4", "L5"]
SideEffect = Literal["read", "write", "external"]
RiskClass = Literal["minimal", "low", "medium", "high", "critical"]

VALID_LEVELS: tuple[str, ...] = ("L0", "L1", "L1-NC", "L2", "L3", "L4", "L5")


class JsonSchema(TypedDict, total=False):
    type: str
    properties: dict[str, Any]
    required: list[str]
    additionalProperties: bool | dict[str, Any]


class RateLimit(TypedDict, total=False):
    rpm: int
    concurrent: int


class Cost(TypedDict, total=False):
    type: Literal["free", "fixed", "metered", "subscription"]
    amount: str
    currency: str
    unit: str


@dataclass
class ActionContext:
    principal: str
    agent: str
    envelope: dict[str, Any]


HandlerArgs = TypedDict("HandlerArgs", {"input": Any, "context": ActionContext})
ActionHandler = Callable[[HandlerArgs], Any | Awaitable[Any]]


@dataclass
class ActionDefinition:
    id: str
    handler: ActionHandler
    intent: str | None = None
    version: str = "1.0.0"
    summary: str | None = None
    description: str | None = None
    input_schema: dict[str, Any] | None = None
    output_schema: dict[str, Any] | None = None
    side_effects: SideEffect = "read"
    idempotent: bool | None = None
    cost: dict[str, Any] | None = None
    rate_limit: dict[str, Any] | None = None
    risk_class: RiskClass = "low"
    requires_auth: bool | None = None


@dataclass
class PolicyDecision:
    allow: bool
    reason: str | None = None
    rules: list[str] = field(default_factory=list)


PolicyHookArgs = TypedDict(
    "PolicyHookArgs",
    {"actionId": str, "input": Any, "context": ActionContext},
)
PolicyHook = Callable[[PolicyHookArgs], PolicyDecision | Awaitable[PolicyDecision]]


@dataclass
class ServerConfig:
    did: str
    conformance: ConformanceLevel
    name: str | None = None
    version: str = "0.1.0"
    domain: str | None = None
    categories: list[str] | None = None
    description: str | None = None
    description_for_agents: str | None = None
    signing_key_pem: str | bytes | None = None
    storage: "ReceiptStore | None" = None
    admin_token: str | None = None
    policy: PolicyHook | None = None
    jurisdictions: list[str] | None = None
    data_residency: list[str] | None = None
    contact_email: str | None = None


class ReceiptStore(Protocol):
    def insert_receipt(self, receipt: dict[str, Any]) -> None: ...
    def receipts_by_principal(self, principal: str, limit: int) -> list[dict[str, Any]]: ...
    def all_receipts(self, limit: int) -> list[dict[str, Any]]: ...
    def delete_by_principal(self, principal: str) -> int: ...
    def get_chain_tip(self) -> str: ...
    def set_chain_tip(self, h: str) -> None: ...
    def insert_subscription(self, sub: dict[str, Any]) -> None: ...
    def cancel_subscription(self, sub_id: str) -> bool: ...
    def active_subscription(self, principal: str) -> dict[str, Any] | None: ...
    def insert_incident(self, incident: dict[str, Any]) -> None: ...
    def list_incidents(self, limit: int) -> list[dict[str, Any]]: ...
    def rate_bucket_increment(self, key: str, ttl_ms: int) -> int: ...
