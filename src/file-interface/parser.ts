import { parseCsvLine } from "../shared/csv";
import { inferColumnTypeFromCells, parseDeclaredDataCellValue } from "../shared/value";
import type {
  ColumnType,
  ComputeBlock,
  ComputeBlockTargets,
  ComputeStatement,
  MetaBlock,
  MetaEntry,
  ParsedPluginBlock,
  ParsedSheetBlock,
  ParsedSheetDocument,
  PlotBlock,
  PlotDependencies,
  PlotFieldMap,
  SourceRange,
  TableBlock,
  TableColumn,
} from "./types";

const DIRECTIVE_PATTERN = /^@([a-z]+)(?:\s+([A-Za-z_][A-Za-z0-9_-]*))?\s*$/;
const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const COLUMN_PATTERN = /^([A-Za-z_][A-Za-z0-9_]*)(?:\[(dynamic|string|number|boolean|null)\])?$/;
const SUPPORTED_PLOT_KEYS = new Set(["deps", "x", "y", "color", "title"]);
const DEFAULT_TABLE_NAME = "sheet";

interface BlockBuffer {
  directive: string;
  name?: string;
  body: string[];
  source: SourceRange;
}

export class SheetSyntaxParser {
  parse(source: string): ParsedSheetDocument {
    const normalizedSource = source.replace(/\r\n?/g, "\n").trim();
    if (normalizedSource === "") {
      return { blocks: [] };
    }

    const lines = normalizedSource.split("\n");
    const blocks: ParsedSheetBlock[] = [];
    const tableMap: Record<string, TableBlock> = {};
    let index = 0;

    while (index < lines.length) {
      if (this.shouldIgnoreLine(lines[index])) {
        index += 1;
        continue;
      }

      const headerLine = lines[index].trim();
      const directiveMatch = headerLine.match(DIRECTIVE_PATTERN);
      if (!directiveMatch && blocks.length === 0) {
        const block = this.parseImplicitFirstTable(lines, index);
        blocks.push(block.table);
        tableMap[block.table.name] = block.table;
        index = block.nextIndex;
        continue;
      }

      if (!directiveMatch) {
        throw new Error(`Expected directive at line ${index + 1}: ${lines[index]}`);
      }

      const startLine = index + 1;
      const directive = directiveMatch[1];
      const name = directiveMatch[2];
      index += 1;

      const body: string[] = [];
      while (index < lines.length && !lines[index].replace(/^\s+/, "").startsWith("@")) {
        body.push(lines[index]);
        index += 1;
      }

      const blockBuffer: BlockBuffer = {
        directive,
        name,
        body,
        source: {
          startLine,
          endLine: Math.max(startLine, index),
        },
      };

      const block = this.parseBlock(blockBuffer, tableMap);
      blocks.push(block);

      if (block.kind === "table") {
        tableMap[block.name] = block;
      }
    }

    return { blocks };
  }

  private parseImplicitFirstTable(
    lines: string[],
    startIndex: number,
  ): {
    table: TableBlock;
    nextIndex: number;
  } {
    const body: string[] = [];
    let index = startIndex;

    while (index < lines.length && !lines[index].replace(/^\s+/, "").startsWith("@")) {
      body.push(lines[index]);
      index += 1;
    }

    const table = this.parseTableBlock({
      directive: "table",
      name: DEFAULT_TABLE_NAME,
      body,
      source: {
        startLine: startIndex + 1,
        endLine: Math.max(startIndex + 1, index),
      },
    });

    return {
      table,
      nextIndex: index,
    };
  }

  private parseBlock(blockBuffer: BlockBuffer, tableMap: Record<string, TableBlock>): ParsedSheetBlock {
    if (blockBuffer.directive === "meta") {
      if (blockBuffer.name) {
        throw new Error("@meta does not accept a block name");
      }
      return this.parseMetaBlock(blockBuffer);
    }

    if (!blockBuffer.name) {
      throw new Error(`@${blockBuffer.directive} requires a block name`);
    }

    switch (blockBuffer.directive) {
      case "plugin":
        return this.parsePluginBlock(blockBuffer);
      case "table":
        return this.parseTableBlock(blockBuffer);
      case "compute":
        return this.parseComputeBlock(blockBuffer);
      case "plot":
        return this.parsePlotBlock(blockBuffer, tableMap);
      default:
        throw new Error(`Unsupported directive @${blockBuffer.directive}`);
    }
  }

  private parseMetaBlock(blockBuffer: BlockBuffer): MetaBlock {
    const entries: MetaEntry[] = [];

    blockBuffer.body.forEach((rawLine, offset) => {
      const line = rawLine.trim();
      if (this.shouldIgnoreLine(rawLine)) {
        return;
      }

      const separatorIndex = line.indexOf(":");
      if (separatorIndex < 1) {
        throw new Error(`Invalid @meta entry at line ${blockBuffer.source.startLine + offset + 1}: ${line}`);
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      if (!IDENTIFIER_PATTERN.test(key)) {
        throw new Error(`Invalid @meta key: ${key}`);
      }

      entries.push({
        key,
        value,
        source: this.lineSource(blockBuffer, offset),
      });
    });

    return {
      kind: "meta",
      entries,
      source: blockBuffer.source,
    };
  }

  private parsePluginBlock(blockBuffer: BlockBuffer): ParsedPluginBlock {
    const entries = this.parseKeyValueBody(blockBuffer);
    const path = entries.path;
    if (!path) {
      throw new Error(`@plugin ${blockBuffer.name} requires a path`);
    }

    const exportsList = entries.exports
      ? entries.exports
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];

    return {
      kind: "plugin",
      alias: blockBuffer.name!,
      binding: {
        path,
        exportNames: exportsList,
      },
      source: blockBuffer.source,
    };
  }

  private parseTableBlock(blockBuffer: BlockBuffer): TableBlock {
    // Comment lines are ignored globally for now, including inside @table blocks.
    const contentLines = blockBuffer.body.filter((line) => !this.shouldIgnoreLine(line));
    if (contentLines.length === 0) {
      throw new Error(`@table ${blockBuffer.name} is empty`);
    }

    const columns = this.parseTableColumns(parseCsvLine(contentLines[0]), blockBuffer.name!);
    const rows = contentLines.slice(1).map((line, index) => {
      const parsedRow = parseCsvLine(line);
      if (parsedRow.length !== columns.length) {
        throw new Error(
          `@table ${blockBuffer.name} row ${index + 2} has ${parsedRow.length} cells; expected ${columns.length}`,
        );
      }

      return parsedRow.map((cell, cellIndex) => parseDeclaredDataCellValue(cell, columns[cellIndex].declaredType));
    });

    const resolvedColumns = columns.map((column, columnIndex) => ({
      ...column,
      columnType: inferColumnTypeFromCells(
        rows.map((row) => row[columnIndex]),
        column.declaredType,
        column.isTypeExplicit,
      ),
    }));

    return {
      kind: "table",
      name: blockBuffer.name!,
      columns: resolvedColumns,
      rows,
      source: blockBuffer.source,
    };
  }

  private parseComputeBlock(blockBuffer: BlockBuffer): ComputeBlock {
    const targets = this.parseComputeTargets(blockBuffer);
    const statements: ComputeStatement[] = [];

    blockBuffer.body.forEach((rawLine, offset) => {
      const line = rawLine.trim();
      if (this.shouldIgnoreLine(rawLine)) {
        return;
      }
      if (line.startsWith("target:")) {
        return;
      }

      const separatorIndex = line.indexOf("=");
      if (separatorIndex < 1) {
        throw new Error(
          `Invalid @compute statement at line ${blockBuffer.source.startLine + offset + 1}: ${line}`,
        );
      }

      const target = line.slice(0, separatorIndex).trim();
      const expression = line.slice(separatorIndex + 1).trim();
      if (!IDENTIFIER_PATTERN.test(target)) {
        throw new Error(`Invalid computed column name: ${target}`);
      }

      statements.push({
        target,
        expression,
        source: this.lineSource(blockBuffer, offset),
      });
    });

    return {
      kind: "compute",
      tableName: blockBuffer.name!,
      targets,
      statements,
      source: blockBuffer.source,
    };
  }

  private parsePlotBlock(blockBuffer: BlockBuffer, tableMap: Record<string, TableBlock>): PlotBlock {
    const table = tableMap[blockBuffer.name!];
    if (!table) {
      throw new Error(`Unknown table for @plot ${blockBuffer.name}`);
    }

    const contentLines = blockBuffer.body
      .filter((line) => !this.shouldIgnoreLine(line))
      .map((line) => line.trim())
      .filter(Boolean);
    if (contentLines.length === 0) {
      throw new Error(`@plot ${blockBuffer.name} is empty`);
    }

    let fields: PlotFieldMap;
    if (contentLines.length === 1 && !contentLines[0].includes(":")) {
      const parts = contentLines[0].split(/\s+/);
      if (parts.length < 3 || parts.length > 4) {
        throw new Error(`Invalid shorthand plot definition: ${contentLines[0]}`);
      }
      if (parts[0] !== "bar") {
        throw new Error(`Only bar plots are supported in this demo: ${contentLines[0]}`);
      }

      fields = {
        x: parts[1],
        y: parts[2],
        color: parts[3],
      };
    } else {
      const entries = this.parseKeyValueBody(blockBuffer);
      Object.keys(entries).forEach((key) => {
        if (!SUPPORTED_PLOT_KEYS.has(key)) {
          throw new Error(`Unsupported plot key: ${key}`);
        }
      });
      fields = {
        x: entries.x,
        y: entries.y,
        color: entries.color,
        title: entries.title,
      };
    }

    if (!fields.x || !fields.y) {
      throw new Error(`Bar plot for table ${blockBuffer.name} must define x and y`);
    }

    const dependencies = this.parsePlotDependencies(blockBuffer, fields);

    return {
      kind: "plot",
      tableName: blockBuffer.name!,
      dependencies,
      fields,
      source: blockBuffer.source,
    };
  }

  private parseKeyValueBody(blockBuffer: BlockBuffer): Record<string, string> {
    const entries: Record<string, string> = {};

    blockBuffer.body.forEach((rawLine, offset) => {
      const line = rawLine.trim();
      if (this.shouldIgnoreLine(rawLine)) {
        return;
      }

      const separatorIndex = line.indexOf(":");
      if (separatorIndex < 1) {
        throw new Error(`Invalid entry at line ${blockBuffer.source.startLine + offset + 1}: ${line}`);
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      entries[key] = value;
    });

    return entries;
  }

  private parseComputeTargets(blockBuffer: BlockBuffer): ComputeBlockTargets {
    for (let offset = 0; offset < blockBuffer.body.length; offset += 1) {
      const line = blockBuffer.body[offset].trim();
      if (this.shouldIgnoreLine(blockBuffer.body[offset])) {
        continue;
      }

      if (!line.startsWith("target:")) {
        break;
      }

      const names = this.parseNameList(line.slice("target:".length), "@compute target");
      return {
        names,
        source: this.lineSource(blockBuffer, offset),
      };
    }

    throw new Error(`@compute ${blockBuffer.name} must declare target:`);
  }

  private parsePlotDependencies(blockBuffer: BlockBuffer, fields: PlotFieldMap): PlotDependencies {
    for (let offset = 0; offset < blockBuffer.body.length; offset += 1) {
      const line = blockBuffer.body[offset].trim();
      if (this.shouldIgnoreLine(blockBuffer.body[offset])) {
        continue;
      }

      if (!line.startsWith("deps:")) {
        continue;
      }

      const names = this.parseNameList(line.slice("deps:".length), "@plot deps");
      return {
        names,
        source: this.lineSource(blockBuffer, offset),
      };
    }

    const inferredDependencies = [fields.x, fields.y, fields.color].filter(Boolean) as string[];
    if (inferredDependencies.length === 0) {
      throw new Error(`@plot ${blockBuffer.name} must declare deps:`);
    }

    return {
      names: inferredDependencies,
      source: blockBuffer.source,
    };
  }

  private parseNameList(rawValue: string, context: string): string[] {
    const names = rawValue
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (names.length === 0) {
      throw new Error(`${context} must contain at least one name`);
    }

    names.forEach((name) => {
      if (!IDENTIFIER_PATTERN.test(name)) {
        throw new Error(`Invalid identifier "${name}" in ${context}`);
      }
    });

    return names;
  }

  private parseTableColumns(headerCells: string[], tableName: string): TableColumn[] {
    const columns = headerCells.map((headerCell) => {
      const match = headerCell.trim().match(COLUMN_PATTERN);
      if (!match) {
        throw new Error(`Invalid column declaration "${headerCell}" in @table ${tableName}`);
      }

      const declaredType = (match[2] ?? "dynamic") as ColumnType;
      return {
        name: match[1],
        declaredType,
        columnType: declaredType,
        isTypeExplicit: match[2] !== undefined,
      };
    });

    this.ensureUniqueIdentifiers(
      columns.map((column) => column.name),
      `@table ${tableName} header`,
    );

    return columns;
  }

  private assertNumberPlotColumn(table: TableBlock, columnName: string, fieldName: string): void {
    const column = table.columns.find((item) => item.name === columnName);
    if (!column) {
      throw new Error(`Unknown plot column "${columnName}" in @plot ${table.name}`);
    }
    if (column.columnType !== "number") {
      throw new Error(
        `Plot field "${fieldName}" must reference a number column, but "${columnName}" is ${column.columnType}`,
      );
    }
  }

  private ensureUniqueIdentifiers(values: string[], context: string): void {
    const seen = new Set<string>();

    values.forEach((value) => {
      if (!IDENTIFIER_PATTERN.test(value)) {
        throw new Error(`Invalid identifier "${value}" in ${context}`);
      }

      if (seen.has(value)) {
        throw new Error(`Duplicate identifier "${value}" in ${context}`);
      }

      seen.add(value);
    });
  }

  private lineSource(blockBuffer: BlockBuffer, offset: number): SourceRange {
    const line = blockBuffer.source.startLine + offset + 1;
    return {
      startLine: line,
      endLine: line,
    };
  }

  // Lines starting with "#" are treated as comments and skipped by the parser.
  private shouldIgnoreLine(line: string): boolean {
    const trimmedLine = line.trim();
    return trimmedLine === "" || trimmedLine.startsWith("#");
  }
}
