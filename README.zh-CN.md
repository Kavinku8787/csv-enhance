<p align="center">
  <img src="https://raw.githubusercontent.com/QuetzalSidera/csv-enhance/main/asset/Logo.webp" alt="CSVX logo" width="100" />
</p>

<h1 align="center">CSVX</h1>

<p align="center">
  轻量、AI 友好、纯文本优先的电子表格格式。
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

CSVX 是一种轻量、AI 友好、纯文本优先的电子表格格式。

它站在这些东西的中间：

- CSV
- 电子表格
- 结构化数据 DSL

CSVX 的目标是：

- 纯文本就能读懂
- 适合版本管理
- 足够表达计算列和窗口列
- 可以编译成 `.xlsx`
- 在编辑器和自动化场景里也顺手

npm 包名是 `csvx-lang`。
安装后的命令行入口仍然是 `csvx`。

---

## 一眼看懂

- 兼容 CSV 风格的表格输入
- 支持强类型列
- `@compute` 用来生成按行计算的新列
- `@func` 用来复用内联逻辑
- `@plugin` 用来引入可信的本地 TypeScript 帮手
- `@window` 用来生成跨行窗口列
- `@plot` 用来声明图表规格
- CLI 可直接 lint、compile、导出 `.xlsx`
- VS Code 扩展已支持高亮、诊断、hover、definition、references 和 completion

---

## 通过 npm 安装

如果想全局安装，直接运行：

```bash
npm install -g csvx-lang
```

npm 包名是 `csvx-lang`。
安装后的命令行入口仍然是 `csvx`。

可以先快速确认一下：

```bash
csvx --help
```

如果更希望在某个项目里本地使用，而不是全局安装：

```bash
npm install csvx-lang
npx csvx --help
```

---

## VS Code 扩展

编辑器高亮与语言支持工具通过 GitHub Releases 分发，发布物是一个 `.vsix` 文件。

先从 Releases 下载最新的 `csvx-language-support-*.vsix`，然后在本地用 VS Code 安装：

```bash
code --install-extension ./csvx-language-support-0.1.1.vsix
```

如果本机还没有 `code` 命令，可以先在 VS Code 里执行：

- `Shell Command: Install 'code' command in PATH`

也可以直接从 VS Code 命令面板中手动安装：

- `Extensions: Install from VSIX...`

当前扩展已经支持：

- 语法高亮
- 诊断提示
- hover
- 跳转到定义
- 查找引用
- 自动补全

---

## 最快体验方式

先建一个最小文件 `sales.csvx`：

```csvx
item[string],price[number],count[number]
apple,1.99,3
banana,2.50,4

@compute sheet
target: revenue[number]
revenue = price * count
```

先检查：

```bash
csvx lint sales.csvx
```

再编译：

```bash
csvx compile sales.csvx
```

最后导出成 Excel：

```bash
csvx xlsx sales.csvx
```

默认会生成：

```text
sales.xlsx
```

如果想指定输出路径：

```bash
csvx xlsx sales.csvx -o output/report.xlsx
```

如果安装方式是本地依赖，那么把上面的 `csvx` 换成 `npx csvx` 即可：

```bash
npx csvx lint sales.csvx
npx csvx compile sales.csvx
npx csvx xlsx sales.csvx
```

---

## 文档入口

现在所有项目文档都集中放在 [`docs/`](docs/) 目录下。

### 新手友好文档

- [WIKI.en.md](docs/WIKI.en.md)
- [WIKI.zh-CN.md](docs/WIKI.zh-CN.md)
- [AGENT.md](AGENT.md)

### 语法参考

- [REFERENCE.en.md](docs/REFERENCE.en.md)
- [REFERENCE.zh-CN.md](docs/REFERENCE.zh-CN.md)

### 内置函数

- [BUILTINS.en.md](docs/BUILTINS.en.md)
- [BUILTINS.zh-CN.md](docs/BUILTINS.zh-CN.md)

### 命令行

- [CLI.en.md](docs/CLI.en.md)
- [CLI.zh-CN.md](docs/CLI.zh-CN.md)

### 参与贡献

- [CONTRIBUTING.en.md](docs/CONTRIBUTING.en.md)
- [CONTRIBUTING.zh-CN.md](docs/CONTRIBUTING.zh-CN.md)

### 项目说明

- [ROADMAP.en.md](docs/ROADMAP.en.md)
- [ROADMAP.zh-CN.md](docs/ROADMAP.zh-CN.md)
- [TYPE_SYSTEM.md](docs/TYPE_SYSTEM.md)
- [CHANGELOG.md](docs/CHANGELOG.md)
- [RELEASING.en.md](docs/RELEASING.en.md)

---

## 快速开始

如果是在仓库里直接开发，而不是通过 npm 使用，先构建项目：

```bash
npm run build
```

运行测试：

```bash
npm test
```

体验命令行：

```bash
node dist/cli/csvx.js lint ./examples/retail.csvx
node dist/cli/csvx.js compile ./examples/retail.csvx
node dist/cli/csvx.js xlsx ./examples/retail.csvx
```

如果已经通过 npm 安装：

```bash
csvx lint ./examples/retail.csvx
csvx compile ./examples/retail.csvx
csvx xlsx ./examples/retail.csvx
```

---

## 当前状态

CSVX 目前已经支持：

- 强类型表格
- `@compute`
- `@func`
- `@plugin`
- `@window`
- `@plot`
- `.xlsx` 导出
- CLI 工作流
- 第一版编辑器能力

目前最完整的编辑器支持是 VS Code。
