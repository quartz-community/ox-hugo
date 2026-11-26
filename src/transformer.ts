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
// one shortcode parameter: `name="value"` (with `\"` escapes), name=`raw value`, or name=value
const shortcodeParam = String.raw`[\w-]+\s*=\s*(?:"(?:[^"\\\n]|\\.)*"|\`[^\`]*\`|[^\s"\`<>%}]+)`;
// `{{< figure src="…" caption="…" … >}}` (or `{{% … %}}`, or `< figure … >` once the shortcode
// braces are gone): the parameters are matched as quoted values, so a `>` inside one (ox-hugo
// writes captions as HTML) doesn't end the shortcode
const figureTagRegex = new RegExp(
  String.raw`(?:\{\{[<%]|<) ?figure((?:\s+${shortcodeParam})*)\s*\/?\s*(?:[>%]\}\}|>)`,
  "g",
);
const shortcodeParamRegex = /([\w-]+)\s*=\s*(?:"((?:[^"\\\n]|\\.)*)"|`([^`]*)`|([^\s"`<>%}]+))/g;

/** The parameters of a Hugo shortcode (`src="a.png" caption="A \"cat\""`), unquoted. */
export function parseShortcodeParams(params: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [, name, quoted, raw, bare] of params.matchAll(shortcodeParamRegex)) {
    result[name!] = quoted !== undefined ? quoted.replace(/\\(.)/g, "$1") : (raw ?? bare ?? "");
  }
  return result;
}

/**
 * The text of a figure caption as ox-hugo writes it: HTML, with the figure number in
 * `<span class="figure-number">Figure 1: </span>`. Without the number and the tags.
 */
export function captionText(caption: string): string {
  return caption
    .replace(/<span class="figure-number">[\s\S]*?<\/span>/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The Markdown image for a figure shortcode. Hugo's figure renders `alt`, else nothing, as the
 * image's alt text, and the caption below it; a Markdown image has no caption, so the caption's
 * text becomes the alt text when there is no `alt`, and `title` stays the title.
 */
export function figureToMarkdownImage(params: Record<string, string>): string | undefined {
  const src = params.src;
  if (src === undefined) return undefined;
  const alt = (params.alt ?? captionText(params.caption ?? "")).replace(/([\\[\]])/g, "\\$1");
  const dest = /[\s()<>]/.test(src) ? `<${src.replace(/([<>])/g, "\\$1")}>` : src;
  const title = params.title ? ` "${params.title.replace(/(["\\])/g, "\\$1")}"` : "";
  return `![${alt}](${dest}${title})`;
}
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
// Private-use character as the placeholder delimiter (allowed by no-control-regex). Any U+E000
// already in the text is hidden behind a placeholder of its own first, so every U+E000 the
// transform sees belongs to a placeholder.
const placeholderRegex = /\uE000(\d+)\uE000/g;

const blankLineRegex = /^[ \t]*$/;
const indentedLineRegex = /^(?: {4}| {0,3}\t)/;
const listItemRegex = /^ {0,3}(?:[-+*]|\d{1,9}[.)])(?:[ \t]|$)/;
const atxHeadingRegex = /^ {0,3}#{1,6}(?:[ \t]|$)/;

/**
 * Hides the lines of indented code blocks: lines indented by four spaces (or a tab) that follow
 * a blank line, a heading or another code line. An indented line right after a paragraph line
 * continues the paragraph, and indented lines in a list are the list items' content, so neither
 * is code (code in a list item, indented further still, is not recognized and stays as is).
 */
function hideIndentedCode(src: string, hide: (code: string) => string): string {
  let inList = false;
  let codeMayStart = true; // start of the text, after a blank line, a heading or code
  let previousWasCode = false;
  return src
    .split("\n")
    .map((line) => {
      if (blankLineRegex.test(line)) {
        codeMayStart = true;
        return line;
      }
      if (indentedLineRegex.test(line)) {
        if (!inList && (codeMayStart || previousWasCode)) {
          previousWasCode = true;
          codeMayStart = false;
          return hide(line);
        }
      } else if (listItemRegex.test(line)) {
        inList = true;
      } else if (codeMayStart) {
        // an unindented line after a blank line ends a list
        inList = false;
      }
      previousWasCode = false;
      codeMayStart = !inList && atxHeadingRegex.test(line);
      return line;
    })
    .join("\n");
}

/**
 * Runs `transform` on `src` with fenced code blocks, indented code blocks and inline code spans
 * left untouched.
 */
export function transformOutsideCode(src: string, transform: (text: string) => string): string {
  const code: string[] = [];
  const hide = (match: string) => `\uE000${code.push(match) - 1}\uE000`;
  const restore = (text: string): string =>
    text.replaceAll(placeholderRegex, (_m, i: string) => restore(code[Number(i)]!));
  const hidden = hideIndentedCode(
    src.replaceAll("\uE000", hide).replaceAll(fencedCodeRegex, hide),
    hide,
  ).replaceAll(inlineCodeRegex, hide);
  return restore(transform(hidden));
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

        // before the shortcodes go: a caption can contain `}}`
        if (opts.replaceFigureWithMdImg) {
          src = src.replaceAll(
            figureTagRegex,
            (value, params: string) => figureToMarkdownImage(parseShortcodeParams(params)) ?? value,
          );
        }

        if (opts.removeHugoShortcode) {
          src = src.replaceAll(hugoShortcodeRegex, (_value, ...capture) => {
            const [scContent] = capture;
            return scContent;
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
