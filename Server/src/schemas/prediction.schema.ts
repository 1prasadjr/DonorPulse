import { z } from "zod";
import { env } from "../config/env";
import { AppError } from "../errors/AppError";
import { HTTP_STATUS } from "../constants/httpStatus";

const predictionOptionsSchema = z.object({
  topN: z.coerce.number().int().min(1).max(env.topRiskLimitMax).optional(),
});

export interface PredictionOptions {
  topN: number;
}

export function parsePredictionOptions(input: unknown): PredictionOptions {
  const parsed = predictionOptionsSchema.safeParse(input ?? {});
  if (!parsed.success) {
    throw new AppError(
      "Invalid prediction options",
      HTTP_STATUS.BAD_REQUEST,
      "BAD_REQUEST",
      {
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    );
  }

  return {
    topN: parsed.data.topN ?? env.topRiskLimitDefault,
  };
}
