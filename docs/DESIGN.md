# StudyFlow UI/UX Design System

This document records the current visual system in `public/index.html` and `public/styles.css`. Recommendations are separated from existing implementation.

## 1. Design philosophy

The current interface aims to feel modern, clean, encouraging, student-friendly, and approachable. It uses a light neutral canvas, rounded cards, purple accents, small visual illustrations, and concise supportive copy.

## 2. Existing visual identity

### Colors

The following values are defined in the CSS `:root` custom properties:

| Token | Value | Use |
|---|---|---|
| `--purple` | `#7048df` | Primary actions, active navigation, key accents |
| `--purple-dark` | `#5632c4` | Hover/strong primary state |
| `--purple-soft` | `#f0ebff` | Soft accent surface |
| `--lavender` | `#e8defe` | Supporting color |
| `--ink` | `#25233b` | Main text |
| `--muted` | `#8c8aa1` | Secondary text |
| `--line` | `#efedf5` | Borders/dividers |
| `--surface` | `#fff` | Cards and form surfaces |
| `--bg` | `#f8f7fc` | Main page background |
| `--mint` | `#e5f8f1` | Progress/success backgrounds |
| `--green` | `#239a70` | Success accent |
| `--orange` | `#fff0e3` | Warm supporting accent |
| `--blue` | `#e9f1ff` | Supporting accent |

Other literal colors are present in components and should not be assumed to be centralized tokens.

### Typography

- Body text uses `DM Sans`.
- Brand and selected headings use `Manrope`.
- Both families are self-hosted in `public/fonts/` under the SIL Open Font License, with the required notices in `public/fonts/OFL.txt`.
- Eyebrow labels use small uppercase text with increased letter spacing. Major headings use larger, heavier type.

### Shapes, surfaces, and controls

- Cards and panels use white surfaces, pale borders, soft shadows, and generally rounded corners; the root card radius is 20px.
- Primary buttons use purple, white text, rounded corners, and a soft shadow. Outline and white variants are also defined.
- Inputs, selects, textareas, forms, and modals use the same rounded, light-border visual language.
- Small inline iconography, emoji, text-only provider identifiers, and simple SVGs are used. The existing app also contains CSS-built illustrations and charts.

## 3. Layout system

- **Authentication:** Split illustration and form panel at larger widths; illustration is hidden on mobile.
- **Desktop application:** Persistent left sidebar, top bar, and a padded page content area. Main views are single-page sections changed by frontend navigation.
- **Dashboard:** Welcome header, daily momentum/streak cards, metric cards, and two-column panels for today's plan, tasks, week chart, and quick access.
- **Learning views:** Separate sections for timetable, tasks, calendar, statistics, revision, English, maths, challenge, leaderboard, AI/dictionary, profile, and settings.
- **Dialogs:** A centered modal form sits above a backdrop and includes close/cancel/save controls.
- **Mobile:** Sidebar is hidden; a fixed bottom navigation provides Home, Stats, Tasks, and Profile. Content grids collapse and tables/components tighten spacing.

## 4. Component standards

These standards reflect the existing patterns and should be retained when extending the UI:

- **Buttons:** Use clear action text, the existing `.btn` variants, and visible hover/focus states. Use icon-only controls only with an accessible label/title.
- **Forms:** Use a visible label for each field, native input types where appropriate, and inline feedback near the relevant form.
- **Cards:** Use `.panel`/card patterns with a concise heading and supporting text; avoid unnecessary nested boxes.
- **Tables/lists:** Keep row actions identifiable and preserve adequate spacing; provide an empty state when data is absent.
- **Navigation:** Preserve the desktop sidebar and mobile bottom navigation; indicate the active view.
- **Notifications:** Use the toast region with `aria-live="polite"` and readable text. Dismiss controls should remain keyboard accessible.
- **Loading and errors:** Disable or update actions while work is in progress; present actionable, non-sensitive error messages.
- **Dialogs:** Preserve the dialog role, modal semantics, labelled title, close/cancel controls, and focus on the first input when opening.

## 5. Responsive breakpoints

Current CSS includes breakpoints around 1200px, 900px, 680px, 600px, and 380px. At 1200px and below, spacing and column counts adjust; at 900px and below, major content grids collapse; at 680px and below, the mobile navigation and single-column/tighter layouts are used. Very narrow screens receive additional typography and spacing adjustments.

These are implementation breakpoints, not a formal device-support matrix. Verify changes at each breakpoint rather than assuming a specific device.

## 6. Accessibility

Current markup/styles include a skip link, semantic form labels, keyboard-visible `:focus-visible` outlines, accessible names for several icon buttons, a live toast region, and dialog semantics. This is a useful baseline, not evidence of full WCAG conformance.

The task modal now traps and restores keyboard focus, reduced-motion preferences are respected, and key icon-only controls have accessible names. Before a release, verify the remaining screen-reader announcements, color contrast, zoom/reflow, and all app flows with assistive technology. Accessibility testing status is tracked in [TASKS.md](./TASKS.md).

## 7. Proposed improvements

These are proposals, not existing design features:

- Centralize remaining literal color values into tokens.
- Measure contrast for muted text, status colors, and charts and adjust where needed.
- Define and automate an accessibility and responsive visual regression checklist.

See [PRD.md](./PRD.md) for product context and [RULES.md](./RULES.md) for frontend implementation constraints.
