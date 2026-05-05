/**
 * Model Risk and Symbiotic Escalation (RFC 0028).
 *
 * Helpers for declaring a model inventory, emitting symbiotic-escalation
 * decisions, and producing counterfactual explanations alongside adverse
 * action notices.
 */

export type ModelRiskTier = 'L1' | 'L2' | 'L3' | 'L4';

export interface ModelInventoryEntry {
  model_id: string;
  model_family: string;
  model_version: string;
  risk_tier: ModelRiskTier;
  training_data_summary_url?: string;
  evaluation_report_url?: string;
  champion: boolean;
  challenger_against?: string;
}

export interface SymbioticEscalation {
  decision_id: string;
  model_id: string;
  confidence: number;
  threshold: number;
  escalated_to: 'human_reviewer' | 'committee' | 'champion_model';
  reason: string;
}

export interface CounterfactualExplanation {
  decision_id: string;
  outcome: string;
  contributing_factors: Array<{ feature: string; weight: number; observed: unknown }>;
  minimal_changes_for_alternative_outcome: Array<{ feature: string; from: unknown; to: unknown }>;
}

export interface AdverseActionNotice {
  notice_id: string;
  decision_id: string;
  user_id: string;
  outcome: string;
  primary_reasons: string[];
  appeal_url: string;
  issued_at: string;
}

export function shouldEscalate(confidence: number, threshold: number): boolean {
  return confidence < threshold;
}

export function buildCounterfactual(opts: {
  decisionId: string;
  outcome: string;
  factors: Array<{ feature: string; weight: number; observed: unknown }>;
  minimalChanges: Array<{ feature: string; from: unknown; to: unknown }>;
}): CounterfactualExplanation {
  return {
    decision_id: opts.decisionId,
    outcome: opts.outcome,
    contributing_factors: opts.factors,
    minimal_changes_for_alternative_outcome: opts.minimalChanges,
  };
}

export function buildAdverseActionNotice(opts: {
  decisionId: string;
  userId: string;
  outcome: string;
  primaryReasons: string[];
  appealUrl: string;
}): AdverseActionNotice {
  return {
    notice_id: `aan_${Date.now()}`,
    decision_id: opts.decisionId,
    user_id: opts.userId,
    outcome: opts.outcome,
    primary_reasons: opts.primaryReasons,
    appeal_url: opts.appealUrl,
    issued_at: new Date().toISOString(),
  };
}
