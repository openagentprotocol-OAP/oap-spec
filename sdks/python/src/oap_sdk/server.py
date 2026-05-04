"""OapServer: the main entry point for building OAP-conformant tool servers in Python.

Example:
    >>> from oap_sdk import OapServer
    >>>
    >>> server = OapServer(
    ...     did="did:web:tool.example",
    ...     conformance="L1-NC",
    ...     name="My Tool",
    ... )
    >>>
    >>> @server.action(
    ...     id="create_task",
    ...     intent="create a task with title and due date",
    ...     input_schema={"type": "object", "properties": {"title": {"type": "string"}}, "required": ["title"]},
    ...     side_effects="write",
    ... )
    ... async def create_task(args):
    ...     return {"id": "task_1", "title": args["input"]["title"]}
    >>>
    >>> server.serve(port=8080)
"""

from __future__ import annotations

import asyncio
import inspect
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from .manifest import build_did_document, build_manifest, derive_domain
from .signing import (
    SigningKeys,
    canonicalize,
    generate_ulid,
    load_signing_key,
    sha256_hex,
    sign_ed25519,
)
from .storage import MemoryStore
from .types import (
    ActionContext,
    ActionDefinition,
    ConformanceLevel,
    PolicyDecision,
    PolicyHook,
    ReceiptStore,
    ServerConfig,
    VALID_LEVELS,
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class OapServer:
    """OAP-conformant tool server."""

    def __init__(
        self,
        *,
        did: str,
        conformance: ConformanceLevel,
        name: str | None = None,
        version: str = "0.1.0",
        domain: str | None = None,
        categories: list[str] | None = None,
        description: str | None = None,
        description_for_agents: str | None = None,
        signing_key_pem: str | bytes | None = None,
        storage: ReceiptStore | None = None,
        admin_token: str | None = None,
        policy: PolicyHook | None = None,
        jurisdictions: list[str] | None = None,
        data_residency: list[str] | None = None,
        contact_email: str | None = None,
    ) -> None:
        if not did:
            raise ValueError("OapServer: did is required")
        if conformance not in VALID_LEVELS:
            raise ValueError(
                f"OapServer: conformance must be one of {VALID_LEVELS}, got '{conformance}'"
            )

        self.config = ServerConfig(
            did=did,
            conformance=conformance,
            name=name,
            version=version,
            domain=domain,
            categories=categories,
            description=description,
            description_for_agents=description_for_agents,
            signing_key_pem=signing_key_pem,
            storage=storage,
            admin_token=admin_token,
            policy=policy,
            jurisdictions=jurisdictions,
            data_residency=data_residency,
            contact_email=contact_email,
        )
        self.did = did
        self.conformance = conformance
        self.storage: ReceiptStore = storage or MemoryStore()
        self.keys: SigningKeys = load_signing_key(signing_key_pem)
        self.policy = policy
        self.admin_token = admin_token
        self.domain = derive_domain(self.config, 8080)
        self._actions: dict[str, ActionDefinition] = {}
        self.app = self._build_app()

    # ─────────────────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────────────────

    def action(
        self,
        *,
        id: str,
        intent: str | None = None,
        version: str = "1.0.0",
        summary: str | None = None,
        description: str | None = None,
        input_schema: dict[str, Any] | None = None,
        output_schema: dict[str, Any] | None = None,
        side_effects: str = "read",
        idempotent: bool | None = None,
        cost: dict[str, Any] | None = None,
        rate_limit: dict[str, Any] | None = None,
        risk_class: str = "low",
        requires_auth: bool | None = None,
        handler: Callable[..., Any] | None = None,
    ) -> Any:
        """Register an Action handler.

        May be used as a decorator or called directly with a `handler` kwarg.
        """

        def register(fn: Callable[..., Any]) -> Callable[..., Any]:
            if id in self._actions:
                raise ValueError(f"action({id}): already registered")
            definition = ActionDefinition(
                id=id,
                handler=fn,
                intent=intent,
                version=version,
                summary=summary,
                description=description,
                input_schema=input_schema,
                output_schema=output_schema,
                side_effects=side_effects,  # type: ignore[arg-type]
                idempotent=idempotent,
                cost=cost,
                rate_limit=rate_limit,
                risk_class=risk_class,  # type: ignore[arg-type]
                requires_auth=requires_auth,
            )
            self._actions[id] = definition
            return fn

        if handler is not None:
            register(handler)
            return self

        return register

    def manifest(self) -> dict[str, Any]:
        return build_manifest(self.config, self._actions, self.domain)

    def did_document(self) -> dict[str, Any]:
        return build_did_document(self.did, self.domain, self.keys.public_jwk)

    def serve(self, *, port: int = 8080, host: str = "0.0.0.0") -> None:
        """Start the HTTP server (blocking). Uses uvicorn."""
        import uvicorn  # local import; uvicorn is a dep

        if not self.config.domain and not self.did.startswith("did:web:"):
            self.domain = f"localhost:{port}"
        print(f"[oap] listening on http://{host}:{port}")
        print(f"[oap]   Manifest: /.well-known/oap-tool.json")
        print(f"[oap]   DID:      /.well-known/did.json")
        print(f"[oap]   Tool DID: {self.did}")
        print(f"[oap]   Conformance: {self.conformance}")
        uvicorn.run(self.app, host=host, port=port, log_level="warning")

    # ─────────────────────────────────────────────────────────────────────────
    # Internals
    # ─────────────────────────────────────────────────────────────────────────

    def _build_app(self) -> FastAPI:
        app = FastAPI(title="OAP Server", docs_url=None, redoc_url=None)

        @app.get("/.well-known/oap-tool.json")
        def _manifest() -> dict[str, Any]:
            return self.manifest()

        @app.get("/.well-known/did.json")
        def _did() -> dict[str, Any]:
            return self.did_document()

        @app.post("/oap/invoke")
        async def _invoke(request: Request) -> JSONResponse:
            return await self._handle_invoke(request)

        @app.get("/oap/audit")
        def _audit(principal_did: str | None = None, limit: int = 100) -> dict[str, Any]:
            limit = min(500, max(1, limit))
            receipts = (
                self.storage.receipts_by_principal(principal_did, limit)
                if principal_did
                else self.storage.all_receipts(limit)
            )
            return {"receipts": receipts, "total": len(receipts)}

        @app.post("/oap/data/delete")
        async def _delete(request: Request) -> JSONResponse:
            body = await request.json()
            principal_did = body.get("principal_did")
            if not principal_did:
                raise HTTPException(status_code=400, detail="principal_did required")
            request_received_at = _now_iso()
            deleted = self.storage.delete_by_principal(principal_did)
            completed_at = _now_iso()
            core = {
                "receipt_id": f"urn:oap:deletion:{secrets.token_hex(12)}",
                "tool_did": self.did,
                "principal_did": principal_did,
                "request_received_at": request_received_at,
                "completed_at": completed_at,
                "method": "cryptographic_erasure",
                "scope": {
                    "data_classes": ["oap_receipts"],
                    "provenance_tags": ["gdpr-art-17"],
                    "subprocessors_propagated_to": [],
                },
            }
            sig = sign_ed25519(self.keys.private_key, core)
            payload = {
                **core,
                "signature": {"alg": "EdDSA", "kid": "oap-signing", "value": sig},
                "_diagnostics": {"receipts_deleted": deleted},
            }
            return JSONResponse(content=payload, media_type="application/oap+json")

        @app.get("/oap/incident")
        def _incidents() -> dict[str, Any]:
            return {"incidents": self.storage.list_incidents(100)}

        @app.post("/oap/incident", status_code=201)
        async def _incident_create(request: Request) -> dict[str, Any]:
            if self.admin_token and request.headers.get("x-admin-token") != self.admin_token:
                raise HTTPException(status_code=401, detail="admin_token_required")
            body = await request.json() or {}
            incident = {
                "incident_id": f"inc_{generate_ulid()}",
                "severity": body.get("severity", "minor"),
                "created_at": _now_iso(),
                **body,
            }
            self.storage.insert_incident(incident)
            return incident

        @app.post("/oap/discover")
        async def _discover(request: Request) -> dict[str, Any]:
            body = await request.json() or {}
            intent = str(body.get("intent", "")).lower()
            tokens = [t for t in intent.split() if t]
            matches = []
            for a in self._actions.values():
                haystack = f"{a.id} {a.summary or ''} {a.intent or ''} {a.description or ''}".lower()
                hits = sum(1 for t in tokens if t in haystack)
                confidence = (
                    0.4 if not tokens else min(0.95, 0.4 + 0.55 * (hits / len(tokens)))
                )
                matches.append(
                    {
                        "id": a.id,
                        "summary": a.summary or a.intent or a.id,
                        "confidence": confidence,
                        "estimated_cost_eur": (a.cost or {}).get("amount", "0"),
                    }
                )
            matches.sort(key=lambda m: m["confidence"], reverse=True)
            return {"matching_actions": matches}

        @app.get("/oap/billing")
        def _billing(principal_did: str | None = None) -> dict[str, Any]:
            sub = self.storage.active_subscription(principal_did) if principal_did else None
            return {"subscription": sub, "pricing": self.manifest()["pricing"]}

        @app.post("/oap/subscribe")
        async def _subscribe(request: Request) -> dict[str, Any]:
            body = await request.json() or {}
            principal_did = body.get("principal_did")
            if not principal_did:
                raise HTTPException(status_code=400, detail="principal_did required")
            sub = {
                "subscription_id": generate_ulid(),
                "principal_did": principal_did,
                "agent_did": body.get("agent_did"),
                "tool_did": self.did,
                "tier": body.get("tier", "free"),
                "status": "active",
                "created_at": _now_iso(),
                "subscription_token": f"oap_sub_live_{secrets.token_hex(16)}",
            }
            self.storage.insert_subscription(sub)
            self._persist_receipt("subscription", principal_did, sub.get("agent_did"), None, body, sub)
            return sub

        @app.delete("/oap/subscribe/{sub_id}")
        def _unsubscribe(sub_id: str) -> dict[str, Any]:
            ok = self.storage.cancel_subscription(sub_id)
            if not ok:
                raise HTTPException(status_code=404, detail="not_found")
            return {
                "subscription_id": sub_id,
                "status": "canceled",
                "canceled_at": _now_iso(),
            }

        @app.get("/oap/conformance-receipt")
        def _conformance() -> dict[str, Any]:
            core = {
                "receipt_id": f"urn:oap:conformance:{secrets.token_hex(12)}",
                "type": "conformance",
                "timestamp": _now_iso(),
                "implementation": {
                    "did": self.did,
                    "name": self.config.name or "OAP Tool",
                    "version": self.config.version,
                },
                "suite": {"name": "oap-sdk-runtime", "version": "0.1.0", "spec_version": "1.0"},
                "target": {"uri": f"https://{self.domain}"},
                "claimed_levels": [self.conformance],
                "profile": "non-commercial" if self.conformance == "L1-NC" else "standard",
                "results_summary": {
                    "note": "Runtime self-attestation only. For an audited Receipt, run oap-spec/test-suite/attest.js in CI.",
                },
                "validity": {
                    "not_before": _now_iso(),
                    "not_after": (datetime.now(timezone.utc) + timedelta(days=90))
                    .isoformat()
                    .replace("+00:00", "Z"),
                },
                "previous_receipt_hash": "genesis",
            }
            sig = sign_ed25519(self.keys.private_key, core)
            return {
                **core,
                "signatures": [{"by": f"{self.did}#oap-signing", "alg": "EdDSA", "value": sig}],
            }

        return app

    async def _handle_invoke(self, request: Request) -> JSONResponse:
        try:
            env = await request.json()
        except Exception:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "error": {"code": "invalid_json"}},
            )
        required = ["oap_version", "request_id", "principal_did", "agent_did", "action", "input"]
        missing = [k for k in required if env.get(k) is None]
        if missing:
            return JSONResponse(
                status_code=400,
                content={
                    "status": "error",
                    "error": {"code": "invalid_envelope", "message": f"Missing: {', '.join(missing)}"},
                },
            )
        if env["oap_version"] != "1.0":
            return JSONResponse(
                status_code=400,
                content={"status": "error", "error": {"code": "unsupported_version"}},
            )
        action = self._actions.get(env["action"])
        if not action:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "error": {"code": "action_not_found", "message": env["action"]}},
            )
        requires_auth = (
            action.requires_auth
            if action.requires_auth is not None
            else action.side_effects in ("write", "external")
        )
        if requires_auth:
            auth = request.headers.get("authorization", "")
            if not auth.lower().startswith("bearer "):
                return JSONResponse(
                    status_code=401,
                    content={
                        "status": "error",
                        "error": {"code": "auth_required", "message": "Bearer token required."},
                    },
                )

        principal = env["principal_did"]
        if action.rate_limit and action.rate_limit.get("rpm"):
            import time as _time

            minute_bucket = int(_time.time() * 1000 // 60000)
            key = f"{principal}__{action.id}__{minute_bucket}"
            nxt = self.storage.rate_bucket_increment(key, 60_000)
            if nxt > action.rate_limit["rpm"]:
                return JSONResponse(
                    status_code=429,
                    headers={"Retry-After": str(60 - int((_time.time() * 1000 % 60000) // 1000))},
                    content={"status": "error", "error": {"code": "rate_limited"}},
                )

        ctx = ActionContext(principal=principal, agent=env["agent_did"], envelope=env)

        if self.policy is not None:
            try:
                decision_or_coro = self.policy({"actionId": action.id, "input": env["input"], "context": ctx})
                if inspect.isawaitable(decision_or_coro):
                    decision = await decision_or_coro
                else:
                    decision = decision_or_coro
            except Exception as e:
                return JSONResponse(
                    status_code=500,
                    content={"status": "error", "error": {"code": "policy_error", "message": str(e)}},
                )
            if not decision.allow:
                deny_receipt = self._persist_receipt(
                    "invocation_denied",
                    principal,
                    env["agent_did"],
                    action.id,
                    env["input"],
                    None,
                    {
                        "id": f"pol_{generate_ulid()}",
                        "outcome": "deny",
                        "rules": decision.rules,
                        "reason": decision.reason,
                    },
                )
                return JSONResponse(
                    status_code=403,
                    content={
                        "status": "error",
                        "error": {
                            "code": "policy_denied",
                            "message": decision.reason or "Denied by policy hook.",
                        },
                        "receipt_id": deny_receipt["receipt_id"],
                    },
                )

        try:
            result = action.handler({"input": env["input"], "context": ctx})
            if inspect.isawaitable(result):
                output = await result
            else:
                output = result
        except Exception as e:
            err_receipt = self._persist_receipt(
                "invocation_error",
                principal,
                env["agent_did"],
                action.id,
                env["input"],
                None,
            )
            return JSONResponse(
                status_code=500,
                content={
                    "status": "error",
                    "error": {"code": "internal", "message": str(e)},
                    "receipt_id": err_receipt["receipt_id"],
                },
            )

        receipt = self._persist_receipt(
            "invocation",
            principal,
            env["agent_did"],
            action.id,
            env["input"],
            output,
        )

        return JSONResponse(
            status_code=200,
            media_type="application/oap+json",
            content={
                "oap_version": "1.0",
                "request_id": env["request_id"],
                "response_id": f"res_{generate_ulid()}",
                "timestamp": _now_iso(),
                "tool_did": self.did,
                "status": "success",
                "output": output,
                "error": None,
                "metering": {"duration_ms": 1, "units_charged": 0, "currency": "EUR"},
                "receipt_id": receipt["receipt_id"],
                "receipt_hash": receipt.get("self_hash", ""),
            },
        )

    def _persist_receipt(
        self,
        type_: str,
        principal_did: str | None,
        agent_did: str | None,
        action_id: str | None,
        input_: Any,
        output: Any,
        decision: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        previous = self.storage.get_chain_tip()
        core = {
            "receipt_id": f"urn:oap:receipt:{generate_ulid()}",
            "type": type_,
            "timestamp": _now_iso(),
            "principal_did": principal_did,
            "agent_did": agent_did,
            "tool_did": self.did,
            "action_id": action_id,
            "input_hash": "sha256:" + sha256_hex(canonicalize(input_ or {})),
            "output_hash": "sha256:" + sha256_hex(canonicalize(output or {})),
            "cost": {"amount": "0", "currency": "EUR"},
            "policy_decisions": [
                decision or {"id": f"pol_{generate_ulid()}", "outcome": "allow", "rules": ["l1.universal.pass"]}
            ],
            "previous_receipt_hash": previous,
        }
        sig = sign_ed25519(self.keys.private_key, core)
        receipt = {**core, "signatures": [{"by": f"{self.did}#oap-signing", "alg": "EdDSA", "value": sig}]}
        self_hash = "sha256:" + sha256_hex(canonicalize(receipt))
        receipt["self_hash"] = self_hash
        self.storage.insert_receipt(receipt)
        self.storage.set_chain_tip(self_hash)
        return receipt
