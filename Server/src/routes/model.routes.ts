import { Router } from "express";
import { getModelMetadata } from "../controllers/model.controller";

export const modelRouter = Router();

modelRouter.get("/model/metadata", getModelMetadata);
