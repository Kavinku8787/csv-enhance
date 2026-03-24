import { parseCsvLine } from "../../shared/csv";
import { inferColumnTypeFromCells, parseDeclaredDataCellValue } from "../../shared/value";
import type {
  ColumnType,
  ComputeBlockTargets,
  PlotDependencies,
  PlotFieldMap,
  SourceRange,
  TableBlock,
  TableColumn,
} from "../types";
import { COLUMN_PATTERN, IDENTIFIER_PATTERN } from "./parser-config";
import type { BlockBuffer } from "./block-buffer";

export class ParserSupport {
  shouldIgnoreLine(line: string): boolean {
    const trimmedLine = line.trim();
    return trimmedLine === "" || trimmedLine.startsWith("#");
  }

  lineSource(blockBuffer: BlockBuffer, offset: number): SourceRange {
    const line = blockBuffer.source.startLine + offset + 1;
    return {
      startLine: line,
      endLine: line,
    };
  }

  parseKeyValueBody(blockBuffer: BlockBuffer): Record<string, string> {
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

  parseTableBlockContent(blockBuffer: BlockBuffer): Pick<TableBlock, "columns" | "rows"> {
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
      columns: resolvedColumns,
      rows,
    };
  }

  parseComputeTargets(blockBuffer: BlockBuffer): ComputeBlockTargets {
    for (let offset = 0; offset < blockBuffer.body.length; offset += 1) {
      const line = blockBuffer.body[offset].trim();
      if (this.shouldIgnoreLine(blockBuffer.body[offset])) {
        continue;
      }

      if (!line.startsWith("target:")) {
        break;
      }

      const columns = this.parseComputeTargetColumns(line.slice("target:".length), "@compute target");
      return {
        columns,
        source: this.lineSource(blockBuffer, offset),
      };
    }

    throw new Error(`@compute ${blockBuffer.name} must declare target:`);
  }

  parsePlotDependencies(blockBuffer: BlockBuffer, fields: PlotFieldMap): PlotDependencies {
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

  ensureUniqueIdentifiers(values: string[], context: string): void {
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

  private parseComputeTargetColumns(rawValue: string, context: string): TableColumn[] {
    const targetCells = rawValue
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (targetCells.length === 0) {
      throw new Error(`${context} must contain at least one name`);
    }

    const columns = targetCells.map((targetCell) => {
      const match = targetCell.match(COLUMN_PATTERN);
      if (!match) {
        throw new Error(`Invalid identifier "${targetCell}" in ${context}`);
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
      context,
    );

    return columns;
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
}
