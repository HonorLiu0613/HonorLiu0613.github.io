# Repository migration

## Pages

| Previous file | Current file | Current route |
| --- | --- | --- |
| `_pages/about.md` | `_pages/home.md` | `/` |
| `_pages/year-archive.html`, `_pages/portfolio.html` | `_pages/notes.html` | `/notes/` |
| `_pages/experience.html` | `_pages/experience.html` | `/experience/` |
| `_pages/cv.md` | `_pages/cv.html` | `/cv/` |
| `_pages/404.md` | `_pages/not-found.html` | `/404.html` |

## Articles

| Previous source | Current source | Previous URL (redirected) |
| --- | --- | --- |
| `_posts/2026-07-31-first-blog.md` | `_notes/hello-world.md` | `/posts/2026/07/hello-world/` |
| `_posts/2026-08-06-preparing-for-recomendation.md` | `_notes/recommendation-preparation.md` | `/preparing-for-recomendation/` |
| `_portfolio/2026-08-01-website-project.md` | `_notes/personal-website.md` | `/portfolio/2026-08-01-website-project/` |
| `_portfolio/2026-08-29-Derivation-to-kalman-filter.md` | `_notes/kalman-filter-derivation.md` | `/portfolio/2026-08-29-Derivation-to-kalman-filter/` |
| `_portfolio/2026-10-13-micro_program_on_wechat.md` | `_notes/wechat-family-menu.md` | `/portfolio/2026-10-13-micro_program_on_wechat/` |
| `_experience/2026-8-1-Robot-Competition-experience.md` | `_experience/robotics-competitions.md` | `/experience/2026-8-1-Robot-Competition-experience/` |

The filenames of the WeChat article no longer imply a conflicting date: its existing
front matter date, October 23, 2026, remains the publication date.

Asset folders follow article filenames under `images/notes/` and `images/experience/`.
Internal image references have been updated. Old image URLs are not retained; article
redirects lead to pages that reference the new assets.

## Removed template features

- Unused talk/publication collections, generators, maps, and sample drafts/comments.
- Duplicate post/portfolio archives and standalone category/tag pages (redirect to Notes).
- Legacy JSON CV data/conversion scripts; the real `files/cv.pdf` is preserved unchanged.
- Old layouts/includes, multiple Sass theme palettes, Susy/Breakpoint, icon fonts, jQuery,
  JavaScript minification scripts, and theme-preview/sample images.
- Unused Docker/devcontainer configuration.

`docs/` and `scripts/` are excluded from the generated site.
`LICENSE`, personal article prose, competition photos, the profile portraits,
`CNAME`, and the CV PDF are preserved.

## Obsidian integration

The five public notes now have corresponding classified Markdown files in the Obsidian vault.
Website Note Sync synchronizes their content manually in either direction, detects conflicts,
exports native article HTML and assets, and captures scoped Border reading styles.
See [the usage guide](note-sync.md). Existing private vault notes remain outside the website.
