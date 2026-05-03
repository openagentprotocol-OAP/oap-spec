# From Storefront to Manifest

**A Whitepaper of the Open Agent Protocol**
**Version:** 1.0
**Status:** Public Working Draft
**Date:** May 2026
**Authors:** OAP Commercial Layer Working Group, OAP Web Integration Working Group, and OAP Marketplace and Discovery Working Group

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
