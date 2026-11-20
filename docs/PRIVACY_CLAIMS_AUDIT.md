# Privacy Claims Audit

Review date: 2026-11-19

## User-facing claims reviewed

| Location / claim | Evidence | Status |
|---|---|---|
| AI setup previously did not fully disclose the provider data flow. | Student-data requests are blocked until provider/category approvals are documented. A separate connection test sends only a fixed test prompt and the selected key. | **Updated:** the interface and notices describe the pending status, the blocked student-data flow, and the limited connection test. |
| AI key is not stored in localStorage or SQLite. | Frontend holds the key in application memory; localStorage stores provider/model/Azure endpoint preferences; no AI credential column was found. | **Supported by source inspection**, but not an absolute guarantee for browser extensions, hosting logs, provider-side retention, or future code. |
| “Keep me signed in.” | Previously the checkbox was not submitted and all cookies were persistent. | **Corrected:** the checked preference requests a 14-day cookie; unchecked requests a browser-session cookie. Both database sessions expire within 14 days. |
| “Privacy notice and Terms” before account creation. | The new pages identify missing operator details and incomplete legal review. | **Explicitly marked draft:** these are not final policies; the signup copy warns users not to enter sensitive personal information in this build. |
| Cookie inventory and tracking. | Source review found the first-party session cookie and AI preference localStorage; no analytics/advertising SDK, pixel, or service worker. Fonts are now self-hosted. | **Qualified:** no optional tracking cookie found in source; host configuration and provider behavior remain unverified. No consent banner was added on this evidence. |
| Google Fonts third-party request. | The original sign-in page loaded fonts from Google. | **Removed:** DM Sans and Manrope are now self-hosted, with the SIL Open Font License included. |
| Data retention, export, and deletion. | Authenticated users can export profile, study records, challenge history/claims, notifications/preferences, consent, and browser AI settings; clear study records or challenge history; or password-confirm delete the account. | **Partially implemented.** Expired attempt payloads are cleaned hourly, and current-day replay markers remain temporarily. No general retention schedule or backup/provider-side deletion is enforced. Public policy pages must retain these limitations. |
| Security and privacy assurance. | Password hashes, hashed session tokens, origin checks, rate limits, secure cookie flags, and error handling are present. | Do not describe the app as certified, fully secure, legally compliant, or production-ready based only on this code review. |

## Remaining substantiation work

- Validate public claims against actual host logs, backups, AI provider settings, and current provider contracts.
- Complete the privacy contact, operator identity, retention schedule, request process, and child-user policy.
- Confirm every enabled AI provider and the allowed data categories before launch.
- Re-review all pages after those operational details are supplied.
