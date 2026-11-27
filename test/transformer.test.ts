import { describe, it, expect } from "vitest";
import type { BuildCtx } from "@quartz-community/types";
import { OxHugoFlavouredMarkdown, unescapeOxHugoMath } from "../src/transformer.js";

const ctx = {} as BuildCtx;
const run = (src: string, opts = {}) =>
  OxHugoFlavouredMarkdown(opts).textTransform!(ctx, src) as string;

describe("OxHugoFlavouredMarkdown textTransform", () => {
  // issue #7
  it("removes each shortcode on a line separately", () => {
    expect(run("Use {{< youtube abc >}} and {{< tweet 123 >}} here.")).toBe(
      "Use < youtube abc > and < tweet 123 > here.",
    );
  });

  it("leaves fenced code blocks alone", () => {
    expect(run("```go\n<h1>{{ .Title }}</h1>\n```")).toBe("```go\n<h1>{{ .Title }}</h1>\n```");
    expect(run("```js\nconst o = {#private: 1}\n```")).toBe("```js\nconst o = {#private: 1}\n```");
    expect(run("~~~~\n$a\\_b$\n~~~~\nafter {{x}}")).toBe("~~~~\n$a\\_b$\n~~~~\nafter x");
  });

  it("leaves an unclosed fence (to the end of the file) alone", () => {
    expect(run("text {{x}}\n```\n{{ y }}")).toBe("text x\n```\n{{ y }}");
  });

  it("leaves inline code alone", () => {
    expect(run("Text with css `a {#x}` b")).toBe("Text with css `a {#x}` b");
    expect(run('see ``{{< relref "a" >}}`` and {{< b >}}')).toBe(
      'see ``{{< relref "a" >}}`` and < b >',
    );
  });

  it("strips predefined anchors from ATX headings only", () => {
    expect(run("## Install {#install}\ntext {#keep}")).toBe("## Install\ntext {#keep}");
    expect(run("# Title `code` {#t}")).toBe("# Title `code`");
  });

  it("does not treat text between dollar amounts as math", () => {
    expect(run("Costs $5 and the var is \\_x\\_ and $10.")).toBe(
      "Costs $5 and the var is \\_x\\_ and $10.",
    );
  });

  it("still unescapes math", () => {
    expect(run("inline $a\\_b$ and \\\\(c\\_d\\\\)")).toBe("inline $a_b$ and $c_d$");
    expect(run("$$\nx\\_1\n$$")).toBe("$$\nx_1\n$$");
  });

  it("converts relref links", () => {
    expect(run('[Page]({{< relref "page.md" >}})')).toBe("[Page](page.md)");
  });

  it("keeps the figure src when the shortcode has more parameters", () => {
    expect(run('{{< figure src="./img.png" width="400" >}}')).toBe("![](./img.png)");
    expect(run('{{< figure src="./a.png" >}} and {{< figure src="./b.png" >}}')).toBe(
      "![](./a.png) and ![](./b.png)",
    );
  });

  it("converts a captioned figure, with the caption's text as the alt text", () => {
    // what ox-hugo writes for `#+caption: A cat` above `[[file:/ox-hugo/cat.png]]`
    expect(
      run(
        '{{< figure src="/ox-hugo/cat.png" caption="<span class=\\"figure-number\\">Figure 1: </span>A cat" >}}',
      ),
    ).toBe("![A cat](/ox-hugo/cat.png)");
    expect(
      run(
        '{{< figure caption="<span class=\\"figure-number\\">Figure 2: </span>x > y" src="b.png" >}}',
      ),
    ).toBe("![x > y](b.png)");
    expect(run('{{< figure src="c.png" alt="Alt" caption="Cap" title="T \\"q\\"" >}}')).toBe(
      '![Alt](c.png "T \\"q\\"")',
    );
    expect(run('{{< figure src="my cat.png" caption="[1]" >}}')).toBe("![\\[1\\]](<my cat.png>)");
  });

  it("converts a figure with shortcode removal disabled", () => {
    expect(run('{{< figure src="a.png" >}} {{x}}', { removeHugoShortcode: false })).toBe(
      "![](a.png) {{x}}",
    );
  });

  it("leaves a figure without src alone", () => {
    expect(run('{{< figure caption="x" >}}')).toBe('< figure caption="x" >');
  });

  it("leaves indented code blocks alone", () => {
    expect(run("Go:\n\n    <h1>{{ .Title }}</h1>\n\n    \\\\(x\\\\)\n\nafter {{x}}")).toBe(
      "Go:\n\n    <h1>{{ .Title }}</h1>\n\n    \\\\(x\\\\)\n\nafter x",
    );
    expect(run("# Code\n\tuse {{x}}")).toBe("# Code\n\tuse {{x}}");
  });

  it("rewrites indented lines that are not code", () => {
    // paragraph continuation
    expect(run("para\n    {{x}}")).toBe("para\n    x");
    // list item content
    expect(run("- item\n\n    {{x}} more\n\n1. one\n    \\\\(y\\\\)")).toBe(
      "- item\n\n    x more\n\n1. one\n    $y$",
    );
    // after the list ends, indented lines are code again
    expect(run("- item\n\npara\n\n    {{x}}")).toBe("- item\n\npara\n\n    {{x}}");
  });

  it("keeps text that already contains the placeholder character", () => {
    expect(run("a 7 b {{x}}")).toBe("a 7 b x");
    expect(run("`0` and ")).toBe("`0` and ");
    expect(run("```\n\n```\n{{y}}")).toBe("```\n\n```\ny");
  });

  it("keeps a predefined anchor when removePredefinedAnchor is off", () => {
    expect(run("## H {#h}", { removePredefinedAnchor: false })).toBe("## H {#h}");
    expect(run("## H {#h}")).toBe("## H");
  });

  it("keeps relrefs, figures and LaTeX when every option is off", () => {
    const src = '[P]({{< relref "p.md" >}}) {{< figure src="a.png" >}} \\\\(x\\\\) \\\\[y\\\\]';
    const off = {
      wikilinks: false,
      removePredefinedAnchor: false,
      removeHugoShortcode: false,
      replaceFigureWithMdImg: false,
      replaceOrgLatex: false,
    };
    expect(run(src, off)).toBe(src);
  });

  it("restores placeholders with two-digit indices", () => {
    const code = "`a` ".repeat(11);
    expect(run(code + "{{x}}")).toBe(code + "x");
  });

  it("converts org block LaTeX to $$", () => {
    expect(run("x \\\\[a\\_b\\\\] y")).toBe("x $$a_b$$ y");
    expect(run("\\begin{equation}a\\_b\\end{equation}")).toBe("$$a_b$$");
  });

  it("converts figures with bare and backtick-quoted parameters", () => {
    expect(run("{{< figure src=a.png >}}")).toBe("![](a.png)");
    expect(run("{{< figure src=a.png alt=Cat >}}")).toBe("![Cat](a.png)");
    expect(run("{{< figure src=`a b.png` >}}")).toBe("![](<a b.png>)");
    expect(run("{{< figure src=`a.png` caption=`A <b>cat</b>` >}}")).toBe("![A cat](a.png)");
    // inline code outside the shortcode stays as it is
    expect(run("`{{x}}` and {{< figure src=`c d.png` >}} `$a\\_b$`")).toBe(
      "`{{x}}` and ![](<c d.png>) `$a\\_b$`",
    );
  });

  it("collapses the tags and whitespace of a caption", () => {
    expect(run('{{< figure src="a.png" caption="<em>A</em>   cat" >}}')).toBe("![A cat](a.png)");
  });

  it("keeps indented code lines that follow an indented code line", () => {
    expect(run("para\n\n    line1\n    {{x}}")).toBe("para\n\n    line1\n    {{x}}");
  });
});

describe("unescapeOxHugoMath", () => {
  // what org-blackfriday-escape-chars-in-equation emits for each original fragment
  it.each([
    ["a\\_b", "a_b"], // a_b
    ["x \\* y", "x * y"], // x * y
    ["\\\\{x\\\\}", "\\{x\\}"], // \{x\}
    ["\\right\\\\}", "\\right\\}"], // \right\}
    ["a\\\\,b", "a\\,b"], // a\,b (thin space)
    ["\\\\|v\\\\|", "\\|v\\|"], // \|v\| (norm)
    ["a \\\\\\ b", "a \\\\ b"], // a \\ b (line break)
    ["\\\\\\[2pt]", "\\\\[2pt]"], // \\[2pt]
    ["\\\\\\_", "\\_"], // \_
    ["f\\]\\(x)", "f](x)"], // f](x)
  ])("%s -> %s", (escaped, original) => {
    expect(unescapeOxHugoMath(escaped)).toBe(original);
  });
});
