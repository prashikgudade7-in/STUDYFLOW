# India Legal Compliance Audit

Review date: 2026-11-19

## Scope, evidence and status labels

This is a technical and issue-spotting review, not legal advice, a legal opinion, or a certification of compliance. Applicability depends on the operator, user locations, service model, data purposes, and the provisions and commencement dates in force when the service is launched. The operator must obtain qualified Indian legal advice and verify current official notifications before public deployment.

**VERIFIED** means confirmed from the cited official instrument or inspected repository code as of the review date. **PROPOSED** means a recommended control, not an implemented or legally approved requirement. **PENDING** means owner, vendor, deployment or counsel evidence is missing.

## Issues for owner and counsel

| Area | Source-code evidence | Status |
|---|---|---|
| Operator identity and contact | No legal entity/operator name, service address, privacy contact, or grievance contact is configured. | **Owner input and legal review required.** Do not publish the draft policies without these details. |
| Personal-data notice and processing | The application processes registration/profile data, user-created study records, session/security information, challenge results, notifications and consent metadata. Student-content AI requests remain blocked. New signups record a versioned core-service acceptance. | **Partially implemented.** Acceptance is not a legal-basis determination or compliance finding. The final notice, legal basis, purpose limitation, security and data-principal request duties require counsel review against the phased commencement schedule below. |
| Student and child users | Signup accepts classes 7-12. Neither the browser form nor the server collects date of birth/age or checks age; there is no guardian workflow. The repository and owner decisions reviewed here do not specify an intended minimum age. Under-18 users can register. | **High launch risk; minimum age PENDING.** Do not describe 18+ as an owner-approved policy. Decide eligibility with counsel; implement and verify age/guardian controls before knowingly admitting children where required. |
| Erasure, correction, access, and portability | Settings provides authenticated export, user-scoped study-record/challenge-history clearing, and password-confirmed account deletion. | **Partially implemented.** Export excludes authentication secrets; challenge clearing retains only a current-day anti-replay marker until IST cleanup. Define a verified request channel and backup deletion behavior; active-database deletion cannot erase backups or provider-side copies. |
| AI and other third-party processing | The backend registry has every provider/category set to PENDING and blocks student-content AI requests. A separate connection test sends a fixed, non-student prompt and the user-supplied key. DM Sans and Manrope are self-hosted. | **AI approval PENDING** separately for text, images and documents/PDF-derived content for each provider. Vendor terms, regions, retention and transfer safeguards are not verified. Do not send student content before evidence-based approval and a reviewed notice/consent flow. |
| Cookies and consent | Source review found a necessary authentication cookie and non-cookie localStorage preference; no analytics/advertising tracker was found. | **No optional cookie banner added.** This does not resolve any consent or notice duty for personal-data processing or deployment-added technologies. |
| Copyright and brand assets | Unverified provider-logo images have been removed from the application and replaced by text labels. Provider names remain as integration identifiers. | **Partially addressed.** No affiliation or endorsement is claimed; counsel should review any public use of provider names and marks. |
| Hosting and operational retention | The repository does not establish a selected production host, region, database region, backup/log location or retention, or administrative access arrangement. | **PENDING** until supported by provider/deployment evidence: hosting provider; application region; database region; backup region; log storage region; backup retention; log retention; administrative access arrangements. |
| Security and incident operations | Code has password hashing, hashed session tokens, rate limits, HTTPS-aware cookies, and origin controls. Deployment logging, backups, incident response, and data-retention controls are operator-managed. | **Technical controls do not establish legal compliance.** Document and test operational procedures. |

## DPDP Act and Rules commencement — VERIFIED as of 2026-11-19

The official [Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023)](https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf) was published on 11 August 2023. The Act's staged dates are set by [G.S.R. 843(E), 13 November 2025](https://egazette.gov.in/WriteReadData/2025/267647.pdf), under section 1(2). The final [Digital Personal Data Protection Rules, 2025, G.S.R. 846(E), 13 November 2025](https://egazette.gov.in/WriteReadData/2025/267650.pdf) set a separate staged schedule in Rule 1. Dates below are calculated from the Gazette publication date, 13 November 2025; one year elapsed on 13 November 2026 and eighteen months elapse on 13 May 2027.

| Status on 2026-11-19 | DPDP Act provisions under G.S.R. 843(E) | DPDP Rules under G.S.R. 846(E) |
|---|---|---|
| **Commenced 13 November 2025** | Section 1(2), section 2, sections 18-26, 35, 38-43, and section 44(1) and (3). | Rules 1, 2 and 17-21. |
| **Commenced 13 November 2026** | Section 6(9) and section 27(1)(d). | Rule 4, concerning registration and obligations of Consent Managers. This is not a blanket statement that every StudyFlow/Data Fiduciary duty has commenced. |
| **Not yet commenced; scheduled 13 May 2027** | Sections 3-5; section 6(1)-(8) and (10); sections 7-17; section 27 other than clause (d) of sub-section (1); sections 28-34, 36 and 37; and section 44(2). | Rules 3, 5-16, 22 and 23. This includes the notice and child-consent rules; section 9 and Rule 10 are not operative until this tranche. |

Accordingly, do **not** state that all DPDP Act provisions or Rules are currently in force. The primary operational duties in sections 3-17 and Rules 3, 5-16 are scheduled for 13 May 2027, not the Act's enactment date. The [G.S.R. 892(E) corrigendum](https://egazette.gov.in/WriteReadData/2025/268455.pdf), notified 10 December and published 11 December 2025, corrects text in the English Rules, including the commencement wording; it does not change the three-stage dates. The [Digital Personal Data Protection (Removal of Difficulties) Order, 2026, S.O. 5458(E)](https://egazette.gov.in/WriteReadData/2026/276885.pdf), dated 5 October and published 7 October 2026, corrects wording in sections 9 and 10; it does not accelerate their scheduled commencement.

The Act defines a child as an individual who has not completed 18 years. Section 9 and Rule 10 provide for verifiable parental consent before processing a child's personal data, subject to their commencement on 13 May 2027 and any applicable exemptions. The correction order changes section 9 wording but not this timing. This future schedule does not determine whether other current laws, contractual duties, or sectoral requirements apply to StudyFlow.

## Current other-law issue spotting — conditional, counsel review required

The repeal of Information Technology Act, 2000 section 43A is in DPDP Act section 44(2), which G.S.R. 843(E) schedules for 13 May 2027. As of this review, section 43A has therefore not yet been repealed by that DPDP commencement schedule. The [IT Act, 2000](https://indiacode.gov.in/server/api/core/bitstreams/770a7d02-48f2-4274-bab9-10d0f48ee264/content) and [SPDI Rules, 2011, G.S.R. 313(E)](https://indiacode.gov.in/server/api/core/bitstreams/e9545daf-b012-49cd-a697-388039b9b7e0/content) remain relevant for counsel to assess until then, including whether the operator is a covered body corporate and whether the information it handles falls within the Rules. This is not a finding that every SPDI provision applies to StudyFlow.

The official [CERT-In Directions under section 70B(6), 28 April 2022](https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf), paragraph 2(iv), require covered entities to enable ICT-system logs, retain them securely for a rolling 180 days and keep them within Indian jurisdiction. Counsel and the host must determine coverage and implementation. This conditional log requirement does not by itself establish that StudyFlow's database, backups, application or other data must be hosted in India. The repository does not prove deployment log retention or location.

Other applicable statutes, rules, contractual obligations and exemptions depend on the operator's identity and service model and were not exhaustively assessed. Obtain qualified Indian counsel's advice before making legal conclusions or publishing final terms.

The IT Act section 43A and SPDI Rules remain relevant for counsel to assess until the scheduled repeal date of 13 May 2027. Applicability depends on the operator's status and the data processed; this review does not determine that every SPDI provision applies.

## Age, legacy accounts and operational decisions

**VERIFIED:** Registration accepts classes 7-12 and does not ask for age/date of birth or offer an age-assurance or guardian-consent flow. Under-18 users can register. The reviewed source and owner decisions do not establish an intended minimum age. The draft public privacy notice's 18+ statement is therefore unsupported by the inspected workflow and conflicts with the unresolved product position. Do not treat it as a verified eligibility policy. Decide intended audience and age controls with counsel; assess how to notify and obtain any required parental consent before processing children's data when applicable provisions commence.

**VERIFIED:** New-account acceptance is versioned; existing accounts are not automatically backfilled as accepted and are not blocked. Settings exposes consent status and acceptance, but no proactive legacy-user notice or re-acceptance campaign was found. The repository does not establish a workflow for notifying legacy users of revised notices or obtaining any new optional consent. Do not record existing accounts as opted in. **PROPOSED:** establish a notice/versioning and re-consent process based on counsel's determination of whether a change is material or a new legal basis/consent is required. Student-content AI remains blocked; no optional AI consent is currently solicited.

**PENDING:** hosting provider, application region, database region, backup region, log storage region, backup retention, log retention, and administrative access arrangements. The repository supplies no deployment evidence for these values. Keep them pending until verified from the selected provider and actual production configuration.

## Recommended launch gate

Do not represent the application as legally compliant or ready for public use until the operator supplies identity and contact information, implements and legally reviews age/guardian controls, finalizes retention and backup deletion, verifies AI-provider contracts and data locations, selects hosting and logging practices, and receives qualified legal review of the final policies and implementation.

Related drafts: [Privacy notice](../public/privacy.html), [Terms](../public/terms.html), and [Cookie notice](../public/cookies.html).
