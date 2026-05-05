"""Organization, roles, scenes, deontic norms (RFC 0030)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Role:
    role_id: str
    display_name: str
    parent_role_id: Optional[str] = None


@dataclass
class Scene:
    scene_id: str
    display_name: str
    active_when: Optional[str] = None


@dataclass
class Norm:
    norm_id: str
    operator: str  # permitted | obligatory | prohibited
    role_id: str
    scene_id: str
    action_id: str
    source_rfc: Optional[str] = None


@dataclass
class OrganizationManifest:
    organization_did: str
    display_name: str
    roles: List[Role]
    scenes: List[Scene]
    norms: List[Norm]


@dataclass
class DeonticDecision:
    permitted: bool
    applicable_norms: List[Norm]
    conflict: Optional[dict] = None


def evaluate(org: OrganizationManifest, role_id: str, scene_id: str, action_id: str) -> DeonticDecision:
    applicable = [
        n for n in org.norms
        if n.role_id == role_id and n.scene_id == scene_id and n.action_id == action_id
    ]
    prohibitions = [n for n in applicable if n.operator == "prohibited"]
    obligations = [n for n in applicable if n.operator == "obligatory"]
    permissions = [n for n in applicable if n.operator == "permitted"]

    if prohibitions and obligations:
        return DeonticDecision(
            permitted=False,
            applicable_norms=applicable,
            conflict={"reason": "obligation conflicts with prohibition", "norms": prohibitions + obligations},
        )
    if prohibitions:
        return DeonticDecision(permitted=False, applicable_norms=applicable)
    if obligations or permissions:
        return DeonticDecision(permitted=True, applicable_norms=applicable)
    return DeonticDecision(permitted=False, applicable_norms=[])


def check_consistency(org: OrganizationManifest) -> List[dict]:
    issues: List[dict] = []
    seen: dict = {}
    for n in org.norms:
        k = f"{n.role_id}|{n.scene_id}|{n.action_id}"
        seen.setdefault(k, []).append(n)
    for arr in seen.values():
        ops = {n.operator for n in arr}
        if "prohibited" in ops and "obligatory" in ops:
            issues.append({"kind": "conflict_prohibited_obligatory", "norms": arr})
    return issues
