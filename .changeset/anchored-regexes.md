---
"@quartz-community/ox-hugo": patch
---

fix: the Markdown rewrites no longer touch fenced code blocks or inline code, two Hugo shortcodes on one line stay separate, `{#id}` is only stripped from headings, text between two dollar amounts is no longer treated as math, and a `figure` shortcode with more parameters than `src` keeps a clean image URL. Math from org is unescaped the way ox-hugo escapes it (`\*`, `\{`, `\}`, `\,`, `\|`, … as well as `\_`), so KaTeX no longer sees the escapes. README: fixed the link to the OxHugo compatibility docs.
