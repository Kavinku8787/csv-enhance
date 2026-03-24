import type { DataCellValueType } from "../shared/value";

export type ColumnType = DataCellValueType["type"] | "dynamic";
export type PluginExport = (...args: unknown[]) => unknown;

export interface SourceRange {
  startLine: number;
  endLine: number;
}

export interface MetaEntry {
  key: string;
  value: string;
  source: SourceRange;
}

export interface ParsedPluginBinding {
  path: string;
  exportNames: string[];
}

export interface ResolvedPluginBinding {
  exports: PluginExport[];
}

export interface ComputeStatement {
  target: string;
  expression: string;
  source: SourceRange;
}

export interface ComputeBlockTargets {
  names: string[];
  source: SourceRange;
}

// The first iteration only targets bar charts, so plot fields are kept minimal.
export interface PlotFieldMap {
  x?: string;
  y?: string;
  color?: string;
  title?: string;
}

export interface PlotDependencies {
  names: string[];
  source: SourceRange;
}

export interface TableColumn {
  name: string;
  declaredType: ColumnType;
  columnType: ColumnType;
  isTypeExplicit: boolean;
}

export interface BaseBlock {
  kind: "meta" | "plugin" | "table" | "compute" | "plot";
  source: SourceRange;
}

export interface MetaBlock extends BaseBlock {
  kind: "meta";
  entries: MetaEntry[];
}

export interface ParsedPluginBlock extends BaseBlock {
  kind: "plugin";
  alias: string;
  binding: ParsedPluginBinding;
}

export interface ResolvedPluginBlock extends BaseBlock {
  kind: "plugin";
  alias: string;
  modulePath: string;
  exportNames: string[];
  binding: ResolvedPluginBinding;
}

export interface TableBlock extends BaseBlock {
  kind: "table";
  name: string;
  columns: TableColumn[];
  rows: DataCellValueType[][];
}

export interface ComputeBlock extends BaseBlock {
  kind: "compute";
  tableName: string;
  targets: ComputeBlockTargets;
  statements: ComputeStatement[];
}

export interface PlotBlock extends BaseBlock {
  kind: "plot";
  tableName: string;
  dependencies: PlotDependencies;
  fields: PlotFieldMap;
}

export type ParsedSheetBlock = MetaBlock | ParsedPluginBlock | TableBlock | ComputeBlock | PlotBlock;
export type ResolvedSheetBlock = MetaBlock | ResolvedPluginBlock | TableBlock | ComputeBlock | PlotBlock;

export interface ParsedSheetDocument {
  blocks: ParsedSheetBlock[];
}

export interface ResolvedSheetDocument {
  blocks: ResolvedSheetBlock[];
}

export interface ParsedSheetFile {
  path?: string;
  source: string;
  document: ParsedSheetDocument;
}

export interface SheetFile {
  path?: string;
  source: string;
  document: ResolvedSheetDocument;
}
