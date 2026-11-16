# Homepage Editing Guide

The homepage is organized as a short academic profile: About, Research Interests, Education, and Recent Notes. Project and award sections are ready to populate and appear automatically when their data lists are no longer empty. Publications are omitted until there is something to list.

- `_pages/home.md`: bilingual introduction and section markup.
- `_data/home.yml`: bilingual education and research interests, plus `projects` and `awards` lists.
- `_layouts/home.html`: profile image, contact links, and language control.
- `_config.yml`: site name, description, email, GitHub username, and avatar path.
- `assets/css/home.css`: homepage layout, spacing, colors, and typography.
- `assets/js/home-language.js`: language toggle behavior and saved preference.
- `_data/navigation.yml`: Home, Notes, and direct CV links.
- `files/cv.pdf`: the PDF opened directly by the CV navigation item.

For each project, add `title_en`, `title_zh`, `summary_en`, and `summary_zh`; an optional `url` links to a project page. For each award, add `title_en`, `title_zh`, `detail_en`, and `detail_zh`. Leave either list empty to keep that section hidden.
