# STUDYFLOW

## AI-POWERED STUDY MANAGEMENT WEB APPLICATION

StudyFlow is a challenge prototype for local demonstration. It combines a Node.js/Express backend, SQLite persistence, and a responsive vanilla JavaScript frontend to provide accounts, study records, challenges, notifications, PDF text extraction, privacy controls, and an approval-gated AI assistant interface.

## Project overview

StudyFlow is designed to give a student a local dashboard for organizing study activity and completing timed challenges.

### Problem statement

Students can benefit from a single interface for study records, daily activity, challenge progress, and notifications.

### Proposed solution

The prototype provides browser-based study-management workflows backed by a local SQLite database and API routes.

### Project objectives

- Provide personal account and session workflows.
- Persist study records and challenge outcomes.
- Support local PDF text extraction.
- Provide privacy, consent, export, and account-deletion controls.
- Keep AI provider credentials and student-data AI requests separated and gated.

### Target users

Students, project evaluators, and developers running the prototype locally.

## Key features

- Registration, login, logout, and session handling.
- Personal dashboard and study records.
- Daily and leaderboard-style challenge features.
- Notifications and notification preferences.
- PDF text extraction.
- Account data export and deletion.
- Privacy notice, terms, and cookie notice pages.
- Optional AI provider connection testing and approval-gated AI requests.

## Technology stack

- Node.js 20+
- Express 5
- SQLite via better-sqlite3
- HTML, CSS, and vanilla JavaScript
- Node test runner
- pdf-parse

## Architecture

See [System Architecture](docs/SYSTEM_ARCHITECTURE.md) for frontend, backend, database, authentication, and AI details.

## Installation requirements

- Node.js 20 or newer.
- npm.
- A local browser and terminal.

## Installation

```bash
npm install
```

## Environment setup

Copy the template:

```bash
copy .env.example .env
```

Available variables:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP listening port |
| `NODE_ENV` | not set | Set to `test` or `production` only for the relevant run |
| `APP_ORIGIN` | `http://localhost:3000` | Allowed local browser origin |
| `TRUST_PROXY` | empty | Exact trusted proxy address/CIDR or hop count |
| `STUDYFLOW_DB_PATH` | `data/studyflow.db` | SQLite database location |

No API key is required for account, dashboard, challenge, notification, or PDF functionality.

## Database initialization

The server creates the SQLite database and schema automatically. It does not include or migrate a real user database.

## Run locally

```bash
npm start
```

Open `http://localhost:3000`.

For development restart support:

```bash
npm run dev
```

## Testing

```bash
npm test
```

Test results are recorded in [Testing Report](docs/TESTING_REPORT.md). Tests use temporary SQLite databases and fictional accounts.

## Folder structure

```text
STUDYFLOW_GITHUB_SUBMISSION/
├── config/       Database initialization
├── controllers/  Request handlers
├── docs/         Project documentation
├── middleware/   Authentication, origin, and rate limiting
├── public/       Frontend and static pages
├── routes/       Express route modules
├── services/     Challenge, AI, notification, and privacy logic
├── tests/        Node test suite
├── utils/        Authentication and session utilities
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── server.js
```

## AI integration

The AI interface supports OpenAI, Gemini, Claude, Azure OpenAI, Perplexity, DeepSeek, xAI Grok, Mistral, Cohere, and Meta Llama adapters. Provider API keys remain request-time browser values and are not stored in localStorage or SQLite.

All providers and text, image, and document student-data categories are currently approval-gated. The backend blocks student-data AI requests until approvals are documented in [AI Provider Approval Register](docs/AI_PROVIDER_APPROVAL_REGISTER.md). Provider connection tests use a fixed non-student prompt.

## Prototype demonstration

Follow [Prototype Demonstration Guide](docs/PROTOTYPE_DEMO_GUIDE.md).

## Security considerations

- Passwords use PBKDF2-HMAC-SHA256 with per-user salts.
- Session tokens are random values stored by SHA-256 hash.
- Cookies are HttpOnly and SameSite=Lax.
- API mutations validate origin.
- AI credentials are not committed or persisted.
- Security and privacy limitations are documented in [Security Documentation](docs/SECURITY_DOCUMENTATION.md).

## Known limitations

- This repository is for local prototype demonstration, not public deployment.
- AI student-data processing is currently blocked pending approval.
- Email verification and password reset are not implemented.
- The SQLite database is single-process local storage.
- Legal notice pages are drafts requiring operator and legal review.

## Future improvements

- Add email verification and password recovery.
- Complete AI provider and data-category reviews.
- Add a durable or managed database for a future deployment.
- Improve test coverage and browser automation.
- Complete legal review and operator details.

## Contributors

This submission contains the StudyFlow project team implementation; contributor names should be added before publication if final names are available.

## Acknowledgements

StudyFlow uses Node.js, Express, better-sqlite3, pdf-parse, and open-source frontend assets as documented in the project files.
