# RFC 0019: Conformance Testing and Implementability

**Status:** Accepted
**Author(s):** OAP Community Working Group on Implementation and Conformance
**Created:** 2026-05-03
**Revised:** 2026-05-04
**Working Group:** Implementation and Conformance
**Targets:** 1.2

## 1. Summary

This document establishes the executable counterpart to the normative Open Agent Protocol specification. It defines the Conformance Test Suite that lives at `test-suite/`, the Conformance Receipt that any implementation can issue to demonstrate that it has executed the suite, the Conformance Verification procedure by which any consuming Agent can validate such a receipt autonomously, and three governance gates that bind every future Request for Comments to the same standard of executable evidence as the present one. The intent is to make it impossible for the protocol to drift away from what implementers can build, deploy, and verify, and to make it equally impossible for an implementation to claim conformance without producing cryptographically verifiable evidence that any other Agent in the network can independently reproduce.

## 2. Terminology

The key words MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, MAY, and OPTIONAL in this document are to be interpreted as described in RFC 2119 and RFC 8174.

The **Conformance Test Suite** is the executable test corpus published in `test-suite/` of this repository. It is composed of four sub suites named schema, behavior, level, and charter.

A **Conformance Receipt** is a signed JSON document that conforms to `oap-conformance-receipt.schema.json` and asserts that a particular implementation, identified by its decentralized identifier, has executed a particular version of the Conformance Test Suite against a particular target deployment and has demonstrated conformance with a particular set of Conformance Levels.

The **Reference Implementation** is the in tree pair of Reference Server and Reference Agent published under `reference/` and maintained by the Working Group on Implementation and Conformance.

A **Self Verifying Agent** is an Agent that is capable of executing the Conformance Verification procedure described in section 6 against any other Agent or Provider it encounters, with no external coordination beyond fetching public artifacts.

The **Implementability Gate**, the **Backward Compatibility Gate**, and the **Charter Review Gate** are three governance preconditions that any new RFC MUST satisfy before it can advance to Last Call. They are defined in sections 3, 4, and 5 of this document and are enforced both by Continuous Integration and by Working Group review.

## 3. The Implementability Gate

A Request for Comments that proposes a normative change to the Open Agent Protocol MUST be accompanied by a corresponding modification to either the Reference Implementation, the Conformance Test Suite, or both. A normative change is any change that introduces, removes, or alters a MUST, SHOULD, or MAY in any normative artifact, that adds or removes a field of any normative schema, or that alters the lifecycle of any envelope or receipt. The Implementability Gate is enforced automatically by the `implementability-gate` job in `.github/workflows/validate.yml`, which inspects the set of changed files in the pull request and rejects any pull request that modifies `schemas/v1.0/`, `spec/v1.0/`, or `rfcs/RFC-` artifacts without modifying `test-suite/` or `reference/` accordingly.

The intent of the Implementability Gate is that no concept may enter the normative protocol surface unless at least one implementer has demonstrated, in code, that the concept is implementable, and at least one test has demonstrated, in code, that an implementation can be checked against it. Theoretical work that does not yet meet this bar is welcome to live in `papers/`, where it can mature, but it does not occupy any field of any schema and no implementer is bound by it. A Working Group may, by recorded supermajority of two thirds, grant an exception to the Implementability Gate for a particular pull request when the change is editorial, when the change is a typographical correction, or when the change is a non normative clarification. Exceptions MUST be documented in the pull request body with the phrase `Implementability Gate exception` and a one paragraph justification.

## 4. The Backward Compatibility Gate

The schemas published under `schemas/v1.0/` are immutable in their semantics. The `$id` field of each schema is a permanent, citable URL. Any change that alters the meaning of an existing field, that removes an existing field, that tightens an existing constraint, or that changes the value range of an existing enumeration MUST be published as a new schema version under `schemas/v1.1/` with a new `$id`, and the previous version MUST remain available at its original location indefinitely as part of the OAP Registry's append-only history (RFC 0026). Additive changes that introduce new optional fields are permitted within the existing schema version provided that they do not interact in any way with the meaning of existing fields, and provided that the pull request body explicitly declares the change as `additive only`.

The Backward Compatibility Gate is enforced automatically by the `backward-compatibility-gate` job in CI. The job inspects the diff against the base branch and rejects any pull request that modifies a v1.0 schema without an explicit additive only declaration in the pull request body. The intent is that an implementation that was conformant with the protocol on the day it was attested remains forever entitled to claim that level of conformance, and that no future Working Group can retroactively void that entitlement by editing a schema underneath it. This guarantee is essential for the long term economic viability of the agentic ecosystem because the alternative, in which conformance can be revoked through silent schema mutation, would make every Conformance Receipt a perishable promise rather than a durable contract.

## 5. The Charter Review Gate

A Request for Comments that touches any of the user facing rights established by RFC 0016, including but not limited to identity, memory, reputation, projection, persona, cooling off, escalation, deletion, replaceability, or pluralism of model and provider, MUST receive a Peer Review Quorum that is one stricter than the default. The default Quorum (per `governance/RFC-PROCESS.md`) is at least three Maintainer approvals from at least three distinct organizations. For Charter-affecting RFCs the Quorum is at least four Maintainer approvals from at least four distinct organizations, with at least one approval from a Maintainer who has self-identified as a User Advocate in `governance/MAINTAINERS.md`. Each approval comment MUST contain the phrase `Charter Review Gate cleared`.

The Charter Review Gate is enforced procedurally by the Coordinator of the affected Working Group and mechanically by the `charter-review-gate` job in CI, which inspects the linked Issues and the PR review state. The intent is to ensure that every change to the protocol that touches a user right is reviewed by parties whose institutional incentive includes defending that right, and not solely by parties whose institutional incentive is to ship the change. There is no central body that grants User Advocate status; it is a self-assertion logged in `MAINTAINERS.md` and subject to the same recall procedure as any other Maintainer designation.

## 6. Conformance Verification by Consuming Agents

Any consuming Agent SHOULD perform the following procedure before engaging another Agent or Provider for any Action that the consuming Agent's policy classifies as Consequential, and MAY perform it for any other Action.

The consuming Agent first fetches the target Manifest from `/.well-known/oap-tool.json`. The Agent reads the `conformance` block introduced by this RFC. The block contains the claimed Conformance Levels, a URI at which the signed Conformance Receipt is published, the version of the Conformance Test Suite under which the receipt was issued, and the date of the most recent attestation. If the conformance block is absent the Agent treats the target as unattested and applies whatever default policy its principal has configured for unattested counterparties.

The consuming Agent then fetches the Conformance Receipt from the published URI. The Agent validates the receipt against `oap-conformance-receipt.schema.json`. The Agent verifies that the suite version named in the receipt is one the Agent trusts, that the not after timestamp in the validity block has not elapsed, that the signatures array contains at least one signature, and that no signature has the placeholder value reserved for development. The Agent verifies the cryptographic signature against the published key of the implementation DID using whichever resolution method the DID method specifies.

The consuming Agent then OPTIONALLY re executes a randomized subset of behavior tests against the live target to confirm that the target's currently observable behavior matches the behavior that the Conformance Receipt asserts. This live re verification step is what distinguishes the Open Agent Protocol from purely declarative trust frameworks. The reference implementation of this procedure is published as `reference/agent/conformance-verifier.js` and is callable as a library function. Implementations of the Conformance Verifier in other languages SHOULD follow the same algorithm.

The consuming Agent then produces a Verification Report capturing each step of the procedure, the steps that succeeded, the steps that failed, and the resulting set of accepted Conformance Levels. The consuming Agent's policy engine consumes the Verification Report to decide whether to engage. The Verification Report itself MAY be persisted as part of the consuming Agent's audit log so that the decision is reviewable.

## 7. Conformance Receipts

A Conformance Receipt is the artifact through which an implementation makes its conformance claim cryptographically auditable. The receipt is generated by `test-suite/attest.js` after a successful run of the test suite against a target deployment. The receipt asserts the identity of the implementation, the identity and version of the suite, the identity of the target, the set of Conformance Levels claimed (including the optional Profile suffix from RFC 0025, e.g. `L1-NC`), the summary of test results, the hash of the fixtures used during the run, the hash of the canonicalized full results, and the validity period during which the receipt is to be considered current. The receipt is signed by the implementation's signing key.

### 7.1 Peer-witness signatures (L4 and L5)

Receipts that claim Conformance Level L4 or L5 MUST additionally carry peer-witness signatures.

* **L4** requires at least one peer-witness signature. The peer witness MUST be an implementation that itself holds a current, valid L4 or L5 Conformance Receipt anchored in the OAP Registry (RFC 0026).
* **L5** requires at least three peer-witness signatures from three independent implementations, each holding a current, valid L4 or L5 Conformance Receipt anchored in the OAP Registry. "Independent" means that no two witnesses share a controlling organisation as declared in their Manifest publisher block.
* **L5-FINANCE** (RFC 0028 section 8) requires everything L5 requires, plus all obligations of RFC 0028 section 3 (Model Inventory, drift detection, champion challenger promotion, symbiotic escalation, counterfactual explanations, adverse action notices, disparate impact audit), plus that at least two of the three peer witnesses MUST themselves be implementations registered to entities subject to the same regulatory regime as the candidate (regulated bank, broker dealer, insurance undertaking, payment institution, or equivalent). The L5-FINANCE Conformance Receipt extends the L5 Receipt with an `l5_finance_attestation` block whose schema is normative in RFC 0028.

A peer-witness signature attests two things: (a) the witness has fetched the candidate Receipt and verified that its signature, hash chain, and test results are internally consistent, and (b) the witness has executed the published `test-suite/levels/levels.json` checks for the claimed level against the candidate's live deployment and observed conformance. Peer-witness signatures MUST be ed25519 signatures over the canonical-JSON form of the candidate Receipt's `peer_witnesses[]`-stripped body, with the signing key resolvable through the witness's `did:web` document. The procedure is implemented by `reference/agent/conformance-verifier.js#verifyPeerWitnesses`.

### 7.2 Validity period and renewal

A Conformance Receipt has a default validity period of ninety days. An implementation SHOULD re attest at least every ninety days, and MUST re attest after any change to the implementation that touches any code path exercised by the test suite. Attempting to claim a Conformance Level on the basis of an expired receipt is a forfeiture of conformance under section 7 of RFC 0016 and grounds for revocation through the OAP Registry.

### 7.3 Placeholder signatures forbidden

Receipts whose signature has the value reserved for development (`PLACEHOLDER_NOT_FOR_PRODUCTION`, `unsigned-reference`, or any string starting with `placeholder:`) MUST be rejected by every conformant Verifier. The Reference Verifier rejects them. The OAP Registry CI gate (RFC 0026) rejects them. `test-suite/attest.js` MUST refuse to emit them and MUST require an explicit `--signing-key` argument before producing a signed Receipt.

## 8. Adversarial Testing

The Working Group on Implementation and Conformance maintains a continuously growing subdirectory `test-suite/behavior/adversarial/` of tests that intentionally attempt to subvert the protocol. The categories include receipt forgery, signature stripping, cooling off bypass through timestamp manipulation, escalation routing through additional Agents, replaceability obfuscation through deliberately misleading replaceability scores, and Sybil identity creation under RFC 0011. Any adversarial test that succeeds against the Reference Implementation triggers a SECURITY issue against the specification per the procedure described in `SECURITY.md`. The intent is to keep the protocol under permanent internal attack so that external attackers find the surface already hardened by the time they reach it.

## 9. Backward Compatibility

This RFC adds a new schema (`oap-conformance-receipt.schema.json`), a new optional manifest block (`conformance`), a new directory (`test-suite/`), a new reference library (`reference/agent/conformance-verifier.js`), and three new CI jobs. None of these additions alter the meaning of any existing field of any existing schema. Implementations that do not yet publish a Conformance Receipt continue to be valid OAP implementations under their currently claimed Conformance Levels until those claims are challenged, at which point the burden of producing a verifiable Conformance Receipt shifts to the implementation per section 7 of RFC 0016.

## 10. Security Considerations

The Conformance Receipt is a cryptographic statement that can be replayed by any party who possesses it. Implementations MUST therefore choose a validity period commensurate with the rate at which their behavior changes, and MUST publish a revocation endpoint at which any receipt that has been superseded by a later attestation can be marked withdrawn. The signing key used for Conformance Receipts SHOULD be the same key listed in the manifest's publisher block so that consuming Agents can resolve it through the same DID resolution path they already use for the manifest itself.

The live re verification step described in section 6 introduces an attack surface in which a malicious target could attempt to differentiate its responses based on whether it believes it is being audited. To mitigate this, the Conformance Verifier is REQUIRED to randomize the order in which it executes sample tests, to include a small fraction of nonsense requests interleaved with real tests, and to use a fresh principal DID for each verification run when supported by the Agent's identity layer. The Reference Verifier implements all three measures.

## 11. Privacy Considerations

The execution of the Conformance Test Suite against a live target produces logs that include the principal DID and the agent DID used during the run. These DIDs MAY be ephemeral and SHOULD be ephemeral when the verifier is performing live re verification rather than attesting its own implementation. The Conformance Receipt itself MUST NOT contain principal data of any third party that was incidentally interacted with during the run. The fixtures shipped with the test suite are synthetic and contain no real personal data.

## 12. Conformance Impact

This RFC does not alter the criteria for any existing Conformance Level. It introduces three artifacts: the Conformance Receipt (canonical evidence for any Conformance Level claim), the peer-witness signature requirement at L4 and L5 (Section 7.1), and the OAP Registry anchor (RFC 0026). From the publication date of this RFC, every Marketplace, Verifier, and consuming Agent SHOULD require a current Conformance Receipt anchored in the OAP Registry as a precondition for treating any conformance claim as valid.

## 13. Implementation Experience

The Reference Implementation in this repository has been extended in concert with this RFC. The Conformance Test Suite contains schema, behavior, and charter tests that exercise the Reference Server. The Reference Agent has been extended with `conformance-verifier.js`, which any consuming Agent can import and call. The CI workflow `validate.yml` runs the suite on every push and on every pull request, and enforces the Implementability Gate and the Backward Compatibility Gate.

## 14. Alternatives Considered

A purely declarative trust framework in which Providers self attest conformance without any executable verification was considered and rejected because it reduces the protocol to a marketing claim that consuming Agents cannot mechanically check. A mandatory third party certification framework in which only an accredited body could issue Conformance Receipts was considered and rejected because it creates a single point of capture and contradicts the pluralism principle of RFC 0016. The chosen design preserves the right of any implementer to self attest at L1 through L3, requires peer-witnessing by independent already-conformant implementations at L4 and L5, and anchors all Receipts in a public append-only Registry (RFC 0026). The result is the same audit guarantees as third-party certification without the centralization cost, and a mechanical fallback (the Registry's CI gate) that does not depend on any single party remaining honest.

## 15. References

* OAP-CORE-1.0, the normative Open Agent Protocol Core Specification.
* RFC 0016, User Sovereignty Charter.
* RFC 0017, Irreversibility and Cooling Off Periods.
* RFC 0018, The Right to a Human Path.
* RFC 0025, Non-Commercial Conformance Profile.
* RFC 0026, OAP Registry Protocol.
* `schemas/v1.0/oap-conformance-receipt.schema.json`.
* `test-suite/README.md`.
* `reference/agent/conformance-verifier.js`.
* `governance/RFC-PROCESS.md`.
* IETF RFC 2119 and RFC 8174.

## Appendix A: Patrolling Games and Optimal Probe Selection

This appendix is normative for the probe-selection strategy it specifies as the recommended default and informative for the supporting commentary. It models the conformance probe selection problem of section 8 as a Stackelberg Patrolling Game in the sense of Basilico, Gatti, and Amigoni (2009) and the deployed IRIS system of Tsai, Rathi, Kiekintveld, Ordonez, and Tambe (2009), characterizes the Verifier's optimal randomization over probes against bounded-rational adaptive Implementations, and gives the reference algorithm that conformant Verifiers SHOULD implement when selecting which probes to run. The appendix complements Appendix B of `papers/safety-and-policy-stack.md`, which models the Policy Stack itself as a Stackelberg Security Game.

### A.1 The Probe Selection Problem

Let $\mathcal{P} = \{p_1, \ldots, p_n\}$ denote the conformance probe set defined in section 5 of this RFC, partitioned into the categories of section 8: schema probes, behavior probes, level probes, charter probes, and adversarial probes. Let $\mathcal{I}$ denote the Implementation under test, which the Verifier models as a strategic actor that may attempt to exploit predictability in the probe schedule by behaving correctly under expected probes and incorrectly otherwise. Let $b$ denote the Verifier's per-attestation probe budget, namely the maximum number of probes the Verifier can run within the Conformance Receipt validity window of section 7.

The **Verifier's pure strategy** $s_v$ is a subset of $\mathcal{P}$ of size at most $b$. The **Verifier's mixed strategy** $\sigma_v \in \Delta(2^\mathcal{P})$ is a probability distribution over such subsets. The **Implementation's strategy** $s_i$ is the choice of which probes to violate (equivalently, which protocol surfaces to fail). The Verifier observes only the realized $s_v$ but commits publicly to $\sigma_v$ through publication of the Verifier's algorithm under the Registry entry `oap.conformance.verifier.v1`.

The Verifier's utility is the expected detection rate weighted by the severity of the violated surface; the Implementation's utility is the expected payoff from undetected non-compliance minus the cost of compliance on the surfaces it covers. The structure is that of a Stackelberg Patrolling Game with the Verifier as Defender and the Implementation as Attacker.

### A.2 Theorem A.1 (Existence and Computability of the Verifier's Optimal Strategy)

**Statement.** For every finite probe set $\mathcal{P}$ with finite budget $b$, the Verifier's optimal mixed strategy $\sigma_v^*$ exists, is unique up to a measure-zero set of degenerate utility profiles, and is computable in polynomial time in $|\mathcal{P}|$ when the Implementation is single-type and in time $O(|\Theta_i|^b)$ in the Bayesian Implementation-type setting.

**Proof sketch.** The result is the application of Theorem B.1 and Theorem B.2 of `papers/safety-and-policy-stack.md` Appendix B (and their underlying references Conitzer and Sandholm (2006), Paruchuri et al. (2008)) to the conformance Verifier setting. The probe set $\mathcal{P}$ corresponds to the Defender's resources, the protocol surfaces correspond to the targets, and the per-surface utility profile is determined by the severity and the expected cost-of-detection. $\blacksquare$

### A.3 Theorem A.2 (Patrolling Strategy under Adaptive Implementation)

**Statement.** Suppose the Implementation observes the realized probe sequence $\{s_v^{(t)}\}_{t=1}^{T}$ across $T$ past attestation windows and adapts its strategy via fictitious play (Brown 1951; Robinson 1951). Then the Verifier's optimal randomized patrol against the adaptive Implementation is the strategy of Basilico, Gatti, and Amigoni (2009) parametrized by the probe-completion times of $\mathcal{P}$. The Verifier's expected detection rate against the adaptive Implementation is bounded below by

$$
\mathbb{E}[\mathrm{detect}(\sigma_v^*, s_i^*)] \;\ge\; 1 - \frac{C(\mathcal{P}, b)}{T},
$$

where $C(\mathcal{P}, b)$ is the patrolling-game characteristic constant of Basilico-Gatti-Amigoni (2009, Theorem 4) that depends only on the probe completion times and the budget.

**Proof sketch.** The proof follows Basilico, Gatti, and Amigoni (2009, Theorem 4) and the IRIS deployment analysis of Tsai et al. (2009). The key insight is that the Verifier's optimal patrol against an adaptive Attacker is not uniform random but rather a computed distribution that maximizes the minimum coverage probability across targets weighted by Attacker payoff. The asymptotic detection bound follows from the convergence of fictitious play under the Stackelberg structure. $\blacksquare$

### A.4 Reference Verifier Algorithm

The reference Verifier `reference/agent/conformance-verifier.js` SHOULD implement the patrolling strategy of A.3 with the following parameters:

1. **Probe completion times.** The Verifier MUST measure and publish the empirical completion time of each probe class against the Reference Implementation, and MUST update the published values monthly under the Registry entry `oap.conformance.probe-times.v1`.
2. **Adversarial weight.** Probes in the `test-suite/behavior/adversarial/` subdirectory of section 8 receive a multiplicative weight of at least $\eta = 3$ in the patrol distribution, reflecting the higher Defender utility of detecting adversarial violations.
3. **Recency-weighted history.** The Verifier MUST consult the Implementation's past Conformance Receipts (when available) and SHOULD increase the weight of probes targeting protocol surfaces on which the Implementation has previously failed, with exponential recency decay parameter $\lambda = \ln 2 / 90$ days.

A Verifier that does not implement the patrolling strategy is conformant under this RFC but loses the Tambe-grade adversarial robustness guarantee of A.3. The Verifier MUST declare its choice of strategy in the Conformance Receipt under the field `verifier_strategy` with values among `uniform_random`, `weighted_random`, `stackelberg_patrol`, or `custom`.

### A.5 Theorem A.3 (Robustness under Quantal Response Implementations)

**Statement.** When the Implementation exhibits Quantal Response behavior in choosing which protocol surfaces to violate, the Verifier's optimal patrolling strategy is the Quantal Response variant of A.3 with the QSE solution of Yang, Kiekintveld, Ordonez, Tambe, and John (2011). The reference implementation MAY use this variant and MUST publish its choice under `oap.conformance.verifier-qre.v1`.

**Proof sketch.** Direct application of Theorem B.4 of `papers/safety-and-policy-stack.md` Appendix B to the patrolling-game setting. $\blacksquare$

### A.6 Composition with the Adversarial Test Suite

The adversarial test categories of section 8 (receipt forgery, signature stripping, cooling off bypass, escalation routing, replaceability obfuscation, Sybil identity creation) are the **high-priority targets** in the patrolling game of A.1. The patrolling distribution MUST cover each adversarial target with positive probability at every attestation window, with the probability bounded below by $\eta / |\mathcal{P}|$ where $\eta$ is the adversarial weight of A.4.

### A.7 Implications for Downstream RFCs

1. **Safety/Policy Stack paper.** The composition with the Policy Stack Stackelberg game is given in `papers/safety-and-policy-stack.md` Appendix B.8.
2. **RFC 0026 (Registry Protocol).** The Registry entries `oap.conformance.verifier.v1`, `oap.conformance.probe-times.v1`, and `oap.conformance.verifier-qre.v1` are the publication anchors for the patrolling parametrizations.
3. **RFC 0009 (Reputation).** A Verifier's adherence to the patrolling strategy is an input to the Verifier's own reputation under the OAP Reputation aggregation, providing a market signal of Verifier quality.

### A.8 References to Patrolling Games and Adversarial Test Selection

- Basilico, N., Gatti, N., and Amigoni, F. (2009). Leader-Follower Strategies for Robotic Patrolling in Environments with Arbitrary Topologies. *Proceedings of AAMAS-2009.*
- Tsai, J., Rathi, S., Kiekintveld, C., Ordonez, F., and Tambe, M. (2009). IRIS: A Tool for Strategic Security Allocation in Transportation Networks. *Proceedings of AAMAS-2009 Industry Track.*
- Brown, G. W. (1951). Iterative Solution of Games by Fictitious Play. *Activity Analysis of Production and Allocation,* Wiley.
- Robinson, J. (1951). An Iterative Method of Solving a Game. *Annals of Mathematics* 54(2).
- Yang, R., Kiekintveld, C., Ordonez, F., Tambe, M., and John, R. (2011). Improving Resource Allocation Strategy against Human Adversaries in Security Games. *Proceedings of IJCAI-2011.*
- Conitzer, V., and Sandholm, T. (2006). Computing the Optimal Strategy to Commit to. *Proceedings of EC-2006.*
- Paruchuri, P., Pearce, J. P., Marecki, J., Tambe, M., Ordonez, F., and Kraus, S. (2008). Playing Games for Security: An Efficient Exact Algorithm for Solving Bayesian Stackelberg Games. *Proceedings of AAMAS-2008.*
- Tambe, M. (2011). *Security and Game Theory: Algorithms, Deployed Systems, Lessons Learned.* Cambridge University Press.
