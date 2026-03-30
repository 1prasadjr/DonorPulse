import { spawn } from "child_process";
import { env } from "../config/env";
import { HTTP_STATUS } from "../constants/httpStatus";
import { AppError } from "../errors/AppError";
import { PythonInferenceRawResult } from "../types/inference.types";
import { logger } from "../utils/logger";

interface RunInferenceParams {
  inputFilePath: string;
  topN: number;
  requestId: string;
}

interface PythonErrorPayload {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

function parseStructuredPythonError(stderr: string): PythonErrorPayload["error"] | null {
  const trimmed = stderr.trim();
  if (!trimmed) {
    return null;
  }

  const candidates = [trimmed, ...trimmed.split(/\r?\n/).reverse()];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as PythonErrorPayload;
      if (parsed?.error && typeof parsed.error === "object") {
        return parsed.error;
      }
    } catch {
      // Ignore non-JSON chunks from stderr and keep trying.
    }
  }

  return null;
}

function mapPythonErrorCodeToAppCode(code?: string): "FILE_VALIDATION_ERROR" | "INFERENCE_ERROR" | "PYTHON_EXECUTION_ERROR" {
  if (code === "CSV_VALIDATION_ERROR") {
    return "FILE_VALIDATION_ERROR";
  }

  if (code === "FEATURE_VALIDATION_ERROR" || code === "NO_SCOREABLE_DONORS" || code === "INFERENCE_RUNTIME_ERROR") {
    return "INFERENCE_ERROR";
  }

  return "PYTHON_EXECUTION_ERROR";
}

export async function runPythonInference({ inputFilePath, topN, requestId }: RunInferenceParams): Promise<PythonInferenceRawResult> {
  const args = [
    env.pythonEntrypoint,
    "--input_csv",
    inputFilePath,
    "--model_dir",
    env.modelDir,
    "--top_n",
    String(topN),
  ];

  return new Promise<PythonInferenceRawResult>((resolve, reject) => {
    const child = spawn(env.pythonExecutable, args, {
      cwd: env.serverRoot,
      shell: false,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      child.kill();
      reject(
        new AppError(
          "Inference timed out while processing CSV",
          HTTP_STATUS.GATEWAY_TIMEOUT,
          "PYTHON_TIMEOUT",
          { timeoutMs: env.pythonTimeoutMs },
        ),
      );
    }, env.pythonTimeoutMs);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeoutHandle);
      reject(
        new AppError(
          "Could not start Python inference process",
          HTTP_STATUS.SERVICE_UNAVAILABLE,
          "PYTHON_EXECUTION_ERROR",
          { cause: error.message },
        ),
      );
    });

    child.on("close", (code) => {
      clearTimeout(timeoutHandle);

      if (timedOut) {
        return;
      }

      if (code !== 0) {
        const structuredError = parseStructuredPythonError(stderr);
        const pythonErrorCode = structuredError?.code;
        const pythonErrorMessage = structuredError?.message;

        logger.error("Python inference failed", {
          requestId,
          exitCode: code,
          pythonErrorCode,
          stderr: stderr.trim(),
        });

        reject(
          new AppError(
            pythonErrorMessage || "Python inference failed",
            HTTP_STATUS.UNPROCESSABLE_ENTITY,
            mapPythonErrorCodeToAppCode(pythonErrorCode),
            {
              exitCode: code,
              pythonErrorCode,
              pythonErrorDetails: structuredError?.details,
              stderr: stderr.trim() || "Unknown Python error",
            },
          ),
        );
        return;
      }

      try {
        const parsed = JSON.parse(stdout) as PythonInferenceRawResult;
        resolve(parsed);
      } catch (error) {
        reject(
          new AppError(
            "Inference output was not valid JSON",
            HTTP_STATUS.UNPROCESSABLE_ENTITY,
            "INFERENCE_ERROR",
            {
              stdoutSnippet: stdout.slice(0, 500),
              stderrSnippet: stderr.slice(0, 500),
              cause: error instanceof Error ? error.message : String(error),
            },
          ),
        );
      }
    });
  });
}
