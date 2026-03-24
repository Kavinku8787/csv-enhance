import type { ExpressionNode } from "../analysis/types";
import type { DataCellValueType } from "../shared/value";
import type { ExpressionEvaluationContext, RuntimeRow } from "./types";

const BUILTIN_EVALUATORS = {
  sum: (values: number[]) => values.reduce((total, value) => total + value, 0),
  avg: (values: number[]) => (values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length),
  min: (values: number[]) => (values.length === 0 ? 0 : Math.min(...values)),
  max: (values: number[]) => (values.length === 0 ? 0 : Math.max(...values)),
};

export class ExpressionEvaluator {
  evaluate(expression: ExpressionNode, context: ExpressionEvaluationContext): DataCellValueType {
    switch (expression.kind) {
      case "number_literal":
        return { type: "number", value: expression.value };
      case "column_reference":
        return this.resolveRowValue(context.row, expression.column.name, "column");
      case "local_reference":
        return this.resolveRowValue(context.locals, expression.name, "local");
      case "unary_expression":
        return {
          type: "number",
          value: -this.toNumber(this.evaluate(expression.operand, context)),
        };
      case "binary_expression":
        return this.evaluateBinaryExpression(expression, context);
      case "builtin_call":
        return this.evaluateBuiltinCall(expression, context);
      case "plugin_call":
        return this.evaluatePluginCall(expression, context);
    }
  }

  private evaluateBinaryExpression(
    expression: Extract<ExpressionNode, { kind: "binary_expression" }>,
    context: ExpressionEvaluationContext,
  ): DataCellValueType {
    const left = this.toNumber(this.evaluate(expression.left, context));
    const right = this.toNumber(this.evaluate(expression.right, context));

    switch (expression.operator) {
      case "+":
        return { type: "number", value: left + right };
      case "-":
        return { type: "number", value: left - right };
      case "*":
        return { type: "number", value: left * right };
      case "/":
        if (right === 0) {
          throw new Error("Division by zero");
        }
        return { type: "number", value: left / right };
    }
  }

  private evaluateBuiltinCall(
    expression: Extract<ExpressionNode, { kind: "builtin_call" }>,
    context: ExpressionEvaluationContext,
  ): DataCellValueType {
    if (expression.args.length !== 1) {
      throw new Error(`Builtin function ${expression.name} expects exactly one argument`);
    }

    const values = context.aggregateRows.map((row) =>
      this.toNumber(
        this.evaluate(expression.args[0], {
          ...context,
          row,
        }),
      ),
    );

    return {
      type: "number",
      value: BUILTIN_EVALUATORS[expression.name](values),
    };
  }

  private evaluatePluginCall(
    expression: Extract<ExpressionNode, { kind: "plugin_call" }>,
    context: ExpressionEvaluationContext,
  ): DataCellValueType {
    const args = expression.args.map((arg) => this.toScalarValue(this.evaluate(arg, context)));
    const result = expression.fn(...args);
    return this.fromScalarValue(result, `${expression.pluginAlias}.${expression.exportName}`);
  }

  private resolveRowValue(
    row: RuntimeRow | Record<string, DataCellValueType>,
    name: string,
    label: "column" | "local",
  ): DataCellValueType {
    const value = row[name];
    if (!value) {
      throw new Error(`Unknown ${label} reference "${name}" during expression evaluation`);
    }
    return value;
  }

  private toNumber(value: DataCellValueType): number {
    if (value.type !== "number") {
      throw new Error(`Expected number value, received ${value.type}`);
    }
    return value.value;
  }

  private toScalarValue(value: DataCellValueType): string | number | boolean | null {
    return value.value;
  }

  private fromScalarValue(
    value: unknown,
    functionName: string,
  ): DataCellValueType {
    if (value === null) {
      return { type: "null", value: null };
    }
    if (typeof value === "number") {
      return { type: "number", value };
    }
    if (typeof value === "string") {
      return { type: "string", value };
    }
    if (typeof value === "boolean") {
      return { type: "boolean", value };
    }

    throw new Error(`Plugin function ${functionName} must return a scalar value`);
  }
}
