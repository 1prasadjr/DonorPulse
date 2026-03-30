import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const serverRoot = path.resolve(__dirname, "..", "..");
const workspaceRoot = path.resolve(serverRoot, "..");

function findFirstExistingPath(candidates: string[]): string | undefined {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function getVenvPythonCandidates(baseDir: string): string[] {
  return [
    path.resolve(baseDir, ".venv", "Scripts", "python.exe"),
    path.resolve(baseDir, ".venv", "bin", "python"),
  ];
}

function parseCorsOrigins(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolvePythonExecutable(value: string): string {
  const normalized = value.trim();
  const looksLikePath =
    normalized.includes("/") ||
    normalized.includes("\\") ||
    normalized.endsWith(".exe") ||
    normalized.endsWith(".bat") ||
    normalized.endsWith(".cmd");

  if (!looksLikePath) {
    if (normalized === "python" || normalized === "python3") {
      const localCandidates = [
        ...getVenvPythonCandidates(serverRoot),
        ...getVenvPythonCandidates(workspaceRoot),
      ];
      const detected = findFirstExistingPath(localCandidates);

      if (detected) {
        return detected;
      }
    }

    return normalized;
  }

  if (path.isAbsolute(normalized) && fs.existsSync(normalized)) {
    return normalized;
  }

  const projectRelative = path.resolve(serverRoot, normalized);
  if (fs.existsSync(projectRelative)) {
    return projectRelative;
  }

  const workspaceRelative = path.resolve(workspaceRoot, normalized);
  if (fs.existsSync(workspaceRelative)) {
    return workspaceRelative;
  }

  return projectRelative;
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173,http://localhost:3000"),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().default(10),
  UPLOAD_DIR: z.string().min(1).default("src/temp/uploads"),
  PYTHON_EXECUTABLE: z.string().min(1).default("python"),
  PYTHON_ENTRYPOINT: z.string().min(1).default("python/infer_donor_churn.py"),
  PYTHON_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  MODEL_DIR: z.string().min(1).default("models"),
  TOP_RISK_LIMIT_DEFAULT: z.coerce.number().int().min(1).max(500).default(25),
  TOP_RISK_LIMIT_MAX: z.coerce.number().int().min(1).max(1000).default(100),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`Invalid environment configuration: ${issues}`);
}

const raw = parsed.data;
const corsOrigins = parseCorsOrigins(raw.CORS_ORIGIN);

export const env = {
  nodeEnv: raw.NODE_ENV,
  port: raw.PORT,
  corsOrigins,
  maxUploadSizeBytes: Math.floor(raw.MAX_UPLOAD_SIZE_MB * 1024 * 1024),
  uploadDir: path.resolve(serverRoot, raw.UPLOAD_DIR),
  pythonExecutable: resolvePythonExecutable(raw.PYTHON_EXECUTABLE),
  pythonEntrypoint: path.resolve(serverRoot, raw.PYTHON_ENTRYPOINT),
  pythonTimeoutMs: raw.PYTHON_TIMEOUT_MS,
  modelDir: path.resolve(serverRoot, raw.MODEL_DIR),
  topRiskLimitDefault: raw.TOP_RISK_LIMIT_DEFAULT,
  topRiskLimitMax: raw.TOP_RISK_LIMIT_MAX,
  serverRoot,
};
