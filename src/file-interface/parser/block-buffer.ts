import type { SourceRange, TableBlock } from "../types";

export interface BlockBuffer {
  directive: string;
  name?: string;
  body: string[];
  source: SourceRange;
}

export interface ParserTableRegistry {
  [tableName: string]: TableBlock;
}
