# Changelog

## 1.0.2

### Patch Changes

- edbe980: fix: the Markdown rewrites no longer touch fenced code blocks or inline code, two Hugo shortcodes on one line stay separate, `{#id}` is only stripped from headings, text between two dollar amounts is no longer treated as math, and a `figure` shortcode with more parameters than `src` keeps a clean image URL. Math from org is unescaped the way ox-hugo escapes it (`\*`, `\{`, `\}`, `\,`, `\|`, … as well as `\_`), so KaTeX no longer sees the escapes. README: fixed the link to the OxHugo compatibility docs.

## 1.0.1

### Patch Changes

- ec4f0a8: Releases are published from GitHub Actions with npm trusted publishing, so each version on npm now carries provenance linking it to the commit and workflow that built it. No changes to the package itself.

## 1.0.0

### Major Changes

- Stable 1.0 release. All `@quartz-community/*` dependencies now use `^1.0.0` ranges.

  Pre-1.0 caret ranges pinned the minor version (`^0.2.1` means `>=0.2.1 <0.3.0`), so
  published fixes to shared packages could never be resolved by dependents. Moving the
  ecosystem to 1.0 makes caret ranges behave conventionally.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial Quartz community plugin template.
