import type { ComputeBlock, ComputeStatement } from "../../types";
import { IDENTIFIER_PATTERN } from "../parser-config";
import { ParserSupport } from "../parser-support";
import type { BlockBuffer } from "../block-buffer";

export class ComputeBlockParser {
  constructor(private readonly support: ParserSupport) {}

  parse(blockBuffer: BlockBuffer): ComputeBlock {
    const targets = this.support.parseComputeTargets(blockBuffer);
    const statements: ComputeStatement[] = [];

    blockBuffer.body.forEach((rawLine, offset) => {
      const line = rawLine.trim();
      if (this.support.shouldIgnoreLine(rawLine)) {
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
        source: this.support.lineSource(blockBuffer, offset),
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
}
