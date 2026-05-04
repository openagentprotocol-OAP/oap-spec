"""Smoke test: verifies the website example actually works."""

import pytest
from fastapi.testclient import TestClient

from oap_sdk import OapServer


def make_server() -> OapServer:
    server = OapServer(
        did="did:web:tool.example",
        conformance="L1-NC",
        name="Test Tool",
    )

    @server.action(
        id="create_task",
        intent="create a task with title and due date",
        input_schema={
            "type": "object",
            "properties": {"title": {"type": "string"}, "due": {"type": "string"}},
            "required": ["title"],
        },
        output_schema={
            "type": "object",
            "properties": {"id": {"type": "string"}, "title": {"type": "string"}},
            "required": ["id", "title"],
        },
        risk_class="low",
        side_effects="write",
    )
    async def create_task(args):
        return {"id": f"task_{args['input']['title'][:4]}", "title": args["input"]["title"]}

    return server


def test_website_example_full_flow():
    server = make_server()
    client = TestClient(server.app)

    # Manifest
    r = client.get("/.well-known/oap-tool.json")
    assert r.status_code == 200
    manifest = r.json()
    assert manifest["oap_version"] == "1.0"
    assert manifest["conformance"]["level"] == "L1-NC"
    assert len(manifest["actions"]) == 1
    assert manifest["actions"][0]["id"] == "create_task"

    # DID
    r = client.get("/.well-known/did.json")
    assert r.status_code == 200
    did = r.json()
    assert did["id"] == "did:web:tool.example"
    assert did["verificationMethod"][0]["publicKeyJwk"]["kty"] == "OKP"

    # Invoke (write -> requires Bearer)
    r = client.post(
        "/oap/invoke",
        headers={"authorization": "Bearer test-token"},
        json={
            "oap_version": "1.0",
            "request_id": "req_smoke_1",
            "principal_did": "did:web:user.example",
            "agent_did": "did:web:agent.example",
            "action": "create_task",
            "input": {"title": "Buy milk", "due": "2026-12-01"},
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "success"
    assert body["output"]["title"] == "Buy milk"
    assert body["receipt_id"].startswith("urn:oap:receipt:")
    assert body["receipt_hash"].startswith("sha256:")

    # Audit
    r = client.get("/oap/audit", params={"principal_did": "did:web:user.example"})
    audit = r.json()
    assert audit["total"] == 1
    assert audit["receipts"][0]["action_id"] == "create_task"
    assert len(audit["receipts"][0]["signatures"][0]["value"]) > 50

    # Discover
    r = client.post("/oap/discover", json={"intent": "create task"})
    discover = r.json()
    assert discover["matching_actions"][0]["id"] == "create_task"
    assert discover["matching_actions"][0]["confidence"] > 0.5

    # Subscribe
    r = client.post(
        "/oap/subscribe",
        json={"principal_did": "did:web:user.example", "tier": "free"},
    )
    sub = r.json()
    assert sub["status"] == "active"
    assert sub["subscription_token"].startswith("oap_sub_live_")

    # Conformance receipt
    r = client.get("/oap/conformance-receipt")
    conf = r.json()
    assert conf["claimed_levels"] == ["L1-NC"]
    assert conf["profile"] == "non-commercial"

    # GDPR delete (2 receipts: invoke + subscription)
    r = client.post(
        "/oap/data/delete",
        json={"principal_did": "did:web:user.example"},
    )
    assert r.status_code == 200
    delete = r.json()
    assert delete["method"] == "cryptographic_erasure"
    assert len(delete["signature"]["value"]) > 50
    assert delete["_diagnostics"]["receipts_deleted"] == 2


def test_invalid_conformance_rejected():
    with pytest.raises(ValueError, match="conformance must be one of"):
        OapServer(did="did:web:tool.example", conformance="L99")  # type: ignore[arg-type]


def test_missing_did_rejected():
    with pytest.raises(ValueError, match="did is required"):
        OapServer(did="", conformance="L1-NC")


def test_invoke_write_action_without_auth_returns_401():
    server = OapServer(did="did:web:tool.example", conformance="L1-NC")

    @server.action(id="write_thing", side_effects="write")
    async def write_thing(args):
        return {"ok": True}

    client = TestClient(server.app)
    r = client.post(
        "/oap/invoke",
        json={
            "oap_version": "1.0",
            "request_id": "r1",
            "principal_did": "did:web:user.example",
            "agent_did": "did:web:agent.example",
            "action": "write_thing",
            "input": {},
        },
    )
    assert r.status_code == 401


def test_policy_hook_can_deny():
    from oap_sdk import PolicyDecision

    def policy(args):
        return PolicyDecision(
            allow=args["actionId"] != "forbidden",
            reason="test deny",
            rules=["test.deny"],
        )

    server = OapServer(did="did:web:tool.example", conformance="L1-NC", policy=policy)

    @server.action(id="forbidden")
    async def forbidden(args):
        return {}

    client = TestClient(server.app)
    r = client.post(
        "/oap/invoke",
        json={
            "oap_version": "1.0",
            "request_id": "r1",
            "principal_did": "did:web:user.example",
            "agent_did": "did:web:agent.example",
            "action": "forbidden",
            "input": {},
        },
    )
    assert r.status_code == 403
    body = r.json()
    assert body["error"]["code"] == "policy_denied"
    assert body["receipt_id"].startswith("urn:oap:receipt:")
