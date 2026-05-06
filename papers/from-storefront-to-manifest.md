# From Storefront to Manifest

**A Whitepaper of the Open Agent Protocol**
**Version:** 1.0
**Status:** Public Working Draft
**Date:** May 2026
**Authors:** T. Fengler (Editor)
**Working Groups:** Commercial Layer WG, Web Integration WG, and Marketplace and Discovery WG

## Abstract

The contemporary commercial web was built on the assumption that purchase decisions originate with humans who read pages, browse catalogs, compare offers in a tab, and complete a checkout flow that the merchant designed for them. Every layer of the stack reflects that assumption. The storefront is a presentation surface. The catalog is a navigation hierarchy. The recommendation engine is a personalization heuristic. The checkout is a friction reduction sequence. The advertising market is a competition for the human's attention. When the buyer is no longer a human but an autonomous Agent acting on behalf of a Principal, every layer of that stack is structurally misaligned with the buyer it is now serving. This paper describes what each layer becomes when the buyer is an Agent. The storefront becomes the Manifest. The catalog becomes the Verifiable Index. The recommendation engine becomes the Disclosed Ranking Function. The checkout becomes the Procurement Intent. The advertising market becomes the Match Broker conformance regime. The website becomes the surface against which Agents query, subscribe, negotiate, settle, and audit. This is the migration that [RFC 0012](/rfcs/0012), [RFC 0013](/rfcs/0013), [RFC 0014](/rfcs/0014), [RFC 0020](/rfcs/0020), [RFC 0021](/rfcs/0021), and [RFC 0022](/rfcs/0022) collectively make available, and this paper describes how each part of the contemporary commercial stack reorganizes itself around that migration.

## 1. The Storefront and What Replaces It

The storefront is the page on which a merchant presents a product or a service to a human visitor. The page is composed of images, headlines, prose, social proof, urgency cues, and a call to action. It is the artifact of two centuries of retail design adapted to the screen. The storefront is optimized for the cognitive and emotional levers that move a human toward a purchase decision in the moment.

When the buyer is an Agent, the storefront's levers are inert. The Agent does not respond to images, urgency cues, or social proof. The Agent reads the structured data the merchant publishes, evaluates the data against the Principal's standing constraints, and either issues an Intent or moves on. The artifact the Agent reads is the Manifest defined in [OAP-CORE-1.0](/spec) and extended through the Commerce Manifest of [RFC 0013](/rfcs/0013) and [RFC 0014](/rfcs/0014). The Manifest declares the Provider's identity, its commerce model, its prices in decimal currency, its inventory, its conformance levels, its deletion commitments, its Compatibility Profile under [RFC 0024](/rfcs/0024), its Subscription endpoint, and any other field the Agent needs to evaluate the offer.

The Manifest is not a worse storefront. It is a different artifact. It does for the Agent what the storefront does for the human. The two artifacts coexist for the foreseeable transition period. The merchant continues to publish the storefront for human visitors who arrive directly, and publishes the Manifest for the Agents that arrive on behalf of Principals. The Manifest is a one to two kilobyte JSON document at a stable URL. The storefront is a multi megabyte page at a search optimized URL. The relative bandwidth, latency, cost, and verifiability of the two artifacts are not close. The economic gravity of the difference is a pressure on every merchant whose sales increasingly originate from Agent traffic.

The platforms that have built their business on hosting storefronts therefore face a choice. The choice is not whether to support Agents, because their merchants will demand the support. The choice is whether to expose their merchants' Manifests through a uniform OAP surface that the Agent ecosystem can address directly, or to interpose a proprietary Agent surface through which traffic must continue to flow under the platform's terms. The first choice preserves the platform's role as a hosting provider while making its merchants competitive in the Agent ecosystem. The second choice attempts to reproduce the storefront pattern at the Agent layer, which the [Interoperability versus Platforms](/papers/interoperability-versus-platforms) paper argues will be unstable.

## 2. The Catalog and the Verifiable Index

The catalog is the structured navigation hierarchy through which a human visitor browses a merchant's offerings or through which a marketplace presents the merchants on its platform. The catalog is optimized for human discovery patterns, which favor a small number of top level categories, deep nesting, faceted filters, and search heuristics that combine string matching with the marketplace's commercial preferences.

When the buyer is an Agent, the catalog's structure is largely irrelevant. The Agent does not browse. The Agent issues an Intent through the [Agent Query Language of RFC 0020](/rfcs/0020) and consumes the candidates the Resolver returns. The catalog the Agent interacts with is the Verifiable Index of [RFC 0021](/rfcs/0021). The Index is an append only Merkle structure that supports per query Inclusion Proofs, periodic Completeness Attestations, and Negative Inclusion Proofs on demand. The Agent verifies that the candidates it received were drawn from the Index, that the Index is complete to the latest published root, and that no candidate the Agent expected to see was silently suppressed.

The marketplace that operates the catalog therefore takes on a new obligation. The obligation is to attest that its Index is complete, to publish the algorithm by which it ranks candidates, and to produce a Decision Record for every candidate that documents its rank. The marketplace that meets these obligations claims conformance at level M1, M2, or M3 of [RFC 0021](/rfcs/0021), and a consuming Agent that requires verifiable retrieval consults only marketplaces at the level it requires. The marketplace that refuses these obligations operates outside the conformance regime and competes on convenience alone, which the discipline of the [Performance Record system of RFC 0009](/rfcs/0009) progressively erodes.

The contemporary marketplace business model has historically depended on the opacity of the catalog. The opacity has permitted preferential placement of the marketplace's own private label products, demotion of merchants who have refused advertising upsells, and silent suppression of competitors of strategic partners. None of these levers survive the obligations of [RFC 0021](/rfcs/0021), because each of them is detectable by a consuming Agent that runs the verification path. The migration of the catalog to the Verifiable Index is therefore an erosion of marketplace gatekeeping rents and a transfer of the corresponding surplus to the Principals on whose behalf the consuming Agents act.

## 3. The Recommendation Engine and the Disclosed Ranking Function

The recommendation engine is the system that proposes products to a human visitor based on the visitor's history, demographics, behavior, and the marketplace's commercial preferences. The engine is opaque by construction. Its opacity is the source of its value to the platform, because the recommendations it produces can be tilted toward higher margin products, advertising relationships, and inventory the platform wishes to clear without the visitor noticing the tilt.

When the buyer is an Agent, the engine's opacity is its disqualification. An Agent that cannot mechanically evaluate why a candidate was ranked at a particular position cannot rely on the ranking. The Agent's response is to consume the Disclosed Ranking Function of [RFC 0021](/rfcs/0021) and the per response Decision Record that accompanies every candidate. The Decision Record lists the value each input took for that candidate, the contribution each input made to the candidate's score, and the resulting rank. The Agent recomputes the score and verifies that the result matches the documented function. A discrepancy is a deviation from the Disclosed Ranking Function that the Agent reports through the dispute mechanism of [RFC 0009](/rfcs/0009).

The recommendation engine therefore migrates from a private optimization surface to a public contract. The merchant continues to operate whatever ranking algorithm it considers most effective, but the algorithm becomes documented, versioned, and auditable. A change to the algorithm is a versioned event that subscribers receive through [RFC 0022](/rfcs/0022) and that consuming Agents may incorporate into their reliance decisions. The recommendation engine that refuses to publish its function operates outside the conformance regime, which is the same erosion of gatekeeping rents that section 2 describes for the catalog.

## 4. The Checkout and the Procurement Intent

The checkout is the multi step funnel through which a human visitor confirms address, payment, and consent to terms before the merchant takes the order. The funnel is optimized for friction reduction, because every additional field in a checkout flow is empirically associated with abandonment. The funnel is also the locus of dark pattern accumulation, because each defaulted opt in, each pre selected upsell, and each obscured cancellation control adds basis points of margin at the cost of eroding the visitor's consent.

When the buyer is an Agent, the checkout funnel is structurally inert. The Agent has no attention to be lost across multiple steps and no susceptibility to dark patterns. The Agent issues a Procurement Intent under [RFC 0013](/rfcs/0013), generalized through the Agent Query Language of [RFC 0020](/rfcs/0020), and the Intent contains every field that the funnel was previously trying to extract. The Intent is signed by the Principal, carries an explicit budget, an explicit projection, an explicit quality floor, and an explicit consent envelope under the [User Sovereignty Charter of RFC 0016](/rfcs/0016). The merchant accepts the Intent in a single round trip and produces an Order Receipt under the accountability layer described in [Accountability in the Agent Economy](/papers/accountability-in-the-agent-economy).

The economic effect of this migration is large. The cost of constructing checkout funnels falls to zero, because the funnel does not exist. The conversion rate concept loses meaning, because there is no funnel to abandon. The dark pattern surface area falls to the structural fields of the Intent, which are normatively constrained and detectable. The fraud surface migrates from card number testing to Intent forgery, which the signature requirement of [RFC 0020](/rfcs/0020) and the Receipt anchoring of [RFC 0023](/rfcs/0023) make detectable through the same accountability infrastructure that the rest of the protocol relies on. The merchant's payment processing costs fall to the underlying interchange and the cost of the checkout team falls to the cost of operating the Manifest.

## 5. The Advertising Market and the Match Broker

The contemporary advertising market is the set of mechanisms by which merchants pay platforms to inject their offers into the human visitor's attention. The mechanisms are optimized to predict the marginal click value of an impression and to auction impressions accordingly. The market has produced revenues large enough to fund the dominant platforms of the era and large enough to support an industry of optimization, attribution, and measurement intermediaries.

When the buyer is an Agent, the advertising market's premise dissolves. The Agent does not click. The Agent does not have attention to be auctioned. The Agent has Intents to be matched. The market that replaces the advertising market is therefore a market for Intent matching, in which Match Brokers compete to return the candidate set most useful to a consuming Agent given an Intent. The competition is on the verifiable conformance levels of [RFC 0021](/rfcs/0021), on the Disclosed Ranking Function the Match Broker publishes, and on the Performance Record the Match Broker has accumulated under [RFC 0009](/rfcs/0009). The compensation flows through the per Intent budget the consuming Agent declares and through the per match settlement that the Match Broker receives under the commerce model of [RFC 0014](/rfcs/0014).

The aggregate revenue available in this replacement market is bounded by the per Intent budgets that consuming Agents are willing to declare, which the [Economics of the Agent Economy](/papers/economics-of-the-agent-economy) paper analyzes. The bound is structurally lower than the contemporary advertising market because the consuming Agent has no attention to be over priced. The displacement of attention based pricing by Intent based pricing is therefore a redistribution of consumer surplus from advertising platforms to Principals, mediated by the Match Brokers that compete on verifiable conformance.

## 6. The Search Surface

The contemporary search surface is the system through which a human visitor enters a query and receives a ranked set of candidate sources. The system is opaque, the ranking is proprietary, and the candidate set is curated under commercial pressures the visitor cannot inspect. The system has produced one of the largest businesses in the history of commerce.

When the buyer is an Agent, the search surface migrates to the Agent Query Language of [RFC 0020](/rfcs/0020) and the Verifiable Index of [RFC 0021](/rfcs/0021). The Agent expresses its query as a structured Intent rather than as a free text string, the Resolver returns a candidate set with per candidate Inclusion Proofs and Decision Records, and the consuming Agent verifies the result. The free text query persists as a convenience for human users, but the canonical query surface of the agent economy is structured. The economic gravity of the migration is the same as the gravity that motivated structured data on the contemporary web, except that the contemporary web's structured data was advisory and the agent economy's structured queries are normative.

The search surface that emerges is therefore one in which retrieval quality is verifiable rather than asserted. A consuming Agent can reproduce a ranking, detect a deviation, and report the deviation through the dispute mechanism of [RFC 0009](/rfcs/0009). The discipline that the search literature has long called for and that regulators have struggled to impose is achieved at the protocol level. The market for retrieval becomes contestable in a way it has not been in the contemporary era, which is the conclusion that follows from the assembly of the verifiability properties of [RFC 0021](/rfcs/0021) and the structured query surface of [RFC 0020](/rfcs/0020).

## 7. The Page and What Replaces It

The page is the unit of the contemporary commercial web. The merchant publishes pages, the platform indexes pages, the visitor reads pages, the analytics measure pages, the optimization adjusts pages. The entire stack is built around the page as the canonical artifact.

When the buyer is an Agent, the page is no longer the canonical artifact. The Manifest is. The merchant publishes Manifests, the Match Broker indexes Manifests, the Agent reads Manifests, the accountability layer attests Manifests, the conformance regime audits Manifests. The page persists for human visitors who arrive directly, but the canonical surface against which the agent economy organizes itself is the Manifest. This is the migration that the title of this paper names. The migration is from storefront to Manifest, and through that migration every layer of the contemporary commercial stack reorganizes itself around the Agent buyer that it was not designed for and that it now must serve.

## 8. What This Paper Is Not

This paper is not a prediction that the contemporary commercial web will disappear. The page persists as long as humans persist as buyers, and humans persist as buyers indefinitely. The paper is also not an argument that any single contemporary platform will collapse. The platforms that adapt to the Agent buyer will continue to host significant fractions of commerce, and the platforms that refuse will atrophy gradually rather than catastrophically. The paper is an account of how each layer of the contemporary commercial stack reorganizes itself once the buyer is no longer assumed to be a human, and the reorganization the paper describes is the reorganization the Open Agent Protocol enables.

The reorganization is not optional in the long run. The economic gravity of the Agent buyer is large enough that any merchant whose sales increasingly originate from Agent traffic will publish a Manifest, any marketplace whose buyers increasingly delegate to Agents will operate a Verifiable Index, any retrieval surface whose users increasingly query through Agents will publish a Disclosed Ranking Function, and any payment surface whose visitors increasingly issue Intents will accept Procurement Intents. The merchant who chooses not to publish a Manifest cedes the Agent buyer to a competitor who does. The marketplace that chooses not to operate a Verifiable Index cedes the auditing consumer to a competitor that does. The choice each participant faces is not whether to migrate but on which schedule.

The Open Agent Protocol is the migration's standard. The standard is open, the schedule is the participant's, and the surface area is each of the seven planes described in [OAP-CORE-1.0](/spec). This paper has described the migration as it appears at the commercial layer. The other papers describe the migrations at the layers that surround it. Together they describe an internet whose center of gravity has shifted from the page to the Manifest.

## 9. References

* [OAP-CORE-1.0](/spec), the normative Open Agent Protocol Core Specification.
* [RFC 0009](/rfcs/0009), Reputation and Performance Records.
* [RFC 0012](/rfcs/0012), The Agent Native Web.
* [RFC 0013](/rfcs/0013), Commerce Models for the Agent Economy.
* [RFC 0014](/rfcs/0014), Commerce Primitives, A Generalized Commercial Layer.
* [RFC 0016](/rfcs/0016), User Sovereignty Charter.
* [RFC 0019](/rfcs/0019), Conformance Testing and Implementability.
* [RFC 0020](/rfcs/0020), Agent Query Language.
* [RFC 0021](/rfcs/0021), Verifiable Indexes and Match Broker Conformance.
* [RFC 0022](/rfcs/0022), Manifest Subscription Protocol.
* [RFC 0023](/rfcs/0023), Agent Native Storage Substrate.
* [RFC 0024](/rfcs/0024), Schema Negotiation and Versioning.
* [Accountability in the Agent Economy](/papers/accountability-in-the-agent-economy).
* [Databases for the Agent Economy](/papers/databases-for-the-agent-economy).
* [Economics of the Agent Economy](/papers/economics-of-the-agent-economy).
* [Interoperability versus Platforms](/papers/interoperability-versus-platforms).
* [The Agent Web](/papers/agent-web-whitepaper).

---

## Appendix: The Match Broker as Information Retrieval System

This appendix is normative where it references accepted RFCs and informative elsewhere. It provides the technical depth behind section 5 and the retrieval claims of section 2 that the main paper states but does not derive.

### A.1 The Scale Problem in Verifiable Tool Discovery

The Verifiable Index described in section 2 and specified in RFC 0021 solves the tamper-evidence problem: no candidate can be silently suppressed and every ranking is auditable. It does not solve the retrieval quality problem. A Verifiable Index of 10,000 provider Manifests is cryptographically sound regardless of whether the ranking function it exposes returns the correct tools for a given Intent. The anti-capture properties of RFC 0021 are necessary but not sufficient for a high-quality Match Broker.

The retrieval quality problem has been studied extensively in the context of large-scale API and tool discovery for language model agents. Qin et al. (2023, ICLR 2024) evaluated tool retrieval at corpus sizes up to 16,000 APIs using the ToolBench benchmark. Their principal empirical finding is that pure keyword matching produces F1 below 0.40 at corpus sizes above 1,000 tools, while retrieval-augmented approaches maintain F1 above 0.70 across the full range. Patil et al. (2023, Gorilla, UC Berkeley) demonstrated that retrieval-augmented API selection outperforms LLM-only selection by 20 to 40 percentage points on API-call accuracy. The implication for OAP is that a Match Broker which relies on keyword matching alone will fail to surface the correct tool in the majority of queries once the index grows beyond a few hundred providers.

### A.2 The Three-Layer Retrieval Pipeline

A conformant Match Broker implements retrieval in three sequential layers, each necessary for a different reason.

**Layer 1: Constraint Filter.** The AQL Intent of RFC 0020 carries structured predicates that are exact requirements rather than preferences. A provider that operates only in the European Union cannot satisfy an Intent that requires United States jurisdiction. A provider at conformance level L1 cannot satisfy an Intent that requires L3. A provider whose average unit cost exceeds the Intent's budget cannot be selected regardless of its textual relevance. The constraint filter evaluates these predicates and removes ineligible providers from the candidate set before any retrieval computation. The filter is O(n) in the index size but is the least expensive operation per candidate because it requires no text processing.

**Layer 2: BM25 Sparse Retrieval.** The surviving candidates are ranked by BM25 (Robertson and Zaragoza 2009) over the text of each Manifest. BM25 is the dominant sparse retrieval function in the information retrieval literature. Its derivation proceeds from the probabilistic relevance model of Robertson and Sparck Jones (1976) via the binary independence model to the two-stage normalization of Robertson and Zaragoza (2009). The BM25 score of a query q against a document d is:

```
BM25(q, d) = sum_{t in q} IDF(t) * (f(t,d) * (k1 + 1)) / (f(t,d) + k1 * (1 - b + b * |d| / avgdl))
```

where f(t,d) is the within-document term frequency, |d| is the document token count, avgdl is the corpus average document length, IDF(t) = log((N - n(t) + 0.5) / (n(t) + 0.5) + 1) with N the corpus size and n(t) the number of documents containing term t. The hyperparameters k1 controls term frequency saturation and b controls length normalization. Robertson and Zaragoza (2009) report that k1 = 1.5 and b = 0.75 are optimal across a wide range of retrieval collections, and these are the normative values for OAP Reference Match Brokers per RFC 0021 Appendix A.

The text corpus for BM25 is the concatenation of the Manifest description, category tags, action names, and action descriptions. This corpus is richer than a webpage snippet and narrower than a full document, placing the retrieval task in the short-document regime where BM25 performance is well characterized by the TREC short-document track evaluations.

**Layer 3: Multi-Factor Re-Ranking.** BM25 measures textual relevance. A Match Broker that ranks on textual relevance alone would return the tool most similar to the query description, which is not the same as the tool most likely to satisfy the Principal's Intent. The re-ranking stage combines BM25 with four additional signals that are specific to the agent commerce context:

Reputation score, drawn from the RFC 0009 Performance Record aggregate, captures the provider's historical fulfillment quality across all prior interactions. A provider with a reputation score of 0.95 has delivered what it promised in 95 percent of measured interactions. Ranking on textual relevance alone would ignore this signal entirely.

Conformance score captures the provider's verified compliance with the OAP protocol requirements. A provider at L4 has passed the full conformance test suite of RFC 0019 including security probes, transparency log audits, and end-to-end settlement verification. Conformance is a quality signal orthogonal to textual relevance.

Cost score captures the provider's pricing relative to the other candidates in the filtered set. For Principals with binding budget constraints declared in the AQL Intent, a cheaper provider is strictly preferable to a more expensive one at equal quality.

Freshness score captures the recency of the Manifest. A Manifest updated 30 days ago is more likely to reflect current pricing and availability than one updated 18 months ago.

The linear combination of these five signals produces a final score that reflects the true multi-dimensional quality of a candidate for a given Intent. The weights must be disclosed in the Ranked Function declaration of RFC 0021 section 4.1 and must not change without a version increment.

### A.3 The Advertising Market Reconsidered

Section 5 describes the advertising market's dissolution when the buyer is an Agent. This appendix provides the mechanism-design analysis that grounds that claim.

The contemporary search advertising market is a generalized second-price auction (Edelman, Ostrovsky, and Schwarz 2007; Varian 2007) over ad slots. Advertisers bid a maximum cost-per-click, the platform allocates slots in descending bid order, and each advertiser pays the bid of the next-ranked advertiser plus a minimum increment. The equilibrium outcome under truthful bidding is Pareto-efficient for the platform and the top advertisers, but the user receives the ranked set of advertisers most willing to pay, not the ranked set of providers most likely to satisfy the user's actual need. The wedge between willingness to pay and relevance to the user is the central inefficiency of the contemporary advertising market.

When the buyer is an Agent with a formally stated Intent, the willingness-to-pay signal is irrelevant. The Agent is not susceptible to advertising. The Agent evaluates candidates on the merits declared in their Manifests: price, conformance, reputation, and capability match. The generalized second-price auction over ad slots has no analogue in the Agent economy because there are no ad slots and no clicks.

The market that replaces it is a conformance competition. Match Brokers compete to return the most useful candidate set for a given Intent. The competition metric is the RFC 0009 Performance Record of the Match Broker itself: how often did the top-ranked candidate from this broker satisfy the consuming Agent's Intent, at what quality level, and at what cost? A consuming Agent that maintains a Performance Record for each Match Broker it has used will route subsequent Intents to the broker with the best historical satisfaction rate, creating a competitive market in retrieval quality rather than a competitive market in advertising spend.

The revenue model for Match Brokers in this environment is per-match settlement under the commerce model of RFC 0014. The Match Broker receives a small commission on each successful Intent resolution, where success is defined by the Settlement Confirmation produced by RFC 0032. This aligns the broker's revenue with actual utility delivered rather than with clicks generated, which is the alignment that the Vickrey-Clarke-Groves mechanism achieves in theory (Vickrey 1961, Clarke 1971, Groves 1973) and that the OAP settlement infrastructure makes operationally verifiable.

### A.4 Formal Properties of the Verifiable Index

The three anti-capture properties stated in section 2 have precise formal characterizations.

**Property 1: Suppression Detectability.** Let I be the Verifiable Index at root r, and let P be a provider whose Manifest is in I. A Match Broker that returns a candidate set C from I and omits P can be detected by any consuming Agent that requests a Negative Inclusion Proof for P. The Negative Inclusion Proof either asserts that P is not in the index, which is false and produces an inconsistency verifiable against r, or asserts that P is in the index but did not satisfy the Intent constraints, in which case the Agent can verify the constraint evaluation against the Intent's AQL predicates. A Match Broker that produces a false Negative Inclusion Proof has forged a signed document, which requires compromising the broker's signing key.

**Property 2: Demotion Detectability.** Let f be the Disclosed Ranking Function and let d_P be the Decision Record for provider P in response to Intent q. A consuming Agent that recomputes f(P, q) from the inputs declared in d_P and obtains a score differing from the declared final score by more than the floating-point tolerance epsilon has detected a deviation from f. The deviation is evidence that the broker applied a different ranking function to P than the one it discloses. The signed Decision Record makes the deviation attributable and reportable under RFC 0009.

**Property 3: Change Observability.** A change to the Disclosed Ranking Function without a version increment is detectable by any Agent that has cached the previous function version. The function version is declared in the broker's Manifest, which is subscribed by consuming Agents under RFC 0022. A Manifest update that increments the function version triggers a notification to all subscribers within the subscription window declared in the Manifest. An unversioned function change produces a discrepancy between the cached function and the applied function that is detectable via Property 2.

The three properties together make the Match Broker's behavior fully accountable in the same sense that the Receipt chain of RFC 0023 makes provider behavior accountable: every action is either verifiable or attributably deceptive.

### A.5 References for Appendix

- Clarke, E. H. (1971). Multipart Pricing of Public Goods. Public Choice 11.
- Edelman, B., Ostrovsky, M., and Schwarz, M. (2007). Internet Advertising and the Generalized Second-Price Auction: Selling Billions of Dollars Worth of Keywords. American Economic Review 97(1).
- Groves, T. (1973). Incentives in Teams. Econometrica 41(4).
- Johnson, J., Douze, M., and Jegou, H. (2021). Billion-scale Similarity Search with GPUs. IEEE Transactions on Big Data 7(3). The FAISS vector index for dense retrieval extensions.
- Malkov, Y. A., and Yashunin, D. A. (2020). Efficient and Robust Approximate Nearest Neighbor Search Using HNSW Graphs. IEEE TPAMI 42(4).
- Patil, S., Zhang, T., Wang, X., and Gonzalez, J. (2023). Gorilla: Large Language Model Connected with Massive APIs. arXiv:2305.15334. UC Berkeley RISE Lab. The empirical demonstration of 20 to 40 percentage point retrieval gains for tool selection.
- Qin, Y., Liang, S., Ye, Y., et al. (2023). ToolLLM: Facilitating Large Language Models to Master 16000+ Real-world APIs. ICLR 2024. The foundational ToolBench evaluation establishing retrieval necessity at scale.
- Robertson, S. E., and Sparck Jones, K. (1976). Relevance Weighting of Search Terms. Journal of the American Society for Information Science 27(3). The probabilistic relevance model from which BM25 is derived.
- Robertson, S., and Zaragoza, H. (2009). The Probabilistic Relevance Framework: BM25 and Beyond. Foundations and Trends in Information Retrieval 3(4). The canonical BM25 derivation with hyperparameter analysis.
- Varian, H. (2007). Position Auctions. International Journal of Industrial Organization 25(6).
- Vickrey, W. (1961). Counterspeculation, Auctions, and Competitive Sealed Tenders. Journal of Finance 16(1).

*This appendix accompanies RFC 0021 (Verifiable Indexes and Disclosed Ranking Functions) and the Reference Match Broker implementation in reference/match-broker/. The three-layer retrieval pipeline described in section A.2 is normatively specified in RFC 0021 Appendix A and implemented in reference/match-broker/broker.js.*
