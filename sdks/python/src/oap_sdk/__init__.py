"""oap-sdk: Official Python SDK for the Open Agent Protocol.

Build OAP-conformant tool servers with manifest publishing, signed invocation,
hash-chained receipts, and conformance attestation.

See https://openagentprotocol.eu/sdks
"""

from .manifest import build_did_document, build_manifest
from .server import OapServer
from .signing import (
    SigningKeys,
    canonicalize,
    export_private_key_pem,
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
    RiskClass,
    ServerConfig,
    SideEffect,
    VALID_LEVELS,
)

__version__ = "0.1.0"
OAP_SPEC_VERSION = "1.0"

__all__ = [
    "OapServer",
    "MemoryStore",
    "ServerConfig",
    "ActionDefinition",
    "ActionContext",
    "PolicyDecision",
    "PolicyHook",
    "ReceiptStore",
    "ConformanceLevel",
    "RiskClass",
    "SideEffect",
    "SigningKeys",
    "VALID_LEVELS",
    "build_manifest",
    "build_did_document",
    "canonicalize",
    "sha256_hex",
    "sign_ed25519",
    "load_signing_key",
    "export_private_key_pem",
    "generate_ulid",
    "__version__",
    "OAP_SPEC_VERSION",
]
