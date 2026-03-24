import type { PlotBlock, PlotFieldMap, TableBlock } from "../../types";
import type { BlockBuffer, ParserTableRegistry } from "../block-buffer";
import { SUPPORTED_PLOT_KEYS } from "../parser-config";
import { ParserSupport } from "../parser-support";

export class PlotBlockParser {
  constructor(private readonly support: ParserSupport) {}

  parse(blockBuffer: BlockBuffer, tableMap: ParserTableRegistry): PlotBlock {
    const table = tableMap[blockBuffer.name!];
    if (!table) {
      throw new Error(`Unknown table for @plot ${blockBuffer.name}`);
    }

    const contentLines = blockBuffer.body
      .filter((line) => !this.support.shouldIgnoreLine(line))
      .map((line) => line.trim())
      .filter(Boolean);
    if (contentLines.length === 0) {
      throw new Error(`@plot ${blockBuffer.name} is empty`);
    }

    const fields = this.parseFields(blockBuffer, contentLines);
    if (!fields.x || !fields.y) {
      throw new Error(`Bar plot for table ${blockBuffer.name} must define x and y`);
    }

    return {
      kind: "plot",
      tableName: blockBuffer.name!,
      dependencies: this.support.parsePlotDependencies(blockBuffer, fields),
      fields,
      source: blockBuffer.source,
    };
  }

  private parseFields(blockBuffer: BlockBuffer, contentLines: string[]): PlotFieldMap {
    if (contentLines.length === 1 && !contentLines[0].includes(":")) {
      const parts = contentLines[0].split(/\s+/);
      if (parts.length < 3 || parts.length > 4) {
        throw new Error(`Invalid shorthand plot definition: ${contentLines[0]}`);
      }
      if (parts[0] !== "bar") {
        throw new Error(`Only bar plots are supported in this demo: ${contentLines[0]}`);
      }

      return {
        x: parts[1],
        y: parts[2],
        color: parts[3],
      };
    }

    const entries = this.support.parseKeyValueBody(blockBuffer);
    Object.keys(entries).forEach((key) => {
      if (!SUPPORTED_PLOT_KEYS.has(key)) {
        throw new Error(`Unsupported plot key: ${key}`);
      }
    });

    return {
      x: entries.x,
      y: entries.y,
      color: entries.color,
      title: entries.title,
    };
  }
}
