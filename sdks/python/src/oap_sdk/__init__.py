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
from .memory import (
    MemoryGrant,
    MemoryFilter,
    build_customization_receipt,
    is_grant_expired,
)
from .subscription import (
    ManifestSubscription,
    ManifestUpdateNotification,
    verify_manifest_update,
)
from .model_risk import (
    ModelInventoryEntry,
    SymbioticEscalation,
    CounterfactualExplanation,
    CounterfactualFactor,
    CounterfactualChange,
    AdverseActionNotice,
    should_escalate,
    build_adverse_action_notice,
)
from .organization import (
    Role,
    Scene,
    Norm,
    OrganizationManifest,
    DeonticDecision,
    evaluate as evaluate_deontic,
    check_consistency as check_org_consistency,
)

__version__ = "1.0.0rc2"
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
    "MemoryGrant",
    "MemoryFilter",
    "build_customization_receipt",
    "is_grant_expired",
    "ManifestSubscription",
    "ManifestUpdateNotification",
    "verify_manifest_update",
    "ModelInventoryEntry",
    "SymbioticEscalation",
    "CounterfactualExplanation",
    "CounterfactualFactor",
    "CounterfactualChange",
    "AdverseActionNotice",
    "should_escalate",
    "build_adverse_action_notice",
    "Role",
    "Scene",
    "Norm",
    "OrganizationManifest",
    "DeonticDecision",
    "evaluate_deontic",
    "check_org_consistency",
    "AhtFallbackPolicy",
    "Peer",
    "ThreeTierParams",
    "ThreeTierResult",
    "run_three_tier_handshake",
    "detect_convention_drift",
    "capability_announcement_hash",
    "aht_canonicalize",
    "__version__",
    "OAP_SPEC_VERSION",
]

from .aht import (
    AhtFallbackPolicy,
    Peer,
    ThreeTierParams,
    ThreeTierResult,
    aht_canonicalize,
    capability_announcement_hash,
    detect_convention_drift,
    run_three_tier_handshake,
)
