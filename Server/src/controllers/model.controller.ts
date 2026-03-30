import fs from "fs/promises";
import path from "path";
import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { HTTP_STATUS } from "../constants/httpStatus";
import { AppError } from "../errors/AppError";

export async function getModelMetadata(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const manifestPath = path.join(env.modelDir, "model_manifest.json");
    const metricsPath = path.join(env.modelDir, "metrics.json");

    const [manifestRaw, metricsRaw] = await Promise.all([
      fs.readFile(manifestPath, "utf-8"),
      fs.readFile(metricsPath, "utf-8"),
    ]);

    res.status(HTTP_STATUS.OK).json({
      status: "success",
      requestId: req.requestId,
      data: {
        manifest: JSON.parse(manifestRaw),
        metrics: JSON.parse(metricsRaw),
      },
    });
  } catch (error) {
    next(
      new AppError(
        "Could not load model metadata",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "INTERNAL_ERROR",
        { cause: error instanceof Error ? error.message : String(error) },
      ),
    );
  }
}
