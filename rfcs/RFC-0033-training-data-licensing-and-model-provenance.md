# RFC 0033: Training Data Licensing and Model Provenance

**Status:** Draft
**Author(s):** T. Fengler (Editor)
**Working Group:** Commercial Layer
**Created:** 2026-05-06
**Targets:** 1.2
**Extends:** RFC 0013
**Affects:** RFC 0005 (Entities), RFC 0007 (Projections), RFC 0009 (Reputation), RFC 0012 (Agent Native Web), RFC 0013 (Commerce Models), RFC 0014 (Commerce Primitives), RFC 0016 (User Sovereignty Charter), RFC 0023 (Agent Native Storage Substrate), RFC 0028 (Model Risk and Symbiotic Autonomy).

## 1. Summary

RFC 0013 section 3.5 defines Citation Attribution Receipts for single-output usage of Knowledge Nodes. Section 3.9 describes four metering mechanisms for real-time consumption. RFC 0013 explicitly leaves open the question of training data licensing: the use of content not in a single generated output but in the training of a model's underlying weights.

This RFC closes that gap. It defines the Training Data License (TDL), the Training Inclusion Record (TIR), the Model Provenance Document (MPD), and the Training Exclusion Request (TER). Together they establish a machine-verifiable, DID-anchored chain of custody from a Knowledge Node through a training dataset to a deployed model, satisfying the EU AI Act Article 53(1)(d) requirement that GPAI providers publish sufficiently detailed training data summaries, and the Article 53(3) obligation that providers respect text and data mining (TDM) opt-outs under the EU DSM Directive Article 4.

## 2. Motivation

### 2.1 The Gap Between Citation and Training

Citation Attribution Receipts document that a specific agent output incorporated content from a specific Knowledge Node. This covers inference-time usage. It does not cover the prior, structurally different use: the crawling, filtering, and tokenization of content into a training corpus, and the subsequent gradient-based absorption of that content into a model's weights.

Training is categorically distinct from inference for three reasons. First, the scale of consumption is orders of magnitude larger: a model trained on the CommonCrawl consumes trillions of tokens from billions of documents, while an inference session typically consumes thousands of tokens from dozens of documents. Second, the nature of the economic relationship is different: at inference time the agent pays per token consumed; at training time the model developer receives a permanent capability to produce content similar to the training data without any further per-token transaction. Third, the legal framework is different: the EU DSM Directive Article 4 grants a TDM exception that can be opted out of by machine-readable signals, creating a normative legal obligation to respect those signals that does not exist for inference.

### 2.2 The Regulatory Landscape

The EU AI Act, in force as of August 2024, requires GPAI providers to publish training data summaries by August 2025. The EU AI Office has issued template summaries. The EU DSM Directive Article 4 opt-out, implemented via `robots.txt` disallow directives for specific crawlers or via structured signals in HTTP response headers, is legally binding in all EU member states. The EU AI Act Article 53(1)(b) additionally requires GPAI providers to implement a policy to comply with Union law on copyright. GDPR Article 22 requires that automated decisions based on data subjects' personal data be explainable.

Existing robots.txt signals are insufficient: they are advisory, not cryptographically verifiable, and cannot express licensing terms beyond a binary allow/disallow. The opting-out party cannot verify that a crawler has honored the signal. The content creator cannot prove retroactively that a model was trained on their content without access to the developer's internal records.

This RFC provides a protocol-level solution: a machine-readable, cryptographically signed, DID-anchored licensing framework that allows any Knowledge Node provider to express granular training permissions, any model developer to record their compliance, and any regulator or rights holder to audit the chain of custody.

### 2.3 Existing Work This RFC Builds On

Bommasani et al. (2021) "On the Opportunities and Risks of Foundation Models" (Stanford CRFM) establishes the training data provenance problem as a first-order concern for AI accountability. Henderson et al. (2023) "Foundation Models and Fair Use" provides a legal analysis of when training constitutes fair use and when it does not, identifying the machine-readable opt-out as the critical distinguishing factor. Elkin-Koren and Hacohen (2024) "Training Data as a Copyrightable Work" (Hebrew University Law Review) argues that the selection and arrangement of training datasets constitutes copyrightable expression, motivating the dataset-level provenance records this RFC defines. The C2PA specification v2.2 (2025) provides the cryptographic content credential infrastructure that this RFC extends for training data. The EU AI Office's GPAI training data transparency template (2025) provides the regulatory requirement that the Model Provenance Document directly satisfies.

## 3. Specification

### 3.1 Terminology

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, NOT RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in RFC 2119 and RFC 8174.

A **Training Data License (TDL)** is a machine-readable, DID-signed document published by a Knowledge Node provider that expresses whether and under what conditions a model developer may incorporate the Knowledge Node's content into a training corpus.

A **Training Inclusion Record (TIR)** is a machine-readable, DID-signed document published by a model developer that records which Training Data Licenses were accepted, which Knowledge Nodes were included, how they were preprocessed, and at which dataset version they were incorporated.

A **Model Provenance Document (MPD)** is the aggregate model-level document that collects all Training Inclusion Records associated with a model version, declares the model's training data summary for EU AI Act Article 53(1)(d) compliance, and provides the machine-verifiable chain of custody from Knowledge Nodes to model weights.

A **Training Exclusion Request (TER)** is a machine-readable, DID-signed document by which a Knowledge Node provider requests that a model developer remove their content from a future training run or, where technically feasible, apply unlearning procedures to an existing model.

A **Training Data License Identifier (TDLI)** is a stable URI that uniquely identifies a specific version of a TDL, analogous to a SPDX license identifier for software.

### 3.2 The Training Data License

A Training Data License is published by a Knowledge Node provider at a discoverable URI. The URI MUST follow the pattern `https://{provider_domain}/.well-known/oap/training-license.json` for the provider's default license, or `https://{provider_domain}/.well-known/oap/training-license/{license_id}.json` for a specific license version.

The TDL schema (`oap-training-data-license.schema.json`) requires the following fields:

```json
{
  "tdl_id": "urn:oap:tdl:knowledge.example:2026-v1",
  "version": "1.0",
  "provider_did": "did:web:knowledge.example",
  "effective_from": "2026-05-06T00:00:00Z",
  "effective_until": null,
  "scope": {
    "applies_to": "all_knowledge_nodes",
    "excluded_node_ids": [],
    "included_content_classes": ["text", "structured_data"],
    "excluded_content_classes": ["biometric", "health", "special_category_gdpr"]
  },
  "permissions": {
    "research_tdm": "allowed",
    "commercial_tdm": "allowed_with_attribution",
    "pretraining": "allowed_with_attribution",
    "finetuning": "allowed_with_attribution",
    "rlhf": "allowed_with_attribution",
    "distillation": "prohibited",
    "synthetic_data_generation": "allowed_with_fee"
  },
  "attribution_requirements": {
    "required": true,
    "form": "model_provenance_document",
    "granularity": "dataset_version",
    "anchor_in_registry": true
  },
  "fee": {
    "pretraining_fee_per_token": "0.000001",
    "finetuning_fee_per_token": "0.000005",
    "synthetic_data_fee_per_output_token": "0.00001",
    "currency": "EUR",
    "payment_endpoint": "https://knowledge.example/oap/training-fee"
  },
  "opt_out_signals": {
    "robots_txt_compliant": true,
    "tdm_reservation_header": "X-Robots-Tag: noai",
    "oap_tdl_supersedes_robots_txt": true
  },
  "eu_dsm_directive": {
    "article_4_opt_out_scope": "commercial_tdm",
    "gdpr_data_subject_rights_preserved": true
  },
  "unlearning": {
    "supports_approximate_unlearning": false,
    "unlearning_request_endpoint": null
  },
  "dispute_endpoint": "https://knowledge.example/oap/training-dispute",
  "signature": {
    "alg": "EdDSA",
    "kid": "did:web:knowledge.example#key-1",
    "value": "..."
  }
}
```

The `permissions` object uses a closed vocabulary for each training activity. Permitted values are `allowed`, `allowed_with_attribution`, `allowed_with_fee`, `allowed_with_attribution_and_fee`, and `prohibited`. A model developer that finds no TDL at the well-known URI MUST treat the provider as `research_tdm: allowed, commercial_tdm: prohibited` by default, consistent with the EU DSM Directive Article 4 opt-out presumption for commercial operators.

### 3.3 Training Inclusion Record

A model developer MUST create a Training Inclusion Record for each Knowledge Node provider whose content is incorporated into a training corpus. The TIR is published by the model developer at a URI that the Model Provenance Document references.

```json
{
  "tir_id": "urn:oap:tir:model.example:dataset-v3:knowledge.example",
  "version": "1.0",
  "model_developer_did": "did:web:model.example",
  "provider_did": "did:web:knowledge.example",
  "tdl_id": "urn:oap:tdl:knowledge.example:2026-v1",
  "tdl_hash": "sha256:abc123...",
  "dataset_version": "training-corpus-v3.2",
  "dataset_snapshot_date": "2026-04-01T00:00:00Z",
  "included_node_ids_hash": "sha256:def456...",
  "token_count": 4200000000,
  "preprocessing": {
    "deduplication": "MinHash-LSH",
    "filtering": ["SafeNSFW-v2", "LanguageID-v3"],
    "tokenizer": "BPE-GPT4o-v2",
    "pii_removal": true,
    "pii_removal_method": "Microsoft Presidio v2.2"
  },
  "training_activities": ["pretraining"],
  "fee_paid": {
    "amount": "4200.00",
    "currency": "EUR",
    "settlement_confirmation_id": "urn:oap:settlement:fee-knowledge-example-2026-04-02"
  },
  "signatures": [
    {
      "by": "did:web:model.example",
      "alg": "EdDSA",
      "value": "..."
    },
    {
      "by": "did:web:knowledge.example",
      "alg": "EdDSA",
      "value": "OPTIONAL_PROVIDER_ACKNOWLEDGMENT"
    }
  ]
}
```

The `included_node_ids_hash` is the SHA-256 hash of a sorted, newline-delimited list of Knowledge Node URIs. This allows auditors to verify which specific nodes were included without requiring the model developer to publish the full list, while still allowing individual providers to request confirmation of whether their specific node was included.

The `preprocessing` block satisfies the EU AI Office GPAI training data summary template field "Data processing methods." The `pii_removal` and `pii_removal_method` fields satisfy the EU AI Act Annex IX Section 2(f) requirement to describe technical measures taken to protect personal data.

### 3.4 Model Provenance Document

The Model Provenance Document is the aggregate record that satisfies EU AI Act Article 53(1)(d). It is published by the model developer at `https://{developer_domain}/.well-known/oap/model-provenance/{model_id}/{version}.json`.

```json
{
  "mpd_id": "urn:oap:mpd:model.example:gpt-oap-70b:v1.2",
  "version": "1.2",
  "model_developer_did": "did:web:model.example",
  "model_id": "gpt-oap-70b",
  "model_version": "1.2",
  "architecture": "Transformer, decoder-only",
  "parameter_count": 70000000000,
  "training_completed": "2026-04-15T00:00:00Z",
  "training_activities": ["pretraining", "supervised_finetuning", "rlhf"],
  "training_inclusion_records": [
    {
      "tir_id": "urn:oap:tir:model.example:dataset-v3:knowledge.example",
      "tir_uri": "https://model.example/oap/tir/knowledge-example-v3",
      "tir_hash": "sha256:abc123..."
    }
  ],
  "total_training_tokens": 15000000000000,
  "total_providers": 847,
  "providers_with_commercial_tdm_permission": 712,
  "providers_research_only": 135,
  "eu_ai_act_compliance": {
    "article_53_1_d_satisfied": true,
    "gpai_transparency_template_version": "EU_AI_Office_2025_v1",
    "dsm_directive_opt_outs_respected": true,
    "gdpr_data_subject_rights_preserved": true,
    "eu_copyright_policy_endpoint": "https://model.example/copyright-policy"
  },
  "c2pa_manifest_uri": "https://model.example/c2pa/gpt-oap-70b-v1.2.c2pa",
  "registry_anchor": {
    "registry_did": "did:web:registry.openagentprotocol.eu",
    "anchor_timestamp": "2026-04-16T00:00:00Z",
    "anchor_hash": "sha256:ghi789..."
  },
  "signatures": [
    {
      "by": "did:web:model.example",
      "alg": "EdDSA",
      "value": "..."
    }
  ]
}
```

The `c2pa_manifest_uri` links to a C2PA v2.2 Content Credential for the model, enabling cross-protocol verification by tools that implement C2PA without implementing OAP. This bidirectional compatibility satisfies the EU AI Act recital 102 encouragement to use harmonized standards for AI transparency.

### 3.5 Training Exclusion Request

A Knowledge Node provider that wishes to withdraw permission for future training, or to request approximate unlearning from an existing model, submits a Training Exclusion Request to the model developer's `unlearning_request_endpoint`.

```json
{
  "ter_id": "urn:oap:ter:knowledge.example:2026-05-06-001",
  "provider_did": "did:web:knowledge.example",
  "target_model_developer_did": "did:web:model.example",
  "target_model_id": "gpt-oap-70b",
  "scope": {
    "applies_to": "all_nodes_from_provider",
    "specific_node_ids": null
  },
  "request_type": "future_training_exclusion",
  "unlearning_requested": false,
  "legal_basis": "EU_DSM_Directive_Art4_OptOut",
  "jurisdiction": "EU",
  "effective_from": "2026-06-01T00:00:00Z",
  "signature": {
    "alg": "EdDSA",
    "by": "did:web:knowledge.example",
    "value": "..."
  }
}
```

A model developer that receives a TER MUST:
- Acknowledge the TER within 30 days with a signed Training Exclusion Acknowledgment.
- Exclude the referenced Knowledge Nodes from all training runs that begin after `effective_from`.
- Update the TDL reference in all affected TIRs for subsequent model versions to record the exclusion.
- If `unlearning_requested` is true and `supports_approximate_unlearning` is true in the provider's TDL, provide a reasonable effort implementation of approximate machine unlearning and record the result in a signed Unlearning Report.

A model developer that fails to respond to a TER within 30 days MAY be reported to the OAP Registry under RFC 0026 as non-compliant with this RFC. The Registry will record the non-compliance in the model developer's public Registry entry.

### 3.6 Fee Settlement for Training Use

Where a TDL specifies `allowed_with_fee` or `allowed_with_attribution_and_fee`, the model developer MUST settle the training fee through the OAP Payment Instrument Adapter Protocol of RFC 0032 before the training run begins. The Training Inclusion Record MUST reference the `settlement_confirmation_id` of the completed payment. A model developer that claims training inclusion without a corresponding settlement confirmation for a fee-bearing TDL is non-compliant with this RFC and with RFC 0013.

Fee settlement for training is distinct from inference-time settlement in scale. Training fees are typically one-time per dataset version and are settled as a single large payment. The `pretraining_fee_per_token` multiplied by the `token_count` gives the total fee. The fee is settled through the RFC 0032 protocol using the `per_token_knowledge` commerce primitive with `settlement_trigger: on_invocation` (one invocation per training run).

### 3.7 Relation to Manifest and Inference-Time Licensing

An agent that deploys a model MUST include the model's `mpd_id` in its OAP Manifest under `model_provenance`. This allows any consumer of the agent to verify the model's training data chain of custody through the MPD, and allows Knowledge Node providers to determine whether their content contributed to the model's capabilities and whether the appropriate fees were paid.

The inference-time Citation Attribution Receipts of RFC 0013 section 3.5 and the training-time Training Inclusion Records of this RFC are complementary. Together they constitute the full lifecycle record: who contributed data, how it was used in training, and how it contributed to a specific output.

### 3.8 Conformance

A model developer claiming conformance to this RFC MUST:
- Publish a Model Provenance Document for each model version it deploys in an OAP Manifest.
- Create and publish Training Inclusion Records for all Knowledge Node providers whose content is included in any training corpus.
- Respect TDL permissions, paying training fees and obtaining attribution as required.
- Process Training Exclusion Requests within 30 days.
- Anchor the MPD in the OAP Registry under RFC 0026.

A Knowledge Node provider claiming conformance to this RFC MUST:
- Publish a Training Data License at the well-known URI.
- Sign and version the TDL.
- Process Training Inclusion Record acknowledgment requests from model developers within 14 days.
- Publish a machine-readable TDM opt-out signal in `robots.txt` or HTTP headers that is consistent with the TDL permissions.

## 4. Security Considerations

**TDL Forgery.** A model developer might publish a TIR that references a forged TDL, claiming permission that the provider never granted. Mitigation: TDLs are anchored by provider DID signature. A verifier checks that the TDL signature is valid against the provider's current DID Document key. If the provider's DID is updated after the TDL was signed (key rotation), the TDL remains valid if the signing key is in the provider's DID Document history under the did:web resolution rules.

**Retroactive Permission Changes.** A provider might retroactively change a TDL to prohibit activities it previously allowed, then claim that existing TIRs are non-compliant. Mitigation: TIRs record the `tdl_hash` at the time of incorporation. A model developer can demonstrate compliance by showing that the TDL version in force at the time of the training run permitted the use. TDLs are versioned and immutable once signed; a new version must be issued for any change.

**Token Count Inflation.** A model developer might underreport token counts to reduce training fees. Mitigation: the `included_node_ids_hash` allows the provider to request confirmation of inclusion for specific nodes. The provider can cross-check the reported token count against the node's known size. Significant discrepancies can be submitted as a Dispute Record under RFC 0032 section 3.9.

## 5. Privacy Considerations

Training corpora may contain personal data despite PII removal. The `preprocessing.pii_removal` field and associated method create a rebuttable presumption that GDPR-compliant PII removal was performed. This does not eliminate the obligation under GDPR Article 17 to honor data subject erasure requests. Where a data subject's personal data is demonstrably included in a training corpus, the `unlearning` fields in the TDL establish the technical pathway for approximate compliance. Model developers SHOULD implement and document their approximate unlearning procedures under RFC 0028 Model Risk Management, because unlearning is a model-level intervention that requires the same testing and validation rigor as any other model change.

## 6. References

- RFC 0013, Commerce Models for the Agent Economy.
- RFC 0014, Commerce Primitives, A Generalized Commercial Layer.
- RFC 0028, Agent Model Risk Management and Symbiotic Autonomy.
- RFC 0032, Payment Instrument Adapter Protocol.
- Bommasani, R., et al. (2021). On the Opportunities and Risks of Foundation Models. Stanford Center for Research on Foundation Models. arXiv:2108.07258.
- Henderson, P., et al. (2023). Foundation Models and Fair Use. arXiv:2303.15715.
- Elkin-Koren, N., and Hacohen, O. (2024). Training Data as a Copyrightable Work. Hebrew University of Jerusalem Faculty of Law Research Paper.
- European Union (2024). EU AI Act: Regulation (EU) 2024/1689 on Artificial Intelligence, Articles 53 and 86, Annex IX.
- European Union (2019). EU DSM Directive: Directive (EU) 2019/790 on Copyright in the Digital Single Market, Article 4.
- EU AI Office (2025). GPAI Training Data Transparency Summary Template, Version 1.
- Coalition for Content Provenance and Authenticity (C2PA) (2025). C2PA Technical Specification v2.2.
- Cao, Y., et al. (2023). Unlearning Bias in Language Models. Proceedings of ICML 2023. Survey of machine unlearning techniques applicable to the `unlearning_requested` field.
- Ginart, A., et al. (2019). Making AI Forget You: Machine Unlearning. Advances in Neural Information Processing Systems 32.
- SPDX Working Group (2024). SPDX Specification v2.3. Linux Foundation. The model for machine-readable licensing that the TDLI format follows.
