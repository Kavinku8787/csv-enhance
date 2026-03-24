export function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const currentChar = line[index];
    const nextChar = line[index + 1];

    if (currentChar === "\"") {
      if (inQuotes && nextChar === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (currentChar === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += currentChar;
  }

  if (inQuotes) {
    throw new Error(`Unterminated quoted value in CSV line: ${line}`);
  }

  cells.push(current.trim());
  return cells;
}
