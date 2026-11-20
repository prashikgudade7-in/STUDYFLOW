# Copyright and Asset Audit

Review date: 2026-11-19

## Summary

No license inventory sufficient for a public or commercial launch was found for the provider-logo image files. No user-uploaded material is bundled in the project. DM Sans and Manrope were self-hosted with their verified SIL Open Font License. This is an asset-provenance review, not a copyright clearance opinion.

## Follow-up disposition

The unverified provider-logo PNGs were removed from the application and replaced with text names and initials. The names identify selectable integrations; their use does not imply affiliation or endorsement. Public/commercial trademark use remains subject to owner and counsel review.

## Findings

| Asset / content | Evidence | Status |
|---|---|---|
| Provider logo PNGs formerly under `public/logos/` | The files had no verified file-by-file source or license. They have been removed from the application and replaced with text labels/initials. | **Images removed.** Provider names remain text and are not represented as licensed marks or endorsements; review public trademark use with counsel. |
| DM Sans and Manrope | Self-hosted as `public/fonts/dm-sans-latin.woff2` and `public/fonts/manrope-latin.woff2`. Their upstream OFL files were verified at `google/fonts` (`ofl/dmsans/OFL.txt` and `ofl/manrope/OFL.txt`), and the combined notices/license are included in `public/fonts/OFL.txt`. | **License notice included.** The frontend no longer makes a Google Fonts request. |
| StudyFlow-authored source and visual design | Repository contains application source and UI assets. | No independent copyright ownership chain or contributor assignment is established by source inspection. Owner must verify rights before commercial use. |
| User study text, uploaded PDFs/images, AI prompts/outputs | Not committed as project assets by the reviewed source. | The product terms need counsel-reviewed rules on user content and AI output; do not imply an ownership transfer or unverified license. |

## Recommendations

- If provider marks are reintroduced, create an asset manifest with the exact path, source URL, author, license/permission, retrieval date, and required notice.
- Review text-only provider-name use and any future brand marks against applicable provider brand terms.
- Keep original source provenance, licenses, and notices in the repository.

The removed logo files were `azure.png`, `claude.png`, `cohere.png`, `deepseek.png`, `gemini.png`, `grok.png`, `meta.png`, `mistral.png`, `openai.png`, and `perplexity.png`. Their individual source/licensing status remains unverified.

References: [`public/logos/README.txt`](../public/logos/README.txt), [`public/fonts/OFL.txt`](../public/fonts/OFL.txt), [`public/index.html`](../public/index.html).

Font license sources: [DM Sans OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/dmsans/OFL.txt) and [Manrope OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt).
