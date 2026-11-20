# StudyFlow Student Privacy Implementation

Review date: 19 November 2026

## Implementation summary

The existing Express/SQLite architecture is retained. The changes add an additive consent table, explicit core-service acceptance, authenticated consent APIs, fuller per-account export, study-record and challenge-history deletion controls, and short retention for temporary challenge material. Existing data is not reset or overwritten.

AI providers remain pending. The backend approval registry continues to block student prompts, images and documents before provider calls. No provider is silently substituted. The Settings page says why content processing is unavailable and allows clearing saved browser AI settings.

## Database and API changes

- `privacy_consents` stores the core-service purpose, consent-notice version and UTC Unix timestamp, uniquely per user and version.
- `challenge_daily_claims` preserves one official submission per user and IST day even if a score is deleted. Existing challenge results are backfilled additively. Old markers and expired challenge sessions are cleaned hourly.
- New notification preference rows default to off; existing preference rows remain unchanged.
- `GET /api/privacy/consent` and `PUT /api/privacy/consent` view and record the current core-service acceptance.
- `DELETE /api/data` requires confirmation and removes only the signed-in user's study records.
- `DELETE /api/challenge/history` requires confirmation, removes only that user's challenge scores/attempts/summary/challenge notifications, and retains today's minimal replay marker.
- `GET /api/account/export` is still authenticated and now includes notifications, preferences, consent records and daily claim markers alongside profile, study and challenge history. The browser adds its local AI provider preferences.
- Existing `DELETE /api/account` remains password-confirmed; foreign keys remove the user's active SQLite data.

## Data minimization and security

- New optional notification preferences are off by default; existing choices are preserved because the database cannot distinguish old defaults from deliberate choices.
- No age, school name, photo or study detail is newly collected. School and photo remain optional existing fields.
- Student-content AI remains blocked by the backend while provider approvals are pending. An AI connection test is not a student-content approval and uses only a fixed non-student prompt.
- Export is user-scoped, uses a consistent SQLite read transaction and `Cache-Control: no-store`; credentials, raw session tokens and answer keys are excluded.
- Bulk deletions are authenticated, scoped to the account, confirmed, rate-limited and guarded by the same-origin middleware.

## India legal issue-spotting

This is not legal advice or a compliance certification. The operator's legal identity, service model, intended user ages and production region are unknown. Official MeitY and India Code sources could not be retrieved by the available tools on the review date (403/unavailable); exact provision commencement and current legal applicability therefore remain unresolved.

| Topic | Assessment |
|---|---|
| DPDP Act 2023 | Enactment alone should not be treated as proof that every substantive provision is in force; commencement notifications must be checked provision by provision. StudyFlow likely determines purposes for account/study features, but the operator identity and legal role are unknown. Implement with notice, purpose limitation, security and user controls in mind; obtain counsel review of current effective duties |
| DPDP Rules/notifications | Verify the official Gazette/MeitY rules and every staged effective date before launch. This review does not assert which rules or sections are currently operative |
| IT Act 2000 and SPDI Rules 2011 | Password information is a specific issue for counsel to analyze. Whether the operator is covered and how SPDI requirements interact with DPDP commencement/repeal provisions must be confirmed from current official texts |
| Children | Classes 7–12 include likely minors, but no age is collected and no guardian flow exists. Determine eligibility and implement legally reviewed age/guardian controls before knowingly enrolling children |
| CERT-In directions | The official 28 April 2022 direction (paragraph 2(iv)) states a 180-day secure log-retention requirement for covered organizations and Indian-jurisdiction storage. StudyFlow's operator coverage and host capability are unverified; repository logs do not establish this operational requirement |
| Hosting, backups, transfers | Provider and region are pending; no residency, encryption-at-rest, backup or cross-border-transfer claim is made |

Potential DPDP obligations to map against the actual commencement notices include notice and consent quality, purpose-limited processing, withdrawal, security safeguards/breach response, grievance handling, erasure, and child-data safeguards. Potential SPDI Rules issues include a published privacy policy, purpose/necessity and prior consent for covered sensitive data (including passwords), limits on disclosure/transfers, retention and reasonable security. Those are issue areas for counsel, not a finding that each provision currently applies to this unknown operator.

Primary official references: [MeitY Data Protection Framework](https://www.meity.gov.in/data-protection-framework), [India Code](https://www.indiacode.nic.in/), [e-Gazette of India](https://egazette.gov.in/), and the [CERT-In Directions under section 70B(6)](https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf). The CERT-In PDF was retrievable; the other official current texts could not be retrieved during this review.

## Unresolved launch decisions

1. Name the operator and publish a monitored privacy/contact channel.
2. Obtain Indian counsel's opinion on the DPDP Act/Rules commencement timeline, SPDI applicability, notice/consent requirements, and transitional duties as of launch.
3. Decide whether minors may use StudyFlow; add age/guardian controls if required.
4. Define retention for accounts, study records, results, notifications, database files, backups and infrastructure logs.
5. Select hosting/backup providers and verify regions, access controls, retention and deletion.
6. Keep AI content processing disabled until provider contracts, data locations, retention, user notices, optional consent/withdrawal and server-side preference enforcement are approved and tested.
7. Decide how existing accounts without a recorded consent version will be notified or asked to accept before public service.

## Verification

See the task completion report for the exact test, dependency-audit, syntax and diff-check results. No deployment or production-data operation was performed.
