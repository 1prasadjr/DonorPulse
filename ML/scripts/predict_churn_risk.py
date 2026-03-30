#!/usr/bin/env python3
"""
Score donor rows using the saved churn model.

Usage:
    python scripts/predict_churn_risk.py \
      --input data/processed/donor_training_dataset.csv \
      --model_dir models \
      --output predictions/predicted_donor_risk.csv
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import pandas as pd


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="CSV containing donor-level features")
    parser.add_argument("--model_dir", required=True, help="Directory with saved model artifacts")
    parser.add_argument("--output", required=True, help="Path to scored CSV")
    return parser.parse_args()


def risk_band(score: float) -> str:
    if score >= 0.70:
        return "high_risk"
    if score >= 0.40:
        return "medium_risk"
    return "low_risk"


def recommendation_from_row(row: pd.Series) -> str:
    if row["risk_band"] == "high_risk":
        if row.get("is_recurring_donor", 0) == 1:
            return "Personal outreach from fundraiser; review recurring payment health; send impact update."
        if row.get("open_rate_last_90d", 0) < 0.20:
            return "Try a reactivation campaign with a different channel and stronger mission story."
        return "Prioritize personal email/call and a targeted renewal ask within 7 days."
    if row["risk_band"] == "medium_risk":
        return "Send tailored impact content and a soft re-engagement ask; monitor for 30 days."
    return "Keep in regular stewardship flow; no urgent action needed."


def load_model(model_dir: Path):
    manifest_path = model_dir / "model_manifest.json"
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    if manifest["model_format"] == "catboost_cbm":
        from catboost import CatBoostClassifier

        model = CatBoostClassifier()
        model.load_model(str(model_dir / manifest["model_path"]))
    else:
        model = joblib.load(model_dir / manifest["model_path"])

    return manifest, model


def predict_proba(manifest: dict, model, X: pd.DataFrame):
    if manifest["model_name"] == "catboost":
        X_cb = X.copy()
        for col in manifest["categorical_columns"]:
            X_cb[col] = X_cb[col].astype(str)
        return model.predict_proba(X_cb)[:, 1]
    return model.predict_proba(X)[:, 1]


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    model_dir = Path(args.model_dir)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    manifest, model = load_model(model_dir)
    df = pd.read_csv(input_path)

    feature_cols = manifest["feature_columns"]
    X = df[feature_cols].copy()

    scores = predict_proba(manifest, model, X)
    threshold = float(manifest["decision_threshold"])

    out = df.copy()
    out["churn_risk_score"] = scores
    out["predicted_churn_label"] = (out["churn_risk_score"] >= threshold).astype(int)
    out["risk_band"] = out["churn_risk_score"].apply(risk_band)
    out["recommended_action"] = out.apply(recommendation_from_row, axis=1)

    sort_cols = ["snapshot_date", "churn_risk_score"]
    existing_sort_cols = [c for c in sort_cols if c in out.columns]
    out = out.sort_values(existing_sort_cols, ascending=[True, False][:len(existing_sort_cols)])

    out.to_csv(output_path, index=False)
    print(f"[OK] wrote {output_path}")


if __name__ == "__main__":
    main()
