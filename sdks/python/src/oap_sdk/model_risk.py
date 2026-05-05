"""Model risk and symbiotic escalation (RFC 0028)."""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, List, Optional


@dataclass
class ModelInventoryEntry:
    model_id: str
    model_family: str
    model_version: str
    risk_tier: str  # L1..L4
    champion: bool
    training_data_summary_url: Optional[str] = None
    evaluation_report_url: Optional[str] = None
    challenger_against: Optional[str] = None


@dataclass
class SymbioticEscalation:
    decision_id: str
    model_id: str
    confidence: float
    threshold: float
    escalated_to: str  # human_reviewer, committee, champion_model
    reason: str


@dataclass
class CounterfactualFactor:
    feature: str
    weight: float
    observed: Any


@dataclass
class CounterfactualChange:
    feature: str
    from_: Any
    to: Any


@dataclass
class CounterfactualExplanation:
    decision_id: str
    outcome: str
    contributing_factors: List[CounterfactualFactor]
    minimal_changes_for_alternative_outcome: List[CounterfactualChange]


@dataclass
class AdverseActionNotice:
    notice_id: str
    decision_id: str
    user_id: str
    outcome: str
    primary_reasons: List[str]
    appeal_url: str
    issued_at: str


def should_escalate(confidence: float, threshold: float) -> bool:
    return confidence < threshold


def build_adverse_action_notice(
    decision_id: str,
    user_id: str,
    outcome: str,
    primary_reasons: List[str],
    appeal_url: str,
) -> AdverseActionNotice:
    now = datetime.now(timezone.utc)
    return AdverseActionNotice(
        notice_id=f"aan_{int(now.timestamp() * 1000)}",
        decision_id=decision_id,
        user_id=user_id,
        outcome=outcome,
        primary_reasons=primary_reasons,
        appeal_url=appeal_url,
        issued_at=now.isoformat(),
    )
