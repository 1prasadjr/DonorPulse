import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { env } from "../config/env";
import { logger } from "../utils/logger";

const PYTHON_HEALTH_CACHE_TTL_MS = 60_000;
const PYTHON_MODULE_CHECK_TIMEOUT_MS = 20_000;

let cachedPythonCheckAt = 0;
let cachedPythonRuntimeReady = false;
let cachedPythonModuleSignature = "";

interface ModelManifestLite {
  model_name?: string;
  model_format?: string;
  decision_threshold?: number;
}

export interface BackendHealthChecks {
  pythonEntrypointExists: boolean;
  pythonRuntimeReady: boolean;
  modelManifestExists: boolean;
  uploadDirWritable: boolean;
}

export interface BackendHealthSummary {
  healthy: boolean;
  checks: BackendHealthChecks;
  modelName: string;
  threshold: number | null;
}

function checkUploadDirWritable(dir: string): boolean {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function readModelManifest(manifestPath: string): ModelManifestLite | null {
  try {
    if (!fs.existsSync(manifestPath)) {
      return null;
    }

    const raw = fs.readFileSync(manifestPath, "utf-8");
    const parsed = JSON.parse(raw) as ModelManifestLite;
    return parsed;
  } catch {
    return null;
  }
}

function requiredPythonModulesForModel(modelFormat?: string): string[] {
  const commonModules = ["pandas", "numpy", "joblib"];

  if (modelFormat === "catboost_cbm") {
    return [...commonModules, "catboost"];
  }

  return [...commonModules, "sklearn"];
}

function parseMissingModuleOutput(stdout: string): string[] {
  try {
    const parsed = JSON.parse(stdout) as { missing_modules?: unknown };
    if (!Array.isArray(parsed.missing_modules)) {
      return [];
    }

    return parsed.missing_modules.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function checkPythonRuntimeReady(requiredModules: string[]): boolean {
  const now = Date.now();
  const moduleSignature = requiredModules.join("|");
  if (
    now - cachedPythonCheckAt < PYTHON_HEALTH_CACHE_TTL_MS &&
    moduleSignature === cachedPythonModuleSignature
  ) {
    return cachedPythonRuntimeReady;
  }

  const moduleProbeScript = `
import importlib
import json
import sys

modules = json.loads(sys.argv[1])
missing = []
for module_name in modules:
    try:
        importlib.import_module(module_name)
    except Exception:
        missing.append(module_name)

if missing:
    print(json.dumps({"missing_modules": missing}))
    sys.exit(1)

print("ok")
`;

  const result = spawnSync(env.pythonExecutable, ["-c", moduleProbeScript, JSON.stringify(requiredModules)], {
    cwd: env.serverRoot,
    shell: false,
    timeout: PYTHON_MODULE_CHECK_TIMEOUT_MS,
    encoding: "utf-8",
    env: {
      ...process.env,
      PYTHONIOENCODING: "utf-8",
    },
  });

  const stdout = (result.stdout || "").trim();
  const runtimeReady = result.status === 0 && stdout.includes("ok");

  if (!runtimeReady) {
    const missingModules = parseMissingModuleOutput(stdout);
    if (missingModules.length > 0) {
      logger.warn("Python runtime check missing modules", {
        missingModules,
      });
    }
  }

  cachedPythonRuntimeReady = runtimeReady;
  cachedPythonCheckAt = now;
  cachedPythonModuleSignature = moduleSignature;
  return cachedPythonRuntimeReady;
}

export function evaluateBackendHealth(): BackendHealthSummary {
  const modelManifestPath = path.join(env.modelDir, "model_manifest.json");
  const manifest = readModelManifest(modelManifestPath);
  const requiredModules = requiredPythonModulesForModel(manifest?.model_format);

  const checks: BackendHealthChecks = {
    pythonEntrypointExists: fs.existsSync(env.pythonEntrypoint),
    pythonRuntimeReady: checkPythonRuntimeReady(requiredModules),
    modelManifestExists: fs.existsSync(modelManifestPath),
    uploadDirWritable: checkUploadDirWritable(env.uploadDir),
  };

  const healthy = Object.values(checks).every(Boolean);

  return {
    healthy,
    checks,
    modelName: manifest?.model_name || "unknown",
    threshold: typeof manifest?.decision_threshold === "number" ? manifest.decision_threshold : null,
  };
}