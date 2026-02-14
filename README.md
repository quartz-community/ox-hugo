# @quartz-community/ox-hugo

Transforms ox-hugo exported markdown to be compatible with Quartz, handling relref links, Hugo shortcodes, figure tags, and org-mode LaTeX.

## Installation

```bash
npx quartz plugin add github:quartz-community/ox-hugo
```

## Usage

```ts
// quartz.config.ts
import * as ExternalPlugin from "./.quartz/plugins"

const config: QuartzConfig = {
  plugins: {
    transformers: [
      ExternalPlugin.OxHugoFlavouredMarkdown(),
    ],
  },
}
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| wikilinks | `boolean` | `true` | Whether to parse wikilinks. |
| removePredefinedAnchor | `boolean` | `true` | Whether to remove predefined anchors. |
| removeHugoShortcode | `boolean` | `true` | Whether to remove Hugo shortcodes. |
| replaceFigureWithMdImg | `boolean` | `true` | Whether to replace figure tags with markdown images. |
| replaceOrgLatex | `boolean` | `true` | Whether to replace org-mode LaTeX. |

## Documentation

See the [Quartz documentation](https://quartz.jzhao.xyz/) for more information.

## License

MIT
