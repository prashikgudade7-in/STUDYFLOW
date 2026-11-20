# StudyFlow Development and AI Coding Rules

These rules apply to developers and AI coding agents working in this repository. Read [MEMORY.md](./MEMORY.md), this file, and the relevant product, architecture, design, and task documents before significant work. Current code is authoritative when documentation is stale.

## 1. General rules

1. Inspect the relevant implementation and tests before changing code.
2. Check `git status` first. Preserve staged, unstaged, and untracked user changes.
3. Make surgical changes that address the requested behavior; do not rewrite unrelated modules.
4. Preserve established UX, API compatibility, and data unless an intentional breaking change is approved.
5. Use JavaScript ES modules and follow existing names, formatting, and patterns.
6. Do not invent files, functions, endpoints, dependencies, tables, or supported behavior.
7. Prefer existing platform and package capabilities; do not add dependencies without need.
8. Keep errors observable and avoid logging credentials, tokens, private prompts, or user content.
9. Do not deploy, publish, push, or commit without explicit permission.
10. Explain significant API, schema, security, or UX changes and update the relevant documentation.

## 2. Security rules

1. Never store plaintext passwords, session tokens, API keys, or other credentials in source, logs, SQLite, or browser persistent storage.
2. Never trust client-supplied identity, ownership, permissions, class band, official score, elapsed time, or official challenge date.
3. Use prepared/parameterized SQL for values; allowlist any dynamic SQL identifiers.
4. Include authenticated owner scope in reads, updates, and deletes of user-owned records.
5. Validate types, sizes, formats, and expected object shapes for untrusted request data.
6. Preserve cookie security, session expiration/invalidation, origin checks, and route-specific rate limits.
7. Keep AI provider destinations fixed or strictly validated; reject unsafe redirects and avoid SSRF regressions.
8. Keep uploaded files bounded, validate format/content, and avoid unnecessary disk persistence.
9. Do not return stack traces, SQL details, provider response bodies, or secrets to clients.
10. Treat frontend escaping and CSP as separate protections; do not interpolate untrusted values into HTML without escaping.
11. Do not claim security certification. Record remaining limitations accurately.

## 3. Database rules

1. Preserve existing user and challenge history.
2. Prefer additive schema changes with appropriate indexes, constraints, and foreign keys.
3. Use SQLite transactions for multi-step changes that must succeed or fail together.
4. Enable and preserve foreign-key enforcement and owner scoping.
5. Consider SQLite persistence, WAL behavior, backups, restore procedures, and concurrency.
6. Do not put database contents or test-user information in source control or documentation.
7. Use isolated temporary databases for tests that exercise persistence or authentication.

## 4. Frontend rules

1. Preserve the existing design and responsive behavior unless a redesign is requested.
2. Keep API secrets out of frontend persistent storage; a user-entered provider key must remain transient.
3. Escape untrusted text and preserve semantic controls, labels, keyboard focus, and status announcements.
4. Treat UI-side scores and validation as display behavior only where the server owns an authoritative decision.
5. Keep API request/response behavior aligned with the route and controller implementation.

## 5. Testing rules

1. Add focused regression cases for new security-sensitive behavior or fixed bugs.
2. Run the smallest relevant test first, then `npm test` when project-wide interactions may be affected.
3. Run `npm audit --omit=dev` for dependency/security work and when release-readiness requires it.
4. Use only mock credentials and isolated test databases; do not use production accounts or data.
5. Never claim a test, audit, browser check, build, or deployment passed unless it actually ran.
6. Document test coverage gaps separately from passing results.

## 6. Git and file-safety rules

1. Do not revert, overwrite, stage, or delete unrelated changes.
2. Inspect an existing file before replacing it.
3. Use the smallest patch that preserves the user's intended modifications.
4. Do not commit unless asked. If creating a commit is explicitly approved, include the required project co-author trailer.
5. Never include secrets or generated database contents in commits.

## 7. Deployment rules

1. Never deploy without explicit authorization.
2. Configure secrets through the platform's environment-variable/secret store, not source files.
3. In production, set `NODE_ENV=production`, HTTPS `APP_ORIGIN`, accurate `TRUST_PROXY`, a dynamic `PORT`, and durable `STUDYFLOW_DB_PATH`.
4. Verify secure cookies, HTTPS termination, HSTS, health checks, graceful shutdown, and database persistence with the actual hosting provider.
5. Do not present an untested proxy or SQLite volume configuration as production-verified.

## 8. Documentation rules

- Keep product requirements in [PRD.md](./PRD.md), implementation details in [ARCHITECTURE.md](./ARCHITECTURE.md), visual standards in [DESIGN.md](./DESIGN.md), work status in [TASKS.md](./TASKS.md), and durable decisions in [MEMORY.md](./MEMORY.md).
- Clearly label actual behavior, verified behavior, proposals, and unknowns.
- Update affected documents after significant changes; do not duplicate large source excerpts.
- Keep all documentation free of credentials, private user data, and unverifiable claims.
