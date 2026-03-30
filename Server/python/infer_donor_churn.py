#!/usr/bin/env python3
"""
Run donor churn inference from raw donor event CSV and emit dashboard-ready JSON.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ML_SCRIPTS_DIR = PROJECT_ROOT / "ML" / "scripts"


def _load_module(module_name: str, file_path: Path):
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not create module spec for {file_path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


try:
    build_module = _load_module("build_donor_training_table", ML_SCRIPTS_DIR / "build_donor_training_table.py")
    predict_module = _load_module("predict_churn_risk", ML_SCRIPTS_DIR / "predict_churn_risk.py")

    DONATION_EVENT = build_module.DONATION_EVENT
    build_features_for_donor = build_module.build_features_for_donor
    load_model = predict_module.load_model
    predict_proba = predict_module.predict_proba
    recommendation_from_row = predict_module.recommendation_from_row
    risk_band = predict_module.risk_band
except Exception as exc:  # pragma: no cover - initialization error
    print(
        json.dumps(
            {
                "error": {
                    "code": "IMPORT_ERROR",
                    "message": "Could not import required ML scripts",
                    "details": str(exc),
                }
            }
        ),
        file=sys.stderr,
    )
    sys.exit(2)


REQUIRED_COLUMNS = {
    "donor_id",
    "event_date",
    "event_type",
    "donor_since_date",
    "acquisition_source",
    "donor_region",
    "is_recurring_donor",
}

OPTIONAL_DEFAULTS: dict[str, Any] = {
    "event_id": "",
    "amount_usd": 0.0,
    "campaign_source": "unknown",
    "was_opened": 0,
    "was_clicked": 0,
    "was_replied": 0,
    "was_attended": 0,
    "converted_to_donation": 0,
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input_csv", required=True, help="Path to raw donor events CSV")
    parser.add_argument("--model_dir", required=True, help="Path to model artifacts directory")
    parser.add_argument("--top_n", type=int, default=25, help="Top N donors for highlights")
    return parser.parse_args()


def fail(code: str, message: str, details: Any | None = None, exit_code: int = 1) -> None:
    payload: dict[str, Any] = {
        "error": {
            "code": code,
            "message": message,
        }
    }
    if details is not None:
        payload["error"]["details"] = details
    print(json.dumps(payload), file=sys.stderr)
    sys.exit(exit_code)


def validate_and_prepare_raw_events(df: pd.DataFrame) -> pd.DataFrame:
    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing:
        fail(
            "CSV_VALIDATION_ERROR",
            "Uploaded CSV is missing required columns",
            {"missing_columns": missing, "required_columns": sorted(REQUIRED_COLUMNS)},
            3,
        )

    out = df.copy()
    for col, default in OPTIONAL_DEFAULTS.items():
        if col not in out.columns:
            out[col] = default

    out["event_date"] = pd.to_datetime(out["event_date"], errors="coerce")
    out["donor_since_date"] = pd.to_datetime(out["donor_since_date"], errors="coerce")

    if out["event_date"].isna().any() or out["donor_since_date"].isna().any():
        fail(
            "CSV_VALIDATION_ERROR",
            "Uploaded CSV contains invalid dates",
            {
                "event_date_invalid_rows": int(out["event_date"].isna().sum()),
                "donor_since_date_invalid_rows": int(out["donor_since_date"].isna().sum()),
            },
            3,
        )

    numeric_cols = [
        "amount_usd",
        "was_opened",
        "was_clicked",
        "was_replied",
        "was_attended",
        "converted_to_donation",
        "is_recurring_donor",
    ]
    for col in numeric_cols:
        out[col] = pd.to_numeric(out[col], errors="coerce").fillna(0)

    out["donor_id"] = out["donor_id"].astype(str)
    out["event_type"] = out["event_type"].astype(str)
    out["acquisition_source"] = out["acquisition_source"].astype(str).fillna("unknown")
    out["donor_region"] = out["donor_region"].astype(str).fillna("unknown")
    out["campaign_source"] = out["campaign_source"].astype(str).fillna("unknown")

    if out["event_id"].astype(str).str.strip().eq("").all():
        out["event_id"] = out.index.astype(str)

    out = out.sort_values(["donor_id", "event_date", "event_id"]).reset_index(drop=True)
    return out


def build_inference_feature_table(events_df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Timestamp]:
    snapshot_date = events_df["event_date"].max().normalize()
    donor_groups = {donor_id: g.copy() for donor_id, g in events_df.groupby("donor_id")}

    rows: list[dict[str, Any]] = []
    for donor_df in donor_groups.values():
        has_historical_donation = (
            (donor_df["event_type"] == DONATION_EVENT) & (donor_df["event_date"] <= snapshot_date)
        ).any()
        if not has_historical_donation:
            continue

        features = build_features_for_donor(donor_df, snapshot_date)
        features.pop("churned_in_next_180d", None)
        rows.append(features)

    if not rows:
        fail(
            "NO_SCOREABLE_DONORS",
            "No donors were scoreable from uploaded CSV",
            "Ensure CSV contains donation history rows per donor",
            3,
        )

    return pd.DataFrame(rows), snapshot_date


def build_segment_recommendations(scored_df: pd.DataFrame, limit: int = 6) -> list[dict[str, Any]]:
    grouped = (
        scored_df.groupby(["donor_region", "acquisition_source"], dropna=False)
        .agg(
            donor_count=("donor_id", "count"),
            average_risk_score=("churn_risk_score", "mean"),
            high_risk_count=("risk_band", lambda s: int((s == "high_risk").sum())),
        )
        .reset_index()
    )

    grouped = grouped.sort_values(["average_risk_score", "donor_count"], ascending=[False, False]).head(limit)

    recommendations: list[dict[str, Any]] = []
    for row in grouped.to_dict(orient="records"):
        avg = float(row["average_risk_score"])
        risk_level = "high_risk" if avg >= 0.70 else "medium_risk" if avg >= 0.40 else "low_risk"

        if risk_level == "high_risk":
            recommendation = "Prioritize personal outreach this week with a mission impact story and direct renewal ask."
        elif risk_level == "medium_risk":
            recommendation = "Run a re-engagement campaign with targeted content and monitor response over 30 days."
        else:
            recommendation = "Continue stewardship cadence and test small upgrade asks for retention growth."

        recommendations.append(
            {
                "segment_key": f"region:{row['donor_region']}|acquisition:{row['acquisition_source']}",
                "title": f"{row['donor_region']} donors from {row['acquisition_source']}",
                "risk_level": risk_level,
                "donor_count": int(row["donor_count"]),
                "average_risk_score": round(avg, 4),
                "recommendation": recommendation,
            }
        )

    return recommendations


def build_engagement_insights(scored_df: pd.DataFrame) -> list[dict[str, str]]:
    high = scored_df[scored_df["risk_band"] == "high_risk"]

    avg_days_last_gift = float(high["days_since_last_donation"].mean()) if not high.empty else 0.0
    avg_open_rate_all = float(scored_df["open_rate_last_90d"].mean()) if not scored_df.empty else 0.0
    recurring_share = float(scored_df["is_recurring_donor"].mean()) if not scored_df.empty else 0.0
    declining_gift_count = int((scored_df["gift_amount_trend_90d_vs_prev_90d"] < 0).sum())

    return [
        {
            "key": "high_risk_recency",
            "title": "High-risk donor recency",
            "value": f"{avg_days_last_gift:.0f} days since last gift",
            "insight": "High-risk donors have gone longer without donating and should be contacted first.",
        },
        {
            "key": "email_engagement",
            "title": "Average email open rate",
            "value": f"{avg_open_rate_all * 100:.1f}%",
            "insight": "Lower engagement indicates need for stronger storytelling and channel testing.",
        },
        {
            "key": "recurring_share",
            "title": "Recurring donor share",
            "value": f"{recurring_share * 100:.1f}%",
            "insight": "Recurring donors are typically more stable; preserve this segment with impact updates.",
        },
        {
            "key": "declining_gift_trend",
            "title": "Donors with declining recent gifts",
            "value": str(declining_gift_count),
            "insight": "These donors may need tailored ask amounts and personal reactivation messaging.",
        },
    ]


def build_manager_summary(summary: dict[str, Any]) -> tuple[str, list[str]]:
    total = summary["total_donors"]
    high = summary["high_risk_donors"]
    medium = summary["medium_risk_donors"]
    churn_rate = summary["predicted_churn_rate"]

    manager_summary = (
        f"Out of {total} active donors, {high} are high risk and {medium} are medium risk. "
        f"The model estimates about {churn_rate * 100:.1f}% may churn soon without intervention."
    )

    manager_notes = [
        "Start with high-risk donors for personal outreach in the next 7 days.",
        "Use segment recommendations to tailor campaigns by donor region and acquisition source.",
        "Track changes in open rates and donation recency after each campaign cycle.",
        "Re-run this analysis after major campaign sends to monitor retention movement.",
    ]

    return manager_summary, manager_notes


def main() -> None:
    args = parse_args()
    input_csv = Path(args.input_csv)
    model_dir = Path(args.model_dir)

    if not input_csv.exists():
        fail("INPUT_NOT_FOUND", "Input CSV not found", str(input_csv), 3)

    if not model_dir.exists():
        fail("MODEL_DIR_NOT_FOUND", "Model directory not found", str(model_dir), 3)

    raw_df = pd.read_csv(input_csv)
    events_df = validate_and_prepare_raw_events(raw_df)

    features_df, snapshot_date = build_inference_feature_table(events_df)

    manifest, model = load_model(model_dir)
    feature_columns = manifest["feature_columns"]

    missing_features = [col for col in feature_columns if col not in features_df.columns]
    if missing_features:
        fail(
            "FEATURE_VALIDATION_ERROR",
            "Engineered features missing required model columns",
            {"missing_features": missing_features},
            3,
        )

    X = features_df[feature_columns].copy()
    scores = predict_proba(manifest, model, X)
    threshold = float(manifest["decision_threshold"])

    scored = features_df.copy()
    scored["churn_risk_score"] = scores
    scored["predicted_churn_label"] = (scored["churn_risk_score"] >= threshold).astype(int)
    scored["risk_band"] = scored["churn_risk_score"].apply(risk_band)
    scored["recommended_action"] = scored.apply(recommendation_from_row, axis=1)
    scored = scored.sort_values("churn_risk_score", ascending=False).reset_index(drop=True)

    total = int(len(scored))
    high_count = int((scored["risk_band"] == "high_risk").sum())
    medium_count = int((scored["risk_band"] == "medium_risk").sum())
    low_count = int((scored["risk_band"] == "low_risk").sum())

    summary = {
        "total_donors": total,
        "predicted_churn_donors": int(scored["predicted_churn_label"].sum()),
        "predicted_churn_rate": round(float(scored["predicted_churn_label"].mean()) if total else 0.0, 4),
        "average_risk_score": round(float(scored["churn_risk_score"].mean()) if total else 0.0, 4),
        "high_risk_donors": high_count,
        "medium_risk_donors": medium_count,
        "low_risk_donors": low_count,
    }

    def band_payload(band: str, count: int, label: str) -> dict[str, Any]:
        return {
            "band": band,
            "count": count,
            "percentage": round((count / total) * 100, 2) if total else 0.0,
            "score_range_label": label,
        }

    risk_bands = [
        band_payload("high_risk", high_count, ">= 0.70"),
        band_payload("medium_risk", medium_count, "0.40 - 0.69"),
        band_payload("low_risk", low_count, "< 0.40"),
    ]

    manager_summary, manager_notes = build_manager_summary(summary)

    donors = [
        {
            "donor_id": str(row["donor_id"]),
            "churn_risk_score": round(float(row["churn_risk_score"]), 6),
            "predicted_churn_label": int(row["predicted_churn_label"]),
            "risk_band": row["risk_band"],
            "recommended_action": row["recommended_action"],
            "donor_region": str(row["donor_region"]),
            "acquisition_source": str(row["acquisition_source"]),
            "preferred_campaign_source": str(row["preferred_campaign_source"]),
            "is_recurring_donor": int(row["is_recurring_donor"]),
            "days_since_last_donation": float(row["days_since_last_donation"]),
            "days_since_last_communication": float(row["days_since_last_communication"]),
            "open_rate_last_90d": float(row["open_rate_last_90d"]),
            "click_rate_last_90d": float(row["click_rate_last_90d"]),
        }
        for _, row in scored.iterrows()
    ]

    payload = {
        "meta": {
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "snapshot_date": snapshot_date.date().isoformat(),
            "top_n_requested": int(args.top_n),
            "input": {
                "raw_rows": int(len(events_df)),
                "donor_count": int(events_df["donor_id"].nunique()),
            },
            "model": {
                "model_name": manifest["model_name"],
                "model_format": manifest["model_format"],
                "decision_threshold": threshold,
                "feature_count": len(feature_columns),
            },
        },
        "summary": summary,
        "risk_bands": risk_bands,
        "donors": donors,
        "segment_recommendations": build_segment_recommendations(scored),
        "engagement_insights": build_engagement_insights(scored),
        "manager_summary": manager_summary,
        "manager_notes": manager_notes,
    }

    print(json.dumps(payload))


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as exc:  # pragma: no cover - fallback safety
        fail("INFERENCE_RUNTIME_ERROR", "Unexpected Python inference failure", str(exc), 4)
