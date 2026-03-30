import fs from "fs";
import path from "path";
import multer from "multer";
import { env } from "../config/env";
import { AppError } from "../errors/AppError";
import { HTTP_STATUS } from "../constants/httpStatus";

const allowedMimeTypes = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "text/plain",
]);

const allowedExtensions = new Set([".csv"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(env.uploadDir, { recursive: true });
    cb(null, env.uploadDir);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueName = `${Date.now()}-${safeName}`;
    cb(null, uniqueName);
  },
});

function fileFilter(_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeLooksValid = allowedMimeTypes.has(file.mimetype);
  const extensionLooksValid = allowedExtensions.has(ext);

  if (!mimeLooksValid && !extensionLooksValid) {
    cb(new AppError("Only CSV uploads are supported", HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE, "FILE_VALIDATION_ERROR"));
    return;
  }

  cb(null, true);
}

export const uploadCsvMiddleware = multer({
  storage,
  limits: { fileSize: env.maxUploadSizeBytes, files: 1 },
  fileFilter,
});
