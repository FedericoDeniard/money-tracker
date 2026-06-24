import { createTool } from "@mastra/core/tools";
import { Parser } from "expr-eval";
import { z } from "zod";

export const calculateTool = createTool({
  id: "calculate",
  description:
    "Evaluate a mathematical expression and return the numeric result. Use this whenever the user asks for a calculation, percentage, ratio, conversion, or any arithmetic operation (e.g. 'what is 15% of 84000', 'sqrt(144)', '200 * 12 * 2'). Supported: + - * / ^ ( ), sqrt, log, ln, abs, min, max, sin, cos, tan, and ternary (cond ? a : b).",
  inputSchema: z.object({
    expression: z
      .string()
      .min(1)
      .max(500)
      .describe(
        "Mathematical expression to evaluate. Uses expr-eval syntax: + - * / ^ ( ), sqrt, log, ln, abs, min, max, sin, cos, tan, and ternary (cond ? a : b). No variables."
      ),
  }),
  outputSchema: z.object({
    result: z.number(),
    expression: z.string(),
  }),
  requestContextSchema: z.object({
    userId: z.string(),
  }),
  execute: async input => {
    const parser = new Parser();

    let expr;
    try {
      expr = parser.parse(input.expression);
    } catch (e) {
      throw new Error(
        `Invalid expression: ${e instanceof Error ? e.message : String(e)}`
      );
    }

    let result: number;
    try {
      result = expr.evaluate({});
    } catch (e) {
      throw new Error(
        `Evaluation failed: ${e instanceof Error ? e.message : String(e)}`
      );
    }

    if (!Number.isFinite(result)) {
      throw new Error("Result is not a finite number");
    }

    return { result, expression: input.expression };
  },
});
