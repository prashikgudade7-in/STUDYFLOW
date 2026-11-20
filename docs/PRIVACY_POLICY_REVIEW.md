# Privacy Policy Review

## Baseline review (before implementation)

Reviewed the StudyFlow source tree on 2026-11-19. This is a technical review, not legal advice or a determination that StudyFlow complies with any law.

### Confirmed data flows

- Registration collects name, username, email address, class (7-12), board, and a password that is stored as a PBKDF2 hash with a per-user salt.
- The profile can also store school, photo, and timezone. User-created study records are stored in SQLite as JSON and can contain free-form study information.
- Challenge attempts and results, including selected answers and scores, are associated with the signed-in user and retained in SQLite.
- Sign-in uses a random session token in an HttpOnly, SameSite=Lax cookie. The cookie is Secure on HTTPS and currently has a fixed 14-day lifetime. SQLite stores only a hash of the token.
- The login form shows a checked “Keep me signed in” checkbox, but the client does not send its value and the server does not use it.
- The application has no analytics or advertising SDK, tracking pixel, or service worker identified in the reviewed source. The login cookie is required for authenticated features. The browser also stores AI provider/model/Azure endpoint preferences in localStorage; no API key is stored there.
- AI provider credentials are held in browser memory, sent to StudyFlow for a request, and forwarded by the server to the provider selected by the user. Prompts and optional images may therefore be disclosed to that provider. The application does not intentionally save the key, prompt, or image in its SQLite database; provider-side retention and processing are outside the repository’s evidence.
- The PDF endpoint processes uploads in memory, enforces a 20 MiB input limit, and returns extracted text up to 60,000 characters. The endpoint does not intentionally persist the uploaded PDF.
- The sign-in page loads DM Sans and Manrope from Google Fonts. This makes a direct browser request to Google infrastructure; the request can expose connection metadata such as an IP address and user-agent.
- The authenticated leaderboard returns usernames, class information, profile photos, and scores to signed-in users.

### Gaps and risks observed

| Priority | Finding | Evidence / impact |
|---|---|---|
| HIGH | No user-facing privacy notice, terms, cookie information, or operational privacy contact was found. | Users cannot review a complete notice before providing account and study information. The codebase does not establish an operator identity, support address, registered address, or grievance contact. |
| HIGH | Student accounts may belong to minors, but age/guardian controls are not present. | Registration supports classes 7-12. Legal applicability, age gating, parental consent, and any child-data restrictions require owner and counsel review. |
| HIGH | Retention, account deletion, and export are not fully defined or implemented. | Account, study records, and challenge history can remain in SQLite indefinitely. There is no self-service account deletion or complete data export. |
| MEDIUM | AI-provider disclosures are incomplete in the UI. | The interface says a key is sent to StudyFlow “only” for a request, but does not say StudyFlow forwards the key and request content to the selected provider. |
| MEDIUM | Google Fonts is a third-party browser data flow. | The app loads fonts from Google on the sign-in page; no consent/third-party disclosure is present. No tracking purpose was found, but external processing and jurisdictional implications need review. |
| LOW | “Keep me signed in” is not functional. | The checkbox does not affect the fixed 14-day cookie/session lifetime and can mislead users about persistence. |
| MEDIUM | Accessibility gaps affect keyboard and motion-sensitive users. | The modal does not trap or restore focus; no reduced-motion override was found; focus indication uses translucent color; generated delete controls have no accessible name; dynamic authentication errors are not announced. |
| MEDIUM | Local provider-logo rights and provenance are unverified. | `public/logos/README.txt` describes different formats/files than those in the current repository and does not provide complete per-asset license evidence. |
| INFORMATIONAL | No optional tracking cookie or analytics consent mechanism was identified. | Do not add a consent banner solely on assumption. Reassess after owner/legal review and before adding optional analytics or marketing technologies. |

### Configuration and decisions required before publication

- Legal entity/operator name, service address, privacy/support email, and any required grievance contact.
- Which countries and user groups the service will serve, especially whether minors can register.
- A documented retention schedule, deletion/export process, backup lifecycle, and response ownership.
- Provider-specific AI privacy/retention terms, transfer locations, and the intended controller/processor roles.
- Whether Google Fonts should remain externally hosted or be self-hosted.
- Verified provenance and redistribution rights for each provider logo.
- Counsel review of applicable Indian privacy, consumer, copyright, and child-safety requirements, including commencement dates and rules in force on the publication date.

No source or policy files were changed as part of this baseline review.

## Changes made after the baseline

- Added draft Privacy, Terms, and Cookie pages and made them reachable from the sign-in and application footers. The pages explicitly identify missing operator/contact details and require owner and counsel review.
- Corrected the AI disclosure in the UI and README: StudyFlow forwards the selected provider credential, prompt, and optional image to the provider. Provider-side retention and processing remain unverified.
- Connected the “Keep me signed in” checkbox to cookie persistence. Checked uses a 14-day cookie; unchecked uses a browser-session cookie; the server-side session remains capped at 14 days. Added isolated unit coverage.
- Reduced PDF extraction log data to the error class rather than the parser's free-form error message.
- Added modal focus trapping and focus restoration, reduced-motion handling, stronger focus outlines, accessible names for key controls, and live status announcements.
- Removed the direct Google Fonts browser requests by self-hosting DM Sans and Manrope under their verified SIL Open Font License, included at `public/fonts/OFL.txt`.
- Replaced provider-logo images with text labels and initials; the unverified PNG assets are no longer used.
- Added authenticated JSON export and password-confirmed account deletion. Account deletion cascades through active SQLite profile, session, study-record, and challenge data; backups and third-party copies are not removed by the application.
- Added versioned, affirmative core-service acceptance at account creation and a settings flow for legacy accounts. Acceptance is not backfilled for existing users; account deletion removes the consent record as the core-processing withdrawal route.
- Expanded the authenticated export to include notifications, notification preferences, recorded consent, challenge replay markers, and browser AI provider preferences, while excluding authentication secrets and answer keys.
- Added confirmed user-scoped bulk deletion of study records and challenge history. A current-day anti-replay marker remains until the IST date changes; expired question/answer attempt rows are removed by hourly cleanup.
- Set newly created notification preference rows to off, including on existing database files, while preserving all previously stored choices.
- Kept student-content AI disabled; added a Settings explanation and a control to clear browser-stored provider/model/endpoint preferences and the in-memory key.
- Added a server-side AI provider approval registry with all provider/content categories pending. Student-data provider calls are blocked in both the frontend and backend until all categories have recorded approval, verification dates, and evidence.
- Preserved provider configuration testing through a separate authenticated endpoint that rejects user content and sends only a fixed non-student test prompt.
- Documented why no optional cookie banner was added: the reviewed frontend showed only the required authentication cookie and a non-cookie AI preference; it showed no analytics or advertising tracker.

## Remaining owner and counsel actions

No final legal compliance conclusion is made. The project still needs an identified operator and privacy contact, a retention and backup-deletion policy, an owner-approved age policy and any applicable age/guardian controls, provider approval and region review, host/log/backup configuration, and qualified legal review. See [INDIA_LEGAL_COMPLIANCE_AUDIT.md](./INDIA_LEGAL_COMPLIANCE_AUDIT.md) for the Gazette-verified staged DPDP Act and Rules schedule.

## Legal and operational reassessment (2026-11-19)

**VERIFIED:** G.S.R. 843(E) and G.S.R. 846(E), both published 13 November 2025, stage commencement across 13 November 2025, 13 November 2026, and 13 May 2027. As of this review, sections 3-17 of the DPDP Act and Rules 3, 5-16 (including the child-consent Rule 10) are scheduled for 13 May 2027; do not state that the full Act or Rules are already in force. IT Act section 43A remains unrepealed under the same schedule until section 44(2) commences on 13 May 2027. See the audit for provision-level detail, official Gazette links, and conditional CERT-In/SPDI analysis.

**VERIFIED:** The registration flow allows classes 7-12, has no age/date-of-birth check, and has no age-assurance or guardian workflow. No intended minimum age is established by the reviewed source or owner decisions. The public privacy notice's 18+ assertion is unsupported by the inspected account flow and must be reconciled before publication; do not infer or invent an age policy.

**VERIFIED:** New-account acceptance is versioned, but existing users are not backfilled, automatically marked as consented, or blocked. No proactive legacy-user notice or re-acceptance campaign was identified. No optional AI consent is collected; student-content AI remains blocked by backend enforcement. Any future notice or consent workflow requires owner and counsel review and must not silently treat existing accounts as opted in.

**PENDING:** Hosting provider, application region, database region, backup region, log storage region, backup retention, log retention, and administrative access arrangements. These remain unknown; do not publish assumed locations or retention periods. AI approval remains **PENDING** separately for text prompts, images, and PDFs/document-derived content for every provider.

The policy pages remain drafts pending owner decisions, evidence for operational arrangements, and qualified legal review. This assessment is not a compliance determination.
