---
"@quartz-community/ox-hugo": patch
---

Figure shortcodes with a caption (as ox-hugo writes them, `caption="<span class=\"figure-number\">Figure 1: </span>A cat"`) or with a `>` in any parameter now become a whole Markdown image instead of leaving the rest of the shortcode as text; the caption's text (without the figure number) becomes the image's alt text unless the figure has `alt`, and `title` is kept. Indented code blocks are left untouched like fenced ones, and text that already contains the U+E000 private-use character is no longer corrupted.
