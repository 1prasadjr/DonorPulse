import { Router } from "express";
import { uploadAndPredict } from "../controllers/prediction.controller";
import { uploadCsvMiddleware } from "../middlewares/upload.middleware";

export const predictionRouter = Router();

predictionRouter.post("/predictions/upload", uploadCsvMiddleware.single("file"), uploadAndPredict);
