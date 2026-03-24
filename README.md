# `.sheet` File Interface

This refactor focuses on the file interface layer first, following the architecture notes in `Comment.md`.

Current scope:

- file-oriented entry API
- block-level syntax parsing
- expression AST parsing
- semantic analysis for `@compute`
- typed table cell representation
- typed table column declaration and inference
- source metadata for each parsed block
- `#` comment line support

Not part of this phase:

- syntax static analysis
- compute compiler
- xlsx adapter
- plugin execution runtime

## Structure

- [src/file-interface/reader.ts](/Users/qianshuang/Project/WebProject/csv-enhance/src/file-interface/reader.ts): file interface and default reader
- [src/file-interface/parser.ts](/Users/qianshuang/Project/WebProject/csv-enhance/src/file-interface/parser.ts): block parser
- [src/file-interface/types.ts](/Users/qianshuang/Project/WebProject/csv-enhance/src/file-interface/types.ts): document and block types
- [src/analysis/expression-parser.ts](/Users/qianshuang/Project/WebProject/csv-enhance/src/analysis/expression-parser.ts): expression AST parser
- [src/analysis/analyzer.ts](/Users/qianshuang/Project/WebProject/csv-enhance/src/analysis/analyzer.ts): semantic binding for compute expressions
- [src/shared/value.ts](/Users/qianshuang/Project/WebProject/csv-enhance/src/shared/value.ts): typed cell inference
- [src/shared/csv.ts](/Users/qianshuang/Project/WebProject/csv-enhance/src/shared/csv.ts): CSV line parsing

## Example

```ts
import { DefaultSheetFileReader } from "./src";

const reader = new DefaultSheetFileReader();
const file = reader.readFromPath("./examples/retail.sheet");

console.log(file.document.blocks);
```

Comment lines starting with `#` are ignored during parsing.
If the first block does not start with `@`, it is parsed as an implicit `@table sheet` block for CSV compatibility.
Table columns support `name[type]`, for example `region[string]` or `qty[number]`.
If the type is omitted, the column starts as `dynamic` and each cell is parsed in `null -> number -> boolean -> string` order.
The current demo only models bar plots, and plot fields may only reference `number` columns.
`@compute` expressions are preserved in the file interface layer and then parsed into AST plus semantic bindings in the analysis layer.
