import { Request, Response } from "express";
import { HTTP_STATUS } from "../constants/httpStatus";
import { evaluateBackendHealth } from "../services/backendHealth.service";

export function getHealth(_req: Request, res: Response): void {
  const health = evaluateBackendHealth();

  res.status(HTTP_STATUS.OK).json({
    status: health.healthy ? "ok" : "degraded",
    service: "drp-openpaws-server",
    timestamp: new Date().toISOString(),
    checks: health.checks,
  });
}
