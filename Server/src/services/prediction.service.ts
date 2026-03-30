import { PredictionApiData } from "../types/api.types";
import { runPythonInference } from "./pythonBridge.service";
import { mapInferenceToApiData } from "./predictionResponseMapper.service";

interface PredictFromUploadParams {
  requestId: string;
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  topN: number;
}

export async function predictFromUpload(params: PredictFromUploadParams): Promise<PredictionApiData> {
  const pythonResult = await runPythonInference({
    inputFilePath: params.filePath,
    topN: params.topN,
    requestId: params.requestId,
  });

  return mapInferenceToApiData({
    pythonResult,
    upload: {
      fileName: params.fileName,
      fileSizeBytes: params.fileSizeBytes,
      mimeType: params.mimeType,
    },
    topN: params.topN,
  });
}
