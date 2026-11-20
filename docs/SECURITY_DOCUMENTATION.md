# Security Documentation

## Implemented controls

- Password hashing with PBKDF2-HMAC-SHA256 and random salts.
- Session tokens stored by SHA-256 hash rather than plaintext.
- HttpOnly, SameSite session cookies.
- Cross-origin request validation for mutating API requests.
- Per-IP and login-identifier rate limiting.
- Parameterized SQLite queries.
- Security headers, including CSP and frame-ancestors protection.
- Account deletion and account-data export endpoints.
- AI student-data approval gates.

## Known limitations

- This submission is a local prototype, not a production deployment certification.
- Rate limits stored only in process memory require shared controls in multi-instance deployments.
- Provider terms and student-data approvals remain unresolved until recorded in `AI_PROVIDER_APPROVAL_REGISTER.md`.
- Email verification and password reset are not implemented.
- The SQLite database and process server require a trusted local operator.

## Secret handling

The repository must not contain `.env`, real API keys, private certificates, session secrets, or personal databases. AI keys are entered per browser session and must not be committed.
