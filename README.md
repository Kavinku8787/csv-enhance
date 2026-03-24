<p align="center">
  <img src="asset/Logo.webp" alt="CSVX logo" width="88" style="vertical-align:middle;" />
  <span style="display:inline-block;margin:0 12px;color:#9ca3af;font-size:28px;vertical-align:middle;">|</span>
  <span style="display:inline-block;font-size:42px;font-weight:700;vertical-align:middle;">CSVX</span>
</p>

<p align="center">
  Lightweight, AI-friendly, text-first spreadsheets.
</p>

<p align="center">
  <a href="https://github.com/QuetzalSidera/csv-enhance"><img alt="repo" src="https://img.shields.io/badge/GitHub-csv--enhance-111827?logo=github"></a>
  <img alt="npm" src="https://img.shields.io/badge/npm-csvx--lang-cb3837?logo=npm">
  <img alt="version" src="https://img.shields.io/badge/version-0.1.1-111827">
  <img alt="status" src="https://img.shields.io/badge/status-demo-f59e0b">
  <img alt="language" src="https://img.shields.io/badge/language-TypeScript-3178c6">
  <img alt="export" src="https://img.shields.io/badge/export-.xlsx-16a34a">
  <img alt="editor" src="https://img.shields.io/badge/editor-VS%20Code-007acc">
  <img alt="tests" src="https://img.shields.io/badge/tests-68%20passing-22c55e">
</p>

CSVX is a lightweight, AI-friendly, text-first spreadsheet format.

It sits in the space between:

- CSV
- spreadsheets
- structured data DSLs

CSVX is designed to be:

- easy to read in plain text
- friendly to version control
- expressive enough for computed columns and window columns
- compilable into `.xlsx`
- pleasant to work with in editors and automation flows

The npm package name is `csvx-lang`.
The installed CLI command remains `csvx`.

---

## At a Glance

- CSV-compatible table input
- typed columns
- `@compute` for row-scoped derived columns
- `@func` for reusable inline logic
- `@plugin` for trusted local TypeScript helpers
- `@window` for sequence-scoped columns
- `@plot` for declarative chart specs
- CLI for lint, compile, and `.xlsx` export
- VS Code extension with highlighting, diagnostics, hover, definition, references, and completion

---

## Install from npm

Install the package globally:

```bash
npm install -g csvx-lang
```

The npm package name is `csvx-lang`.
The installed CLI command is still `csvx`.

Quick check:

```bash
csvx --help
```

If you prefer to use it inside a project instead of installing globally:

```bash
npm install csvx-lang
npx csvx --help
```

---

## Fastest Way to Try It

Create a small file named `sales.csvx`:

```csvx
item[string],price[number],count[number]
apple,1.99,3
banana,2.50,4

@compute sheet
target: revenue[number]
revenue = price * count
```

Lint it:

```bash
csvx lint sales.csvx
```

Compile it:

```bash
csvx compile sales.csvx
```

Export it to Excel:

```bash
csvx xlsx sales.csvx
```

That will generate:

```text
sales.xlsx
```

If you want a custom output path:

```bash
csvx xlsx sales.csvx -o output/report.xlsx
```

If you installed `csvx-lang` locally instead of globally, just replace `csvx` with `npx csvx`:

```bash
npx csvx lint sales.csvx
npx csvx compile sales.csvx
npx csvx xlsx sales.csvx
```

---

## Documentation

All project documentation now lives under [`docs/`](docs/).

### Beginner-friendly guides

- [WIKI.en.md](docs/WIKI.en.md)
- [WIKI.zh-CN.md](docs/WIKI.zh-CN.md)
- [AGENT.md](AGENT.md)

### Reference docs

- [REFERENCE.en.md](docs/REFERENCE.en.md)
- [REFERENCE.zh-CN.md](docs/REFERENCE.zh-CN.md)

### Builtins

- [BUILTINS.en.md](docs/BUILTINS.en.md)
- [BUILTINS.zh-CN.md](docs/BUILTINS.zh-CN.md)

### CLI

- [CLI.en.md](docs/CLI.en.md)
- [CLI.zh-CN.md](docs/CLI.zh-CN.md)

### Contributing

- [CONTRIBUTING.en.md](docs/CONTRIBUTING.en.md)
- [CONTRIBUTING.zh-CN.md](docs/CONTRIBUTING.zh-CN.md)

### Project notes

- [ROADMAP.en.md](docs/ROADMAP.en.md)
- [ROADMAP.zh-CN.md](docs/ROADMAP.zh-CN.md)
- [TYPE_SYSTEM.md](docs/TYPE_SYSTEM.md)
- [CHANGELOG.md](docs/CHANGELOG.md)
- [RELEASING.en.md](docs/RELEASING.en.md)

---

## Quick Start

If you are working from the repository instead of the npm package, build the project:

```bash
npm run build
```

Run tests:

```bash
npm test
```

Try the CLI:

```bash
node dist/cli/csvx.js lint ./examples/retail.csvx
node dist/cli/csvx.js compile ./examples/retail.csvx
node dist/cli/csvx.js xlsx ./examples/retail.csvx
```

Installed package usage:

```bash
csvx lint ./examples/retail.csvx
csvx compile ./examples/retail.csvx
csvx xlsx ./examples/retail.csvx
```

---

## Current Status

CSVX currently supports:

- typed tables
- `@compute`
- `@func`
- `@plugin`
- `@window`
- `@plot`
- `.xlsx` export
- CLI workflows
- first-pass editor tooling

VS Code support is currently the most complete editor experience.
