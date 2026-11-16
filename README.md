# Haoran Liu — Personal Website

A Jekyll website with Home and Notes in the primary navigation, plus a direct link to the CV PDF.
Experience remains available as a standalone page. Filenames use English; article prose keeps its original language.

| Section | Source | URL |
| --- | --- | --- |
| Home | `_pages/home.md` | `/` |
| Notes | `_pages/notes.html` | `/notes/` |
| Experience | `_pages/experience.html` (not in primary navigation) | `/experience/` |
| CV PDF | `files/cv.pdf` | `/files/cv.pdf` |
| CV compatibility redirect | `_pages/cv.html` | `/cv/` |

## Editing and synchronizing notes

Obsidian is the main writing environment. Website Note Sync supports manual synchronization
of public Markdown notes in either direction between the vault and local `_notes/` files.
Concurrent changes require an explicit version choice, and touched notes are backed up.
Only notes with `publish: true` are exported; unpublished collection documents are excluded
from generated article routes. Public Git history is independent of this flag.

The desktop plugin is installed in the Obsidian vault. Click its refresh ribbon icon or run
**Website Note Sync: 预览并同步公开笔记**, review the plan, then synchronize.
It regenerates native Obsidian article HTML, linked assets, scoped Border styles, and the local
Jekyll build. Version 1.2.0 also provides a Git publication preview: inspect all website changes,
edit the commit message, then commit and push with the installed Git credentials. Sync opens
this preview by default; pushing requires clicking its button. Website-side Markdown edits must be synchronized
before building; a stale-render check prevents publishing cached old article bodies.

Settings provide Obsidian → website, website → Obsidian, and bidirectional modes, with
destination-change protection. Commands can sync only the current note or add missing
publication properties. The included Templater template is installed as
`99-模板/website-note.md` in the vault and keeps new articles unpublished by default.

See the [Chinese usage guide](docs/note-sync.md) for settings, publication flags, conflicts,
classification, attachments, and backups. Binary attachments are maintained in Obsidian and
exported to the website; their contents are not merged bidirectionally.

## Source map

- `_notes/`: editable public Markdown; stable `web_id` and English `web_slug` link both copies.
- `_includes/rendered-notes/`: generated native article HTML; do not edit directly.
- `assets/notes/<slug>/`: generated linked attachments with content hashes.
- `_experience/`: experience articles; `_data/experience.yml` supplies the timeline.
- `_data/navigation.yml`: the Home, Notes, and direct CV links.
- `_data/home.yml`: research interests and education; reserved lists for future projects and awards.
- `_includes/profile-sidebar.html`: the shared profile sidebar on Home and Notes.
- `_data/note_palette.yml`: the eight colors shared by Home note pills and Notes rows.
- `files/cv.pdf`: the embedded/downloadable CV document.
- `images/experience/`: competition photos; legacy `images/notes/` URLs remain available.
- `tools/website-note-sync/src/`: desktop plugin sources. Run its `build.py` to bundle `main.js`.
- `docs/migration.md`: old article names and redirects.
- `docs/homepage.md`: homepage sections and editing locations.

Note properties include `title`, `date`, `updated`, `publish`, `domain`, `tags`, and `featured`.
Home shows the latest three public notes by date; `featured` remains an optional metadata
property and does not affect this selection. The plugin manages render-related properties
and stable identifiers; keep them intact when editing website Markdown.

## Styles

- `assets/css/home.css`: shared Home/Notes profile layout, card borders, and responsive styling.
- `assets/css/site.css`: navigation, page layouts, flatter note cards, timeline, and CV.
- `assets/css/border.css`: generated article typography, scoped to `.note-body`, captured from
  the active Obsidian theme and Style Settings. Current theme:
  [Border 1.13.9 by Akifyss](https://github.com/Akifyss/obsidian-border).
- `assets/css/syntax.css`: Rouge colors for Jekyll-rendered experience articles.
- `assets/js/site.js`: article outline, code language labels, and copy buttons.
- `assets/js/notes.js`: domain/tag filters, full-text search, and responsive row colors.

## Editing the homepage

- Edit the English introduction and section labels in `_pages/home.md`.
- The full-width Recent Notes card automatically lists the latest three public notes; adjust `slice: 0, 3` in `_pages/home.md` to change the count.
- Edit education and research interests in `_data/home.yml`.
- The `projects` and `awards` arrays in `_data/home.yml` are reserved for future sections; add their presentation to `_pages/home.md` when ready.
- Update the shared profile bio in `_includes/profile-sidebar.html`; edit contact details and the avatar path in `_config.yml`.
- Adjust layout, typography, card borders, and tag appearance in `assets/css/home.css`; general navigation and page transitions are in `assets/css/site.css`.
- Edit the eight shared note colors in `_data/note_palette.yml`. Home field/topic pills and visible Notes rows sample this palette evenly, keeping the first and last colors. Notes filtering and column changes recalculate the rows.
- The CV navigation item points directly to `files/cv.pdf`.

The native renderer preserves common Markdown structures and syntax highlighting. Math uses
the locally hosted MathJax 3.2.2 bundle with its Apache 2.0 license. Installed fonts and
interactive plugin-specific content can differ between Obsidian and a browser.

## Local build

Requires Ruby and Bundler. The current local environment uses Ruby 4.0.

```sh
bundle install
bundle exec jekyll serve --host 127.0.0.1
```

After syncing notes, open `http://127.0.0.1:4000`, or check the production build:

```sh
bundle exec jekyll build --trace
python scripts/check-site.py _site
```

`_site`, root `vendor`, `node_modules`, and `.jekyll-cache` are generated local directories.
`assets/vendor` is a public browser runtime directory and must remain in Git.
Plugin sources, documentation, and validation scripts are excluded from generated output.

## Deployment and attribution

`.github/workflows/pages.yml` builds and deploys with GitHub Actions. Select **GitHub Actions**
under repository **Settings → Pages → Build and deployment**. Push reviewed source changes
to the default branch, or dispatch the workflow manually. Standard Pages safe builds do not
execute the custom math and render-validation plugins.

This site began with Academic Pages / Minimal Mistakes. Its original MIT license remains
in `LICENSE`. The current layouts and scoped styles replace the previous template stack.
