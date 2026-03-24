import type { ColumnType } from "../file-interface/types";

export type DataCellValueType =
  | { type: "string"; value: string }
  | { type: "number"; value: number }
  | { type: "boolean"; value: boolean }
  | { type: "null"; value: null };

// Values stay close to the source file and are not inflated into heavier classes.
export function inferDynamicDataCellValue(rawValue: string): DataCellValueType {
  const parsers = [parseNullValue, parseNumberValue, parseBooleanValue, parseStringValue];

  for (const parser of parsers) {
    const parsedValue = parser(rawValue);
    if (parsedValue) {
      return parsedValue;
    }
  }

  throw new Error(`Unable to parse dynamic cell value: ${rawValue}`);
}

export function parseDeclaredDataCellValue(rawValue: string, declaredType: ColumnType): DataCellValueType {
  if (declaredType === "dynamic") {
    return inferDynamicDataCellValue(rawValue);
  }

  const parserMap: Record<Exclude<ColumnType, "dynamic">, (value: string) => DataCellValueType | null> = {
    null: parseNullValue,
    number: parseNumberValue,
    boolean: parseBooleanValue,
    string: parseStringValue,
  };

  const parsedValue = parserMap[declaredType](rawValue);
  if (!parsedValue) {
    throw new Error(`Value "${rawValue}" does not match declared column type "${declaredType}"`);
  }

  return parsedValue;
}

export function inferColumnTypeFromCells(
  cells: DataCellValueType[],
  declaredType: ColumnType,
  isTypeExplicit: boolean,
): ColumnType {
  if (isTypeExplicit) {
    return declaredType;
  }

  const nonNullTypes = cells.filter((cell) => cell.type !== "null").map((cell) => cell.type);
  if (nonNullTypes.length === 0) {
    return "dynamic";
  }

  const firstType = nonNullTypes[0];
  if (nonNullTypes.every((type) => type === firstType)) {
    return firstType;
  }

  return "dynamic";
}

function parseNullValue(rawValue: string): DataCellValueType | null {
  return rawValue.trim() === "" ? { type: "null", value: null } : null;
}

function parseNumberValue(rawValue: string): DataCellValueType | null {
  const trimmedValue = rawValue.trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(trimmedValue)) {
    return null;
  }

  return { type: "number", value: Number(trimmedValue) };
}

function parseBooleanValue(rawValue: string): DataCellValueType | null {
  const trimmedValue = rawValue.trim();
  if (trimmedValue === "true") {
    return { type: "boolean", value: true };
  }
  if (trimmedValue === "false") {
    return { type: "boolean", value: false };
  }
  return null;
}

function parseStringValue(rawValue: string): DataCellValueType {
  return { type: "string", value: rawValue.trim() };
}
