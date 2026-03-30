import { useContext } from "react";
import { PredictionContext } from "./predictionContext";

export function usePrediction() {
  const ctx = useContext(PredictionContext);
  if (!ctx) {
    throw new Error("usePrediction must be used inside PredictionProvider");
  }

  return ctx;
}
