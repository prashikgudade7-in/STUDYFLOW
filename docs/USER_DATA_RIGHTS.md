# StudyFlow User Data Controls

Review date: 19 November 2026

These are technical controls available in the current application, not a representation that every right or deadline under a particular law has been satisfied.

## View and export

- The signed-in app loads the user's profile and study records through authenticated APIs.
- Settings provides **Download my data**. The account export is authenticated, rate-limited, uses the session owner's ID in every query, and is sent with `Cache-Control: no-store`.
- Export includes profile fields, study records, completed challenge results, current anti-replay claim markers, notifications, notification preferences and recorded core-service consent.
- The browser adds its saved AI provider/model/endpoint preferences. API keys are not stored in localStorage and are not exported.
- Password hashes/salts, session tokens/hashes, login-limit hashes, and question answer keys are intentionally excluded.

## Delete

- Individual study records can be removed from their feature interface.
- Settings offers **Delete study records**, which requires confirmation and deletes only records owned by the signed-in account.
- Settings offers **Delete challenge history**, which removes that account's challenge scores, attempt question sets and challenge notifications. If an official challenge was already completed today, a minimal current-day claim remains until the IST date changes and scheduled cleanup runs; this prevents deleting a score and replaying for a replacement leaderboard result.
- **Delete account** requires the current password and deletes the account and its active SQLite rows, sessions, records, challenge data, notification data, preferences and consent record via foreign-key cascades.

Account/data deletion does not erase deployment backups, platform logs, or information already sent to a third party. StudyFlow currently blocks student-content AI requests; provider connection tests are a distinct flow.

## Preferences and consent

- Notification preferences are managed in the authenticated notification drawer. New preference rows default off; pre-existing stored choices are preserved.
- The core data-use notice is separate from optional settings. New registration requires an unchecked affirmative checkbox. Settings displays the current recorded version and lets a legacy account affirmatively record it.
- Withdrawing core-service consent requires account deletion because the consent covers processing needed to operate the account. That action is password-confirmed.
- There is no optional AI consent to withdraw because no provider is approved and no student-content processing is enabled. Users can clear local provider/model/endpoint preferences and the in-memory API key in Settings.
- Browser notification permission is separately controlled by the browser/operating system.

## Security properties

- Export/delete APIs require a valid session.
- Record, challenge, notification, preference and consent database access is scoped to the authenticated user ID.
- Deletion operations validate confirmation and run in the current application origin; account deletion also verifies the password.
- SQL values are parameterized; dynamic SQL in leaderboard filters and preference fields uses server-side allowlists.
- Export excludes authentication secrets and is read from a consistent SQLite snapshot.

## Limitations and owner actions

- No privacy request contact, operator identity or service address is configured.
- Data subject requests beyond the implemented controls need a documented, monitored process and response owner.
- Backup deletion, production logs, hosting region and third-party deletion are not controlled or verified by this repository.
- Correction is currently available for profile fields and individual study records, but there is no dedicated correction-request workflow for every derived value.
- Age/guardian controls are absent; no age is collected. Determine whether minors may use the service before public launch.
- The current privacy notice remains a draft pending owner details and qualified legal review.
