# Cookie and Consent Assessment

Review date: 2026-11-19

## Result

No analytics, advertising, tracking pixel, or nonessential cookie was identified in the reviewed application source. A consent-management platform or banner was therefore not added: a banner without an optional purpose to control would be misleading and would imply a legal determination that has not been made. This is a technical inventory, not legal advice. Reassess before adding optional analytics or marketing tools and with counsel for each intended market.

## First-party cookie

| Name | Purpose | Attributes | Lifetime |
|---|---|---|---|
| `studyflow_session` | Authentication and session continuity | HttpOnly, SameSite=Lax, Secure for HTTPS, Path=/ | If “Keep me signed in” is checked, 14 days. If unchecked, a browser-session cookie. The database session expires within 14 days in either case. |

Sign out deletes the server-side session and clears the browser cookie. Blocking or clearing it prevents authenticated features from working.

## Other storage and external requests

- `localStorage.studyflow_ai_pref` remembers the AI provider, model, and optional Azure endpoint. It does not contain the API key and remains until cleared. It is not a cookie.
- DM Sans and Manrope are now self-hosted from `public/fonts/` under the SIL Open Font License; the Google Fonts browser request was removed.
- AI provider calls are made from the StudyFlow server to the provider the user selected. This is a data flow but not a browser cookie.
- No analytics/advertising SDK, tracking pixel, service worker, or optional cookie was found in the reviewed frontend.

## Consent and launch caveats

- No banner was implemented because no optional tracking cookie was found. This does not resolve privacy-law consent requirements for account, study, or AI processing.
- The font self-hosting change removes the third-party font request from the current frontend.
- The owner must confirm deployment-side cookies, CDNs, monitoring, and hosting access logs; they are outside the repository.
- If optional tracking is introduced, identify the purpose and legal basis, gate the relevant technology where legally required, and provide a working preference/revocation mechanism before loading it.
- Legal operator/contact details and counsel review are still required. See [the draft Cookie notice](../public/cookies.html), [Privacy notice review](./PRIVACY_POLICY_REVIEW.md), and [third-party data flow](./THIRD_PARTY_DATA_FLOW.md).
