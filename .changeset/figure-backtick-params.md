---
"@quartz-community/ox-hugo": patch
---

Convert figure shortcodes with backtick-quoted parameters (``{{< figure src=`a b.png` >}}``) to images (`![](<a b.png>)`); they were hidden as inline code and came out as ``![](`a b.png`)``.
