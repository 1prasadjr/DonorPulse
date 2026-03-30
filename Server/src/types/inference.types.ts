export interface PythonInferenceRawResult {
  meta: {
    processed_at: string;
    snapshot_date: string;
    input: {
      raw_rows: number;
      donor_count: number;
    };
    model: {
      model_name: string;
      model_format: string;
      decision_threshold: number;
      feature_count: number;
    };
  };
  summary: {
    total_donors: number;
    predicted_churn_donors: number;
    predicted_churn_rate: number;
    average_risk_score: number;
    high_risk_donors: number;
    medium_risk_donors: number;
    low_risk_donors: number;
  };
  risk_bands: Array<{
    band: "high_risk" | "medium_risk" | "low_risk";
    count: number;
    percentage: number;
    score_range_label: string;
  }>;
  donors: Array<{
    donor_id: string;
    churn_risk_score: number;
    predicted_churn_label: 0 | 1;
    risk_band: "high_risk" | "medium_risk" | "low_risk";
    recommended_action: string;
    donor_region: string;
    acquisition_source: string;
    preferred_campaign_source: string;
    is_recurring_donor: number;
    days_since_last_donation: number;
    days_since_last_communication: number;
    open_rate_last_90d: number;
    click_rate_last_90d: number;
  }>;
  segment_recommendations: Array<{
    segment_key: string;
    title: string;
    risk_level: "high_risk" | "medium_risk" | "low_risk";
    donor_count: number;
    average_risk_score: number;
    recommendation: string;
  }>;
  engagement_insights: Array<{
    key: string;
    title: string;
    value: string;
    insight: string;
  }>;
  manager_summary: string;
  manager_notes: string[];
}
