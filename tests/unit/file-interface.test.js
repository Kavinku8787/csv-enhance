const path = require("path");
const fs = require("fs");
const os = require("os");
const {
  ComputeExecutor,
  DefaultSheetFileReader,
  DocumentExecutor,
  ExpressionEvaluator,
  PlotCompiler,
  SheetCompiler,
  SheetSemanticAnalyzer,
  XlsxAdapter,
} = require("../../dist/index.js");
const XLSX = require("xlsx");

describe("DefaultSheetFileReader integration", () => {
  const reader = new DefaultSheetFileReader();
  const analyzer = new SheetSemanticAnalyzer();
  const evaluator = new ExpressionEvaluator();
  const computeExecutor = new ComputeExecutor(evaluator);
  const documentExecutor = new DocumentExecutor(computeExecutor);
  const plotCompiler = new PlotCompiler();
  const sheetCompiler = new SheetCompiler(reader, analyzer, documentExecutor, plotCompiler);
  const xlsxAdapter = new XlsxAdapter();
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
      columns: [
        { name: "double_total", declaredType: "dynamic", columnType: "dynamic", isTypeExplicit: false },
        { name: "taxed_total", declaredType: "dynamic", columnType: "dynamic", isTypeExplicit: false },
      ],
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
    expect(analyzedComputeBlock.outputColumns).toEqual([
      { name: "double_total", declaredType: "dynamic", columnType: "dynamic", isTypeExplicit: false },
      { name: "taxed_total", declaredType: "dynamic", columnType: "dynamic", isTypeExplicit: false },
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

    const runtimeRow = {
      total: { type: "number", value: 20 },
      price: { type: "number", value: 3 },
      count: { type: "number", value: 1 },
    };

    expect(
      evaluator.evaluate(analyzedComputeBlock.statements[0].expression, {
        row: runtimeRow,
        locals: {},
        aggregateRows: [runtimeRow],
      }),
    ).toEqual({ type: "number", value: 40 });

    expect(
      evaluator.evaluate(analyzedComputeBlock.statements[1].expression, {
        row: runtimeRow,
        locals: {},
        aggregateRows: [runtimeRow],
      }),
    ).toEqual({ type: "number", value: 3.24 });

    const evaluatedTable = computeExecutor.execute(tableBlock, analyzedComputeBlock);
    expect(evaluatedTable.columns).toEqual([
      ...tableBlock.columns,
      { name: "double_total", declaredType: "dynamic", columnType: "dynamic", isTypeExplicit: false },
      { name: "taxed_total", declaredType: "dynamic", columnType: "dynamic", isTypeExplicit: false },
    ]);
    expect(evaluatedTable.rows[0].double_total).toEqual({ type: "number", value: 40 });
    expect(evaluatedTable.rows[0].taxed_total).toEqual({ type: "number", value: 3.24 });

    const evaluatedDocument = documentExecutor.execute(analyzedDocument);
    expect(Object.keys(evaluatedDocument.tables)).toEqual(["sheet"]);
    expect(evaluatedDocument.tables.sheet.columns).toEqual(evaluatedTable.columns);
    expect(evaluatedDocument.tables.sheet.rows).toEqual(evaluatedTable.rows);
    expect(evaluatedDocument.plots).toEqual([
      {
        kind: "plot",
        tableName: "sheet",
        fields: {
          x: "amount",
          y: "total",
          title: "amount vs total",
        },
        resolvedDependencies: [
          tableBlock.columns[8],
          tableBlock.columns[9],
        ],
        rows: [
          {
            amount: { type: "number", value: 10 },
            total: { type: "number", value: 20 },
          },
          {
            amount: { type: "number", value: 15 },
            total: { type: "number", value: 30 },
          },
          {
            amount: { type: "number", value: 18 },
            total: { type: "number", value: 36 },
          },
        ],
        source: { startLine: 24, endLine: 28 },
      },
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

  test("analyzes local compute variables separately from outputs", () => {
    const file = reader.readFromString(
      `price[number],qty[number]
3,5

@compute sheet
target: total
subtotal = price * qty
total = subtotal
`,
      path.resolve(__dirname, "../fixtures/file-interface/locals.sheet"),
    );

    const analyzedDocument = analyzer.analyze(file.document);
    const analyzedComputeBlock = analyzedDocument.blocks.find((block) => block.kind === "compute");

    expect(analyzedComputeBlock).toBeDefined();
    expect(analyzedComputeBlock.outputs).toEqual([{ columnName: "total" }]);
    expect(analyzedComputeBlock.outputColumns).toEqual([
      { name: "total", declaredType: "dynamic", columnType: "dynamic", isTypeExplicit: false },
    ]);
    expect(analyzedComputeBlock.locals).toEqual(["subtotal"]);
    expect(analyzedComputeBlock.statements).toEqual([
      {
        target: { columnName: "subtotal" },
        expression: {
          kind: "binary_expression",
          operator: "*",
          left: {
            kind: "column_reference",
            column: file.document.blocks[0].columns[0],
          },
          right: {
            kind: "column_reference",
            column: file.document.blocks[0].columns[1],
          },
        },
        source: { startLine: 6, endLine: 6 },
        isOutput: false,
      },
      {
        target: { columnName: "total" },
        expression: {
          kind: "local_reference",
          name: "subtotal",
        },
        source: { startLine: 7, endLine: 7 },
        isOutput: true,
      },
    ]);

    const evaluatedTable = computeExecutor.execute(file.document.blocks[0], analyzedComputeBlock);
    expect(evaluatedTable.columns).toEqual([
      ...file.document.blocks[0].columns,
      { name: "total", declaredType: "dynamic", columnType: "dynamic", isTypeExplicit: false },
    ]);
    expect(evaluatedTable.rows[0].total).toEqual({ type: "number", value: 15 });
    expect(evaluatedTable.rows[0].subtotal).toBeUndefined();
  });

  test("resolves plot deps against compute outputs", () => {
    const file = reader.readFromString(
      `price[number],qty[number]
3,5

@compute sheet
target: total
total = price * qty

@plot sheet
deps: total
x: total
y: total
`,
      path.resolve(__dirname, "../fixtures/file-interface/plot-output.sheet"),
    );

    const analyzedDocument = analyzer.analyze(file.document);
    const analyzedPlotBlock = analyzedDocument.blocks.find((block) => block.kind === "plot");

    expect(analyzedPlotBlock).toBeDefined();
    expect(analyzedPlotBlock.resolvedDependencies).toEqual([
      {
        name: "total",
        declaredType: "dynamic",
        columnType: "dynamic",
        isTypeExplicit: false,
      },
    ]);
  });

  test("parses typed compute targets without inference", () => {
    const file = reader.readFromString(
      `price[number]
3

@compute sheet
target: total[number], label[string], passthrough
total = price
label = price
passthrough = price
`,
      path.resolve(__dirname, "../fixtures/file-interface/typed-targets.sheet"),
    );

    const computeBlock = file.document.blocks.find((block) => block.kind === "compute");
    expect(computeBlock).toBeDefined();
    expect(computeBlock.targets).toEqual({
      columns: [
        { name: "total", declaredType: "number", columnType: "number", isTypeExplicit: true },
        { name: "label", declaredType: "string", columnType: "string", isTypeExplicit: true },
        { name: "passthrough", declaredType: "dynamic", columnType: "dynamic", isTypeExplicit: false },
      ],
      source: { startLine: 5, endLine: 5 },
    });

    const analyzedDocument = analyzer.analyze(file.document);
    const analyzedPlotSource = reader.readFromString(
      `price[number]
3

@compute sheet
target: total[number]
total = price

@plot sheet
deps: total
x: total
y: total
`,
      path.resolve(__dirname, "../fixtures/file-interface/typed-target-plot.sheet"),
    );
    const analyzedPlotDocument = analyzer.analyze(analyzedPlotSource.document);
    const analyzedPlotBlock = analyzedPlotDocument.blocks.find((block) => block.kind === "plot");

    expect(analyzedDocument.blocks.find((block) => block.kind === "compute").outputs).toEqual([
      { columnName: "total" },
      { columnName: "label" },
      { columnName: "passthrough" },
    ]);
    expect(analyzedPlotBlock.resolvedDependencies).toEqual([
      {
        name: "total",
        declaredType: "number",
        columnType: "number",
        isTypeExplicit: true,
      },
    ]);
  });

  test("supports unicode identifiers in table names, column names, compute targets, and plot deps", () => {
    const file = reader.readFromString(
      `@table 销售表
地区[string],金额[number]
华北,10
华东,12

@compute 销售表
target: 合计[number]
合计 = 金额 * 2

@plot 销售表
deps: 金额,合计
x: 金额
y: 合计
title: 金额与合计
`,
      path.resolve(__dirname, "../fixtures/file-interface/unicode.sheet"),
    );

    const tableBlock = file.document.blocks.find((block) => block.kind === "table");
    expect(tableBlock.name).toBe("销售表");
    expect(tableBlock.columns).toEqual([
      { name: "地区", declaredType: "string", columnType: "string", isTypeExplicit: true },
      { name: "金额", declaredType: "number", columnType: "number", isTypeExplicit: true },
    ]);

    const analyzedDocument = analyzer.analyze(file.document);
    const evaluatedDocument = documentExecutor.execute(analyzedDocument);

    expect(evaluatedDocument.tables["销售表"].columns).toEqual([
      { name: "地区", declaredType: "string", columnType: "string", isTypeExplicit: true },
      { name: "金额", declaredType: "number", columnType: "number", isTypeExplicit: true },
      { name: "合计", declaredType: "number", columnType: "number", isTypeExplicit: true },
    ]);
    expect(evaluatedDocument.tables["销售表"].rows).toEqual([
      {
        地区: { type: "string", value: "华北" },
        金额: { type: "number", value: 10 },
        合计: { type: "number", value: 20 },
      },
      {
        地区: { type: "string", value: "华东" },
        金额: { type: "number", value: 12 },
        合计: { type: "number", value: 24 },
      },
    ]);
    expect(plotCompiler.compileBarPlot(evaluatedDocument.plots[0])).toEqual({
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: "bar",
      title: "金额与合计",
      data: {
        values: [
          { 金额: 10, 合计: 20 },
          { 金额: 12, 合计: 24 },
        ],
      },
      encoding: {
        x: {
          field: "金额",
          type: "quantitative",
        },
        y: {
          field: "合计",
          type: "quantitative",
        },
      },
    });
  });

  test("evaluates builtin aggregate expressions across aggregate rows", () => {
    const file = reader.readFromString(
      `value[number]
1
2

@compute sheet
target: average[number]
average = avg(value)
`,
      path.resolve(__dirname, "../fixtures/file-interface/aggregate.sheet"),
    );

    const analyzedDocument = analyzer.analyze(file.document);
    const analyzedComputeBlock = analyzedDocument.blocks.find((block) => block.kind === "compute");
    const aggregateRows = [
      { value: { type: "number", value: 1 } },
      { value: { type: "number", value: 2 } },
    ];

    expect(
      evaluator.evaluate(analyzedComputeBlock.statements[0].expression, {
        row: aggregateRows[0],
        locals: {},
        aggregateRows,
      }),
    ).toEqual({ type: "number", value: 1.5 });
  });

  test("materializes aggregate compute outputs onto every row", () => {
    const file = reader.readFromString(
      `value[number]
1
2

@compute sheet
target: average[number]
average = avg(value)
`,
      path.resolve(__dirname, "../fixtures/file-interface/aggregate-materialize.sheet"),
    );

    const analyzedDocument = analyzer.analyze(file.document);
    const tableBlock = file.document.blocks.find((block) => block.kind === "table");
    const analyzedComputeBlock = analyzedDocument.blocks.find((block) => block.kind === "compute");
    const evaluatedTable = computeExecutor.execute(tableBlock, analyzedComputeBlock);

    expect(evaluatedTable.columns).toEqual([
      ...tableBlock.columns,
      { name: "average", declaredType: "number", columnType: "number", isTypeExplicit: true },
    ]);
    expect(evaluatedTable.rows).toEqual([
      {
        value: { type: "number", value: 1 },
        average: { type: "number", value: 1.5 },
      },
      {
        value: { type: "number", value: 2 },
        average: { type: "number", value: 1.5 },
      },
    ]);
  });

  test("preserves typed compute output columns in runtime tables", () => {
    const file = reader.readFromString(
      `price[number]
3

@compute sheet
target: total[number], label[string], passthrough
total = price
label = price
passthrough = price
`,
      path.resolve(__dirname, "../fixtures/file-interface/runtime-typed-targets.sheet"),
    );

    const analyzedDocument = analyzer.analyze(file.document);
    const tableBlock = file.document.blocks.find((block) => block.kind === "table");
    const analyzedComputeBlock = analyzedDocument.blocks.find((block) => block.kind === "compute");
    const evaluatedTable = computeExecutor.execute(tableBlock, analyzedComputeBlock);

    expect(evaluatedTable.columns).toEqual([
      ...tableBlock.columns,
      { name: "total", declaredType: "number", columnType: "number", isTypeExplicit: true },
      { name: "label", declaredType: "string", columnType: "string", isTypeExplicit: true },
      { name: "passthrough", declaredType: "dynamic", columnType: "dynamic", isTypeExplicit: false },
    ]);
  });

  test("executes compute blocks before plots and exposes computed dependencies", () => {
    const file = reader.readFromString(
      `value[number]
1
2

@compute sheet
target: doubled[number]
doubled = value * 2

@plot sheet
deps: doubled
x: doubled
y: doubled
`,
      path.resolve(__dirname, "../fixtures/file-interface/document-executor.sheet"),
    );

    const analyzedDocument = analyzer.analyze(file.document);
    const evaluatedDocument = documentExecutor.execute(analyzedDocument);

    expect(evaluatedDocument.tables.sheet.columns).toEqual([
      { name: "value", declaredType: "number", columnType: "number", isTypeExplicit: true },
      { name: "doubled", declaredType: "number", columnType: "number", isTypeExplicit: true },
    ]);
    expect(evaluatedDocument.tables.sheet.rows).toEqual([
      {
        value: { type: "number", value: 1 },
        doubled: { type: "number", value: 2 },
      },
      {
        value: { type: "number", value: 2 },
        doubled: { type: "number", value: 4 },
      },
    ]);
    expect(evaluatedDocument.plots).toEqual([
      {
        kind: "plot",
        tableName: "sheet",
        fields: {
          x: "doubled",
          y: "doubled",
        },
        resolvedDependencies: [
          { name: "doubled", declaredType: "number", columnType: "number", isTypeExplicit: true },
        ],
        rows: [
          {
            doubled: { type: "number", value: 2 },
          },
          {
            doubled: { type: "number", value: 4 },
          },
        ],
        source: { startLine: 9, endLine: 12 },
      },
    ]);
  });

  test("compiles evaluated plots into Vega-Lite bar specs", () => {
    const file = reader.readFromPath(fixturePath);
    const analyzedDocument = analyzer.analyze(file.document);
    const evaluatedDocument = documentExecutor.execute(analyzedDocument);
    const [plot] = evaluatedDocument.plots;

    expect(plotCompiler.compileBarPlot(plot)).toEqual({
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: "bar",
      title: "amount vs total",
      data: {
        values: [
          { amount: 10, total: 20 },
          { amount: 15, total: 30 },
          { amount: 18, total: 36 },
        ],
      },
      encoding: {
        x: {
          field: "amount",
          type: "quantitative",
        },
        y: {
          field: "total",
          type: "quantitative",
        },
      },
    });
  });

  test("compiles a sheet from path through the full pipeline", () => {
    const compiled = sheetCompiler.compilePath(fixturePath);

    expect(compiled.file.path).toBe(fixturePath);
    expect(compiled.analyzedDocument.blocks).toHaveLength(5);
    expect(compiled.evaluatedDocument.tables.sheet.rows[0]).toEqual({
      region: { type: "string", value: "North" },
      price: { type: "number", value: 3 },
      active: { type: "boolean", value: true },
      note: { type: "null", value: null },
      count: { type: "number", value: 1 },
      flag: { type: "boolean", value: true },
      label: { type: "string", value: "alpha" },
      mixed: { type: "number", value: 1 },
      amount: { type: "number", value: 10 },
      total: { type: "number", value: 20 },
      double_total: { type: "number", value: 40 },
      taxed_total: { type: "number", value: 3.24 },
    });
    expect(compiled.plotSpecs).toEqual([
      {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        mark: "bar",
        title: "amount vs total",
        data: {
          values: [
            { amount: 10, total: 20 },
            { amount: 15, total: 30 },
            { amount: 18, total: 36 },
          ],
        },
        encoding: {
          x: {
            field: "amount",
            type: "quantitative",
          },
          y: {
            field: "total",
            type: "quantitative",
          },
        },
      },
    ]);
  });

  test("builds an xlsx workbook with table sheets and a _plots metadata sheet", () => {
    const compiled = sheetCompiler.compilePath(fixturePath);
    const workbook = xlsxAdapter.buildWorkbook(compiled);

    expect(workbook.SheetNames).toEqual(["sheet", "_plots"]);

    const tableRows = XLSX.utils.sheet_to_json(workbook.Sheets.sheet, { header: 1, defval: null });
    expect(tableRows).toEqual([
      [
        "region",
        "price",
        "active",
        "note",
        "count",
        "flag",
        "label",
        "mixed",
        "amount",
        "total",
        "double_total",
        "taxed_total",
      ],
      ["North", 3, true, null, 1, true, "alpha", 1, 10, 20, 40, 3.24],
      ["South", 4, false, null, 2, false, "beta", "hello", 15, 30, 60, 8.64],
      ["East", 5, true, null, null, null, "gamma", null, 18, 36, 72, 0],
    ]);

    const plotRows = XLSX.utils.sheet_to_json(workbook.Sheets._plots);
    expect(plotRows).toEqual([
      {
        plot_index: 0,
        table: "sheet",
        title: "amount vs total",
        x: "amount",
        y: "total",
        color: "",
        deps: "amount,total",
        spec_json: JSON.stringify(compiled.plotSpecs[0]),
      },
    ]);
  });

  test("writes compiled workbook to disk", () => {
    const compiled = sheetCompiler.compilePath(fixturePath);
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "sheet-format-"));
    const outputPath = path.join(tempDirectory, "integration.xlsx");

    xlsxAdapter.writeCompiledResult(compiled, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);

    const workbook = XLSX.readFile(outputPath);
    expect(workbook.SheetNames).toEqual(["sheet", "_plots"]);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets.sheet, { header: 1, defval: null })[1]).toEqual([
      "North",
      3,
      true,
      null,
      1,
      true,
      "alpha",
      1,
      10,
      20,
      40,
      3.24,
    ]);
  });

  test("throws when plot execution happens before its computed dependency is materialized", () => {
    const file = reader.readFromString(
      `value[number]
1

@plot sheet
deps: doubled
x: doubled
y: doubled

@compute sheet
target: doubled[number]
doubled = value * 2
`,
      path.resolve(__dirname, "../fixtures/file-interface/document-order.sheet"),
    );

    const analyzedDocument = analyzer.analyze(file.document);

    expect(() => documentExecutor.execute(analyzedDocument)).toThrow(/not materialized yet: doubled/);
  });

  test("throws when compute executor receives the wrong table", () => {
    const file = reader.readFromString(
      `value[number]
1

@table sales
value[number]
2

@compute sales
target: total[number]
total = value
`,
      path.resolve(__dirname, "../fixtures/file-interface/executor-mismatch.sheet"),
    );

    const analyzedDocument = analyzer.analyze(file.document);
    const wrongTable = file.document.blocks.find((block) => block.kind === "table" && block.name === "sheet");
    const analyzedComputeBlock = analyzedDocument.blocks.find((block) => block.kind === "compute");

    expect(() => computeExecutor.execute(wrongTable, analyzedComputeBlock)).toThrow(
      /executor received "sheet"/,
    );
  });
});
