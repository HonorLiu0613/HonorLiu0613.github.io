# Notes readability update — 2026-11-14

References inspected at 1440 CSS pixels, with browser scale 100%:

- [Josh W. Comeau: CSS articles](https://www.joshwcomeau.com/css/): distinct article title,
  summary, and navigation hierarchy; readable text rather than tiny metadata everywhere.
- [Maggie Appleton: Garden](https://maggieappleton.com/garden): clear topic navigation,
  calm surfaces, and separation between content and metadata.
- [Tania Rascia: Blog](https://www.taniarascia.com/blog/): restrained page hierarchy and
  readable content groupings.

The existing homepage and Border article body remain intact. This update increases note
labels and reading navigation sizes, with light badge backgrounds and dark text:

| Element | Previous | Current |
| --- | --- | --- |
| Tags on cards and article headers | 11px | 14px |
| Card domain label | 11px | 14px, with a tinted badge |
| Card date | 11px | 13px |
| Article metadata | 12px | 14px |
| Outline entries | 12px | 15px |
| Outline heading | 12px | 16px |

`_plugins/note-colors.rb` maps known labels to a palette and gives new labels a stable
hash-based fallback. Both card tags and article tags use the same filter. Color is
supplementary: label text remains visible, with contrast checked at 4.5:1 or higher.
The reading outline uses a tinted active row, a side rule, and font weight to identify
the current section. Its width and padding accommodate the larger text.

Desktop verification uses viewports of 1920 and 1440 CSS pixels at device scale 1, with
`visualViewport.scale === 1` and no page zoom overrides. Mobile verification uses 390 CSS
pixels. Font sizes, color consistency, contrast, horizontal overflow, search, and links
are checked alongside screenshots.
