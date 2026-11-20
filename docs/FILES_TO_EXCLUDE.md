# Files Excluded

- `node_modules/`: installed dependencies, reproduced with `npm install`.
- `.git/`: original or submission repository metadata is handled separately.
- `.env`: may contain local configuration or credentials.
- `data/*.db`, `data/*.db-shm`, `data/*.db-wal`: runtime or personal user data.
- `*.backup`, `*.bak`, and `server.backup.js`: backup copies not needed for execution.
- `uploads/`: runtime-generated or local uploaded files.
- `logs/`, `*.log`: runtime diagnostics.
- IDE and operating-system junk: editor settings, `.DS_Store`, and `Thumbs.db`.
- `docs/MEMORY.md` and `docs/RULES.md`: internal AI handoff and coding-agent instructions, not evaluator documentation.
