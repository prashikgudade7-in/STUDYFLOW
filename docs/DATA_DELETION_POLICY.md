# StudyFlow Data Deletion Policy

Review date: 19 November 2026

## Purpose

This document states what the repository can delete from the active SQLite database. It does not promise deletion from backups, hosting-provider logs, or third-party systems that the operator has not verified.

## User-initiated deletion

### Individual and bulk study records

`DELETE /api/data?id=<record-id>` deletes one record only when both the record ID and authenticated `user_id` match. `DELETE /api/data` requires `{ "confirm": true }` and clears only the authenticated user's `records`. Settings asks for confirmation before the bulk operation.

### Challenge history

`DELETE /api/challenge/history` requires authentication and `{ "confirm": true }`. It deletes the user's result rows, in-progress attempt rows, challenge summary record and challenge notifications. Result deletion therefore removes the corresponding scores from authenticated leaderboards.

For fairness, the server retains a minimal `(user_id, day_key, claimed_at)` marker for a completed official challenge on the current Asia/Kolkata date. It contains no question set, answer key or score and prevents a user from deleting a result and submitting a replacement that day. Hourly cleanup removes markers after the date changes. Older markers are removed during this cleanup.

### Account deletion

`DELETE /api/account` requires a valid session and correct current password. The user row is deleted inside a transaction. SQLite foreign keys are enabled; owned sessions, records, challenge results/attempts, challenge claims, notification data, preferences and consent rows cascade from that account. The browser cookie is cleared after successful deletion.

Deletion is irreversible. It does not remove data from SQLite backups, host/CDN logs, files outside the configured database, or third-party systems.

## Automatic cleanup

| Data | Current cleanup |
|---|---|
| Server sessions | Expired after no more than 14 days; hourly cleanup removes expired rows |
| Login rate-limit identifiers | 15-minute expiry; periodic cleanup |
| Challenge question/answer attempt rows | Expire after the attempt TTL; hourly cleanup removes expired rows |
| Daily anti-replay claim | Retained through the current IST date; hourly cleanup removes claims from prior dates |
| Study records, challenge results, notifications and consent | No automatic age-based deletion; user deletion/clear controls apply |
| AI prompts/images/documents | Not intentionally persisted in SQLite; processing endpoint is blocked while providers remain unapproved |
| PDF upload | Parsed in memory; no intentional file persistence |
| Hosting logs/backups | Provider, location and retention are pending; repository cannot state or execute their deletion |

The cleanup interval can mean expired attempt data remains until the next cleanup run. Production operators must monitor the task and define retention for database backups and infrastructure logs.

## Preservation and integrity

The initialization change is additive. It does not wipe existing accounts, study records, challenge history or preference rows. A migration backfills the new daily-claim table from existing official challenge results so deleting a result does not permit a same-day replay. Existing notification preferences are not rewritten.

Deletion APIs use prepared statements and the authenticated account ID. The application does not accept a client-supplied owner ID for deletion.

## Backups and third parties

No backup provider, schedule, region, retention window or recovery process is configured in the project. Account deletion cannot guarantee backup erasure. No student prompts, images or documents are sent to AI providers while approvals are pending. The separate connection test sends an API key and fixed non-student prompt to a selected provider; vendor-side deletion/retention is unknown.

Before production, the operator must set a backup retention and deletion lifecycle, restrict backup access, test restoration, verify hosting/log retention, and document how deletion requests affect backup copies. Do not claim third-party deletion without provider evidence.
