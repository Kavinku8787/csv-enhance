const IDENTIFIER_START_PATTERN_SOURCE = String.raw`[\p{L}_]`;
const IDENTIFIER_CONTINUE_PATTERN_SOURCE = String.raw`[\p{L}\p{N}\p{M}_]`;
const DIRECTIVE_NAME_PATTERN_SOURCE = String.raw`[a-z]+`;

export const DIRECTIVE_PATTERN = new RegExp(
  String.raw`^@(${DIRECTIVE_NAME_PATTERN_SOURCE})(?:\s+(${IDENTIFIER_START_PATTERN_SOURCE}(?:${IDENTIFIER_CONTINUE_PATTERN_SOURCE}|-)*))?\s*$`,
  "u",
);
export const IDENTIFIER_PATTERN = new RegExp(
  String.raw`^${IDENTIFIER_START_PATTERN_SOURCE}${IDENTIFIER_CONTINUE_PATTERN_SOURCE}*$`,
  "u",
);
export const COLUMN_PATTERN = new RegExp(
  String.raw`^(${IDENTIFIER_START_PATTERN_SOURCE}${IDENTIFIER_CONTINUE_PATTERN_SOURCE}*)(?:\[(dynamic|string|number|boolean|null)\])?$`,
  "u",
);
export const SUPPORTED_PLOT_KEYS = new Set(["deps", "x", "y", "color", "title"]);
export const DEFAULT_TABLE_NAME = "sheet";
