import cors, { CorsOptions } from "cors";
import { env } from "./env";

const allowedOrigins = new Set(env.corsOrigins);

function isDevLocalhostOrigin(origin: string): boolean {
  if (env.nodeEnv !== "development") {
    return false;
  }

  try {
    const parsed = new URL(origin);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    if (isDevLocalhostOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-Request-Id"],
};

export const corsMiddleware = cors(corsOptions);
