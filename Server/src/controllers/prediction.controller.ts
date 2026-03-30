import { NextFunction, Request, Response } from "express";
import { parsePredictionOptions } from "../schemas/prediction.schema";
import { predictFromUpload } from "../services/prediction.service";
import { HTTP_STATUS } from "../constants/httpStatus";
import { AppError } from "../errors/AppError";
import { safeUnlink } from "../utils/fileSystem";
import { PredictionApiResponse } from "../types/api.types";

export async function uploadAndPredict(
  req: Request,
  res: Response<PredictionApiResponse>,
  next: NextFunction,
): Promise<void> {
  if (!req.file) {
    next(new AppError("CSV file is required in 'file' field", HTTP_STATUS.BAD_REQUEST, "FILE_VALIDATION_ERROR"));
    return;
  }

  try {
    const options = parsePredictionOptions(req.body);

    const result = await predictFromUpload({
      requestId: req.requestId,
      filePath: req.file.path,
      fileName: req.file.originalname,
      fileSizeBytes: req.file.size,
      mimeType: req.file.mimetype,
      topN: options.topN,
    });

    res.status(HTTP_STATUS.OK).json({
      status: "success",
      requestId: req.requestId,
      data: result,
    });
  } catch (error) {
    next(error);
  } finally {
    await safeUnlink(req.file.path);
  }
}
