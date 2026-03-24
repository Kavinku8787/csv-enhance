import type { ParsedPluginBlock } from "../../types";
import type { BlockBuffer } from "../block-buffer";
import { ParserSupport } from "../parser-support";

export class PluginBlockParser {
  constructor(private readonly support: ParserSupport) {}

  parse(blockBuffer: BlockBuffer): ParsedPluginBlock {
    const entries = this.support.parseKeyValueBody(blockBuffer);
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
}
