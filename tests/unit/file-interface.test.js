const path = require("path");
const { DefaultSheetFileReader, SheetSemanticAnalyzer } = require("../../dist/index.js");

describe("DefaultSheetFileReader integration", () => {
  const reader = new DefaultSheetFileReader();
  const analyzer = new SheetSemanticAnalyzer();
  const fixturePath = path.resolve(__dirname, "../fixtures/file-interface/integration.sheet");

  test("parses one sheet fixture end to end", () => {
    const file = reader.readFromPath(fixturePath);

    expect(file.path).toBe(fixturePath);
    expect(file.document.blocks).toHaveLength(5);

    const [tableBlock, metaBlock, pluginBlock, computeBlock, plotBlock] = file.document.blocks;

    expect(tableBlock.kind).toBe("table");
    expect(tableBlock.name).toBe("sheet");

    expect(metaBlock.kind).toBe("meta");
    expect(metaBlock.entries).toEqual([
      {
        key: "title",
        value: "integration demo",
        source: { startLine: 9, endLine: 9 },
      },
      {
        key: "owner",
        value: "qa",
        source: { startLine: 10, endLine: 10 },
      },
    ]);

    expect(pluginBlock.kind).toBe("plugin");
    expect(pluginBlock.alias).toBe("finance");
    expect(pluginBlock.modulePath).toBe(
      path.resolve(path.dirname(fixturePath), "../../../examples/plugins/finance.ts"),
    );
    expect(pluginBlock.exportNames).toEqual(["tax"]);
    expect(pluginBlock.binding.exports).toHaveLength(1);
    expect(pluginBlock.binding.exports[0].name).toBe("tax");

    expect(tableBlock.columns).toEqual([
      { name: "region", declaredType: "string", columnType: "string", isTypeExplicit: true },
      { name: "price", declaredType: "number", columnType: "number", isTypeExplicit: true },
      { name: "active", declaredType: "boolean", columnType: "boolean", isTypeExplicit: true },
      { name: "note", declaredType: "null", columnType: "null", isTypeExplicit: true },
      { name: "count", declaredType: "dynamic", columnType: "number", isTypeExplicit: false },
      { name: "flag", declaredType: "dynamic", columnType: "boolean", isTypeExplicit: false },
      { name: "label", declaredType: "dynamic", columnType: "string", isTypeExplicit: false },
      { name: "mixed", declaredType: "dynamic", columnType: "dynamic", isTypeExplicit: false },
      { name: "amount", declaredType: "number", columnType: "number", isTypeExplicit: true },
      { name: "total", declaredType: "number", columnType: "number", isTypeExplicit: true },
    ]);
    expect(tableBlock.rows).toEqual([
      [
        { type: "string", value: "North" },
        { type: "number", value: 3 },
        { type: "boolean", value: true },
        { type: "null", value: null },
        { type: "number", value: 1 },
        { type: "boolean", value: true },
        { type: "string", value: "alpha" },
        { type: "number", value: 1 },
        { type: "number", value: 10 },
        { type: "number", value: 20 },
      ],
      [
        { type: "string", value: "South" },
        { type: "number", value: 4 },
        { type: "boolean", value: false },
        { type: "null", value: null },
        { type: "number", value: 2 },
        { type: "boolean", value: false },
        { type: "string", value: "beta" },
        { type: "string", value: "hello" },
        { type: "number", value: 15 },
        { type: "number", value: 30 },
      ],
      [
        { type: "string", value: "East" },
        { type: "number", value: 5 },
        { type: "boolean", value: true },
        { type: "null", value: null },
        { type: "null", value: null },
        { type: "null", value: null },
        { type: "string", value: "gamma" },
        { type: "null", value: null },
        { type: "number", value: 18 },
        { type: "number", value: 36 },
      ],
    ]);

    expect(computeBlock.kind).toBe("compute");
    expect(computeBlock.tableName).toBe("sheet");
    expect(computeBlock.targets).toEqual({
      names: ["double_total", "taxed_total"],
      source: { startLine: 19, endLine: 19 },
    });
    expect(computeBlock.statements).toEqual([
      {
        target: "double_total",
        expression: "total * 2",
        source: { startLine: 20, endLine: 20 },
      },
      {
        target: "taxed_total",
        expression: "finance.tax(price, count)",
        source: { startLine: 21, endLine: 21 },
      },
    ]);

    expect(plotBlock.kind).toBe("plot");
    expect(plotBlock.tableName).toBe("sheet");
    expect(plotBlock.dependencies).toEqual({
      names: ["amount", "total"],
      source: { startLine: 25, endLine: 25 },
    });
    expect(plotBlock.fields).toEqual({
      x: "amount",
      y: "total",
      title: "amount vs total",
    });

    const analyzedDocument = analyzer.analyze(file.document);
    const analyzedComputeBlock = analyzedDocument.blocks.find((block) => block.kind === "compute");

    expect(analyzedComputeBlock).toBeDefined();
    expect(analyzedComputeBlock.tableName).toBe("sheet");
    expect(analyzedComputeBlock.outputs).toEqual([
      { columnName: "double_total" },
      { columnName: "taxed_total" },
    ]);
    expect(analyzedComputeBlock.locals).toEqual([]);
    expect(analyzedComputeBlock.statements).toHaveLength(2);
    expect(analyzedComputeBlock.statements[0]).toEqual({
      target: { columnName: "double_total" },
      expression: {
        kind: "binary_expression",
        operator: "*",
        left: {
          kind: "column_reference",
          column: tableBlock.columns[9],
        },
        right: {
          kind: "number_literal",
          value: 2,
        },
      },
      source: { startLine: 20, endLine: 20 },
      isOutput: true,
    });
    expect(analyzedComputeBlock.statements[1].target).toEqual({ columnName: "taxed_total" });
    expect(analyzedComputeBlock.statements[1].expression.kind).toBe("plugin_call");
    expect(analyzedComputeBlock.statements[1].expression.pluginAlias).toBe("finance");
    expect(analyzedComputeBlock.statements[1].expression.exportName).toBe("tax");
    expect(analyzedComputeBlock.statements[1].expression.fn).toBe(pluginBlock.binding.exports[0]);
    expect(analyzedComputeBlock.statements[1].expression.args).toEqual([
      {
        kind: "column_reference",
        column: tableBlock.columns[1],
      },
      {
        kind: "column_reference",
        column: tableBlock.columns[4],
      },
    ]);

    const analyzedPlotBlock = analyzedDocument.blocks.find((block) => block.kind === "plot");
    expect(analyzedPlotBlock).toBeDefined();
    expect(analyzedPlotBlock.resolvedDependencies).toEqual([
      tableBlock.columns[8],
      tableBlock.columns[9],
    ]);
  });

  test("throws when a plot field is not declared in deps", () => {
    const conflictFile = reader.readFromString(
      `value[number]
1

@plot sheet
deps: value
x: other
y: value
`,
      path.resolve(__dirname, "../fixtures/file-interface/conflict.sheet"),
    );

    expect(() => analyzer.analyze(conflictFile.document)).toThrow(/must be declared in deps/);
  });

  test("throws when @compute is missing target declaration", () => {
    expect(() =>
      reader.readFromString(
        `value[number]
1

@compute sheet
x = value
`,
        path.resolve(__dirname, "../fixtures/file-interface/missing-target.sheet"),
      ),
    ).toThrow(/must declare target:/);
  });

  test("throws when a plot dependency does not exist", () => {
    const conflictFile = reader.readFromString(
      `value[number]
1

@compute sheet
target: out
out = value

@plot sheet
deps: missing
x: value
y: value
`,
      path.resolve(__dirname, "../fixtures/file-interface/conflict.sheet"),
    );

    expect(() => analyzer.analyze(conflictFile.document)).toThrow(/Unknown plot dependency "missing"/);
  });
});
