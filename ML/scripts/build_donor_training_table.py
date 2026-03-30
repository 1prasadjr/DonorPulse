#!/usr/bin/env python3
"""
Build a donor-level training table from raw donor event data.

Usage:
    python scripts/build_donor_training_table.py \
        --input data/raw/synthetic_donor_events.csv \
        --output data/processed/donor_training_dataset.csv
"""

from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

DONATION_EVENT = "donation"
COMM_EVENTS = {"email", "sms", "phone_call", "direct_mail", "event"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Path to raw donor events CSV")
    parser.add_argument("--output", required=True, help="Path to output donor training CSV")
    return parser.parse_args()


def safe_rate(numerator: float, denominator: float) -> float:
    return float(numerator) / float(denominator) if denominator else 0.0


def days_since(snapshot_date: pd.Timestamp, last_date: pd.Timestamp | pd.NaT) -> float:
    if pd.isna(last_date):
        return 9999.0
    return float((snapshot_date - last_date).days)


def build_features_for_donor(donor_df: pd.DataFrame, snapshot_date: pd.Timestamp) -> dict:
    history = donor_df[donor_df["event_date"] <= snapshot_date].copy()
    donations = history[history["event_type"] == DONATION_EVENT].copy()
    comms = history[history["event_type"].isin(COMM_EVENTS)].copy()

    last_30_start = snapshot_date - pd.Timedelta(days=30)
    last_90_start = snapshot_date - pd.Timedelta(days=90)
    prev_90_start = snapshot_date - pd.Timedelta(days=180)
    last_180_start = snapshot_date - pd.Timedelta(days=180)
    last_365_start = snapshot_date - pd.Timedelta(days=365)

    donations_30 = donations[donations["event_date"] > last_30_start]
    donations_90 = donations[donations["event_date"] > last_90_start]
    donations_180 = donations[donations["event_date"] > last_180_start]
    donations_365 = donations[donations["event_date"] > last_365_start]
    donations_prev_90 = donations[(donations["event_date"] > prev_90_start) & (donations["event_date"] <= last_90_start)]

    comms_30 = comms[comms["event_date"] > last_30_start]
    comms_90 = comms[comms["event_date"] > last_90_start]
    comms_180 = comms[comms["event_date"] > last_180_start]
    comms_365 = comms[comms["event_date"] > last_365_start]

    lifetime_donation_count = int(len(donations))
    last_donation_date = donations["event_date"].max() if not donations.empty else pd.NaT
    last_comm_date = comms["event_date"].max() if not comms.empty else pd.NaT

    amount_last_90 = float(donations_90["amount_usd"].sum())
    amount_prev_90 = float(donations_prev_90["amount_usd"].sum())
    donation_count_last_90 = int(len(donations_90))
    donation_count_prev_90 = int(len(donations_prev_90))

    donor_profile = history.iloc[-1]

    if not donations.empty and donations["campaign_source"].notna().any():
        preferred_campaign_source = donations["campaign_source"].value_counts(dropna=True).index[0]
    else:
        preferred_campaign_source = "unknown"

    return {
        "donor_id": donor_profile["donor_id"],
        "snapshot_date": snapshot_date.date().isoformat(),
        "days_since_last_donation": days_since(snapshot_date, last_donation_date),
        "donations_last_30d": int(len(donations_30)),
        "donations_last_90d": donation_count_last_90,
        "donations_last_180d": int(len(donations_180)),
        "donations_last_365d": int(len(donations_365)),
        "total_amount_last_90d": round(amount_last_90, 2),
        "total_amount_last_180d": round(float(donations_180["amount_usd"].sum()), 2),
        "total_amount_last_365d": round(float(donations_365["amount_usd"].sum()), 2),
        "lifetime_donation_count": lifetime_donation_count,
        "lifetime_donation_amount": round(float(donations["amount_usd"].sum()), 2),
        "avg_gift_amount": round(float(donations["amount_usd"].mean()) if not donations.empty else 0.0, 2),
        "max_gift_amount": round(float(donations["amount_usd"].max()) if not donations.empty else 0.0, 2),
        "gift_amount_trend_90d_vs_prev_90d": round(amount_last_90 - amount_prev_90, 2),
        "donation_count_trend_90d_vs_prev_90d": donation_count_last_90 - donation_count_prev_90,
        "days_since_last_communication": days_since(snapshot_date, last_comm_date),
        "communications_last_30d": int(len(comms_30)),
        "communications_last_90d": int(len(comms_90)),
        "communications_last_180d": int(len(comms_180)),
        "communications_last_365d": int(len(comms_365)),
        "open_rate_last_90d": round(safe_rate(comms_90["was_opened"].sum(), len(comms_90)), 4),
        "click_rate_last_90d": round(safe_rate(comms_90["was_clicked"].sum(), len(comms_90)), 4),
        "reply_rate_last_180d": round(safe_rate(comms_180["was_replied"].sum(), len(comms_180)), 4),
        "attendance_rate_last_365d": round(safe_rate(comms_365["was_attended"].sum(), len(comms_365)), 4),
        "converted_communications_last_180d": int(comms_180["converted_to_donation"].sum()),
        "donor_tenure_days": int((snapshot_date - pd.to_datetime(donor_profile["donor_since_date"])).days),
        "preferred_campaign_source": preferred_campaign_source,
        "acquisition_source": donor_profile["acquisition_source"],
        "donor_region": donor_profile["donor_region"],
        "is_recurring_donor": int(donor_profile["is_recurring_donor"]),
        "churned_in_next_180d": 0,
    }


def build_label(donor_df: pd.DataFrame, snapshot_date: pd.Timestamp) -> int:
    future_end = snapshot_date + pd.Timedelta(days=180)
    future_donations = donor_df[(donor_df["event_type"] == DONATION_EVENT) & (donor_df["event_date"] > snapshot_date) & (donor_df["event_date"] <= future_end)]
    return 1 if future_donations.empty else 0


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(input_path)
    df["event_date"] = pd.to_datetime(df["event_date"])
    df["donor_since_date"] = pd.to_datetime(df["donor_since_date"])
    df = df.sort_values(["donor_id", "event_date", "event_id"]).reset_index(drop=True)

    min_snapshot = (df["event_date"].min() + pd.Timedelta(days=365)).to_period("M").to_timestamp("M")
    max_snapshot = (df["event_date"].max() - pd.Timedelta(days=180)).to_period("M").to_timestamp("M")
    snapshot_dates = pd.date_range(min_snapshot, max_snapshot, freq="ME")

    rows = []
    donor_groups = {donor_id: g.copy() for donor_id, g in df.groupby("donor_id")}

    for snapshot_date in snapshot_dates:
        lookback_start = snapshot_date - pd.Timedelta(days=365)
        for donor_id, donor_df in donor_groups.items():
            recent_donations = donor_df[(donor_df["event_type"] == DONATION_EVENT) & (donor_df["event_date"] <= snapshot_date) & (donor_df["event_date"] > lookback_start)]
            if recent_donations.empty:
                continue
            feature_row = build_features_for_donor(donor_df, snapshot_date)
            feature_row["churned_in_next_180d"] = build_label(donor_df, snapshot_date)
            rows.append(feature_row)

    training_df = pd.DataFrame(rows).sort_values(["snapshot_date", "donor_id"]).reset_index(drop=True)
    training_df.to_csv(output_path, index=False)

    print(f"[OK] wrote {output_path}")
    print(f"rows={len(training_df)} donors={training_df['donor_id'].nunique()} snapshots={training_df['snapshot_date'].nunique()}")
    print(f"label_rate={training_df['churned_in_next_180d'].mean():.4f}")


if __name__ == "__main__":
    main()
