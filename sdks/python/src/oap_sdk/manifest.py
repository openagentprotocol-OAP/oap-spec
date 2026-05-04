"""Manifest and DID document construction."""

from __future__ import annotations

from typing import Any
from urllib.parse import unquote

from .types import ActionDefinition, ServerConfig


def build_manifest(
    config: ServerConfig,
    actions: dict[str, ActionDefinition],
    domain: str,
) -> dict[str, Any]:
    manifest_actions = []
    for a in actions.values():
        manifest_actions.append(
            {
                "id": a.id,
                "version": a.version,
                "summary": a.summary or a.intent or a.id,
                "description_for_agents": a.description or a.intent or a.summary or a.id,
                "input_schema": a.input_schema or {"type": "object", "additionalProperties": True},
                "output_schema": a.output_schema or {"type": "object", "additionalProperties": True},
                "side_effects": a.side_effects,
                "idempotent": a.idempotent if a.idempotent is not None else (a.side_effects != "write"),
                "cost": a.cost or {"type": "free"},
                "rate_limit": a.rate_limit or {"rpm": 60, "concurrent": 5},
                "risk_class": a.risk_class,
            }
        )

    tool_id = (config.name or "oap-tool").lower()
    tool_id = "".join(c if c.isalnum() or c == "-" else "-" for c in tool_id)

    return {
        "oap_version": "1.0",
        "tool": {
            "id": tool_id,
            "did": config.did,
            "name": config.name or "OAP Tool",
            "version": config.version,
            "publisher": {
                "did": config.did,
                "legal_name": config.name or "OAP Tool",
                "verified": False,
            },
            "categories": config.categories or ["general"],
            "description_for_humans": config.description or "An OAP-conformant tool.",
            "description_for_agents": (
                config.description_for_agents
                or config.description
                or "An OAP-conformant tool."
            ),
        },
        "endpoints": {
            "invoke": "/oap/invoke",
            "audit": "/oap/audit",
            "data_delete": "/oap/data/delete",
            "incident": "/oap/incident",
            "discover": "/oap/discover",
            "billing": "/oap/billing",
            "subscribe": "/oap/subscribe",
            "conformance_receipt": "/oap/conformance-receipt",
        },
        "auth": [{"method": "anonymous"}, {"method": "bearer"}],
        "actions": manifest_actions,
        "pricing": {
            "free_tier": {"calls_per_day": 100000},
            "models": [{"type": "free"}],
        },
        "sla": {
            "uptime_target": 0.99,
            "latency_p95_ms": 200,
            "max_call_duration_ms": 30000,
            "supports_streaming": False,
            "supports_async": False,
            "regions": config.data_residency or ["EU"],
            "max_concurrency_per_principal": 50,
            "incident_disclosure_within_hours": 72,
        },
        "trust": {
            "publisher_verified": False,
            "data_residency": config.data_residency or ["EU"],
            "gdpr_compliant": True,
        },
        "data_policy": {
            "stores_principal_data": True,
            "retention_days": 30,
            "shares_with_third_parties": False,
            "training_on_principal_data": "never",
            "deletion_endpoint": "/oap/data/delete",
            "lawful_bases": ["contract", "consent"],
        },
        "risk_class": "minimal",
        "jurisdictions": config.jurisdictions or ["EU"],
        "conformance": {
            "level": config.conformance,
            "spec_version": "1.0",
            "profile": "non-commercial" if config.conformance == "L1-NC" else "standard",
        },
        "governance": {
            "dispute_resolution_url": "/legal/disputes",
            "contact_email": config.contact_email or f"contact@{domain.split(':')[0]}",
        },
    }


def build_did_document(did: str, domain: str, public_jwk: dict[str, Any]) -> dict[str, Any]:
    protocol = (
        "http"
        if domain.startswith("localhost") or domain.startswith("127.") or domain.startswith("0.0.0.0")
        else "https"
    )
    return {
        "@context": [
            "https://www.w3.org/ns/did/v1",
            "https://w3id.org/security/suites/jws-2020/v1",
        ],
        "id": did,
        "verificationMethod": [
            {
                "id": f"{did}#oap-signing",
                "type": "JsonWebKey2020",
                "controller": did,
                "publicKeyJwk": {**public_jwk, "alg": "EdDSA", "use": "sig", "kid": "oap-signing"},
            }
        ],
        "assertionMethod": [f"{did}#oap-signing"],
        "authentication": [f"{did}#oap-signing"],
        "service": [
            {
                "id": f"{did}#oap-tool",
                "type": "OAPTool",
                "serviceEndpoint": f"{protocol}://{domain}/.well-known/oap-tool.json",
            }
        ],
    }


def derive_domain(config: ServerConfig, fallback_port: int) -> str:
    if config.domain:
        return config.domain
    if config.did.startswith("did:web:"):
        raw = config.did[len("did:web:"):]
        return unquote(raw.split(":")[0])
    return f"localhost:{fallback_port}"
