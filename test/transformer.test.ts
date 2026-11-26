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

  it("respects disabled options", () => {
    expect(run("## H {#h} {{x}}", { removePredefinedAnchor: false })).toBe("## H {#h} x");
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
