declare function require(name: string): any;

import type { CompiledSheetResult } from "./sheet-compiler";
import type { EvaluatedPlot, EvaluatedSheetDocument, EvaluatedTable } from "./types";
import type { VegaLiteBarSpec } from "./plot-compiler";

const XLSX = require("xlsx");

type Workbook = any;

interface PlotMetadataRow {
  plot_index: number;
  table: string;
  title: string;
  x: string;
  y: string;
  color: string;
  deps: string;
  spec_json: string;
}

export class XlsxAdapter {
  buildWorkbook(compiled: CompiledSheetResult): Workbook {
    return this.buildWorkbookFromDocument(compiled.evaluatedDocument, compiled.plotSpecs);
  }

  buildWorkbookFromDocument(
    evaluatedDocument: EvaluatedSheetDocument,
    plotSpecs: VegaLiteBarSpec[],
  ): Workbook {
    const workbook = XLSX.utils.book_new();
    const usedSheetNames = new Set<string>();

    for (const tableName of Object.keys(evaluatedDocument.tables)) {
      const table = evaluatedDocument.tables[tableName];
      const worksheet = this.buildTableSheet(table);
      const sheetName = this.allocateSheetName(table.name, usedSheetNames);

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }

    const plotsSheet = this.buildPlotsSheet(evaluatedDocument.plots, plotSpecs);
    const plotsSheetName = this.allocateSheetName("_plots", usedSheetNames);
    XLSX.utils.book_append_sheet(workbook, plotsSheet, plotsSheetName);

    return workbook;
  }

  writeWorkbook(workbook: Workbook, outputPath: string): void {
    XLSX.writeFile(workbook, outputPath);
  }

  writeCompiledResult(compiled: CompiledSheetResult, outputPath: string): void {
    this.writeWorkbook(this.buildWorkbook(compiled), outputPath);
  }

  private buildTableSheet(table: EvaluatedTable): any {
    const headerRow = table.columns.map((column) => column.name);
    const dataRows = table.rows.map((row) =>
      table.columns.map((column) => this.toSheetCellValue(row[column.name])),
    );

    return XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  }

  private buildPlotsSheet(plots: EvaluatedPlot[], plotSpecs: VegaLiteBarSpec[]): any {
    const rows: PlotMetadataRow[] = plots.map((plot, index) => ({
      plot_index: index,
      table: plot.tableName,
      title: plot.fields.title ?? "",
      x: plot.fields.x ?? "",
      y: plot.fields.y ?? "",
      color: plot.fields.color ?? "",
      deps: plot.resolvedDependencies.map((dependency) => dependency.name).join(","),
      spec_json: JSON.stringify(plotSpecs[index]),
    }));

    return XLSX.utils.json_to_sheet(rows, {
      header: ["plot_index", "table", "title", "x", "y", "color", "deps", "spec_json"],
    });
  }

  private toSheetCellValue(cell: EvaluatedTable["rows"][number][string]): string | number | boolean | null {
    if (!cell || cell.type === "null") {
      return null;
    }

    return cell.value;
  }

  private allocateSheetName(baseName: string, usedSheetNames: Set<string>): string {
    const sanitized = this.sanitizeSheetName(baseName);
    let candidate = sanitized;
    let suffix = 1;

    while (usedSheetNames.has(candidate)) {
      const suffixText = `_${suffix}`;
      candidate = `${sanitized.slice(0, Math.max(1, 31 - suffixText.length))}${suffixText}`;
      suffix += 1;
    }

    usedSheetNames.add(candidate);
    return candidate;
  }

  private sanitizeSheetName(name: string): string {
    const sanitized = name.replace(/[:\\/?*\[\]]/g, "_").trim();
    const nonEmpty = sanitized.length > 0 ? sanitized : "sheet";
    return nonEmpty.slice(0, 31);
  }
}
