import rehypeRaw from 'rehype-raw';

// src/transformer.ts
var defaultOptions = {
  wikilinks: true,
  removePredefinedAnchor: true,
  removeHugoShortcode: true,
  replaceFigureWithMdImg: true,
  replaceOrgLatex: true
};
var relrefRegex = new RegExp(/\[([^\]]+)\]\(\{\{< relref "([^"]+)" >\}\}\)/, "g");
var predefinedHeadingIdRegex = new RegExp(/(.*) {#(?:.*)}/, "g");
var hugoShortcodeRegex = new RegExp(/{{(.*)}}/, "g");
var figureTagRegex = new RegExp(/< ?figure src="(.*)" ?>/, "g");
var inlineLatexRegex = new RegExp(/\\\\\((.+?)\\\\\)/, "g");
var blockLatexRegex = new RegExp(
  /(?:\\begin{equation}|\\\\\(|\\\\\[)([\s\S]*?)(?:\\\\\]|\\\\\)|\\end{equation})/,
  "g"
);
var quartzLatexRegex = new RegExp(/\$\$[\s\S]*?\$\$|\$.*?\$/, "g");
var OxHugoFlavouredMarkdown = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts };
  return {
    name: "OxHugoFlavouredMarkdown",
    textTransform(_ctx, src) {
      if (opts.wikilinks) {
        src = src.toString();
        src = src.replaceAll(relrefRegex, (_value, ...capture) => {
          const [text, link] = capture;
          return `[${text}](${link})`;
        });
      }
      if (opts.removePredefinedAnchor) {
        src = src.toString();
        src = src.replaceAll(predefinedHeadingIdRegex, (_value, ...capture) => {
          const [headingText] = capture;
          return headingText;
        });
      }
      if (opts.removeHugoShortcode) {
        src = src.toString();
        src = src.replaceAll(hugoShortcodeRegex, (_value, ...capture) => {
          const [scContent] = capture;
          return scContent;
        });
      }
      if (opts.replaceFigureWithMdImg) {
        src = src.toString();
        src = src.replaceAll(figureTagRegex, (_value, ...capture) => {
          const [src2] = capture;
          return `![](${src2})`;
        });
      }
      if (opts.replaceOrgLatex) {
        src = src.toString();
        src = src.replaceAll(inlineLatexRegex, (_value, ...capture) => {
          const [eqn] = capture;
          return `$${eqn}$`;
        });
        src = src.replaceAll(blockLatexRegex, (_value, ...capture) => {
          const [eqn] = capture;
          return `$$${eqn}$$`;
        });
        src = src.replaceAll(quartzLatexRegex, (value) => {
          return value.replaceAll("\\_", "_");
        });
      }
      return src;
    },
    htmlPlugins() {
      const plugins = [rehypeRaw];
      return plugins;
    }
  };
};

export { OxHugoFlavouredMarkdown };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map