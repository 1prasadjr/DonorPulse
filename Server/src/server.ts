import fs from "fs";
import { createApp } from "./app";
import { env } from "./config/env";
import { evaluateBackendHealth } from "./services/backendHealth.service";
import { logger } from "./utils/logger";

async function bootstrap(): Promise<void> {
  fs.mkdirSync(env.uploadDir, { recursive: true });

  const app = createApp();
  const server = app.listen(env.port, () => {
    const startupHealth = evaluateBackendHealth();

    logger.info("Server started", {
      port: env.port,
      nodeEnv: env.nodeEnv,
      uploadDir: env.uploadDir,
      modelDir: env.modelDir,
    });

    logger.info("Backend startup status", {
      health: startupHealth.healthy ? "ok" : "degraded",
      model: startupHealth.modelName,
      threshold: startupHealth.threshold,
      checks: startupHealth.checks,
    });
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      logger.error("Failed to start server: port already in use", {
        port: env.port,
        hint: "Stop the existing server process or change PORT in Server/.env",
      });
    } else {
      logger.error("Failed to start server: listen error", {
        port: env.port,
        code: error.code,
        error: error.message,
      });
    }

    process.exit(1);
  });
}

bootstrap().catch((error: unknown) => {
  logger.error("Failed to start server", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
