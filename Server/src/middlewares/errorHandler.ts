import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { HTTP_STATUS } from "../constants/httpStatus";
import { AppError } from "../errors/AppError";
import { logger } from "../utils/logger";
import { ErrorApiResponse } from "../types/api.types";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response<ErrorApiResponse>,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: "error",
      requestId: req.requestId,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    const statusCode = err.code === "LIMIT_FILE_SIZE" ? HTTP_STATUS.REQUEST_TOO_LARGE : HTTP_STATUS.BAD_REQUEST;
    res.status(statusCode).json({
      status: "error",
      requestId: req.requestId,
      error: {
        code: "FILE_VALIDATION_ERROR",
        message: err.message,
      },
    });
    return;
  }

  logger.error("Unhandled error", {
    requestId: req.requestId,
    error: err instanceof Error ? err.message : String(err),
  });

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    status: "error",
    requestId: req.requestId,
    error: {
      code: "INTERNAL_ERROR",
      message: "Unexpected server error while processing request",
    },
  });
}
