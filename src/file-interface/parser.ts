import type { ParsedSheetBlock, ParsedSheetDocument, TableBlock } from "./types";
import type { BlockBuffer, ParserTableRegistry } from "./parser/block-buffer";
import { DEFAULT_TABLE_NAME, DIRECTIVE_PATTERN } from "./parser/parser-config";
import { ParserSupport } from "./parser/parser-support";
import {
  ComputeBlockParser,
  MetaBlockParser,
  PlotBlockParser,
  PluginBlockParser,
  TableBlockParser,
} from "./parser/blocks";

export class SheetSyntaxParser {
  private readonly support = new ParserSupport();

  private readonly metaBlockParser = new MetaBlockParser(this.support);

  private readonly pluginBlockParser = new PluginBlockParser(this.support);

  private readonly tableBlockParser = new TableBlockParser(this.support);

  private readonly computeBlockParser = new ComputeBlockParser(this.support);

  private readonly plotBlockParser = new PlotBlockParser(this.support);

  parse(source: string): ParsedSheetDocument {
    const normalizedSource = source.replace(/\r\n?/g, "\n").trim();
    if (normalizedSource === "") {
      return { blocks: [] };
    }

    const lines = normalizedSource.split("\n");
    const blocks: ParsedSheetBlock[] = [];
    const tableMap: ParserTableRegistry = {};
    let index = 0;

    while (index < lines.length) {
      if (this.support.shouldIgnoreLine(lines[index])) {
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

    const table = this.tableBlockParser.parse({
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

  private parseBlock(blockBuffer: BlockBuffer, tableMap: ParserTableRegistry): ParsedSheetBlock {
    if (blockBuffer.directive === "meta") {
      if (blockBuffer.name) {
        throw new Error("@meta does not accept a block name");
      }
      return this.metaBlockParser.parse(blockBuffer);
    }

    if (!blockBuffer.name) {
      throw new Error(`@${blockBuffer.directive} requires a block name`);
    }

    switch (blockBuffer.directive) {
      case "plugin":
        return this.pluginBlockParser.parse(blockBuffer);
      case "table":
        return this.tableBlockParser.parse(blockBuffer);
      case "compute":
        return this.computeBlockParser.parse(blockBuffer);
      case "plot":
        return this.plotBlockParser.parse(blockBuffer, tableMap);
      default:
        throw new Error(`Unsupported directive @${blockBuffer.directive}`);
    }
  }
}
