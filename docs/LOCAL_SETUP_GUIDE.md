# Local Setup Guide

## Requirements

- Node.js 20 or newer.
- npm.

## Install

```bash
cd STUDYFLOW_GITHUB_SUBMISSION
npm install
```

## Configuration

Copy `.env.example` to `.env` only for local configuration. The `.env` file is intentionally ignored by Git.

```bash
copy .env.example .env
```

On PowerShell, `copy` is also suitable. `PORT` defaults to `3000`. `APP_ORIGIN` must match the browser origin. `STUDYFLOW_DB_PATH` is optional.

## Run

```bash
npm start
```

Open `http://localhost:3000`. The SQLite database is initialized automatically.
