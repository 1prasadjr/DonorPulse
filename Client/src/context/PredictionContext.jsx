import { useMemo, useState } from "react";
import { PredictionContext } from "./predictionContext";

const STORAGE_KEY = "openpaws_prediction_data";

function readStoredPrediction() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function PredictionProvider({ children }) {
  const [predictionResponse, setPredictionResponse] = useState(readStoredPrediction);

  const setPrediction = (response) => {
    setPredictionResponse(response);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(response));
    } catch {
      // Ignore storage errors for MVP.
    }
  };

  const clearPrediction = () => {
    setPredictionResponse(null);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors for MVP.
    }
  };

  const value = useMemo(
    () => ({
      predictionResponse,
      setPrediction,
      clearPrediction,
    }),
    [predictionResponse],
  );

  return <PredictionContext.Provider value={value}>{children}</PredictionContext.Provider>;
}
