# Database Documentation

## Initialization

The application creates `data/studyflow.db` automatically on startup. `data/` is excluded from Git and any existing database must not be committed.

Set `STUDYFLOW_DB_PATH` to an absolute or project-relative SQLite path. Relative paths are resolved from the project root.

## Main tables

- `users`: account profile and password data.
- `sessions`: hashed session tokens and expiry data.
- `privacy_consents`: recorded core-service consent.
- `records`: study records owned by a user.
- `challenge_attempts`: completed challenge results.
- `challenge_sessions`: pending challenge questions and status.
- `challenge_daily_claims`: daily challenge claim state.
- `login_attempt_limits`: identifier-based login abuse state.
- `notifications`: user notification records.
- `notification_preferences`: notification settings.

Foreign keys are enabled and account deletion removes dependent records.

## Resetting local test data

Stop the server, remove `data/studyflow.db` and its `-wal`/`-shm` files if they exist, then start the server again. This deletes local accounts and records.
