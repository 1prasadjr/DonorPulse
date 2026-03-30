import { Router } from "express";
import { healthRouter } from "./health.routes";
import { modelRouter } from "./model.routes";
import { predictionRouter } from "./prediction.routes";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(modelRouter);
apiRouter.use(predictionRouter);
