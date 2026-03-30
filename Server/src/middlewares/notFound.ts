import { Request, Response } from "express";
import { HTTP_STATUS } from "../constants/httpStatus";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    status: "error",
    requestId: req.requestId,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
}
