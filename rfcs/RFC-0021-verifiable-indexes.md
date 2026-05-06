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
