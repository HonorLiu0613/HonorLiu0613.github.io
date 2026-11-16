# Homepage Editing Guide

The homepage is a short academic profile: introduction and interests, two education cards, then a full-width Recent Notes card showing the latest three public notes. Notes summaries are omitted on Home. Home and Notes share the profile sidebar, navigation alignment, and field/topic pill styles. The interface uses English without a language switch.

- `_pages/home.md`: introduction and section markup; automatically selects the latest three public notes by date, regardless of the `featured` property. Change the `slice: 0, 3` count to adjust how many appear.
- `_data/home.yml`: education (`institution`, `program`, `period`) and research interests, plus reserved `projects` and `awards` lists.
- `_layouts/home.html`: homepage two-column wrapper.
- `_includes/profile-sidebar.html`: shared profile image, bio, and contact links for Home and Notes.
- `_config.yml`: site name, description, email, GitHub username, and avatar path.
- `assets/css/home.css`: Home/Notes layout, spacing, typography, card borders, and pill-shaped tags.
- `assets/css/site.css`: common styles and page transitions; animation follows the system reduced-motion setting.
- `_pages/notes.html` and `_includes/note-card.html`: Notes filters and cards, including `Field:` and `Tags:` labels.
- `_data/note_palette.yml`: shared Home/Notes palette. Home field/topic pills sample the colors evenly across its recent-note rows. On Notes, the first visible row uses `#CC247C` and the last uses `#AA77E9`. With fewer than eight rows, colors are sampled evenly from the palette; with more rows, some colors repeat. One visible row uses the first color.
- `assets/js/notes.js`: search, filters, and row color recalculation when filtering or changing the layout width.
- `_data/navigation.yml`: Home, Notes, and direct CV links.
- `files/cv.pdf`: the PDF opened directly by the CV navigation item.

Project and award lists are reserved data interfaces, with no public sections rendered yet. Add the corresponding markup to `_pages/home.md` when ready to publish those records.

Home cards have a permanent 2px gray outline and a 4px warm brown-red top edge (`#b85450`). Notes cards use the same border widths with their assigned row color. Home and Notes field/topic pills use the same rounded shape, pale fill, and darker readable text; Home tags also link to the matching Notes filter. Card borders do not change on hover.

Desktop Recent Notes article titles use 20px type. Education uses 18px institution names, 16px program descriptions, and 14px dates, with 18px/20px card padding. The small-screen rules at 480px use 18px note titles and 17px/15px/13px education text. Adjust these selectors in `assets/css/home.css`: `.home-post h3`, `.home-education__item h3`, `.home-education__item p`, `.home-education__period`, and `.home-education__card`.
