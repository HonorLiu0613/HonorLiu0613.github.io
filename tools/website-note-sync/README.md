# Website Note Sync

Desktop Obsidian plugin for publishing selected notes to a local Jekyll website.

## Features

- Manual, conflict-aware synchronization: bidirectional, Obsidian to website, or website to Obsidian.
- Stable `web_id` / `web_slug` mapping, backups before writes, and safe path validation.
- Obsidian-rendered HTML with local images, formulas, code highlighting, tables, callouts, and captured Border theme styles.
- GitHub publication preview with an explicit commit and push action.
- Draft handoff through Microsoft Edge and Wechatsync for CSDN, Zhihu, Xiaohongshu, and Douyin image-text posts.

## Install from a release

Copy `main.js` and `manifest.json` into:

`.obsidian/plugins/website-note-sync/`

Then enable **Website Note Sync** in Obsidian. The plugin is desktop-only because it uses the local vault, website files, Ruby build, and Git executable.

## First-run setup

1. Choose the website repository directory containing `_config.yml` and `_notes`.
2. Select a synchronization mode. `Obsidian -> website` is the safest default when Obsidian is the primary editor.
3. Keep conflict protection enabled and run a preview before synchronizing.
4. For media drafts, install Wechatsync in the same Edge profile and sign in to the platforms you enabled.

The plugin never stores platform passwords or cookies. It only stores local paths, sync state, and draft links returned by the local handoff page.

See `docs/note-sync.md` in the website repository for the note frontmatter format, classification rules, media limits, and GitHub publishing workflow.
