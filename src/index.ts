export { DefaultSheetFileReader, type SheetFileReader } from "./file-interface/reader";
export { PluginModuleLoader } from "./file-interface/plugin-loader";
export { SheetSyntaxParser } from "./file-interface/parser";
export { SheetSemanticAnalyzer } from "./analysis/analyzer";
export { ExpressionParser, type ParsedExpressionNode } from "./analysis/expression-parser";
export { ComputeExecutor } from "./runtime/compute-executor";
export { DocumentExecutor } from "./runtime/document-executor";
export { ExpressionEvaluator } from "./runtime/expression-evaluator";
export { PlotCompiler } from "./runtime/plot-compiler";
export { SheetCompiler } from "./runtime/sheet-compiler";
export { XlsxAdapter } from "./runtime/xlsx-adapter";
export type {
  ColumnType,
  ComputeBlock,
  ComputeStatement,
  MetaBlock,
  MetaEntry,
  ParsedPluginBinding,
  ParsedPluginBlock,
  ParsedSheetBlock,
  ParsedSheetDocument,
  ParsedSheetFile,
  PlotBlock,
  PlotFieldMap,
  PluginExport,
  ResolvedPluginBinding,
  ResolvedPluginBlock,
  ResolvedSheetBlock,
  ResolvedSheetDocument,
  SheetFile,
  SourceRange,
  TableBlock,
  TableColumn,
} from "./file-interface/types";
export type {
  AnalysisContext,
  AnalyzedComputeBlock,
  AnalyzedComputeStatement,
  AnalyzedPlotBlock,
  AnalyzedSheetDocument,
  AnalyzedSheetBlock,
  AnalyzeTarget,
  BinaryExpressionNode,
  BinaryOperator,
  BuiltinCallNode,
  ColumnReferenceNode,
  ExpressionNode,
  LocalReferenceNode,
  NumberLiteralNode,
  PluginCallNode,
} from "./analysis/types";
export type {
  EvaluatedComputeResult,
  EvaluatedExpression,
  EvaluatedPlot,
  EvaluatedSheetBlock,
  EvaluatedSheetDocument,
  EvaluatedTable,
  ExpressionEvaluationContext,
  RuntimeRow,
} from "./runtime/types";
export type { VegaLiteBarSpec, VegaLiteEncodingField, VegaLiteFieldType } from "./runtime/plot-compiler";
export type { CompiledSheetResult, CompiledSheetResult as SheetCompilationResult } from "./runtime/sheet-compiler";
export {
  inferColumnTypeFromCells,
  inferDynamicDataCellValue,
  parseDeclaredDataCellValue,
  type DataCellValueType,
} from "./shared/value";
export { parseCsvLine } from "./shared/csv";
