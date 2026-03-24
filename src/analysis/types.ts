import type {
  ComputeBlock,
  MetaBlock,
  PlotBlock,
  ResolvedPluginBlock,
  ResolvedSheetDocument,
  SourceRange,
  TableBlock,
  TableColumn,
} from "../file-interface/types";

export type BinaryOperator = "+" | "-" | "*" | "/";

export type ExpressionNode =
  | NumberLiteralNode
  | ColumnReferenceNode
  | LocalReferenceNode
  | UnaryExpressionNode
  | BinaryExpressionNode
  | BuiltinCallNode
  | PluginCallNode;

export interface NumberLiteralNode {
  kind: "number_literal";
  value: number;
}

export interface ColumnReferenceNode {
  kind: "column_reference";
  column: TableColumn;
}

export interface LocalReferenceNode {
  kind: "local_reference";
  name: string;
}

export interface UnaryExpressionNode {
  kind: "unary_expression";
  operator: "-";
  operand: ExpressionNode;
}

export interface BinaryExpressionNode {
  kind: "binary_expression";
  operator: BinaryOperator;
  left: ExpressionNode;
  right: ExpressionNode;
}

export interface BuiltinCallNode {
  kind: "builtin_call";
  name: "sum" | "avg" | "min" | "max";
  args: ExpressionNode[];
}

export interface PluginCallNode {
  kind: "plugin_call";
  pluginAlias: string;
  exportName: string;
  fn: (...args: unknown[]) => unknown;
  args: ExpressionNode[];
}

export interface AnalyzeTarget {
  columnName: string;
}

export interface AnalyzedComputeStatement {
  target: AnalyzeTarget;
  expression: ExpressionNode;
  source: SourceRange;
  isOutput: boolean;
}

export interface AnalyzedComputeBlock {
  kind: "compute";
  tableName: string;
  outputs: AnalyzeTarget[];
  locals: string[];
  statements: AnalyzedComputeStatement[];
  source: SourceRange;
}

export interface AnalyzedPlotBlock extends PlotBlock {
  resolvedDependencies: TableColumn[];
}

export type AnalyzedSheetBlock =
  | MetaBlock
  | ResolvedPluginBlock
  | TableBlock
  | AnalyzedPlotBlock
  | AnalyzedComputeBlock;

export interface AnalyzedSheetDocument {
  blocks: AnalyzedSheetBlock[];
}

export interface AnalysisContext {
  document: ResolvedSheetDocument;
  tableMap: Record<string, TableBlock>;
  pluginMap: Record<string, ResolvedPluginBlock>;
  computeOutputMap: Record<string, Record<string, TableColumn>>;
}

export type ComputeCapableBlock = ComputeBlock | AnalyzedComputeBlock;
