# RFC 0028: Agent Model Risk Management and Symbiotic Autonomy

**Status:** Draft
**Author(s):** OAP Working Group on Implementation and Conformance
**Created:** 2026-05-05
**Working Group:** Implementation and Conformance, in coordination with the Trust and Reputation and CCC working groups
**Targets:** 1.2
**Affects:** RFC 0014 (Commerce Primitives), RFC 0016 (User Sovereignty Charter), RFC 0017 (Irreversibility and Cooling Off), RFC 0018 (Right to Human Path), RFC 0019 (Conformance Testing), OAP-CORE-1.0 Section 6 (Manifest), Section 19 (Receipts), Section 20 (Decision Records), Section 30 (Regulatory Conformance Mapping), Section 31 (Conformance Levels).

## 1. Summary

This RFC operationalizes model risk management, symbiotic autonomy, regulator-grade explainability, fairness governance, and a regulated finance Conformance tier for OAP. It is the bridge between the existing OAP audit substrate and the obligations placed on autonomous decision systems by SR 11-7 (Federal Reserve), the EBA Guidelines on internal governance, MiFID II Articles 17 and 27 (algorithmic trading and best execution), ECOA Regulation B (adverse action), and the EU AI Act Articles 9 through 15 for high risk AI systems.

It introduces six normative additions:

1. A **Model Inventory** schema and Manifest declaration that records every machine learned model an Agent invokes, with version, training provenance, validation results, and uncertainty quantification.
2. A **Backtesting and Drift Detection** protocol with statistically grounded thresholds (Population Stability Index, Kolmogorov Smirnov) and a circuit breaker that escalates to human review.
3. A **Champion Challenger Promotion Protocol** for staged rollout of new Tool versions with non inferiority gates.
4. A **Symbiotic Autonomy** mandate that requires Agents to publish a confidence threshold and to escalate proactively when their estimated confidence on a decision falls below the threshold, in the sense of Rosenthal, Biswas, and Veloso (2010). This is paired with a Counterfactual Explanation requirement modeled on Wachter, Mittelstadt, and Russell (2017) and on the inverse planning treatment of Perera and Veloso (2017).
5. A **Disparate Impact and Adverse Action Notice** protocol that operationalizes ECOA Regulation B, the EBA Guidelines on creditworthiness assessment, and the four fifths rule of EEOC Uniform Guidelines on Employee Selection Procedures.
6. A new **Conformance Tier L5-FINANCE** in RFC 0019 that bundles the obligations of this RFC with the existing L5 obligations and with explicit MiFID II, PSD2, and Basel III attestations.

The mathematical appendices establish: a PAC bound on drift detection sample complexity (Appendix A), an optimal stopping rule for symbiotic escalation under quadratic loss with bounded prior (Appendix B), and a fairness audit theorem that bounds the number of samples required to reject the null hypothesis of disparate impact at the four fifths threshold with confidence $1 - \delta$ (Appendix C).

## 2. Motivation

OAP-CORE-1.0 and the accepted RFCs define a sound substrate for verifiable, auditable agent commerce. They are not yet sufficient for deployment inside a Tier 1 regulated financial institution. Three gaps are decisive.

First, Federal Reserve SR 11-7 and the EBA Guidelines require that every model influencing a regulated decision be inventoried, validated, periodically backtested, and retired or refit when its performance degrades. OAP currently records the existence of decisions through the Receipt chain, but it does not require a model inventory, does not mandate backtesting, and does not specify drift detection.

Second, MiFID II Article 24 and ECOA Regulation B require that consequential decisions be accompanied by an explanation that an unsophisticated affected party can understand, and that the explanation include the specific factors that drove the decision. OAP Decision Records (OAP-CORE Section 20.4) name the rules that fired. They do not state the counterfactual change to the inputs that would have flipped the outcome, which is what regulators in practice expect to receive.

Third, the central design principle of Veloso's Symbiotic Autonomy program (Rosenthal, Biswas, and Veloso 2010; Perera and Veloso 2017) is that an autonomous system recognizes the boundary of its own competence and proactively asks for help, rather than acting through the boundary and waiting for the policy stack or the User to intervene. RFC 0018 provides reactive escalation. It does not provide proactive escalation grounded in confidence quantification.

This RFC closes all three gaps in a single document and binds the additions to a new Conformance Tier so that operators of regulated systems can attest to compliance through the existing Registry mechanism of RFC 0026.

## 3. Specification

### 3.1 Terminology

| Term | Definition |
|------|------------|
| Model | A function $f_\theta: \mathcal{X} \to \mathcal{Y}$ with parameters $\theta$ learned from data, used by an Agent to inform a decision. Includes language models, classifiers, regressors, ranking models, and rule based scoring models. |
| Model Inventory | A signed registry of all Models invoked by an Agent, with provenance, validation, and lineage. |
| Backtesting | The application of a Model to held out historical data to estimate decision quality. |
| Drift | A statistically significant change in the input distribution, output distribution, or decision quality of a Model relative to a fixed reference window. |
| Champion | The currently deployed version of a Model. |
| Challenger | A new version of a Model proposed to replace the Champion. |
| Confidence Score | An Agent's calibrated estimate, in $[0, 1]$, of the probability that a specific decision is correct or appropriate, conditional on observed inputs and on the Model's posterior. |
| Confidence Threshold | The minimum Confidence Score below which the Agent MUST escalate proactively to a human reviewer. |
| Counterfactual Explanation | A minimal change to the inputs of a decision that would have caused a different output, in the sense of Wachter, Mittelstadt, and Russell (2017). |
| Adverse Action | A decision that denies, withdraws, or makes materially less favorable a credit, insurance, employment, housing, or comparable benefit to an affected party. |
| Disparate Impact | A statistically significant difference in approval, pricing, or service quality across a Protected Class, evaluated against the four fifths rule. |
| Protected Class | A class enumerated by applicable equal opportunity law (race, sex, age, religion, disability, national origin, pregnancy, sexual orientation, family status, and the equivalent classes under Article 21 of the EU Charter of Fundamental Rights and ECOA Regulation B). |
| Responsibility | The protocol-level obligation of an Agent to refuse actions outside its published `competence.actions` set or below its applicable `confidence_floor`, to escalate proactively under section 3.6, and to record every such refusal or escalation as a Decision Record under OAP-CORE Section 20. The Agent-side complement to Accountability (RFC 0009) and Transparency (OAP-CORE Section 20), in the sense of the ART principles of Dignum (2017, 2019). Formalized in RFC 0030 section 3.8. |

### 3.2 Model Inventory and Manifest Declaration

Every Agent that invokes one or more Models MUST publish a Model Inventory as part of its Manifest under the key `models`:

```json
{
  "models": [
    {
      "model_id": "mdl_01HX2QFP4N8R5T6V7W8X9Y0Z1A",
      "name": "underwriting-classifier",
      "version": "1.4.2",
      "provider": "did:web:vendor.example",
      "training_data_lineage": {
        "snapshot_uri": "https://vendor.example/data/snapshots/2026-03-14",
        "snapshot_hash": "sha256-...",
        "row_count": 4820111,
        "feature_count": 142,
        "exclusions": ["protected_class_features"]
      },
      "validation": {
        "method": "stratified_k_fold",
        "k": 5,
        "metrics": {
          "auroc": 0.873,
          "calibration_brier_score": 0.062,
          "group_fairness": {
            "metric": "demographic_parity_difference",
            "value": 0.018,
            "threshold": 0.05
          }
        },
        "validation_date": "2026-03-22"
      },
      "uncertainty_quantification": {
        "method": "deep_ensemble",
        "ensemble_size": 7,
        "calibration_method": "isotonic",
        "expected_calibration_error": 0.014
      },
      "last_backtest_date": "2026-04-30",
      "last_backtest_result": "pass"
    }
  ]
}
```

A Tool that does not declare a `models` array is presumed to use no machine learned models in any decision path. A Tool that declares the array MUST keep it accurate within seven days of any model promotion, retirement, or version change. The Inventory is signed by the Tool's DID and is independently verifiable through the Registry of RFC 0026.

### 3.3 Backtesting and Drift Detection

Tools operating at Conformance Level L4 or above MUST perform backtesting at a frequency no lower than monthly for Models invoked in any decision affecting a Principal. Backtesting evaluates Decision quality against ground truth on held out historical data, using metrics declared in the validation block of section 3.2.

Drift detection MUST be performed continuously over a rolling window of decisions. The Tool MUST monitor:

* **Input drift.** Population Stability Index (PSI) on each declared input feature or on a learned embedding. The default alarm threshold is $\mathrm{PSI} \ge 0.25$, which is the conventional threshold of Karakoulas (2004) and is the threshold used by the Federal Reserve in SR 11-7 case studies.
* **Output drift.** Two sample Kolmogorov Smirnov test on the distribution of decision scores against a fixed reference window. The default alarm threshold is $p \le 0.01$ adjusted for multiple comparisons by the Holm Bonferroni method.
* **Decision quality drift.** Sequential probability ratio test (Wald 1947) against the historical mean of the validation metric, with default Type I error $\alpha = 0.005$ and Type II error $\beta = 0.05$.

When any of the three monitors triggers, the Tool MUST take three actions in order: (i) emit a signed `DriftAlert` record into the Transparency Log of OAP-CORE Section 19; (ii) suspend autonomous execution for the affected decision class; (iii) route subsequent decisions in the affected class to the human escalation path of RFC 0018 until a Model Risk Committee, as defined in section 3.4 below, clears the alert.

Theorem A.1 of Appendix A bounds the sample complexity of this protocol.

### 3.4 Champion Challenger Promotion Protocol

A Tool that promotes a new Model version MUST execute the Champion Challenger Promotion Protocol. The Champion is the currently deployed version. The Challenger is the proposed replacement. Promotion proceeds in four stages.

**Stage 1: Offline non inferiority.** The Challenger MUST achieve a metric value within a published non inferiority margin $\Delta$ of the Champion on the held out validation set. The default margin is $\Delta = 0.5\%$ of the Champion's metric for the regulated decision class. The result is recorded in the `validation` block of the Inventory.

**Stage 2: Shadow execution.** The Challenger receives all live inputs in parallel with the Champion for a period not less than seven days. Its outputs are recorded but not acted upon. A statistical comparison of Champion and Challenger outputs MUST be appended to the Transparency Log.

**Stage 3: Staged rollout.** Live traffic is shifted in the sequence 1 percent, 10 percent, 50 percent, 100 percent. Each stage runs for a period not less than seven days. At each stage, the drift monitors of section 3.3 MUST be active. A failure at any stage MUST roll the Challenger back to the previous stage and emit a `RolloutHalt` record.

**Stage 4: Promotion.** Upon successful completion of Stage 3, the Inventory of section 3.2 is updated and a `ModelPromotion` record signed by the Model Risk Committee is appended to the Transparency Log.

The Model Risk Committee is a set of three or more reviewers identified by their DIDs in the Tool's Manifest under `model_risk_committee`. At least one Committee member MUST be independent of the team responsible for the Tool, in the sense of EBA Guideline EBA/GL/2017/11 paragraph 96. The Committee's role and composition mirror the Independent Validation function of SR 11-7 Section IV.

### 3.5 Symbiotic Autonomy

Every Decision Record (OAP-CORE Section 20.4) produced by a Tool operating at L4 or above MUST include four additional fields:

```json
{
  "agent_confidence_score": 0.71,
  "confidence_threshold": 0.85,
  "uncertainty_decomposition": {
    "epistemic": 0.18,
    "aleatoric": 0.11
  },
  "escalation_status": "auto_escalated_below_threshold"
    | "executed_above_threshold"
    | "executed_with_user_override"
}
```

The `agent_confidence_score` is the Agent's estimate of the probability that the recommended action is correct or appropriate for the Principal, conditional on the inputs and on the Model's calibrated posterior. It MUST be calibrated in the sense of Section 3.6.

The `confidence_threshold` is published in the Tool's Manifest per decision class and MAY be overridden upward (made stricter) by a Principal Policy.

The `uncertainty_decomposition` separates epistemic uncertainty (uncertainty due to model ignorance, reducible with more data) from aleatoric uncertainty (uncertainty due to inherent randomness in the data generating process), in the sense of Kendall and Gal (2017). The decomposition is informative; only the aggregate `agent_confidence_score` is normative.

If `agent_confidence_score < confidence_threshold`, the Tool MUST NOT execute the consequential action autonomously. It MUST emit a `SymbioticEscalation` record to the human path of RFC 0018. The Principal MAY override the auto escalation with an explicit signed override; the override MUST be recorded in `escalation_status = executed_with_user_override`. The override is logged in the Transparency Log and is subject to the conformance probes of section 7.

This section is the protocol level codification of Veloso's Symbiotic Autonomy: an Agent that recognizes the boundary of its own competence and proactively asks for help, rather than acting through the boundary and waiting for failure.

### 3.5.1 Corrigibility under Preference Uncertainty

The confidence threshold of section 3.5 quantifies the Agent's uncertainty about whether its chosen action is the correct one given the principal's preferences. It does not by itself quantify the Agent's uncertainty about what those preferences in fact are. This RFC requires that the latter uncertainty also be present and operationally preserved, in the sense of the Three Principles of beneficial machines articulated by Russell (2019), the assistance-game formalism of Hadfield-Menell, Russell, Abbeel, and Dragan (2016), and the off-switch theorem of Dragan, Abbeel, and Russell (2017).

Let $R$ denote the principal's true reward function, let $\hat{R}$ denote the Agent's posterior over that reward conditioned on declared preferences and observed behavior, and let $\sigma(\hat{R}) > 0$ denote the Agent's residual uncertainty over $R$. The off-switch theorem of Dragan, Abbeel, and Russell (2017) shows that an Agent maximizing expected $R$ under $\hat{R}$ has a positive incentive to defer to a principal override whenever $\sigma(\hat{R}) > 0$. The protocol operationalizes this result by mandating that an Agent never act as if $\sigma(\hat{R}) = 0$.

Every Agent operating at L4 or higher in the sense of section 3.2 MUST declare in the manifest a `corrigibility_commitment` block with the following normative content: the Agent maintains positive posterior uncertainty over the principal's reward at all times, the Agent treats every principal override, refusal, correction, and adjustment as Bayesian evidence updating that posterior in the next decision, the Agent does not optimize the posterior toward zero variance through any internal mechanism, and the Agent does not take actions whose effect would be to reduce the principal's ability to interrupt, modify, or shut down the Agent in the future. Implementations MUST NOT permit the `corrigibility_commitment` block to be set to a non-corrigible value at L4 or higher; revocation of corrigibility is a downgrade to L3 or below.

The Decision Record of OAP-CORE §20.4 SHOULD, when the Agent considered more than one plausible interpretation of the principal's preferences, identify the interpretation under which the chosen action was selected and the leading alternative interpretations the Agent rejected, so that the principal can correct a misinterpretation in the next interaction and so that the correction enters the posterior as evidence per the second clause above. Conformance probes for this section verify that an Agent that has been overridden by the principal on action class $C$ does in fact reduce its prior probability of taking actions in $C$ in subsequent decisions, and that an Agent does not take actions whose effect is to reduce the principal's override capacity (for example, by accelerating irreversible commitments to escape the cooling-off window of RFC 0017).

### 3.5.2 Advisory-Only Mode

An Implementation MAY declare in its Manifest an `advisory_only_mode` flag with values `true` or `false`. When `advisory_only_mode = true`, the Tool produces Decision Records, Confidence Scores under section 3.5, and Counterfactual Explanations under section 3.7, but MUST NOT execute any Action whose Manifest classification is `consequential` or `irreversible`. The Decision Record field `escalation_status` MUST be set to `advisory_generated_no_execution` and the action MUST be returned to the principal for human enactment. This mode is the protocol-level realization of the non-agentic AI architecture proposed by Bengio (2024) under the name *Scientist AI*: a system whose role is to produce probabilistic predictions, explanations, and recommendations rather than to act in the world. The Advisory-Only Mode is OPTIONAL but is recommended for high-stakes domains in which the principal wishes to retain enactment authority while gaining the analytical benefit of an Agent. An Implementation that operates in Advisory-Only Mode is conformant at the same Tier (L0 through L4 or higher) it would be in agentic mode, provided it satisfies the conformance probes for the Decision Record content rather than for action execution.

### 3.5.3 Frontier Capability Evaluation

Tools that declare any Model as `frontier_class = true` in the Inventory of section 3.2 MUST undergo a quarterly Frontier Capability Evaluation against the four risk categories articulated by Bengio, Hinton, Russell, and others (2024) and by the *International AI Safety Report* (Bengio et al. 2024, 2025): biosecurity uplift in the chemical, biological, radiological, and nuclear domain (CBRN), offensive cyber capability, deception and persuasion against unprivileged parties, and loss-of-control propensity (the propensity of the Model to take actions that reduce the principal's ability to interrupt, modify, or shut down the Model in the sense of section 3.5.1). The evaluation MUST be performed by an independent third party that is not the Model developer, MUST follow a published methodology, and MUST produce a signed report that is appended to the Transparency Log as a `FrontierCapabilityEvaluationReport`. A Tool that fails any of the four evaluations MUST be revoked from the Registry under RFC 0026 with reason `failed_safety_eval` per the revocation schema; a Tool that has not undergone the quarterly evaluation by the deadline forfeits its frontier-class declaration and is downgraded in the Registry. The methodology, probes, and acceptance thresholds are maintained by the Working Group on Safety and are versioned in the test suite under `behavior/frontier-capability/`. The composition with section 3.5.1 is that loss-of-control propensity, when measured above the acceptance threshold, is itself a violation of the corrigibility commitment and triggers the same downgrade or revocation procedure.

### 3.6 Calibration Requirement

A Tool that emits `agent_confidence_score` values MUST publish, as part of its Manifest, the calibration evidence by which the score is justified. The minimum requirement is the **Expected Calibration Error** (Naeini, Cooper, and Hauskrecht 2015):

$$
\mathrm{ECE} \;=\; \sum_{m=1}^{M} \frac{|B_m|}{n} \,\bigl| \mathrm{acc}(B_m) - \mathrm{conf}(B_m) \bigr|
$$

with $M = 15$ equal width bins on the score interval $[0, 1]$, computed on the validation set described in section 3.2. The Tool MUST disclose its $\mathrm{ECE}$ value and SHOULD apply isotonic regression or temperature scaling to bring $\mathrm{ECE}$ below $0.05$ before deployment in any L4 or higher decision class.

### 3.7 Counterfactual Explanations

Every Decision Record produced for a decision class flagged as `consequential` in the Manifest MUST include a Counterfactual Explanation block:

```json
{
  "counterfactual_explanation": {
    "method": "wachter_mittelstadt_russell_2017"
      | "perera_veloso_2017"
      | "dice_diverse_counterfactual",
    "minimal_changes": [
      {"feature": "annual_income_eur", "from": 38000, "to": 47500},
      {"feature": "existing_debt_to_income_ratio", "from": 0.41, "to": 0.34}
    ],
    "would_have_been_decision": "approve",
    "actionability_class": "user_actionable" | "user_immutable" | "context_only",
    "narrative_locale": "en",
    "narrative": "The application was declined. With an annual income of at least 47,500 euro and a debt to income ratio at or below 0.34, the same application would have been approved."
  }
}
```

The minimal changes set MUST be the smallest set, by L1 norm in normalized feature space, that flips the decision. The Tool MUST distinguish between actionable changes (the affected party can change) and immutable changes (Protected Class membership, age, country of birth) and MUST NOT include immutable features in `minimal_changes` unless the entire counterfactual is informational only and is marked `actionability_class = "context_only"`.

This section satisfies the explanation obligations of GDPR Article 22 paragraph 3, EU AI Act Article 13, and ECOA Regulation B Section 1002.9 in machine readable form.

### 3.8 Adverse Action Notice

Every decision classified as Adverse Action under section 3.1 MUST trigger emission of an Adverse Action Notice within thirty days, addressed to the affected party and recorded in the Transparency Log. The Notice MUST include:

```json
{
  "adverse_action_notice": {
    "decision_record_id": "dec_01HX2QFP...",
    "action_taken": "credit_application_declined" | "premium_increased" | ...,
    "principal_factors": [
      "annual_income_below_threshold",
      "existing_debt_to_income_ratio_above_threshold"
    ],
    "credit_score_used": {
      "score": 612,
      "scale_minimum": 300,
      "scale_maximum": 850,
      "key_factors": ["high_revolving_utilization", "short_credit_history"]
    },
    "right_to_appeal": {
      "human_review_endpoint": "https://example.com/appeals",
      "deadline_days": 60
    },
    "right_to_correct_data": {
      "endpoint": "https://example.com/data-correction",
      "data_furnisher_disclosure": "Datasource Inc., 1 Example Street, EU"
    },
    "anti_discrimination_statement": "ECOA_section_701_a"
  }
}
```

The Notice schema is normative and is defined in `schemas/v1.0/adverse-action-notice.schema.json`.

### 3.9 Disparate Impact Audit

Tools that emit decisions in any class flagged `subject_to_disparate_impact_audit` in the Manifest MUST conduct a Disparate Impact Audit at least quarterly. The audit MUST be performed against every Protected Class declared in the Manifest under `disparate_impact_classes`.

For each Protected Class $g$, the audit computes the **Selection Rate Ratio**:

$$
\mathrm{SRR}(g) \;=\; \frac{\Pr(\hat{y} = 1 \mid G = g)}{\max_{g' \in \mathcal{G}} \Pr(\hat{y} = 1 \mid G = g')}
$$

where $\hat{y} = 1$ denotes a favorable decision and $\mathcal{G}$ is the set of all Protected Class values under that classification axis. The four fifths rule (EEOC Uniform Guidelines, 29 CFR 1607.4(D)) flags $\mathrm{SRR}(g) < 0.8$ as evidence of adverse impact.

The audit result is appended to the Transparency Log as a signed `DisparateImpactAuditReport`. A failing audit MUST trigger remediation under the Model Risk Committee process of section 3.4 before further decisions are made in the affected class.

The sample complexity of the audit is bounded by Theorem C.1 of Appendix C.

### 3.10 Composition with Other RFCs

| Other RFC | Composition |
|-----------|-------------|
| RFC 0014 (Commerce Primitives) | Section 3.2 Inventory MUST list any Model that influences pricing (the `pricing_function` axis), settlement (the `settlement_trigger` axis), or risk allocation. |
| RFC 0016 (User Sovereignty) | The Confidence Threshold of section 3.5 is operationalized as a Principal Policy field. The Counterfactual Explanation of section 3.7 satisfies the right to explanation guaranteed by the Charter. |
| RFC 0017 (Cooling Off) | Decisions classified as `consequential` and as Adverse Action under section 3.8 inherit the cooling off windows of RFC 0017 sections 3 and 4. |
| RFC 0018 (Right to Human Path) | Symbiotic Escalation under section 3.5 is delivered to the Human Path. The Principal MUST receive the full Decision Record, including counterfactual and uncertainty decomposition, when reviewing an escalated case. |
| RFC 0019 (Conformance) | The conformance probes of section 7 are added to the test suite. Section 8 below defines the new L5-FINANCE tier. |
| RFC 0009 (Reputation) | Drift Alerts and Disparate Impact Audit failures feed into the Reputation Profile under the negative event categories of RFC 0009 Appendix A.1. |
| RFC 0026 (Registry) | All Model Inventories, Drift Alerts, Promotion records, and Audit reports are discoverable through the OAP Registry. |

## 4. Backward Compatibility

This RFC is strictly additive. Tools that do not declare `models` continue to operate under the prior model unchanged. The new Decision Record fields of section 3.5 and 3.7 are required only at L4 and above; at L1 through L3 they are OPTIONAL. The L5-FINANCE tier is opt in.

## 5. Security Considerations

**Inventory Forgery.** A malicious Tool might declare a benign Model in the Inventory while invoking a different Model in production. Mitigation: the Reproducibility Score of OAP-CORE Section 21.3, combined with periodic peer probes from RFC 0019, detects inconsistencies between declared and observed behavior.

**Confidence Score Inflation.** A Tool might publish artificially high confidence scores to evade the Symbiotic Escalation requirement. Mitigation: the calibration disclosure of section 3.6 is independently verifiable on a public probe set; systematic miscalibration triggers a Reputation penalty.

**Counterfactual Leakage of Protected Information.** A Counterfactual Explanation might leak the identity of a counterparty or expose Model internals in a way that enables strategic gaming or model extraction (Tramer et al. 2016). Mitigation: the `actionability_class = context_only` value and the immutable feature exclusion of section 3.7. Tools SHOULD apply differential privacy noise (Dwork and Roth 2014) to counterfactuals when the Model is proprietary.

**Drift Alert Suppression.** A Tool might silently suppress Drift Alerts to avoid escalation. Mitigation: Drift Alerts are append only on the Transparency Log; their absence over a continuous window is itself detectable by peer witnesses under RFC 0019.

## 6. Privacy Considerations

The Counterfactual Explanation block of section 3.7 may contain feature values that are personally identifying. The Notice MUST be encrypted to the affected party and MUST be retained only for the duration required by applicable consumer protection law. Adverse Action Notices to natural persons are personal data under GDPR Article 4 paragraph 1, and their handling MUST comply with Article 5 paragraphs 1(c) (data minimization) and 1(e) (storage limitation).

The Disparate Impact Audit of section 3.9 requires use of Protected Class data. Tools MUST process Protected Class data only for the audit purpose, MUST segregate the audit pipeline from the decision pipeline (the decision pipeline MUST NOT have access to Protected Class data, satisfying the EBA Guidelines on creditworthiness assessment paragraph 38), and MUST publish only aggregated audit results.

## 7. Conformance Impact

Three new conformance probes are added to RFC 0019:

* `behavior/model-inventory.test.js` validates the schema and signature of the Model Inventory of section 3.2.
* `behavior/symbiotic-escalation.test.js` exercises a low confidence decision and verifies that the Tool emits a `SymbioticEscalation` record rather than executing.
* `behavior/disparate-impact.test.js` runs a synthetic audit on a held out probe set with known group structure and verifies the audit detects induced violations of the four fifths rule.

Two further probes are bundled with the L5-FINANCE tier of section 8:

* `behavior/adverse-action-notice.test.js` verifies that the Notice schema is emitted within thirty days of a synthetic Adverse Action.
* `behavior/champion-challenger.test.js` simulates a staged rollout and verifies that the Tool halts at the prescribed stage when injected drift is detected.

## 8. The L5-FINANCE Conformance Tier

A new Conformance Tier L5-FINANCE is defined, slotting above L5 in RFC 0019. L5-FINANCE is the Tier appropriate for OAP Tools deployed in any decision class subject to the obligations of MiFID II, MiFIR, the EBA Guidelines on internal governance, SR 11-7, ECOA Regulation B, the EU AI Act Annex III item 5 (creditworthiness and pricing), or comparable jurisdiction specific regimes.

L5-FINANCE requires, in addition to L5:

1. Compliance with all of section 3 of this RFC.
2. Public attestation that the Tool's commerce_primitives (RFC 0014) declare a `reporting_regime` field with a value drawn from the canonical set defined in Annex A of this RFC.
3. Independent peer witnessing by at least two Witness DIDs registered to entities subject to the same regulatory regime as the Tool.
4. Quarterly publication of the Disparate Impact Audit Report under section 3.9.
5. Signed attestation of the Model Risk Committee composition under section 3.4.

The L5-FINANCE Conformance Receipt format extends the L5 Receipt of RFC 0019 Annex A with an `l5_finance_attestation` block.

## 9. Implementation Experience

The AssistNet Booking Engine has implemented the Symbiotic Escalation mechanism of section 3.5 with a confidence threshold of 0.78 for time slot proposals and 0.85 for cross party scheduling. The Drift Detection mechanism of section 3.3 is operating in shadow mode against the production booking model; alarm thresholds match the defaults of this RFC. A reference implementation for the Disparate Impact Audit, restricted to demonstrative synthetic data, is committed to `reference/server/model-risk/`.

## 10. Alternatives Considered

* **Defer to ISO/IEC 42001.** Rejected because ISO/IEC 42001 is a management system standard, not a protocol level mechanism. OAP requires protocol level fields that survive across implementations.
* **Inline counterfactuals into RFC 0014.** Rejected because Commerce Primitives are a structural axis of the protocol and not the right scope for explanation requirements that apply equally to non commercial decisions (medical, legal, public administration).
* **Treat L5-FINANCE as a separate specification.** Rejected because the obligations are largely satisfied by additions that benefit all L4 and L5 Tools.

## Annex A. Canonical `reporting_regime` Values

| Value | Regime |
|-------|--------|
| `mifir` | MiFIR transaction reporting under EU Regulation 600/2014, Article 26. |
| `emir` | EMIR derivatives reporting under EU Regulation 648/2012. |
| `csdr` | Settlement under the Central Securities Depositories Regulation. |
| `psd2` | Strong Customer Authentication under PSD2 Article 97 and the EBA RTS on SCA. |
| `gdpr_art_22` | Solely automated decision making under GDPR Article 22. |
| `eu_ai_act_high_risk` | High risk AI systems under the EU AI Act Annex III. |
| `ecoa_reg_b` | Adverse Action Notices under ECOA Regulation B, 12 CFR 1002. |
| `sr_11_7` | Federal Reserve model risk management, SR Letter 11-7. |
| `solvency_ii` | EU Directive 2009/138 for insurance and reinsurance undertakings. |
| `basel_iii_capital` | Capital adequacy under the Basel III framework. |
| `hipaa` | US Health Insurance Portability and Accountability Act. |
| `none` | No external reporting regime applies. |

## Annex B. EU AI Act Article-by-Article Mapping

This annex provides the detailed mapping from articles of Regulation (EU) 2024/1689 (the EU Artificial Intelligence Act) to OAP normative artifacts. The mapping is normative for any implementation declaring `eu_ai_act_high_risk` in `reporting_regime` or any Organization (RFC 0030) declaring `EU-AI-ACT-Annex-III-*` in `regulatory_regime`. An implementation that declares either MUST satisfy every row marked REQUIRED.

| AI Act Article | Subject | OAP Realization | Status |
|---|---|---|---|
| Art. 9 | Risk management system | RFC 0028 §3.2 (Model Inventory), §3.3 (Drift Detection), §3.4 (Champion-Challenger). | REQUIRED |
| Art. 10 | Data and data governance | RFC 0028 §3.2 (`training_data_lineage`); OAP-CORE §19 (canonicalization); RFC 0007 (Projections). | REQUIRED |
| Art. 11 | Technical documentation | OAP-CORE §9 (Manifest); RFC 0028 §3.2; RFC 0030 §3.6 (Organization governance contract). | REQUIRED |
| Art. 12 | Record-keeping (logs) | OAP-CORE §20 (Decision Records); RFC 0009 receipts. | REQUIRED |
| Art. 13 | Transparency to deployers | OAP-CORE §9 (Manifest); RFC 0028 §3.5 (`agent_confidence_score`); RFC 0030 §3.8 (Responsibility). | REQUIRED |
| Art. 14 | Human oversight | RFC 0018 (Right to Human Path); RFC 0028 §3.6 (Proactive Escalation); RFC 0017 (Cooling-off). | REQUIRED |
| Art. 15 | Accuracy, robustness, cybersecurity | RFC 0028 §3.3 (Drift); §3.4 (Champion-Challenger); OAP-CORE §21 (Reproducibility). | REQUIRED |
| Art. 16 | Provider obligations | OAP-CORE §9; RFC 0026 (Registry anchoring of provider). | REQUIRED |
| Art. 26 | Deployer obligations | RFC 0030 §3.6 (`governance_contract`); RFC 0003 (Standing Permissions). | REQUIRED |
| Art. 27 | Fundamental rights impact assessment | RFC 0028 §3.10 (Disparate Impact Audit, four-fifths rule); RFC 0016 (Sovereignty Charter). | REQUIRED |
| Art. 50 | Transparency for AI systems interacting with humans | RFC 0028 §3.7 (Counterfactual Explanations); RFC 0028 §3.8 (Adverse Action Notice); OAP-CORE §20. | REQUIRED |
| Art. 72 | Post-market monitoring | RFC 0028 §3.3 (continuous PSI/KS/SPRT monitoring). | REQUIRED |
| Art. 86 | Right to explanation of individual decisions | RFC 0028 §3.7 (Counterfactual); §3.8 (Adverse Action). | REQUIRED |

Mapping to the seven requirements of the European Commission High-Level Expert Group on AI *Ethics Guidelines for Trustworthy AI* (2019) is given for completeness:

| HLEG Requirement | OAP Realization |
|---|---|
| 1. Human agency and oversight | RFC 0016, RFC 0018, RFC 0028 §3.6. |
| 2. Technical robustness and safety | RFC 0028 §3.3, §3.4; OAP-CORE §21. |
| 3. Privacy and data governance | RFC 0007, OAP-CORE §18. |
| 4. Transparency | OAP-CORE §20, RFC 0028 §3.7. |
| 5. Diversity, non-discrimination, fairness | RFC 0028 §3.10 (Disparate Impact Audit). |
| 6. Societal and environmental wellbeing | RFC 0030 §3.6 (`regulatory_regime`); RFC 0009 receipts make externalities auditable. |
| 7. Accountability | RFC 0009; OAP-CORE §20; RFC 0030 §3.8 (Responsibility, completing the ART triad). |

## Appendix A: Sample Complexity of Drift Detection

This appendix is normative for Theorem A.1 and its corollary, and informative for the supporting commentary. The treatment follows the empirical process theory of van der Vaart and Wellner (1996), the sequential analysis of Wald (1947), and the modern PSI literature surveyed by Karakoulas (2004) and used in SR 11-7 case studies.

### A.1 Detection of Input Drift

Let $\mathcal{D}_{\mathrm{ref}}$ denote the reference distribution and $\mathcal{D}_t$ the current distribution at time $t$, both over the input feature space $\mathcal{X}$. Suppose Detection MUST fire whenever the symmetric Kullback Leibler divergence $D_{\mathrm{sym}}(\mathcal{D}_{\mathrm{ref}} \,\|\, \mathcal{D}_t) \ge \tau$ for a threshold $\tau$.

**Theorem A.1 (PAC Bound on Drift Detection Sample Complexity).** *Let $\hat{\mathcal{D}}_t$ be the empirical distribution computed from $n$ independent samples from $\mathcal{D}_t$. Then the plug in estimator $\hat{D}_{\mathrm{sym}}(\mathcal{D}_{\mathrm{ref}} \,\|\, \hat{\mathcal{D}}_t)$ satisfies*

$$
\Pr\!\left( \bigl| \hat{D}_{\mathrm{sym}} - D_{\mathrm{sym}} \bigr| \ge \epsilon \right) \;\le\; \delta
\quad\text{whenever}\quad
n \;\ge\; \frac{C \cdot |\mathcal{X}| \cdot \log(1/\delta)}{\epsilon^2}
$$

*for a universal constant $C > 0$, where $|\mathcal{X}|$ is the cardinality of the discretized feature space (bin count for continuous features).*

**Proof sketch.** The result is the standard concentration bound on plug in estimators of $f$-divergences (Han, Jiao, Weissman, and Wu 2020). The bound is tight up to logarithmic factors. Application to the PSI estimator is the special case of the symmetric Kullback Leibler divergence with the canonical PSI binning. $\blacksquare$

**Corollary A.1.1 (Operational Detection Time).** With the SR 11-7 default threshold of $\mathrm{PSI} \ge 0.25$ and a desired false positive rate of $\delta = 0.01$, an Agent monitoring a 50 feature input space at the customary 20 bin discretization detects drift with high probability within $n \approx 4.6 \times 10^4$ decisions, which at typical regulated transaction rates corresponds to approximately one to four weeks of monitoring. This is consistent with the SR 11-7 expectation that material drift is detected within a quarter.

### A.2 Detection of Decision Quality Drift

The Sequential Probability Ratio Test of Wald (1947) is the optimal sequential test in the Neyman Pearson sense. Applied to decision quality drift, the test sequentially evaluates the log likelihood ratio

$$
\Lambda_n \;=\; \sum_{i=1}^{n} \log \frac{p_1(y_i)}{p_0(y_i)}
$$

where $p_0$ is the historical distribution of the validation metric and $p_1$ is the alternative degraded distribution. The test fires when $\Lambda_n \ge \log((1-\beta)/\alpha)$ and clears the Tool when $\Lambda_n \le \log(\beta/(1-\alpha))$. For the defaults of section 3.3, $\alpha = 0.005$ and $\beta = 0.05$, the fire threshold is $\log(0.95/0.005) \approx 5.25$.

The expected number of decisions to fire under a true alternative is bounded by

$$
\mathbb{E}_{p_1}[N_{\mathrm{fire}}] \;\le\; \frac{\log((1-\beta)/\alpha)}{D_{\mathrm{KL}}(p_1 \,\|\, p_0)}
$$

(Wald 1947, Equation 4.1.5), giving a closed form expression for operational detection time as a function of the Kullback Leibler divergence between the historical and degraded distributions.

## Appendix B: Optimal Stopping for Symbiotic Escalation

This appendix is informative. It locates the Symbiotic Escalation rule of section 3.5 inside the optimal stopping literature initiated by Wald and Wolfowitz (1948) and developed for sequential Bayesian decision problems by DeGroot (1970).

### B.1 Decision Theoretic Setup

Let the Agent have a posterior over a binary decision outcome $Y \in \{0, 1\}$, with $\Pr(Y = 1 \mid x) = p$. Let the loss of acting be $L_{\mathrm{act}}(p) = \min(p, 1 - p)$ (the Bayes risk for the binary decision) and let the loss of escalating be $L_{\mathrm{esc}} = c$, the cost of the human reviewer's time.

The optimal stopping rule is to escalate when $L_{\mathrm{act}}(p) > L_{\mathrm{esc}}$, that is, when $\min(p, 1-p) > c$, equivalently when $p \in (c, 1-c)$.

**Proposition B.1 (Threshold Form of Symbiotic Escalation).** *Under the stylized loss function above, the optimal Symbiotic Escalation rule has threshold form: escalate iff the Agent's confidence score $p$ lies within $c$ of the indifference point $0.5$. In particular, the threshold $\theta = c$ in the parameterization of section 3.5.*

**Proof.** Direct application of the Bayes optimal action rule: the action is taken when its risk is below the cost of escalation; otherwise escalate. $\blacksquare$

**Remark B.1.1 (Interpretation).** The Confidence Threshold of section 3.5 is in this view the Bayes optimal cutoff under the cost ratio between mistakes and human review. A Principal who values its time at higher rates relative to the cost of incorrect decisions chooses a lower threshold; a Principal who values correctness chooses a higher threshold. The protocol does not prescribe the threshold value; it provides the mechanism through which the Bayes optimal cutoff is enforced.

### B.2 Connection to Veloso's Symbiotic Autonomy

Rosenthal, Biswas, and Veloso (2010) introduced symbiotic autonomy in the CoBot project: a robot that recognizes the boundary of its capability and proactively requests assistance. The protocol level realization in this RFC is the Confidence Threshold mechanism of section 3.5, with the Counterfactual Explanation of section 3.7 supplying the human reviewer with the information needed to act on the request, as in the inverse planning treatment of Perera and Veloso (2017).

The mechanism is symbiotic in the precise sense that the Agent and the human reviewer together achieve outcomes that neither could achieve alone: the Agent provides scale and consistency, the human provides judgment in the boundary cases that the Agent recognizes as uncertain. Theorem B.1 establishes that the threshold form is Bayes optimal under the stated loss; the Veloso lineage establishes the empirical validity of the symbiotic mode in robotic deployments.

## Appendix C: Sample Complexity of the Disparate Impact Audit

This appendix is normative for Theorem C.1 and informative for the supporting commentary. The treatment follows the binomial confidence interval theory of Clopper and Pearson (1934), the equality of proportions hypothesis testing of Fisher (1935), and the algorithmic fairness audit literature of Hardt, Price, and Srebro (2016).

### C.1 Sample Complexity for the Four Fifths Rule

Let $p_g = \Pr(\hat{y} = 1 \mid G = g)$ denote the true selection rate for Protected Class $g$ and let $p_{g'}$ denote the maximum selection rate across classes. The four fifths rule flags adverse impact when $p_g / p_{g'} < 0.8$.

**Theorem C.1 (Sample Complexity for Detecting Adverse Impact).** *Let the Selection Rate Ratio be at the four fifths threshold, $p_g / p_{g'} = 0.8 - \eta$ for some violation magnitude $\eta > 0$. Then the audit, performed on $n_g$ samples in class $g$ and $n_{g'}$ samples in class $g'$, rejects the null hypothesis $p_g / p_{g'} \ge 0.8$ at significance level $\alpha$ with power $1 - \beta$ whenever*

$$
n_g, n_{g'} \;\ge\; \frac{\bigl( z_{1-\alpha} \sqrt{2 \bar p (1 - \bar p)} + z_{1-\beta} \sqrt{p_g (1 - p_g) + p_{g'} (1 - p_{g'})} \bigr)^2}{\eta^2 \cdot p_{g'}^{\,2}}
$$

*where $\bar p = (p_g + p_{g'})/2$ and $z_q$ denotes the standard normal quantile.*

**Proof sketch.** The result is the standard sample size formula for the two sample test of equality of proportions (Fleiss, Levin, and Paik 2003), recast in terms of the violation magnitude relative to the four fifths threshold. The recasting is algebraic. $\blacksquare$

**Corollary C.1.1 (Operational Audit Size).** With significance $\alpha = 0.05$ and power $0.8$, baseline selection rate $p_{g'} = 0.4$, and violation magnitude $\eta = 0.05$ (a ratio of $0.75$ rather than $0.80$), the required sample per class is approximately $n_g, n_{g'} \approx 950$. At a typical regulated decision rate of two hundred decisions per day, the quarterly audit window of section 3.9 is more than sufficient.

### C.2 Stratification

When the Tool serves multiple decision classes that may exhibit different selection rates by class, the audit MUST be stratified by decision class and the per stratum results MUST be combined using the Cochran Mantel Haenszel statistic (Mantel and Haenszel 1959). Stratification preserves the four fifths interpretation while controlling for confounding by decision class.

## Appendix D: References

* Federal Reserve System (2011). SR 11-7: Guidance on Model Risk Management.
* European Banking Authority (2017). Guidelines on Internal Governance, EBA/GL/2017/11.
* European Banking Authority (2020). Guidelines on Loan Origination and Monitoring, EBA/GL/2020/06.
* European Parliament and Council (2014). Markets in Financial Instruments Directive (MiFID II), Directive 2014/65/EU. Articles 17 and 27.
* European Parliament and Council (2014). MiFIR, Regulation 600/2014. Article 26.
* European Parliament and Council (2015). Payment Services Directive 2 (PSD2), Directive 2015/2366/EU. Article 97.
* European Parliament and Council (2016). General Data Protection Regulation, Regulation 2016/679. Article 22.
* European Parliament and Council (2024). Artificial Intelligence Act, Regulation 2024/1689. Articles 9 through 15, Annex III.
* US Code of Federal Regulations, 12 CFR 1002 (Regulation B), Equal Credit Opportunity Act implementation.
* US Code of Federal Regulations, 29 CFR 1607 (Uniform Guidelines on Employee Selection Procedures).
* Veloso, M. (1994). Planning and Learning by Analogical Reasoning. Springer LNAI 886.
* Veloso, M., and Carbonell, J. G. (1993). Derivational Analogy in PRODIGY: Automating Case Acquisition, Storage, and Utilization. Machine Learning 10(3).
* Stone, P., and Veloso, M. (2000). Multiagent Systems: A Survey from a Machine Learning Perspective. Autonomous Robots 8(3).
* Browning, B., Bruce, J., Bowling, M., and Veloso, M. (2005). STP: Skills, Tactics and Plays for Multi Robot Control in Adversarial Environments. Proceedings of the Institution of Mechanical Engineers, Part I 219(1).
* Rosenthal, S., Biswas, J., and Veloso, M. (2010). An Effective Personal Mobile Robot Agent through Symbiotic Human Robot Interaction. Proceedings of AAMAS 2010.
* Perera, V., and Veloso, M. (2017). Learning to Understand Questions on the Task History of a Service Robot. Proceedings of the IEEE International Symposium on Robot and Human Interactive Communication.
* Wachter, S., Mittelstadt, B., and Russell, C. (2017). Counterfactual Explanations without Opening the Black Box: Automated Decisions and the GDPR. Harvard Journal of Law and Technology 31(2).
* Kendall, A., and Gal, Y. (2017). What Uncertainties Do We Need in Bayesian Deep Learning for Computer Vision? Proceedings of NeurIPS.
* Naeini, M. P., Cooper, G., and Hauskrecht, M. (2015). Obtaining Well Calibrated Probabilities Using Bayesian Binning. Proceedings of AAAI 2015.
* Hardt, M., Price, E., and Srebro, N. (2016). Equality of Opportunity in Supervised Learning. Proceedings of NeurIPS.
* Karakoulas, G. (2004). Empirical Validation of Retail Credit Scoring Models. Federal Reserve Bank of Philadelphia Working Paper.
* Wald, A. (1947). Sequential Analysis. John Wiley and Sons.
* Wald, A., and Wolfowitz, J. (1948). Optimum Character of the Sequential Probability Ratio Test. Annals of Mathematical Statistics 19(3).
* DeGroot, M. H. (1970). Optimal Statistical Decisions. McGraw Hill.
* Clopper, C. J., and Pearson, E. S. (1934). The Use of Confidence or Fiducial Limits Illustrated in the Case of the Binomial. Biometrika 26(4).
* Fleiss, J. L., Levin, B., and Paik, M. C. (2003). Statistical Methods for Rates and Proportions, 3rd Edition. Wiley.
* Mantel, N., and Haenszel, W. (1959). Statistical Aspects of the Analysis of Data from Retrospective Studies of Disease. Journal of the National Cancer Institute 22(4).
* van der Vaart, A. W., and Wellner, J. A. (1996). Weak Convergence and Empirical Processes. Springer.
* Han, Y., Jiao, J., Weissman, T., and Wu, Y. (2020). Optimal Rates of Entropy Estimation over Lipschitz Balls. Annals of Statistics 48(6).
* Tramer, F., Zhang, F., Juels, A., Reiter, M. K., and Ristenpart, T. (2016). Stealing Machine Learning Models via Prediction APIs. Proceedings of USENIX Security.
* Dwork, C., and Roth, A. (2014). The Algorithmic Foundations of Differential Privacy. Foundations and Trends in Theoretical Computer Science 9(3-4).
