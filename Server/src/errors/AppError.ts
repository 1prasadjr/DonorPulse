export type AppErrorCode =
  | "BAD_REQUEST"
  | "FILE_VALIDATION_ERROR"
  | "PYTHON_EXECUTION_ERROR"
  | "PYTHON_TIMEOUT"
  | "INFERENCE_ERROR"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: AppErrorCode;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, code: AppErrorCode, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
