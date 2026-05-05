/**
 * Organization, Roles, Scenes, and Norms (RFC 0030).
 *
 * Helpers for declaring an organization manifest extension and enforcing
 * deontic norms (permissions, obligations, prohibitions) across role-scene
 * pairs.
 */

export type DeonticOperator = 'permitted' | 'obligatory' | 'prohibited';

export interface Role {
  role_id: string;
  display_name: string;
  parent_role_id?: string;
}

export interface Scene {
  scene_id: string;
  display_name: string;
  active_when?: string;
}

export interface Norm {
  norm_id: string;
  operator: DeonticOperator;
  role_id: string;
  scene_id: string;
  action_id: string;
  source_rfc?: string;
}

export interface OrganizationManifest {
  organization_did: string;
  display_name: string;
  roles: Role[];
  scenes: Scene[];
  norms: Norm[];
}

export interface DeonticDecision {
  permitted: boolean;
  applicable_norms: Norm[];
  conflict?: { reason: string; norms: Norm[] };
}

export function evaluate(opts: {
  org: OrganizationManifest;
  roleId: string;
  sceneId: string;
  actionId: string;
}): DeonticDecision {
  const applicable = opts.org.norms.filter(
    (n) => n.role_id === opts.roleId && n.scene_id === opts.sceneId && n.action_id === opts.actionId,
  );
  const prohibitions = applicable.filter((n) => n.operator === 'prohibited');
  const obligations = applicable.filter((n) => n.operator === 'obligatory');
  const permissions = applicable.filter((n) => n.operator === 'permitted');

  if (prohibitions.length && obligations.length) {
    return {
      permitted: false,
      applicable_norms: applicable,
      conflict: { reason: 'obligation conflicts with prohibition', norms: [...prohibitions, ...obligations] },
    };
  }
  if (prohibitions.length) return { permitted: false, applicable_norms: applicable };
  if (obligations.length || permissions.length) return { permitted: true, applicable_norms: applicable };
  return { permitted: false, applicable_norms: [] };
}

export function checkConsistency(org: OrganizationManifest): Array<{ kind: string; norms: Norm[] }> {
  const issues: Array<{ kind: string; norms: Norm[] }> = [];
  const seen = new Map<string, Norm[]>();
  for (const n of org.norms) {
    const k = `${n.role_id}|${n.scene_id}|${n.action_id}`;
    const arr = seen.get(k) || [];
    arr.push(n);
    seen.set(k, arr);
  }
  for (const [, arr] of seen) {
    const ops = new Set(arr.map((n) => n.operator));
    if (ops.has('prohibited') && ops.has('obligatory')) {
      issues.push({ kind: 'conflict_prohibited_obligatory', norms: arr });
    }
  }
  return issues;
}
