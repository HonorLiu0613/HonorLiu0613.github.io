# Haoran Liu — Personal Website

A Jekyll website organized into Home, Notes, Experience, and CV. The homepage keeps
its original appearance. Filenames use English; article prose keeps its original language.

| Section | Source | URL |
| --- | --- | --- |
| Home | `_pages/home.md` | `/` |
| Notes | `_pages/notes.html` | `/notes/` |
| Experience | `_pages/experience.html` | `/experience/` |
| CV | `_pages/cv.html` | `/cv/` |

## Editing and synchronizing notes

Obsidian is the main writing environment. Website Note Sync supports manual synchronization
of public Markdown notes in either direction between the vault and local `_notes/` files.
Concurrent changes require an explicit version choice, and touched notes are backed up.
Only notes with `publish: true` are exported; unpublished collection documents are excluded
from generated article routes. Public Git history is independent of this flag.

The desktop plugin is installed in the Obsidian vault. Click its refresh ribbon icon or run
**Website Note Sync: 预览并同步公开笔记**, review the plan, then synchronize.
It regenerates native Obsidian article HTML, linked assets, scoped Border styles, and the local
Jekyll build. It never pushes Git changes. Website-side Markdown edits must be synchronized
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
- `_data/navigation.yml`: the four navigation links.
- `files/cv.pdf`: the embedded/downloadable CV document.
- `images/experience/`: competition photos; legacy `images/notes/` URLs remain available.
- `tools/website-note-sync/src/`: desktop plugin sources. Run its `build.py` to bundle `main.js`.
- `docs/migration.md`: old article names and redirects.

Note properties include `title`, `date`, `updated`, `publish`, `domain`, `tags`, and `featured`.
Set `featured: true` for Home's featured selection. The plugin manages render-related
properties and stable identifiers; keep them intact when editing website Markdown.

## Styles

- `assets/css/home.css`: original homepage styles, loaded only on Home.
- `assets/css/site.css`: navigation, page layouts, flatter note cards, timeline, and CV.
- `assets/css/border.css`: generated article typography, scoped to `.note-body`, captured from
  the active Obsidian theme and Style Settings. Current theme:
  [Border 1.13.9 by Akifyss](https://github.com/Akifyss/obsidian-border).
- `assets/css/syntax.css`: Rouge colors for Jekyll-rendered experience articles.
- `assets/js/site.js`: article outline, code language labels, and copy buttons.
- `assets/js/notes.js`: domain/tag filters and full-text search.

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
