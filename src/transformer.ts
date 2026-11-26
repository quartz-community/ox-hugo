import type { QuartzTransformerPlugin, BuildCtx } from "@quartz-community/types";
import type { PluggableList } from "unified";
import rehypeRaw from "rehype-raw";

export interface OxHugoOptions {
  /** Replace {{ relref }} with quartz wikilinks []() */
  wikilinks: boolean;
  /** Remove pre-defined anchor (see https://ox-hugo.scripter.co/doc/anchors/) */
  removePredefinedAnchor: boolean;
  /** Remove hugo shortcode syntax */
  removeHugoShortcode: boolean;
  /** Replace <figure/> with ![]() */
  replaceFigureWithMdImg: boolean;

  /** Replace org latex fragments with $ and $$ */
  replaceOrgLatex: boolean;
}

const defaultOptions: OxHugoOptions = {
  wikilinks: true,
  removePredefinedAnchor: true,
  removeHugoShortcode: true,
  replaceFigureWithMdImg: true,
  replaceOrgLatex: true,
};

const relrefRegex = new RegExp(/\[([^\]]+)\]\(\{\{< relref "([^"]+)" >\}\}\)/, "g");
// Only ATX headings: `## Title {#custom-id}` -> `## Title`
const predefinedHeadingIdRegex = new RegExp(
  /^( {0,3}#{1,6}[ \t].*?)[ \t]+\{#[^}\n]*\}[ \t]*$/,
  "gm",
);
// Lazy, so two shortcodes on one line stay two shortcodes
const hugoShortcodeRegex = new RegExp(/{{(.*?)}}/, "g");
// `{{< figure src="…" … >}}` (the `{{`/`}}` are already gone): take `src` alone, skip other params
const figureTagRegex = new RegExp(/< ?figure\b[^>]*?\bsrc="([^"]*)"[^>]*>/, "g");
// \\\\\( -> matches \\(
// (.+?) -> Lazy match for capturing the equation
// \\\\\) -> matches \\)
const inlineLatexRegex = new RegExp(/\\\\\((.+?)\\\\\)/, "g");
// (?:\\begin{equation}|\\\\\(|\\\\\[) -> start of equation
// ([\s\S]*?) -> Matches the block equation
// (?:\\\\\]|\\\\\)|\\end{equation}) -> end of equation
const blockLatexRegex = new RegExp(
  /(?:\\begin{equation}|\\\\\(|\\\\\[)([\s\S]*?)(?:\\\\\]|\\\\\)|\\end{equation})/,
  "g",
);
// \$\$[\s\S]*?\$\$ -> block equations
// inline equations, with pandoc's rule so that dollar amounts are left alone: the opening `$` is
// not followed by whitespace, the closing `$` is not preceded by whitespace nor followed by a
// digit, and both are on one line
const quartzLatexRegex = new RegExp(
  /\$\$[\s\S]*?\$\$|\$(?![\s$])(?:[^$\n\\]|\\[^\n])*?(?<![\s\\])\$(?!\d)/,
  "g",
);

// fenced code blocks (``` or ~~~, closed by a fence of the same kind at least as long, or EOF)
const fencedCodeRegex =
  /^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\1[`~]*[ \t]*$|(?![\s\S]))/gm;
// inline code spans (a backtick run closed by a run of the same length)
const inlineCodeRegex = /(?<!`)(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)/g;
const placeholderRegex = /\u0000(\d+)\u0000/g;

/** Runs `transform` on `src` with fenced code blocks and inline code spans left untouched. */
export function transformOutsideCode(src: string, transform: (text: string) => string): string {
  const code: string[] = [];
  const hide = (match: string) => `\u0000${code.push(match) - 1}\u0000`;
  const hidden = src.replaceAll(fencedCodeRegex, hide).replaceAll(inlineCodeRegex, hide);
  return transform(hidden).replaceAll(placeholderRegex, (_m, i: string) => code[Number(i)]!);
}

/**
 * Undoes ox-hugo's escaping of LaTeX fragments (`org-blackfriday-escape-chars-in-equation`, which
 * protects them from Hugo's Markdown parser): `_`, `*` and `` ` `` get a backslash (`\_`), a
 * backslash before ASCII punctuation gets another one (`\{` -> `\\{`, `\,` -> `\\,`,
 * `\\` -> `\\\`), and `](` becomes `\]\(`. Quartz's math parser reads `$…$` raw, so KaTeX saw
 * the escapes (`\_`, or `\\,` = line break + comma).
 */
export function unescapeOxHugoMath(math: string): string {
  return math
    .replaceAll("\\]\\(", "](")
    .replace(/\\([_*`])/g, "$1")
    .replace(/\\(\\[!-/:-@[-`{-~])/g, "$1");
}

/**
 * ox-hugo is an org exporter backend that exports org files to hugo-compatible
 * markdown in an opinionated way. This plugin adds some tweaks to the generated
 * markdown to make it compatible with quartz but the list of changes applied it
 * is not exhaustive.
 * */
export const OxHugoFlavouredMarkdown: QuartzTransformerPlugin<Partial<OxHugoOptions>> = (
  userOpts,
) => {
  const opts = { ...defaultOptions, ...userOpts };
  return {
    name: "OxHugoFlavouredMarkdown",
    textTransform(_ctx: BuildCtx, src: string) {
      // code blocks and inline code are shown verbatim, so none of the rewrites apply there
      return transformOutsideCode(src.toString(), (src) => {
        if (opts.wikilinks) {
          src = src.replaceAll(relrefRegex, (_value, ...capture) => {
            const [text, link] = capture;
            return `[${text}](${link})`;
          });
        }

        if (opts.removePredefinedAnchor) {
          src = src.replaceAll(predefinedHeadingIdRegex, (_value, ...capture) => {
            const [headingText] = capture;
            return headingText;
          });
        }

        if (opts.removeHugoShortcode) {
          src = src.replaceAll(hugoShortcodeRegex, (_value, ...capture) => {
            const [scContent] = capture;
            return scContent;
          });
        }

        if (opts.replaceFigureWithMdImg) {
          src = src.replaceAll(figureTagRegex, (_value, ...capture) => {
            const [imgSrc] = capture;
            return `![](${imgSrc})`;
          });
        }

        if (opts.replaceOrgLatex) {
          src = src.replaceAll(inlineLatexRegex, (_value, ...capture) => {
            const [eqn] = capture;
            return `$${eqn}$`;
          });
          src = src.replaceAll(blockLatexRegex, (_value, ...capture) => {
            const [eqn] = capture;
            return `$$${eqn}$$`;
          });

          // ox-hugo escapes Markdown characters inside math
          src = src.replaceAll(quartzLatexRegex, (value) => unescapeOxHugoMath(value));
        }
        return src;
      });
    },
    htmlPlugins() {
      const plugins: PluggableList = [rehypeRaw];
      return plugins;
    },
  };
};
