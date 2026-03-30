#!/usr/bin/env python3
"""
Train donor churn models from donor_training_dataset.csv

Usage:
    python scripts/train_churn_model.py \
      --input data/processed/donor_training_dataset.csv \
      --output_dir models

What this script does:
1. Loads donor_training_dataset.csv
2. Uses a chronological split based on snapshot_date
3. Trains:
   - LogisticRegression baseline
   - CatBoostClassifier main model
4. Compares validation PR-AUC
5. Saves the best model + metadata + metrics
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    classification_report,
    precision_recall_curve,
    roc_auc_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

TARGET_COL = "churned_in_next_180d"
ID_COLS = ["donor_id", "snapshot_date", TARGET_COL]
CAT_COLS = ["preferred_campaign_source", "acquisition_source", "donor_region"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Path to donor_training_dataset.csv")
    parser.add_argument("--output_dir", required=True, help="Directory to save trained artifacts")
    return parser.parse_args()


def compute_metrics(y_true, y_proba, threshold=0.5) -> dict:
    y_pred = (y_proba >= threshold).astype(int)
    report = classification_report(y_true, y_pred, output_dict=True, zero_division=0)
    return {
        "roc_auc": float(roc_auc_score(y_true, y_proba)),
        "pr_auc": float(average_precision_score(y_true, y_proba)),
        "precision_at_threshold": float(report["1"]["precision"]),
        "recall_at_threshold": float(report["1"]["recall"]),
        "f1_at_threshold": float(report["1"]["f1-score"]),
        "support_positive": int(report["1"]["support"]),
    }


def find_best_f1_threshold(y_true, y_proba) -> float:
    precision, recall, thresholds = precision_recall_curve(y_true, y_proba)
    if len(thresholds) == 0:
        return 0.5
    f1_scores = 2 * precision[:-1] * recall[:-1] / np.maximum(precision[:-1] + recall[:-1], 1e-9)
    best_idx = int(np.argmax(f1_scores))
    return float(thresholds[best_idx])


def make_time_splits(df: pd.DataFrame):
    snapshot_dates = sorted(df["snapshot_date"].unique())
    n = len(snapshot_dates)

    train_end = max(1, int(round(n * 0.70)))
    val_end = max(train_end + 1, int(round(n * 0.85)))
    if val_end >= n:
        val_end = n - 1

    train_dates = snapshot_dates[:train_end]
    val_dates = snapshot_dates[train_end:val_end]
    test_dates = snapshot_dates[val_end:]

    train_df = df[df["snapshot_date"].isin(train_dates)].copy()
    val_df = df[df["snapshot_date"].isin(val_dates)].copy()
    test_df = df[df["snapshot_date"].isin(test_dates)].copy()

    return train_df, val_df, test_df


def train_logistic_regression(X_train, y_train, X_val, y_val, num_cols, cat_cols):
    preprocessor = ColumnTransformer(
        transformers=[
            (
                "num",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="median")),
                        ("scaler", StandardScaler()),
                    ]
                ),
                num_cols,
            ),
            (
                "cat",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("encoder", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                cat_cols,
            ),
        ]
    )

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            (
                "classifier",
                LogisticRegression(
                    max_iter=3000,
                    class_weight="balanced",
                    random_state=42,
                ),
            ),
        ]
    )
    model.fit(X_train, y_train)
    val_proba = model.predict_proba(X_val)[:, 1]
    best_threshold = find_best_f1_threshold(y_val, val_proba)
    return model, best_threshold


def try_train_catboost(X_train, y_train, X_val, y_val, cat_cols):
    try:
        from catboost import CatBoostClassifier
    except Exception:
        return None, None, "catboost_not_installed"

    X_train_cb = X_train.copy()
    X_val_cb = X_val.copy()
    for col in cat_cols:
        X_train_cb[col] = X_train_cb[col].astype(str)
        X_val_cb[col] = X_val_cb[col].astype(str)

    model = CatBoostClassifier(
        loss_function="Logloss",
        eval_metric="AUC",
        iterations=300,
        learning_rate=0.05,
        depth=6,
        l2_leaf_reg=5,
        random_seed=42,
        auto_class_weights="Balanced",
        verbose=False,
    )

    model.fit(
        X_train_cb,
        y_train,
        cat_features=cat_cols,
        eval_set=(X_val_cb, y_val),
        use_best_model=True,
        verbose=False,
    )

    val_proba = model.predict_proba(X_val_cb)[:, 1]
    best_threshold = find_best_f1_threshold(y_val, val_proba)
    return model, best_threshold, None


def predict_proba_for_model(model_name, model, X, cat_cols):
    if model_name == "catboost":
        X_cb = X.copy()
        for col in cat_cols:
            X_cb[col] = X_cb[col].astype(str)
        return model.predict_proba(X_cb)[:, 1]
    return model.predict_proba(X)[:, 1]


def save_catboost(model, path: Path):
    model.save_model(str(path))


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(input_path)
    df["snapshot_date"] = pd.to_datetime(df["snapshot_date"])

    feature_cols = [c for c in df.columns if c not in ID_COLS]
    num_cols = [c for c in feature_cols if c not in CAT_COLS]

    train_df, val_df, test_df = make_time_splits(df)

    X_train = train_df[feature_cols].copy()
    y_train = train_df[TARGET_COL].copy()

    X_val = val_df[feature_cols].copy()
    y_val = val_df[TARGET_COL].copy()

    X_test = test_df[feature_cols].copy()
    y_test = test_df[TARGET_COL].copy()

    candidates = []

    # Model 1: logistic regression baseline
    lr_model, lr_threshold = train_logistic_regression(
        X_train, y_train, X_val, y_val, num_cols, CAT_COLS
    )
    lr_val_proba = predict_proba_for_model("logreg", lr_model, X_val, CAT_COLS)
    lr_test_proba = predict_proba_for_model("logreg", lr_model, X_test, CAT_COLS)
    candidates.append(
        {
            "model_name": "logistic_regression",
            "model": lr_model,
            "threshold": lr_threshold,
            "val_metrics": compute_metrics(y_val, lr_val_proba, lr_threshold),
            "test_metrics": compute_metrics(y_test, lr_test_proba, lr_threshold),
        }
    )

    # Model 2: catboost main model
    cb_model, cb_threshold, cb_error = try_train_catboost(
        X_train, y_train, X_val, y_val, CAT_COLS
    )
    if cb_model is not None:
        cb_val_proba = predict_proba_for_model("catboost", cb_model, X_val, CAT_COLS)
        cb_test_proba = predict_proba_for_model("catboost", cb_model, X_test, CAT_COLS)
        candidates.append(
            {
                "model_name": "catboost",
                "model": cb_model,
                "threshold": cb_threshold,
                "val_metrics": compute_metrics(y_val, cb_val_proba, cb_threshold),
                "test_metrics": compute_metrics(y_test, cb_test_proba, cb_threshold),
            }
        )
    else:
        print(f"[WARN] skipping catboost: {cb_error}")

    # Pick best by validation PR-AUC
    best = max(candidates, key=lambda x: x["val_metrics"]["pr_auc"])

    metrics_payload = {
        "split_strategy": "chronological_by_snapshot_date",
        "train_rows": int(len(train_df)),
        "val_rows": int(len(val_df)),
        "test_rows": int(len(test_df)),
        "feature_columns": feature_cols,
        "categorical_columns": CAT_COLS,
        "numeric_columns": num_cols,
        "models": {
            c["model_name"]: {
                "validation": c["val_metrics"],
                "test": c["test_metrics"],
                "decision_threshold": float(c["threshold"]),
            }
            for c in candidates
        },
        "selected_model": best["model_name"],
    }

    # Save artifacts
    if best["model_name"] == "catboost":
        model_path = output_dir / "churn_model.cbm"
        save_catboost(best["model"], model_path)
        model_format = "catboost_cbm"
    else:
        model_path = output_dir / "churn_model.joblib"
        joblib.dump(best["model"], model_path)
        model_format = "joblib_pipeline"

    manifest = {
        "model_name": best["model_name"],
        "model_format": model_format,
        "model_path": model_path.name,
        "decision_threshold": float(best["threshold"]),
        "feature_columns": feature_cols,
        "categorical_columns": CAT_COLS,
        "numeric_columns": num_cols,
        "target_column": TARGET_COL,
        "risk_bands": {
            "high_risk": "score >= 0.70",
            "medium_risk": "0.40 <= score < 0.70",
            "low_risk": "score < 0.40",
        },
    }

    with open(output_dir / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics_payload, f, indent=2)

    with open(output_dir / "model_manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    with open(output_dir / "feature_columns.json", "w", encoding="utf-8") as f:
        json.dump(feature_cols, f, indent=2)

    print("[OK] training complete")
    print(json.dumps(metrics_payload, indent=2))


if __name__ == "__main__":
    main()
