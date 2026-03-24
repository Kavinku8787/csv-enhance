import type { BinaryOperator } from "./types";

interface Token {
  type: "number" | "identifier" | "operator" | "paren" | "comma" | "eof";
  value: string;
}

export type ParsedExpressionNode =
  | { kind: "number_literal"; value: number }
  | { kind: "identifier"; name: string }
  | { kind: "unary_expression"; operator: "-"; operand: ParsedExpressionNode }
  | {
      kind: "binary_expression";
      operator: BinaryOperator;
      left: ParsedExpressionNode;
      right: ParsedExpressionNode;
    }
  | { kind: "call_expression"; callee: string; args: ParsedExpressionNode[] };

export class ExpressionParser {
  private readonly tokens: Token[];

  private index = 0;

  constructor(source: string) {
    this.tokens = tokenizeExpression(source);
  }

  parse(): ParsedExpressionNode {
    const expression = this.parseExpression();
    this.expect("eof");
    return expression;
  }

  private parseExpression(): ParsedExpressionNode {
    let node = this.parseTerm();

    while (this.match("operator", "+") || this.match("operator", "-")) {
      const operator = this.consume().value as BinaryOperator;
      node = {
        kind: "binary_expression",
        operator,
        left: node,
        right: this.parseTerm(),
      };
    }

    return node;
  }

  private parseTerm(): ParsedExpressionNode {
    let node = this.parseFactor();

    while (this.match("operator", "*") || this.match("operator", "/")) {
      const operator = this.consume().value as BinaryOperator;
      node = {
        kind: "binary_expression",
        operator,
        left: node,
        right: this.parseFactor(),
      };
    }

    return node;
  }

  private parseFactor(): ParsedExpressionNode {
    if (this.match("operator", "-")) {
      this.consume();
      return {
        kind: "unary_expression",
        operator: "-",
        operand: this.parseFactor(),
      };
    }

    if (this.match("paren", "(")) {
      this.consume();
      const expression = this.parseExpression();
      this.expect("paren", ")");
      return expression;
    }

    if (this.match("number")) {
      return {
        kind: "number_literal",
        value: Number(this.consume().value),
      };
    }

    if (this.match("identifier")) {
      const identifier = this.consume().value;
      if (this.match("paren", "(")) {
        this.consume();
        const args: ParsedExpressionNode[] = [];
        if (!this.match("paren", ")")) {
          do {
            args.push(this.parseExpression());
          } while (this.match("comma") && this.consume());
        }
        this.expect("paren", ")");
        return {
          kind: "call_expression",
          callee: identifier,
          args,
        };
      }

      return {
        kind: "identifier",
        name: identifier,
      };
    }

    throw new Error(`Unexpected token in expression: ${this.peek().value}`);
  }

  private match(type: Token["type"], value?: string): boolean {
    const token = this.peek();
    return token.type === type && (value === undefined || token.value === value);
  }

  private expect(type: Token["type"], value?: string): Token {
    const token = this.peek();
    if (!this.match(type, value)) {
      throw new Error(`Expected ${value ?? type} but found ${token.value}`);
    }
    return this.consume();
  }

  private consume(): Token {
    const token = this.tokens[this.index];
    this.index += 1;
    return token;
  }

  private peek(): Token {
    return this.tokens[this.index];
  }
}

const IDENTIFIER_START_PATTERN = /[\p{L}_]/u;
const IDENTIFIER_CONTINUE_PATTERN = /[\p{L}\p{N}\p{M}_]/u;

function tokenizeExpression(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    const currentChar = source[index];

    if (/\s/.test(currentChar)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(currentChar)) {
      let endIndex = index + 1;
      while (endIndex < source.length && /[0-9.]/.test(source[endIndex])) {
        endIndex += 1;
      }

      const value = source.slice(index, endIndex);
      if (!/^\d+(?:\.\d+)?$/.test(value)) {
        throw new Error(`Invalid numeric literal: ${value}`);
      }

      tokens.push({ type: "number", value });
      index = endIndex;
      continue;
    }

    if (IDENTIFIER_START_PATTERN.test(currentChar)) {
      let endIndex = index + 1;
      while (
        endIndex < source.length &&
        (IDENTIFIER_CONTINUE_PATTERN.test(source[endIndex]) || source[endIndex] === ".")
      ) {
        endIndex += 1;
      }

      tokens.push({
        type: "identifier",
        value: source.slice(index, endIndex),
      });
      index = endIndex;
      continue;
    }

    if ("+-*/".includes(currentChar)) {
      tokens.push({ type: "operator", value: currentChar });
      index += 1;
      continue;
    }

    if ("()".includes(currentChar)) {
      tokens.push({ type: "paren", value: currentChar });
      index += 1;
      continue;
    }

    if (currentChar === ",") {
      tokens.push({ type: "comma", value: currentChar });
      index += 1;
      continue;
    }

    throw new Error(`Unexpected character in expression: ${currentChar}`);
  }

  tokens.push({ type: "eof", value: "<eof>" });
  return tokens;
}
