# Governance of an Ownerless Protocol

**A Whitepaper of the Open Agent Protocol**

**Version:** 1.0
**Status:** Public Working Draft
**Date:** May 2026
**Authors:** T. Fengler (Editor)
**Working Groups:** Privacy and Governance WG

## Abstract

The Open Agent Protocol is governed without an owner, without a foundation, and without a corporate steward whose interests could one day diverge from the interests of the parties that depend on the protocol. This is not an accident. It is the considered response to a long history of open standards that began with credible commitments to neutrality and that ended in capture. The protocols that succeed at the scale at which the Agent Economy will operate are the protocols that no single party can capture. This whitepaper sets out the governance model under which the Open Agent Protocol is developed, explains why ownerlessness is the necessary architectural property of a substrate that arbitrates trust between competing parties, examines the historical evidence on the failure modes of foundation hosted standards, and describes the mechanisms by which the protocol's evolution is kept honest in the absence of a central owner.

## 1. The Capture Problem in Open Standards

A neutral protocol is a public good in the technical sense. Every party that uses it benefits from its neutrality. No single party has an incentive to bear the cost of preserving the neutrality, because the cost is borne by the party that pays it and the benefit is shared by every party that uses the protocol. The combination of distributed benefit and concentrated cost is the structural condition under which capture occurs. A party that is willing to bear the cost of stewarding the protocol acquires, by the act of stewardship, a degree of influence over the protocol's evolution. Over time the influence accumulates. The party's commercial interests come to be reflected in the protocol's design. The parties who depend on the protocol's neutrality discover, often too late, that the steward's interests have diverged from theirs.

The pattern is not speculative. The history of email standards under the Internet Engineering Task Force shows the influence of the largest mailbox providers on the practical interpretation of authentication standards in ways that have made it more difficult for new entrants to deliver mail. The history of web standards under the World Wide Web Consortium and the Web Hypertext Application Technology Working Group shows the increasing concentration of editorial influence in a small number of browser vendors whose commercial interests in advertising surveillance have shaped the evolution of the platform. The history of payment standards under the Europay Mastercard Visa consortium shows the alignment of the standard with the commercial interests of the founding card networks at the expense of merchants and consumers. In each case the standard was governed by a body that began with credible commitments to neutrality, and in each case the body's structure proved insufficient to prevent the gradual conversion of the standard into an instrument of incumbent advantage.

The Open Agent Protocol concludes from this evidence that the absence of a central steward is not a defect to be remedied. It is the architectural property that makes the protocol useful. A protocol that arbitrates trust between competing agents must not itself be subject to the influence of any of those agents, and the only structurally robust way to achieve that condition is to eliminate the central body that the influence would target.

## 2. What Ownerlessness Means in Practice

Ownerlessness is not a synonym for chaos. The protocol is developed, maintained, and evolved through a documented process that any participant may follow. The process consists of four elements that together substitute for the functions a foundation would otherwise perform.

The first element is the request for comments process. Any participant may propose a change to the protocol by publishing an RFC in the canonical specification repository. The RFC follows a published template, identifies the problem it addresses, sets out the proposed change, examines the alternatives, and discusses the implications. The RFC enters public review. Comments are recorded in the repository. The RFC advances through stages of draft, review, and acceptance on the basis of demonstrated consensus, demonstrated implementation, and demonstrated absence of unresolved objections. The process is identical in form to the request for comments process under which the Internet Engineering Task Force developed the foundational protocols of the internet, and it shares the property that the authority of an RFC derives from its adoption rather than from the position of its author.

The second element is the Working Group structure. Substantive areas of the protocol are stewarded by Working Groups. Each Working Group is open to any participant who is willing to do the work, has its agenda published in the canonical repository, conducts its discussions in public, and produces RFCs that follow the standard process. Working Groups are not foundations and have no legal personality. They are coordinating fora that exist for the duration of the work they have undertaken and dissolve when the work is complete. Membership in a Working Group is a function of contribution rather than of affiliation, and no participant may bind a Working Group's output to the interests of an external party.

The third element is the conformance test suite, defined in [RFC 0019](/rfcs/0019). The conformance test suite is the operational definition of what the protocol requires. An implementation that passes the test suite is conformant. An implementation that does not is not. The test suite is maintained in the canonical repository under the same review process as the rest of the specification. Disagreements about the meaning of the protocol are resolved by recourse to the test suite rather than by appeal to a central authority. The test suite is the protocol's parliament of practice, and it is a parliament whose votes are mechanical and reproducible.

The fourth element is the reference implementation. The reference implementation demonstrates that the protocol is implementable in its current form, exercises the conformance test suite, and serves as a starting point for parties who wish to build their own implementations. The reference implementation is permissively licensed and is governed under the same review process as the specification. It is not the canonical implementation, because there is no canonical implementation. It is one implementation that the community has agreed is sufficient to be useful as a reference.

## 3. The OAP community

The collective set of participants who do the work of maintaining the protocol is referred to as the OAP community. The OAP community are not an organization. They are not a foundation. They have no legal personality. They have no shared bank account, no shared office, no shared employment, and no shared liability. They are the natural class of contributors who have, at any given moment, undertaken to do the work that the protocol's continued health requires.

The OAP community' authority is informal and is bounded by the mechanisms described above. A Steward who proposes a change must publish an RFC. A Steward who maintains a Working Group must do so in public. A Steward who maintains the test suite must accept review of every modification. A Steward who departs the project leaves no irreplaceable role behind, because the role exists only insofar as someone is willing to perform it. The OAP community are interchangeable in the sense that no Steward holds a position whose loss would impair the protocol's continuity, and the protocol's processes are designed to ensure that this property remains true as the population of OAP community turns over.

Identification of the OAP community is by contribution rather than by registration. The history of contributions to the canonical repository is the public record from which OAP communityhip is inferred. There is no membership card, no oath, and no accreditation. The protocol's posture is that anyone who shows up and does the work is a Steward, and that no one who does not show up and does not do the work is.

## 4. Anti Capture Mechanics

The combination of ownerlessness and informal OAP communityhip is necessary but not sufficient. A protocol that is structurally ownerless can nevertheless be captured if its development process can be dominated by a coordinated faction. The Open Agent Protocol responds to this risk with a small set of anti capture mechanics that are baked into the development process.

The first anti capture mechanic is the requirement of two independent implementations, formalized in [RFC 0019](/rfcs/0019) as the Implementability Gate. No RFC may advance to the accepted stage until at least two implementations of the proposed change exist, the implementations are independently developed by parties with no shared commercial interest, and the implementations interoperate at the level required by the conformance test suite. The two implementations requirement is the same mechanism by which the Internet Engineering Task Force has historically protected its standards from the imposition of features that no one would actually build, and it has the same effect here. A change that no second party is willing to implement is a change whose value is unproven, and an unproven change does not become part of the protocol.

The second anti capture mechanic is the public objection record. Any participant may file an objection to any RFC at any stage. The objection is recorded in the repository, must be addressed substantively before the RFC may advance, and remains visible in the repository's history regardless of whether it is sustained or overruled. The record is the protocol's defense against the silent suppression of dissent, and it preserves the evidence on which future OAP community can review the legitimacy of past decisions.

The third anti capture mechanic is the conformance test suite's role as the operational definition. A change that is adopted into the specification but that the conformance test suite does not enforce is not a change that has any practical effect on implementations. A faction that succeeds in inserting language into the specification but that fails to obtain corresponding test coverage has won a paper victory. The test suite is the location of the protocol's actual semantics, and it is governed by the same review process that governs the specification text.

The fourth anti capture mechanic is the right to fork. The specification, the test suite, and the reference implementation are all permissively licensed, which means that any participant who comes to believe that the protocol's evolution has been captured can fork the protocol and continue development on its own terms. The right to fork is not a wish. It is the structural condition that disciplines the OAP community. OAP community who lose the confidence of the implementer community lose the implementer community, and a protocol whose implementer community has departed is a protocol that has ceased to exist.

## 5. The Comparison with Foundation Hosted Models

The dominant alternative to the model described in this whitepaper is the foundation hosted model. Under that model a non profit foundation is established, the foundation holds the trademark and the canonical assets, the foundation is funded by member dues, the foundation employs a small staff, and the foundation hosts the working groups and the editorial process. The model has produced significant standards, and it has the advantage that the foundation can hire the people it needs to do the work that volunteers will not do.

The model has three structural disadvantages that the Open Agent Protocol has chosen not to inherit. The first is that the foundation, as a legal person, accumulates institutional inertia and institutional self interest that diverge over time from the interests of the parties that depend on the protocol. The second is that the foundation's funding model creates a class of paying members whose commercial interests gain disproportionate influence over the protocol's evolution. The third is that the foundation, as a single point of governance, is a single point of capture for any actor with sufficient resources to dominate the membership or to litigate against the foundation. The foundation hosted model is therefore acceptable for protocols whose stakes are modest and whose communities are small enough that capture is unlikely. It is not acceptable for a protocol that aspires to mediate the trust relationships of an entire economy.

## 6. Continuity in the Absence of an Owner

A frequent objection to the ownerless model is that it cannot survive the loss of any particular contributor. The objection misunderstands what the model relies on. The model does not rely on any particular contributor. It relies on the existence of a population of contributors that is continually renewed, on a documented process that any contributor can follow, on a canonical repository that any contributor can clone, and on a test suite whose execution is mechanical. The continuity of the protocol depends on the continuity of these structures, not on the continuity of any individual.

The structures themselves are designed for survivability. The canonical repository is mirrored across multiple independent hosting providers. The conformance test suite runs in continuous integration on every commit and is therefore continually verified. The reference implementation is similarly continually verified and is permissively licensed so that any party may take it over if its current maintainers depart. The specification is published in formats that have been stable for decades and that require no proprietary tooling to read or to edit.

Continuity in the absence of an owner is not a hope. It is the engineered property of a system whose every load bearing component has been designed to be replaceable.

## 7. Conclusion

The Open Agent Protocol is governed without an owner because a protocol that arbitrates trust between competing agents cannot afford to have an owner. Ownerlessness is the architectural property that distinguishes a substrate of the Agent Economy from a product of the Agent Economy, and it is the property that the protocol's design has been organized to preserve. The mechanisms by which ownerlessness is operationally maintained, namely the request for comments process, the Working Group structure, the conformance test suite, the reference implementation, the two implementations requirement, the public objection record, and the right to fork, are mechanisms with long histories in adjacent communities and proven track records. The community of contributors who at any given moment do the work of maintaining the protocol is referred to as the OAP community, and OAP communityhip is a function of contribution rather than of accreditation. The result is a governance model that is suitable to the stakes of the Agent Economy and that is structurally resistant to the capture patterns that have historically converted neutral standards into instruments of incumbent advantage. The position aligns with the argument of Floridi (2019) that trustworthy AI infrastructure must be architecturally neutral rather than institutionally neutral: the trustworthiness of a substrate that mediates every other relationship cannot rest on the goodwill of its steward, only on a process that no steward can corrupt.

## References

[OAP-CORE-1.0](/spec). The Open Agent Protocol Core Specification.

[RFC 0016](/rfcs/0016): User Sovereignty Charter. Defines the user-facing principles whose enforcement the governance model must preserve across protocol revisions.

[RFC 0019](/rfcs/0019): Conformance Testing and Implementability. Defines the test suite that operationalizes the protocol's semantics and that disciplines proposed changes through the implementability and backward compatibility gates.

Related whitepapers: [Verifiable Conformance](/papers/verifiable-conformance), [Interoperability Versus Platforms](/papers/interoperability-versus-platforms), [Accountability in the Agent Economy](/papers/accountability-in-the-agent-economy).

IETF RFC 7282. On Consensus and Humming in the IETF. Internet Engineering Task Force, 2014.

IETF RFC 8890. The Internet is for End Users. Internet Engineering Task Force, 2020.

Open Agent Protocol Code of Conduct and Maintainers Charter, available in the canonical repository.

Floridi, L. (2019). Establishing the rules for building trustworthy AI. *Nature Machine Intelligence* 1(6). The argument that trustworthy AI requires governance structures that cannot be corrupted by incumbent interests, mirrored in this paper's case for ownerlessness as an architectural property rather than an institutional choice.

Floridi, L., Cowls, J., Beltrametti, M., Chatila, R., Chazerand, P., Dignum, V., Luetge, C., Madelin, R., Pagallo, U., Rossi, F., Schafer, B., Valcke, P., Vayena, E. (2018). AI4People: An Ethical Framework for a Good AI Society. *Minds and Machines* 28(4). The five-principle framework (Beneficence, Non-maleficence, Autonomy, Justice, Explicability) mapped to OAP artifacts in RFC 0016 §5 and RFC 0028 Annex B.

Floridi, L. (2018). Soft ethics, the governance of the digital and the General Data Protection Regulation. *Philosophical Transactions of the Royal Society A* 376. The hard versus soft ethics distinction that grounds the architectural separation between the four hard policy layers and the optional soft preference advisories of the Safety and Policy Stack paper.

Hall, W. and Pesenti, J. (2017). *Growing the Artificial Intelligence Industry in the UK*. Independent Review for the UK Government, Department for Digital, Culture, Media & Sport and Department for Business, Energy & Industrial Strategy. The Hall-Pesenti recommendation of Data Trusts (data held in trust on behalf of multiple beneficiaries under shared stakeholder governance) is the institutional precedent for the ownerless governance model of this paper, in which the protocol's evolution is held by no single owner and the User Sovereignty Charter (RFC 0016) and Conformance Test Suite (RFC 0019) constitute the protocol's beneficiary obligations and audit instruments respectively.
