import { NextFunction, Request, Response } from "express";
import crypto from "crypto";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header("X-Request-Id");
  req.requestId = incoming && incoming.trim().length > 0 ? incoming : crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
}
