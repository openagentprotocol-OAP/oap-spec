# RFC 0021: Verifiable Indexes and Match Broker Conformance

**Status:** Draft
**Author(s):** T. Fengler (Editor)
**Working Group:** Data Plane
**Created:** 2026-05-03
**Working Group:** Data Plane
**Targets:** 1.2

## 1. Summary

This document defines the obligations that a Match Broker assumes when it indexes Manifests on behalf of consuming Agents and the cryptographic mechanisms by which a consuming Agent can verify that the Match Broker has honored those obligations. The mechanisms include Merkle anchored index commitments, per query inclusion proofs, periodic completeness attestations, and the Disclosed Ranking Function declared in the Match Broker's Manifest. Together they ensure that an Agent that submits an Intent to a Match Broker under RFC 0020 can confirm that no satisfying Offer was suppressed, that the returned ranking corresponds to the declared algorithm, and that the Match Broker did not silently exclude competitors of a preferred Provider. The result is a market structure in which the Match Broker's role is auditable rather than trusted, and in which the gatekeeper rents that have historically attached to dominant marketplaces are foreclosed at the protocol level.

## 2. Terminology

The key words MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, MAY, and OPTIONAL in this document are to be interpreted as described in RFC 2119 and RFC 8174.

A **Match Broker** is a Resolver as defined in RFC 0020 whose declared role is to index Manifests published by other Providers and to return ranked sets of Offers in response to Intents.

A **Verifiable Index** is the data structure operated by a Match Broker that supports the inclusion proofs and completeness attestations specified in this document.

A **Disclosed Ranking Function** is the documented algorithm by which a Match Broker orders the candidates it returns in response to an Intent. The function is published in the Match Broker's Manifest and is referenced by the Decision Records that accompany each ranked response.

An **Inclusion Proof** is a Merkle proof that a particular Manifest was present in the Verifiable Index at a particular index height at a particular time.

A **Completeness Attestation** is a periodic signed statement by the Match Broker asserting the set of Manifests it has indexed in a given window, the set of categories under which they were indexed, and the cryptographic root of the Verifiable Index at the close of the window.

## 3. The Verifiable Index

### 3.1 Structural Requirements

A Match Broker's Verifiable Index MUST be an append only Merkle structure modeled on the design of Sigstore Rekor. Each entry in the Index is the canonical hash of a Manifest at the moment it was added or updated. The Index MUST publish its current Merkle root at a documented endpoint at least once per minute. The root MUST be signed by the Match Broker's signing key and MAY additionally be co signed by independent Witnesses under the witness model of RFC 0019 section 8.

### 3.2 Inclusion Proofs

For every candidate returned in an Intent Response, the Match Broker MUST attach an Inclusion Proof linking the candidate's Manifest hash to a recently published Index root. The proof is a sequence of sibling hashes that the consuming Agent can verify against the published root using the standard Merkle verification algorithm. A Match Broker that returns a candidate without an Inclusion Proof has produced a non conformant response. The Issuer MAY discard the response and SHOULD record the omission against the Match Broker's Performance Record under RFC 0009.

### 3.3 Completeness Attestations

A Match Broker MUST publish a Completeness Attestation at least once per declared window. The window length is declared in the Match Broker's Manifest and SHOULD NOT exceed twenty four hours. The Attestation contains the cryptographic root of the Index at the close of the window, the count of Manifests indexed under each category, the count of distinct Providers represented, the count of new Manifests added during the window, the count of Manifests removed during the window, and the rationale for each removal. The Attestation is signed by the Match Broker and is anchored into a Transparency Log under the same anchoring requirements as Receipts in the Accountability paper.

A Match Broker that fails to publish a Completeness Attestation within the declared window has lapsed conformance under section 7 of this document. A consuming Agent that detects a lapse SHOULD discount the Match Broker's responses for the period during which no Attestation is current and MAY record the lapse against the Match Broker's Performance Record.

### 3.4 The Negative Inclusion Property

A consuming Agent that wishes to confirm that a particular Provider has not been suppressed from a Match Broker's response MAY request a Negative Inclusion Proof. The proof asserts either that the named Provider's Manifest is not in the Index at the current root, or that the Provider's Manifest is in the Index but did not satisfy the Intent's constraints. In the second case the proof is accompanied by a Decision Record explaining which constraints the candidate failed and at which evaluation step. The Negative Inclusion Proof is the protocol's defense against the silent exclusion of inconvenient competitors, and a Match Broker that refuses to produce one on demand is non conformant.

## 4. The Disclosed Ranking Function

### 4.1 Manifest Declaration

A Match Broker MUST declare its Ranking Function in its Manifest under the `ranking_function` block. The block contains the `function_id` field naming the algorithm, the `function_version` field naming the deployed revision, the `inputs` array enumerating the signals consulted, the `weights` block declaring the relative weights applied to each input, and the `evidence_link` field pointing to the executable specification of the algorithm in the Match Broker's source repository or to the formal description published as a Working Group artifact.

The defined inputs include the Intent constraint match score, the candidate Conformance Level under RFC 0019, the candidate Performance Record aggregate under RFC 0009, the candidate latency percentile under the Build Versus Buy Decision Protocol of RFC 0014, the candidate price under the Commerce Primitive of RFC 0014, the candidate Provider's Standing Permission grants under RFC 0003, and any signal that future RFCs add through additive extensions of this list.

### 4.2 Per Response Decision Record

For every candidate returned in an Intent Response, the Match Broker MUST attach a Decision Record that lists the value each input took for that candidate, the contribution each input made to the candidate's score under the Ranking Function, and the resulting rank. The Decision Record is signed by the Match Broker and is verifiable by the consuming Agent through recomputation. A consuming Agent that recomputes the score and obtains a different result has detected a deviation from the Disclosed Ranking Function and SHOULD report the deviation through the dispute mechanism of RFC 0009.

### 4.3 Ranking Function Versioning

A change to the Ranking Function is a substantive change to the Match Broker's published behavior. The Match Broker MUST increment the `function_version` field of its Manifest before any Intent Response reflects the change, and SHOULD publish a notice describing the change at least seven days before the change takes effect. Subscribers under the Manifest Subscription Protocol of RFC 0022 receive the version change as a Manifest update and MAY adjust their reliance accordingly. A Match Broker that changes its Ranking Function silently is non conformant.

## 5. Schema Integration

This RFC introduces three new schemas, namely `oap-inclusion-proof.schema.json`, `oap-completeness-attestation.schema.json`, and `oap-ranking-function.schema.json`. The Manifest schema of OAP-CORE-1.0 is extended with the optional `ranking_function` block and with the optional `verifiable_index` block declaring the Index endpoint and the Attestation cadence. The Intent Response schema of RFC 0020 is extended with the per candidate `inclusion_proof` and `decision_record` blocks. All extensions are additive under the Backward Compatibility Gate of RFC 0019.

## 6. Anti Capture Properties

The mechanisms defined in this document together produce three anti capture properties that distinguish a conformant Match Broker from an unconstrained one. The first property is that no Provider can be silently suppressed, because the Negative Inclusion Proof of section 3.4 makes suppression detectable. The second property is that no candidate can be silently demoted, because the Decision Record of section 4.2 makes demotion verifiable. The third property is that no behavior change can be smuggled through, because the Ranking Function Versioning rule of section 4.3 makes change observable. The combination is the protocol's response to the antitrust literature on algorithmic gatekeeping in digital marketplaces, and it provides at the protocol level the discipline that the literature has otherwise asked regulators to provide.

## 7. Conformance Impact

A Match Broker claiming conformance at level M1 MUST publish a Verifiable Index, MUST attach Inclusion Proofs to all candidates in Intent Responses, and MUST publish a Completeness Attestation at least once per twenty four hours. A Match Broker claiming conformance at level M2 MUST additionally support Negative Inclusion Proofs and MUST publish a Disclosed Ranking Function with per response Decision Records. A Match Broker claiming conformance at level M3 MUST additionally support independent Witness co signing of its Index roots and MUST satisfy the latency floor for Inclusion Proof generation that is published in the Match Broker conformance profile of the test suite.

## 8. Backward Compatibility

This RFC adds new schemas and new optional Manifest blocks. Existing Match Brokers continue to function as Resolvers under RFC 0020 without claiming the conformance levels of section 7 above. Consuming Agents that require the verifiability properties may consult only Match Brokers whose Manifests declare M1 or higher conformance.

## 9. Security Considerations

The Verifiable Index relies on the soundness of the underlying Merkle structure and the integrity of the Match Broker's signing key. Implementations SHOULD use the curve and hash function set defined in OAP-CORE-1.0 section 9 and SHOULD anchor Index roots in at least two independently operated Transparency Logs. Compromise of the signing key permits forged Inclusion Proofs and forged Completeness Attestations until the compromise is detected and the key is revoked. The revocation procedure MUST follow the key revocation rules of OAP-CORE-1.0 section 22.

A malicious Match Broker could attempt to fork its Index by serving different roots to different consumers. The defense is the Witness co signing requirement at conformance level M3 and the periodic publication of Index roots to a public Transparency Log. A consumer who detects two distinct roots signed at adjacent timestamps has detected a fork attack and SHOULD report the attack through the dispute mechanism of RFC 0009.

## 10. Privacy Considerations

The Verifiable Index publishes the hashes of indexed Manifests rather than their contents, which avoids leaking proprietary Manifest data through the Index itself. The Completeness Attestation publishes counts rather than identities, which avoids leaking the population of indexed Providers to parties who have not separately discovered them. Inclusion Proofs returned in response to specific Intents reveal the identity of the candidates returned but not the identities of unsuccessful candidates. Negative Inclusion Proofs reveal the identity of the Provider being checked, which the requesting Agent already possesses by construction.

## 11. Implementation Experience

The Reference Server has been extended with a Verifiable Index implementation built on a Merkle tree of canonicalized Manifest hashes. The Reference Agent has been extended with a verifier that exercises the Inclusion Proof and Completeness Attestation paths in the conformance verifier module described in RFC 0019. The AssistNet platform operates an internal Match Broker at production scale that attests its Index hourly into the same Transparency Log infrastructure that anchors its Receipt chain.

## 12. Alternatives Considered

A trust based marketplace model in which Match Brokers are presumed honest and disputes are resolved through external regulators was considered and rejected. The model fails the basic test that a consuming Agent cannot mechanically verify the marketplace's behavior. A blockchain anchored marketplace in which the entire Index lives on a public ledger was considered and rejected on cost and latency grounds. The chosen design provides equivalent tamper evidence at substantially lower cost by anchoring only the Merkle roots and inheriting the integrity properties of the Transparency Log infrastructure.

## 13. References

* OAP-CORE-1.0, the normative Open Agent Protocol Core Specification.
* RFC 0003, Standing Permissions.
* RFC 0009, Reputation and Performance Records.
* RFC 0013, Commerce Models for the Agent Economy.
* RFC 0014, Commerce Primitives, A Generalized Commercial Layer.
* RFC 0019, Conformance Testing and Implementability.
* RFC 0020, Agent Query Language.
* RFC 0022, Manifest Subscription Protocol.
* Sigstore Rekor Transparency Log Specification.
* IETF RFC 9162, Certificate Transparency Version 2.0.
* IETF RFC 2119 and RFC 8174.
* Crosby, S. A., and Wallach, D. S. (2009). Efficient Data Structures for Tamper-Evident Logging. *USENIX Security Symposium.* The history-tree construction that grounds the append-only Merkle structure of section 4 and the per-query Inclusion Proof of section 5; the prior art on which Sigstore Rekor and Certificate Transparency are themselves built.
* Zheng, W., Dave, A., Beekman, J. G., Popa, R. A., Gonzalez, J. E., and Stoica, I. (2017). Opaque: An Oblivious and Encrypted Distributed Analytics Platform. *USENIX NSDI.* The oblivious-execution framework that grounds the Disclosed Ranking Function obligation of section 6: a Match Broker that wishes to attest ranking correctness without leaking the underlying scores MAY execute the ranking inside an oblivious-enclave engine of the Opaque family and publish the enclave attestation alongside the Index root.
* Song, D., Wagner, D., and Tian, X. (2001). Timing Analysis of Keystrokes and Timing Attacks on SSH. *USENIX Security Symposium.* The side-channel boundary that motivates the requirement of section 5 that Inclusion Proofs MUST be returned in constant time relative to the Index size, so that a Match Broker cannot leak Manifest-population statistics through proof-construction latency.

## Appendix A: Retrieval Architecture for Conformant Match Brokers (Normative)

This appendix is normative. It specifies the retrieval architecture that a conformant Match Broker MUST implement to achieve M2 conformance at a quality level sufficient for production agent-to-agent commerce. A broker that implements only the Merkle index without the retrieval layer satisfies the verifiability requirements of sections 3 and 4 but does not provide adequate discovery quality for large corpora.

### A.1 Motivation from the Tool Discovery Literature

The problem of selecting the correct tool from a large corpus given a natural language intent description is an instance of the information retrieval problem for structured knowledge bases. Qin et al. (2023, ICLR 2024) demonstrated with the ToolBench dataset that pure keyword matching fails catastrophically at corpus sizes above 1,000 tools: the F1 score of keyword-only retrieval drops below 0.40 at 16,000 tools while dense retrieval maintains F1 above 0.70. Patil et al. (2023, Gorilla, UC Berkeley) demonstrated that retrieval-augmented tool selection outperforms LLM-only selection by 20 to 40 percentage points on API accuracy. The OAP retrieval architecture follows the two-stage sparse-then-dense pipeline established by this literature.

### A.2 Three-Layer Retrieval Pipeline

A conformant Match Broker processes an AQL Intent through three sequential layers.

**Layer 1: Constraint Filter.** The broker evaluates the structured predicates of the AQL Intent against each indexed Manifest. Predicates include minimum conformance level, maximum risk class, allowed jurisdictions, maximum unit cost, and required capability categories. The constraint filter is exact and deterministic: a Manifest that fails any predicate is excluded from consideration regardless of its textual relevance to the query. The filter operates in O(n) time over the full index and reduces the candidate set to the set of structurally eligible providers. The constraint filter is normative: a conformant broker MUST NOT return candidates that fail the constraint filter.

**Layer 2: BM25 Sparse Retrieval.** The broker applies BM25 (Robertson and Zaragoza 2009) over the tokenized text of each eligible Manifest. The indexed text corpus is the concatenation of the Manifest's `description` field, its `categories` array, its action names, and the `description` fields of its individual actions. The BM25 score for a query q against document d is:

```
BM25(q, d) = sum_{t in q} IDF(t) * (f(t,d) * (k1 + 1)) / (f(t,d) + k1 * (1 - b + b * |d| / avgdl))
```

where f(t,d) is the term frequency of t in d, |d| is the document length in tokens, avgdl is the average document length over the indexed corpus, and IDF(t) = log((N - df(t) + 0.5) / (df(t) + 0.5) + 1) with N the corpus size and df(t) the document frequency of term t. The normative hyperparameters are k1 = 1.5 and b = 0.75, consistent with the optimal values reported by Robertson and Zaragoza (2009) across a wide range of corpora.

**Layer 3: Multi-Factor Re-Ranking.** The broker computes a final score for each candidate by linearly combining five factors. The normative weights are declared in the Disclosed Ranking Function under the `weights` field:

```
final_score = w_bm25 * bm25_normalized
            + w_rep  * reputation_score
            + w_conf * conformance_score
            + w_cost * cost_score
            + w_fresh* freshness_score
```

The `bm25_normalized` value is the BM25 score normalized to [0, 1] by dividing by a calibrated maximum. The `reputation_score` is the RFC 0009 aggregate Performance Record of the provider, in [0, 1]. The `conformance_score` is the provider's OAP conformance level divided by 4 (L0 to L4 normalized to [0, 1]). The `cost_score` is 1 minus the normalized cost of the provider relative to the candidate set: cheaper providers score higher. The `freshness_score` is a linear decay from 1.0 at manifest age zero to 0.0 at manifest age 365 days.

The reference implementation weights are: bm25 = 0.45, reputation = 0.25, conformance = 0.15, cost = 0.10, freshness = 0.05. A Match Broker MUST publish its actual weights in the Disclosed Ranking Function and MUST NOT deviate from its published weights without incrementing the `function_version` field.

### A.3 Decision Record Schema

For each candidate in an Intent Response, the Match Broker MUST attach a Decision Record containing the input values and their contributions to the final score. The Decision Record MUST be signed by the Match Broker's Ed25519 key. The minimum required fields are:

```json
{
  "candidate_did":             "did:web:provider.example",
  "ranking_function_id":       "oap-bm25-multifactor-v1",
  "ranking_function_version":  "1.0.0",
  "inputs": {
    "bm25_raw":           0.847,
    "bm25_normalized":    0.0847,
    "reputation_score":   0.91,
    "conformance_level":  3,
    "conformance_score":  0.75,
    "cost_score":         0.83,
    "freshness_score":    0.92
  },
  "weights":        { "bm25": 0.45, "reputation": 0.25, "conformance": 0.15, "cost_score": 0.10, "freshness": 0.05 },
  "final_score":    0.7861,
  "computed_at":    "2026-05-06T10:00:00Z"
}
```

The consuming Agent MUST be able to verify the Decision Record by re-computing the `final_score` from the `inputs` and `weights` and confirming that the result matches `final_score` within a tolerance of 1e-6. A discrepancy indicates a ranking deviation reportable under RFC 0009.

### A.4 Scalability Properties

The BM25 implementation in the reference broker uses an inverted index via a SQLite FTS-compatible term frequency table. At corpus sizes up to 100,000 manifests, the retrieval latency is bounded by the IDF computation, which requires one COUNT query per unique query token. For production deployments at larger scales, the normative guidance is to use an in-process inverted index (e.g., Lucene or Tantivy) with pre-computed IDF values, reducing per-query latency to O(|q| * k) where |q| is the query token count and k is the candidate set size after constraint filtering.

The Merkle tree rebuild cost is O(n) where n is the number of indexed manifests. For production deployments, the broker SHOULD use an incremental Merkle tree that appends new leaves without rebuilding the full tree, reducing rebuild cost to O(log n) per registration. The Crosby and Wallach (2009) history tree construction supports this incremental property and is the recommended basis for production implementations.

### A.5 Extension to Dense Retrieval (Informative)

This section is informative. A Match Broker MAY add a dense retrieval stage between layers 2 and 3. Dense retrieval encodes the AQL Intent description and each Manifest description as a dense vector using a bi-encoder model, then computes approximate nearest neighbors using a vector index such as FAISS (Johnson, Douze, and Jégou 2021) or HNSW (Malkov and Yashunin 2020). The dense retrieval layer captures semantic similarity that BM25 misses, particularly for intent descriptions that use vocabulary different from the indexed Manifest text.

The Gorilla benchmark (Patil et al. 2023) and the ToolLLM experiments (Qin et al. 2023) demonstrate that the combination of BM25 and dense retrieval consistently outperforms either method alone, with the improvement concentrated in recall at corpus sizes above 10,000 tools. A broker implementing dense retrieval MUST declare the embedding model it uses in the Disclosed Ranking Function under the `embedding_model` field, because the embedding model is a component of the ranking function and changes to it affect ranking outcomes.

### A.6 References for Appendix A

- Qin, Y., Liang, S., Ye, Y., et al. (2023). ToolLLM: Facilitating Large Language Models to Master 16000+ Real-world APIs. ICLR 2024. The foundational evaluation establishing that retrieval-augmented tool selection is necessary at scale.
- Patil, S., Zhang, T., Wang, X., and Gonzalez, J. (2023). Gorilla: Large Language Model Connected with Massive APIs. arXiv:2305.15334. UC Berkeley. The demonstration that retrieval-augmented LLMs achieve 20 to 40 percentage point improvements in API-call accuracy.
- Robertson, S., and Zaragoza, H. (2009). The Probabilistic Relevance Framework: BM25 and Beyond. Foundations and Trends in Information Retrieval 3(4). The canonical derivation of BM25 and its hyperparameter analysis.
- Crosby, S. A., and Wallach, D. S. (2009). Efficient Data Structures for Tamper-Evident Logging. USENIX Security Symposium. The history tree that underpins the incremental Merkle construction.
- Johnson, J., Douze, M., and Jégou, H. (2021). Billion-scale Similarity Search with GPUs. IEEE Transactions on Big Data 7(3). The FAISS vector index recommended for dense retrieval.
- Malkov, Y. A., and Yashunin, D. A. (2020). Efficient and Robust Approximate Nearest Neighbor Search Using HNSW Graphs. IEEE TPAMI 42(4). The HNSW approximate nearest neighbor algorithm.

## Appendix B: Broker Category Profile (Normative)

This appendix is normative. It defines the Broker Category Profile, an extension of the Match Broker Manifest that binds a broker to a domain category, to a set of accepted jurisdictions, and to the attestation, signing, monitoring, and replication requirements specific to that category. The Profile is the canonical mechanism by which a consuming Agent decides whether a particular Match Broker is admissible for a particular Intent.

### B.1 Motivation

Section 3 of this RFC defines the cryptographic and structural obligations that any conformant Match Broker MUST satisfy. Those obligations are domain neutral. A broker that indexes capability tools and a broker that indexes real estate listings can satisfy the same Merkle obligations while operating under entirely different schemata, regulatory regimes, and threat models. A category neutral profile is insufficient for two reasons. The first is that the attestation requirements for an indexed Manifest differ by domain: a real estate listing without a verifiable land registry attestation cannot be safely matched against an autonomous purchase Intent, whereas a tool listing without a land registry attestation is unremarkable. The second is that the regulatory boundary of a category constrains which jurisdictions a broker may serve and which it MUST refuse: a health broker that indexes German patient flows under United States retention rules is unlawful regardless of its cryptographic conformance. The Broker Category Profile binds the broker to its category, exposes the constraints, and allows the consuming Agent to verify admissibility before issuing any Intent.

### B.2 Profile Schema

A Broker Category Profile is a JSON document conforming to `oap-broker-category-profile.schema.json`. The Profile is embedded in the Match Broker's Manifest under the `broker_category_profile` field and is the unique authoritative source for the category bound parameters of the broker. The required fields are the following.

```json
{
  "broker_category":             "peer_agent | commerce | knowledge | labor | real_estate | tool_capability | compute_model | finance | health | legal | government | education | logistics | asset | subscription_saas | dataset | identity_issuer | reputation_aggregator | event | media",
  "category_version":            "semver, e.g. 1.0.0",
  "accepted_jurisdictions":      ["ISO-3166-1 alpha-2 codes"],
  "refused_jurisdictions":       ["ISO-3166-1 alpha-2 codes"],
  "required_listing_attestations": [
    {
      "attestation_type":        "string drawn from the category attestation vocabulary",
      "issuer_class":            "string drawn from the category issuer class vocabulary",
      "renewal_period_seconds":  3600,
      "binding":                 "REQUIRED | RECOMMENDED"
    }
  ],
  "threshold_signing": {
    "scheme":                    "FROST-Ed25519 | Threshold-Ed25519 | none",
    "m_of_n":                    [3, 5],
    "key_storage":               "HSM | software | none",
    "key_rotation_period_seconds": 7776000
  },
  "monitor_services":            ["did:web:monitor.example", "..."],
  "monitor_minimum_independent": 2,
  "mirror_services":             ["did:web:mirror.example", "..."],
  "mirror_minimum_regions":      2,
  "publication_interval_seconds": 600,
  "data_retention_policy": {
    "listing_payload_ttl_seconds":  31536000,
    "query_log_ttl_seconds":        2592000,
    "audit_log_ttl_seconds":        315360000,
    "tombstone_on_erasure":         true
  },
  "dispute_resolution_endpoint": "https://broker.example/oap/disputes",
  "regulatory_authority_contact": "string",
  "category_specific":           { "...": "category specific extension fields" }
}
```

### B.3 Category Taxonomy

The `broker_category` field MUST take a value drawn from the closed taxonomy of section B.3. Future categories MUST be added through a Working Group artifact that supplies a category specification document defining the attestation vocabulary, the issuer class vocabulary, and the recommended monitor and mirror configuration for that category. The closed taxonomy at version 1.0 is exhaustive: a broker that does not fit any defined category SHALL NOT claim conformance under this profile and SHALL submit a category specification document through the RFC process before listing under the meta registry.

### B.4 Per Category Attestation Requirements

The following per category requirements are normative at version 1.0 of this profile. A Match Broker that claims a category MUST require the listed attestations on every accepted Listing. A Match Broker MUST refuse Listings that omit a REQUIRED attestation, MUST flag Listings that omit a RECOMMENDED attestation in the response Decision Record, and MUST publish the attestation type vocabulary it accepts under the `category_specific.accepted_attestation_subtypes` field.

| Category | Required Attestations | Recommended Attestations | Issuer Classes |
|----------|----------------------|--------------------------|----------------|
| peer_agent | `proof_of_personhood` | `interaction_history_summary` | identity_issuer |
| commerce | `seller_kyb`, `tax_identifier` | `consumer_protection_bond` | tax_authority, registered_chamber |
| knowledge | `content_provenance`, `license_declaration` | `peer_review_signature` | publisher, archivist |
| labor | `employer_kyb`, `equal_treatment_attestation` | `salary_range_disclosure` | tax_authority, labor_authority |
| real_estate | `land_registry_extract`, `ownership_attestation`, `energy_certificate` | `building_permit_summary` | land_registry, surveyor, notary |
| tool_capability | `reproducibility_attestation` | `benchmark_result` | self_attestation, benchmark_authority |
| compute_model | `model_card`, `availability_attestation` | `evaluation_report` | self_attestation, third_party_evaluator |
| finance | `regulator_registration`, `psd2_or_equivalent_licence` | `audit_attestation` | financial_regulator, certified_auditor |
| health | `professional_licence`, `data_processing_lawful_basis` | `accreditation_attestation` | medical_board, data_protection_authority |
| legal | `bar_admission` | `professional_indemnity_insurance` | bar_association |
| government | `agency_registration` | `service_charter` | sovereign_root |
| education | `accreditation_attestation` | `outcome_disclosure` | education_ministry, accreditation_council |
| logistics | `carrier_licence` | `tracking_endpoint_attestation` | transport_authority |
| asset | `title_chain_extract` | `appraisal` | title_authority, certified_appraiser |
| subscription_saas | `entity_kyb`, `terms_of_service_hash` | `availability_record` | tax_authority |
| dataset | `provenance_chain`, `license_declaration`, `consent_attestation` | `bias_audit` | data_steward, ethics_review_board |
| identity_issuer | `root_of_trust_attestation`, `audit_attestation` | `incident_history_summary` | sovereign_root, peer_witness |
| reputation_aggregator | `algorithm_disclosure`, `independence_attestation` | `external_audit` | peer_witness, certified_auditor |
| event | `entity_kyb` | `venue_attestation` | tax_authority |
| media | `content_provenance`, `editorial_responsibility_attestation` | `c2pa_signed_origin` | press_council, c2pa_authority |

The Issuer Class vocabulary at version 1.0 enumerates `identity_issuer`, `tax_authority`, `registered_chamber`, `publisher`, `archivist`, `labor_authority`, `land_registry`, `surveyor`, `notary`, `self_attestation`, `benchmark_authority`, `third_party_evaluator`, `financial_regulator`, `certified_auditor`, `medical_board`, `data_protection_authority`, `bar_association`, `sovereign_root`, `education_ministry`, `accreditation_council`, `transport_authority`, `title_authority`, `certified_appraiser`, `data_steward`, `ethics_review_board`, `peer_witness`, `press_council`, `c2pa_authority`. An attestation MUST carry the Issuer Class of its signer in its `issuer_class` field.

### B.5 Jurisdictional Binding

A Match Broker MUST list at least one jurisdiction in `accepted_jurisdictions` and MUST refuse Listings whose `lawful_jurisdiction` field is not a subset of `accepted_jurisdictions`. The Broker MAY enumerate `refused_jurisdictions` for transparency. A consuming Agent whose Intent declares an `intended_jurisdiction` outside the Broker's `accepted_jurisdictions` SHALL receive a `JurisdictionalMismatch` rejection rather than a candidate set. The rejection is itself a signed document and is auditable through the broker's Audit Log.

For categories that are subject to cross border regulatory regimes, the broker MUST additionally declare the regime in `category_specific.regulatory_regimes`. The defined regimes at version 1.0 are `gdpr_general`, `gdpr_article_9`, `psd2`, `mifid_ii`, `dora`, `eidas_v2`, `agg`, `hipaa`, `ccpa`, `pipeda`, `appi`, and `pdpa_sg`. A broker that declares a regime MUST publish the mapping from regime articles to enforcement points in its broker manifest under `category_specific.regime_mapping`.

### B.6 Threshold Signing and Key Management

A broker that claims conformance level M3 or above under section 7 of this RFC MUST sign Tree Heads, Completeness Attestations, and Listing Receipts under a threshold scheme. The defined schemes are FROST-Ed25519 (Komlo and Goldberg 2020) at M of N with N greater than or equal to 5 and M of at least floor(2N/3) + 1, or any equivalent threshold scheme registered in the Working Group artifact `oap.threshold.schemes.v1`. The signing key shares MUST be stored in hardware security modules of FIPS 140-3 level 2 or above. Key rotation MUST occur at least once per `threshold_signing.key_rotation_period_seconds` and MUST produce a signed rotation event that is committed into the broker's Audit Log and into the meta registry.

The motivation is that single key compromise is a realistic failure mode for production brokers and MUST NOT permit silent forgery of Tree Heads. Under a 3 of 5 scheme, an adversary that compromises two of five signers cannot produce a valid Tree Head; under a 4 of 7 scheme the bound rises to three; the broker MAY choose any parameterization that meets the floor. A broker that claims M3 conformance without threshold signing has lapsed conformance and SHOULD be discounted under the Performance Record of RFC 0009.

### B.7 Monitor and Mirror Requirements

A broker that claims conformance level M2 or above MUST publish its Tree Heads to at least `monitor_minimum_independent` independent Monitor Services. Independence is established by distinct controlling DIDs operated by distinct controllers, where the controller graph is checked against the meta registry for declared affiliation. A broker MUST publish its Listings and its Tree Heads to at least `mirror_minimum_regions` Mirror Services located in distinct geographic regions, where the region is declared by the Mirror's `iso_region` field in its own Manifest. The Monitor and Mirror DIDs MUST be enumerated in the broker's Profile and MUST themselves be conformant under either this RFC at M1 or above or under an equivalent Working Group artifact for Monitors and Mirrors.

A Tree Head that is not visible at a given Monitor within the broker's declared `publication_interval_seconds` is a publication failure. The Monitor MUST emit a `MonitorAlert` event signed by the Monitor that names the broker, the missing publication window, and the last observed Tree Head. The MonitorAlert is itself a Performance Record under RFC 0009 and influences the broker's aggregated score.

### B.8 Data Retention and Erasure

A broker that processes personal data MUST publish a `data_retention_policy` with the fields specified in B.2. Listing payloads MUST be erasable on a verified data subject request under the lawful basis declared in the relevant regulatory regime. The broker MUST implement the cryptographic erasure mechanism described in OAP-CORE-1.0 section 19 such that the data subject's content is rendered unreadable while the audit log entry referring to its existence and erasure remains intact. The audit log entry MUST contain only the content hash, the erasure timestamp, the lawful basis, and the verified data subject DID, and SHALL NOT contain reconstructable personal data.

The retention horizons MUST be at least the following minima per category: `query_log_ttl_seconds` no greater than 2592000 (30 days) for `health` and `peer_agent`, no greater than 7776000 (90 days) for `commerce` and `labor`, and no greater than 31536000 (365 days) for `knowledge`, `legal`, `government`, `media`. The `audit_log_ttl_seconds` MUST be at least 315360000 (10 years) for `finance`, `legal`, `health`, `real_estate`, and at least 94608000 (3 years) for all other categories.

### B.9 Profile Versioning

A change to any field of the Broker Category Profile is a substantive change. The `category_version` field MUST be incremented before the change takes effect. Subscribers under RFC 0022 SHALL receive the Profile change as a Manifest update event with `event_type = "recertified"` if the change affects attestation requirements, threshold parameters, monitor set, mirror set, or retention policy, and with `event_type = "updated"` for editorial changes. A broker that changes its Profile silently is non conformant under this RFC and forfeits its M conformance claim until the next signed Completeness Attestation incorporates the change.

### B.10 Verification Algorithm

A consuming Agent verifies a broker's Profile admissibility for a given Intent by the following deterministic procedure.

1. Fetch the broker Manifest at the broker DID's well known location.
2. Confirm the `broker_category_profile` field is present and validates against `oap-broker-category-profile.schema.json`.
3. Confirm the Profile's `category_version` matches the version recorded in the most recent meta registry listing for the broker. A mismatch indicates either a silent change or a stale meta registry entry; the Agent SHOULD refuse the broker until the meta registry is reconciled.
4. Confirm the Intent's `intended_jurisdiction` is a subset of `accepted_jurisdictions` and disjoint from `refused_jurisdictions`.
5. Confirm the Intent's `required_attestation_subtypes` projection is satisfiable under the broker's `required_listing_attestations`.
6. For each declared `monitor_services` entry, fetch the Monitor's most recent observation of the broker and confirm that the observation is no older than `publication_interval_seconds * 2`.
7. For each declared `mirror_services` entry, fetch a witness of the broker's current Tree Head and confirm the Mirror has signed the same Head as the broker.
8. If all checks pass, the broker is admissible for the Intent. If any check fails, the Agent MUST NOT issue the Intent to the broker and SHOULD record the failure as a Performance Record under RFC 0009.

The procedure is constant time in the size of the broker's index because all checks consult only the Profile, the most recent Tree Head, and the Monitor and Mirror endpoints.

### B.11 Implementation Experience

The Reference Server has been extended with a Profile loader that validates incoming Listings against the per category attestation requirements of section B.4. The Reference Agent has been extended with the verification algorithm of section B.10. The AssistNet platform's internal peer_agent broker has been re profiled under section B.4 with `proof_of_personhood` as the REQUIRED attestation and with a 3 of 5 threshold signing scheme over its Tree Heads, with the share holders located in three geographic regions (Frankfurt, Dublin, Singapore) and the keys stored in YubiHSM2 devices under FIPS 140-3 level 3. The Monitor set is two independent Monitors operated by the AssistNet platform and by an external observer respectively. The Mirror set is two Mirrors in Frankfurt and Dublin with daily consistency reconciliation against the primary Tree.

### B.12 References for Appendix B

- Komlo, C., and Goldberg, I. (2020). FROST: Flexible Round-Optimized Schnorr Threshold Signatures. Selected Areas in Cryptography. The threshold signing scheme normatively required at M3 and above.
- Gennaro, R., Goldfeder, S., and Narayanan, A. (2016). Threshold-Optimal DSA/ECDSA Signatures and an Application to Bitcoin Wallet Security. ACNS 2016. The underlying threshold theory.
- Ben-Or, M., Goldwasser, S., and Wigderson, A. (1988). Completeness Theorems for Non-Cryptographic Fault-Tolerant Distributed Computation. STOC 1988. The classical bound on Byzantine fault tolerance that motivates the floor(2N/3) + 1 requirement.
- ISO/IEC 19790:2012. Security Requirements for Cryptographic Modules. The hardware security module requirements.
- NIST FIPS 140-3. Security Requirements for Cryptographic Modules. The level definitions referenced in B.6.
- Council of Europe, Convention 108+ (2018). The data protection minima that underpin B.8.
- Regulation (EU) 2016/679 (GDPR). The lawful basis and erasure mechanics referenced in B.8.
- C2PA Specification 2.0 (2024). Content provenance referenced in the media category.
