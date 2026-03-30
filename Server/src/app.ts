import express from "express";
import { corsMiddleware } from "./config/cors";
import { apiRouter } from "./routes";
import { errorHandler } from "./middlewares/errorHandler";
import { notFoundHandler } from "./middlewares/notFound";
import { requestIdMiddleware } from "./middlewares/requestId";

export function createApp() {
  const app = express();

  app.use(corsMiddleware);
  app.use(express.json({ limit: "1mb" }));
  app.use(requestIdMiddleware);

  app.use("/api/v1", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
