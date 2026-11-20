# Accessibility Audit

Review date: 2026-11-19

This source-level review applies relevant Web Interface Guidelines and common WCAG 2.2 AA checks. It is not a WCAG conformance audit and does not establish certification.

## Baseline findings

- Positive: skip link, main landmark, associated form labels, visible focus styling, live toast region, and a semantically identified modal were present.
- Issues: the modal did not trap focus or return focus to its opener; there was no reduced-motion override; the focus outline used a translucent color; generated delete controls relied on an unlabeled “×”; generic authentication errors were not announced; and several icon-only controls needed accessible names.

## Changes made

- Modal now traps Tab/Shift+Tab while open, closes on Escape, and returns focus to its invoking control.
- Reduced-motion preferences suppress animation and transition duration.
- Focus indicators use an opaque, darker purple outline and include links.
- Calendar navigation, profile access, task completion, deletion, authentication errors, revision status, and challenge results have accessible names or status announcements.
- Corrected a malformed eye-icon SVG path in the API-key control that produced a browser console parsing error.
- Added public policy pages with skip links, semantic headings, table captions, and a keyboard-accessible footer navigation.
- Added a native password-confirmation dialog for account deletion.

## Remaining checks / limitations

- Full keyboard and screen-reader testing is required across all application flows, including dynamic quiz feedback, upload controls, charts, and mobile navigation.
- A complete contrast measurement and target-size evaluation has not been performed across all color combinations and responsive states.
- Verify keyboard, screen-reader, and mobile behavior of the account-deletion dialog before release.
- Fonts are self-hosted under their verified SIL Open Font License; the frontend no longer makes a Google Fonts request.
- No automated WCAG scanner was added. Do not claim WCAG 2.2 AA conformance based on this source review alone.

Relevant files: `public/index.html`, `public/app.js`, `public/styles.css`, and the three policy pages.
