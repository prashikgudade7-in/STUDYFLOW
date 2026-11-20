# StudyFlow Product Requirements

## 1. Product overview

StudyFlow is a full-stack study companion for students. It combines academic planning, personal study records, practice activities, progress summaries, and optional AI assistance in one responsive web application.

The current interface targets students who want to organize coursework and build steady learning habits. Registration asks for a class (grades 7–12) and a school board, which lets the interface tailor some learning and profile displays. The application is not currently an institution, teacher, or classroom management system.

## 2. Product vision

The product direction is a student-focused productivity ecosystem that makes it easier to plan, practise, and reflect. The implemented product supports that direction through task and timetable planning, a personal calendar, focus sessions, learning practice, challenges, and optional AI tools.

This document distinguishes features visible in the current repository from proposals. Ideas in the roadmap are not commitments and must not be presented as shipped functionality.

## 3. Target users

| User | Needs addressed by current product |
|---|---|
| Students in grades 7–12 | Organize tasks, timetable activities, events, goals, and study sessions; review personal progress. |
| Students practising independently | Use English and maths practice, quick revision, and daily challenge activities. |
| Students who choose to configure an AI provider | Request explanations, dictionary assistance, or question generation from provided material. |

## 4. Implemented product capabilities

These are supported by the current frontend, backend, and database:

- Account signup, login, logout, and cookie-backed sessions.
- A profile with name, username, email, class, board, school, timezone, and photo fields.
- User-owned records for tasks, timetable activities, events, focus sessions, goals, saved words, and achievements.
- Dashboard, calendar, task list, timetable, study statistics, goals, streak summaries, and focus timer.
- Local English and maths practice with progress counters.
- Quick revision from pasted material, text/PDF extraction, or an uploaded image sent to a configured vision-capable AI adapter.
- Optional AI assistant and dictionary workflows, using one of the configured provider adapters.
- Official daily challenge attempts and practice rounds. Official attempt questions, answer keys, scoring, attempt ownership, expiry, replay prevention, and leaderboard date keys are server controlled. The official timezone is `Asia/Kolkata` (IST).
- Daily, weekly, and monthly leaderboards, with class-group filters.
- An authenticated, persisted notification drawer with unread/important/type filters, read and delete controls, clear-all confirmation, category preferences, and an unread badge. Verified official challenge results create deduplicated challenge notifications; other event categories are not generated until trusted event sources exist.

The backend's accepted record `kind` values are `task`, `timetable`, `event`, `session`, `goal`, `saved_word`, and `achievement`. Record payloads are JSON objects; the frontend defines their currently used fields.

## 5. Functional requirements

| ID | Requirement | Current status |
|---|---|---|
| FR-001 | A student can create an account with a unique username and email, class, board, and password. | Implemented |
| FR-002 | A student can sign in and out using an opaque, cookie-delivered session identifier. | Implemented |
| FR-003 | A student can read, create, update, and delete only their own study records. | Implemented in API queries |
| FR-004 | A student can manage profile details and view profile information. | Implemented |
| FR-005 | A student can plan tasks, timetable activities, and calendar events. | Implemented |
| FR-006 | A student can record focus sessions and review personal study activity. | Implemented |
| FR-007 | A student can set a study goal and review goal and streak summaries. | Implemented |
| FR-008 | A student can practise English and maths and view practice counters. | Implemented; practice scoring is client-side |
| FR-009 | A student can make revision questions from material using local logic or a connected AI provider. | Implemented |
| FR-010 | A student can request AI assistance or dictionary explanations using a configured provider. | Implemented |
| FR-011 | A student can extract selectable text from an uploaded PDF for revision. | Implemented |
| FR-012 | An authenticated student can start and submit a server-issued challenge attempt. | Implemented |
| FR-013 | The server calculates official challenge results and IST day/week/month keys and prevents attempt replay. | Implemented |
| FR-014 | A student can view leaderboard results by period and class group. | Implemented |
| FR-015 | A user can recover a forgotten password, verify an email address, or enroll in MFA. | Not implemented |
| FR-016 | An authenticated student can view, filter, mark, star, delete, and clear persisted notifications, and manage notification-category preferences. | Implemented; official challenge results are the only current notification producer |
| FR-017 | Notification event records are created only from verified events and are not duplicated on refresh or retry. | Implemented for official server-scored challenge results; other event sources are not yet authoritative |

## 6. Non-functional requirements

The following are product requirements, not claims that every target has already been measured:

- **Security:** Authenticate protected endpoints, scope user records to the authenticated user, validate untrusted input, use parameterized SQL, protect state-changing requests with origin checks, and keep AI provider destinations constrained.
- **Reliability and data integrity:** Preserve user records, use SQLite foreign keys, transact challenge consumption and scoring, and configure durable storage for deployments.
- **Performance:** Keep request and upload limits bounded and avoid unbounded response payloads. Response-time targets have not yet been defined or benchmarked.
- **Maintainability:** Continue using the current ES-module, route/controller/service organization and focused Node.js tests.
- **Accessibility:** Use semantic controls, visible keyboard focus, labels, and accessible status announcements; run a complete assistive-technology and contrast audit before claiming conformance.
- **Responsiveness:** Preserve desktop navigation and the mobile bottom-navigation layout across current CSS breakpoints.
- **Scalability and availability:** Define capacity, multi-instance, monitoring, recovery, and service-level requirements before selecting a production topology. SQLite and the process-local IP limiters are not a horizontally scaled shared service by themselves.
- **Privacy:** Explain third-party AI data flows and establish a retention policy for account records, challenge attempts, and backups.
- **Notifications:** Keep notification reads and mutations scoped to the authenticated user, validate internal actions, and do not infer study progress or achievements from client-controlled records.

## 7. Security requirements

### Implemented controls

- Passwords are PBKDF2-HMAC-SHA256 hashes with per-user random salts.
- Session tokens are random, stored as SHA-256 hashes, and delivered in HttpOnly, SameSite=Lax cookies. Sessions expire after 14 days and are deleted on logout or by cleanup.
- Authenticated API routes derive user identity from the session; record and challenge operations include user ownership in their database queries.
- Mutating API requests require an `Origin` matching `APP_ORIGIN`.
- Route-specific IP rate limits and a SQLite-backed login identifier limit are present.
- SQLite queries use prepared statements; foreign keys are enabled.
- AI calls use approved HTTPS provider hosts, reject redirects, validate the configurable Azure resource origin, and apply request/response bounds.
- Challenge official results and periods are calculated server-side.

### Verified gaps to track

- The CSP allows `'unsafe-inline'` for scripts and styles.
- Records are limited to 1 MiB each, but there is no cumulative per-user record count or storage quota.
- An unknown API route can reach the static frontend fallback rather than a dedicated JSON 404 handler.
- Password reset, email verification, and MFA are not implemented.
- Backups, restore drills, monitoring, and a production retention policy are not implemented in the repository.

These gaps should be prioritized and addressed before making a production security or compliance claim.

## 8. Proposed roadmap

The following are proposals, not implemented product features:

1. Establish per-user storage quotas and abuse limits.
2. Reduce inline-script/style requirements and strengthen the CSP.
3. Return explicit JSON 404 responses for unknown `/api` endpoints.
4. Define tested database backup, restore, retention, and monitoring procedures.
5. Evaluate password recovery, email verification, and MFA based on product needs.
6. Add a complete accessibility review and production load testing.

See [TASKS.md](./TASKS.md) for statuses and acceptance criteria, and [ARCHITECTURE.md](./ARCHITECTURE.md) for implementation details.

## 9. Release acceptance criteria

A release is ready for its intended environment when:

- Existing automated tests pass, and new security-sensitive behavior has focused regression tests.
- Production environment settings, HTTPS termination, trusted proxy settings, cookie behavior, and persistent database path are verified.
- Database backups can be restored using a documented and tested procedure.
- Unknown API routes return a documented API error format.
- Storage limits, privacy/retention behavior, and AI provider data flow are documented.
- No unresolved critical/high findings remain from a scoped security review.
- Accessibility, responsiveness, and core workflows are checked on supported browsers and screen sizes.
- Deployment is explicitly authorized by the project owner; this documentation does not authorize deployment.
