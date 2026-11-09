# @quartz-community/ox-hugo

Transforms ox-hugo exported markdown to be compatible with Quartz, handling relref links, Hugo shortcodes, figure tags, and org-mode LaTeX.

## Installation

```bash
npx quartz plugin add @quartz-community/ox-hugo
```

Quartz's default configuration has a disabled entry for this plugin; set `enabled: true` to use it.

## Usage

ox-hugo usually writes TOML frontmatter (`+++`). Quartz's built-in frontmatter parsing reads it when configured under `configuration.frontmatter`; the ObsidianFlavoredMarkdown plugin's default `legacy` preset only recognizes YAML frontmatter, so switch it to `preset: strict` too:

```yaml title="quartz.config.yaml"
configuration:
  frontmatter:
    delimiters: "+++"
    language: toml
plugins:
  - source: "@quartz-community/obsidian-flavored-markdown"
    enabled: true
    options:
      preset: strict # needed for TOML (+++) frontmatter
    order: 40
  - source: "@quartz-community/ox-hugo"
    enabled: true
    order: 91
```

The plugin rewrites the Markdown source before it is parsed, so its `order` relative to the other Markdown plugins doesn't matter. It also lets raw HTML in the exported Markdown through (`rehype-raw`).

For advanced use cases, you can override in TypeScript (note the British spelling of the function name):

```ts title="quartz.ts (override)"
import * as ExternalPlugin from "./.quartz/plugins";

ExternalPlugin.OxHugoFlavouredMarkdown({
  replaceOrgLatex: false,
});
```

## Configuration

| Option                   | Type      | Default | Description                                                                                       |
| ------------------------ | --------- | ------- | ------------------------------------------------------------------------------------------------- |
| `wikilinks`              | `boolean` | `true`  | Convert Hugo `relref` links (`[text]({{< relref "page" >}})`) to Markdown links (`[text](page)`). |
| `removePredefinedAnchor` | `boolean` | `true`  | Strip predefined anchors (`{#id}`) from headings.                                                 |
| `removeHugoShortcode`    | `boolean` | `true`  | Remove Hugo shortcode syntax (`{{ … }}`), keeping its content.                                    |
| `replaceFigureWithMdImg` | `boolean` | `true`  | Replace `<figure src="…">` tags with Markdown images (`![](…)`).                                  |
| `replaceOrgLatex`        | `boolean` | `true`  | Convert org-mode LaTeX fragments to `$…$` (inline) and `$$…$$` (block).                           |

## Documentation

See the [Quartz documentation](https://quartz.jzhao.xyz/plugins/OxHugoFlavoredMarkdown) and [OxHugo compatibility](https://quartz.jzhao.xyz/features/OxHugo%20compatibility) for more information.

## License

MIT
