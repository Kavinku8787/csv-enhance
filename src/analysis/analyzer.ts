import { ExpressionParser, type ParsedExpressionNode } from "./expression-parser";
import type {
  AnalysisContext,
  AnalyzedComputeBlock,
  AnalyzedComputeStatement,
  AnalyzedPlotBlock,
  AnalyzedSheetDocument,
  BuiltinCallNode,
  ColumnReferenceNode,
  ExpressionNode,
  LocalReferenceNode,
  PluginCallNode,
} from "./types";
import type { ComputeBlock, PlotBlock, ResolvedPluginBlock, ResolvedSheetDocument, TableBlock, TableColumn } from "../file-interface/types";

const BUILTIN_FUNCTIONS = new Set(["sum", "avg", "min", "max"]);

export class SheetSemanticAnalyzer {
  analyze(document: ResolvedSheetDocument): AnalyzedSheetDocument {
    const context = this.buildContext(document);

    return {
      blocks: document.blocks.map((block) => {
        if (block.kind === "compute") {
          return this.analyzeComputeBlock(block, context);
        }

        if (block.kind === "plot") {
          return this.analyzePlotBlock(block, context);
        }

        return block;
      }),
    };
  }

  private buildContext(document: ResolvedSheetDocument): AnalysisContext {
    const tableMap: Record<string, TableBlock> = {};
    const pluginMap: Record<string, ResolvedPluginBlock> = {};
    const computeOutputMap: Record<string, Record<string, TableColumn>> = {};

    for (const block of document.blocks) {
      if (block.kind === "table") {
        if (tableMap[block.name]) {
          throw new Error(`Duplicate table name "${block.name}"`);
        }
        tableMap[block.name] = block;
      }

      if (block.kind === "plugin") {
        if (pluginMap[block.alias]) {
          throw new Error(`Duplicate plugin alias "${block.alias}"`);
        }
        pluginMap[block.alias] = block;
      }

      if (block.kind === "compute") {
        const table = tableMap[block.tableName];
        if (!table) {
          throw new Error(`Unknown table for @compute ${block.tableName}`);
        }

        const outputs: Record<string, TableColumn> = {};
        for (const targetColumn of block.targets.columns) {
          outputs[targetColumn.name] = {
            ...targetColumn,
          };
        }
        computeOutputMap[block.tableName] = outputs;
      }
    }

    return { document, tableMap, pluginMap, computeOutputMap };
  }

  private analyzeComputeBlock(block: ComputeBlock, context: AnalysisContext): AnalyzedComputeBlock {
    const table = context.tableMap[block.tableName];
    if (!table) {
      throw new Error(`Unknown table for @compute ${block.tableName}`);
    }

    const localNames = new Set<string>();
    const outputs = block.targets.columns.map((column) => ({ columnName: column.name }));
    const outputSet = new Set(block.targets.columns.map((column) => column.name));

    for (const statement of block.statements) {
      if (!outputSet.has(statement.target)) {
        localNames.add(statement.target);
      }
    }

    const statements = block.statements.map((statement) =>
      this.analyzeComputeStatement(statement, table, context, localNames),
    );

    return {
      kind: "compute",
      tableName: block.tableName,
      outputs,
      outputColumns: block.targets.columns.map((column) => ({ ...column })),
      locals: [...localNames],
      statements,
      source: block.source,
    };
  }

  private analyzeComputeStatement(
    statement: ComputeBlock["statements"][number],
    table: TableBlock,
    context: AnalysisContext,
    localNames: Set<string>,
  ): AnalyzedComputeStatement {
    const parsedExpression = new ExpressionParser(statement.expression).parse();

    return {
      target: {
        columnName: statement.target,
      },
      expression: this.bindExpression(parsedExpression, table, context, localNames),
      source: statement.source,
      isOutput: context.computeOutputMap[table.name][statement.target] !== undefined,
    };
  }

  private analyzePlotBlock(block: PlotBlock, context: AnalysisContext): AnalyzedPlotBlock {
    const table = context.tableMap[block.tableName];
    if (!table) {
      throw new Error(`Unknown table for @plot ${block.tableName}`);
    }

    const availableColumns = this.buildAvailableColumns(table, context);
    const dependencyMap = new Map<string, TableColumn>();

    for (const dependencyName of block.dependencies.names) {
      const column = availableColumns[dependencyName];
      if (!column) {
        throw new Error(`Unknown plot dependency "${dependencyName}" in @plot ${block.tableName}`);
      }
      dependencyMap.set(dependencyName, column);
    }

    this.assertPlotFieldDependency(block, "x", dependencyMap);
    this.assertPlotFieldDependency(block, "y", dependencyMap);
    this.assertPlotFieldDependency(block, "color", dependencyMap, false);

    const resolvedDependencies = block.dependencies.names.map((name) => {
      const column = dependencyMap.get(name);
      if (!column) {
        throw new Error(`Unknown plot dependency "${name}" in @plot ${block.tableName}`);
      }
      return column;
    });

    return {
      ...block,
      resolvedDependencies,
    };
  }

  private bindExpression(
    expression: ParsedExpressionNode,
    table: TableBlock,
    context: AnalysisContext,
    localNames: Set<string>,
  ): ExpressionNode {
    switch (expression.kind) {
      case "number_literal":
        return expression;
      case "identifier":
        return this.resolveReference(expression.name, table, context, localNames);
      case "unary_expression":
        return {
          kind: "unary_expression",
          operator: expression.operator,
          operand: this.bindExpression(expression.operand, table, context, localNames),
        };
      case "binary_expression":
        return {
          kind: "binary_expression",
          operator: expression.operator,
          left: this.bindExpression(expression.left, table, context, localNames),
          right: this.bindExpression(expression.right, table, context, localNames),
        };
      case "call_expression":
        return this.resolveCallExpression(expression.callee, expression.args, table, context, localNames);
    }
  }

  private resolveReference(
    name: string,
    table: TableBlock,
    context: AnalysisContext,
    localNames: Set<string>,
  ): ColumnReferenceNode | LocalReferenceNode {
    const column = table.columns.find((item) => item.name === name);
    if (column) {
      return {
        kind: "column_reference",
        column,
      };
    }

    const outputColumn = context.computeOutputMap[table.name]?.[name];
    if (outputColumn) {
      return {
        kind: "column_reference",
        column: outputColumn,
      };
    }

    if (localNames.has(name)) {
      return {
        kind: "local_reference",
        name,
      };
    }

    throw new Error(`Unknown reference "${name}" in @compute ${table.name}`);
  }

  private resolveCallExpression(
    callee: string,
    args: ParsedExpressionNode[],
    table: TableBlock,
    context: AnalysisContext,
    localNames: Set<string>,
  ): BuiltinCallNode | PluginCallNode {
    if (BUILTIN_FUNCTIONS.has(callee)) {
      return {
        kind: "builtin_call",
        name: callee as BuiltinCallNode["name"],
        args: args.map((arg) => this.bindExpression(arg, table, context, localNames)),
      };
    }

    const [pluginAlias, exportName] = callee.split(".");
    if (!pluginAlias || !exportName || callee.split(".").length !== 2) {
      throw new Error(`Unsupported function call "${callee}"`);
    }

    const pluginBlock = context.pluginMap[pluginAlias];
    if (!pluginBlock) {
      throw new Error(`Unknown plugin alias "${pluginAlias}"`);
    }

    const exportIndex = pluginBlock.exportNames.indexOf(exportName);
    if (exportIndex < 0) {
      throw new Error(`Unknown plugin export "${callee}"`);
    }

    return {
      kind: "plugin_call",
      pluginAlias,
      exportName,
      fn: pluginBlock.binding.exports[exportIndex],
      args: args.map((arg) => this.bindExpression(arg, table, context, localNames)),
    };
  }

  private buildAvailableColumns(table: TableBlock, context: AnalysisContext): Record<string, TableColumn> {
    const availableColumns: Record<string, TableColumn> = {};

    for (const column of table.columns) {
      availableColumns[column.name] = column;
    }

    const computedOutputs = context.computeOutputMap[table.name] ?? {};
    for (const name of Object.keys(computedOutputs)) {
      availableColumns[name] = computedOutputs[name];
    }

    return availableColumns;
  }

  private assertPlotFieldDependency(
    block: PlotBlock,
    fieldName: "x" | "y" | "color",
    dependencyMap: Map<string, TableColumn>,
    required = true,
  ): void {
    const fieldValue = block.fields[fieldName];
    if (!fieldValue) {
      if (required) {
        throw new Error(`@plot ${block.tableName} must define ${fieldName}`);
      }
      return;
    }

    if (!dependencyMap.has(fieldValue)) {
      throw new Error(`Plot field "${fieldName}" must be declared in deps: ${fieldValue}`);
    }
  }
}
