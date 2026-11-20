# System Architecture

## Frontend

The frontend consists of `public/index.html`, `public/app.js`, and `public/styles.css`. It communicates with the backend through `/api` endpoints. Static pages for privacy, terms, and cookies are also served from `public/`.

## Backend

`server.js` creates an Express application and mounts route modules for authentication, users, records, challenges, notifications, privacy, PDF extraction, and AI providers. Middleware validates request origins, enforces rate limits, and protects authenticated routes.

## Database

`config/database.js` opens a local SQLite database using `better-sqlite3`. Tables are created automatically when the server starts. The default path is `data/studyflow.db`; `STUDYFLOW_DB_PATH` can override it.

## Authentication

Passwords use PBKDF2-HMAC-SHA256 with random per-user salts. Session identifiers are random, stored only as SHA-256 hashes, and delivered in HttpOnly cookies.

## AI integration

The AI service accepts a provider-selected API key only from the browser request. It is not stored by the backend or frontend storage. Student-data AI requests are blocked by the approval registry until all required provider and category approvals are documented.
