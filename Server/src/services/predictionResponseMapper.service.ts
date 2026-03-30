import {
  DonorRiskRow,
  PredictionApiData,
  RiskBandDistributionItem,
  SegmentRecommendation,
} from "../types/api.types";
import { PythonInferenceRawResult } from "../types/inference.types";

interface MapperInput {
  pythonResult: PythonInferenceRawResult;
  upload: {
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
  };
  topN: number;
}

function mapDonorRow(row: PythonInferenceRawResult["donors"][number]): DonorRiskRow {
  return {
    donorId: row.donor_id,
    churnRiskScore: row.churn_risk_score,
    predictedChurnLabel: row.predicted_churn_label,
    riskBand: row.risk_band,
    recommendedAction: row.recommended_action,
    segment: {
      donorRegion: row.donor_region,
      acquisitionSource: row.acquisition_source,
      preferredCampaignSource: row.preferred_campaign_source,
      isRecurringDonor: row.is_recurring_donor === 1,
    },
    engagement: {
      daysSinceLastDonation: row.days_since_last_donation,
      daysSinceLastCommunication: row.days_since_last_communication,
      openRateLast90d: row.open_rate_last_90d,
      clickRateLast90d: row.click_rate_last_90d,
    },
  };
}

function mapRiskBands(riskBands: PythonInferenceRawResult["risk_bands"]): RiskBandDistributionItem[] {
  return riskBands.map((item) => ({
    band: item.band,
    count: item.count,
    percentage: item.percentage,
    scoreRangeLabel: item.score_range_label,
  }));
}

function mapSegments(segments: PythonInferenceRawResult["segment_recommendations"]): SegmentRecommendation[] {
  return segments.map((segment) => ({
    segmentKey: segment.segment_key,
    title: segment.title,
    riskLevel: segment.risk_level,
    donorCount: segment.donor_count,
    averageRiskScore: segment.average_risk_score,
    recommendation: segment.recommendation,
  }));
}

export function mapInferenceToApiData({ pythonResult, upload, topN }: MapperInput): PredictionApiData {
  const donorRiskList = pythonResult.donors.map(mapDonorRow);
  const topAtRiskDonors = donorRiskList.slice(0, topN);

  return {
    uploadMetadata: {
      fileName: upload.fileName,
      fileSizeBytes: upload.fileSizeBytes,
      mimeType: upload.mimeType,
      rawRowCount: pythonResult.meta.input.raw_rows,
      donorCount: pythonResult.meta.input.donor_count,
      processedAt: pythonResult.meta.processed_at,
      snapshotDate: pythonResult.meta.snapshot_date,
    },
    summaryMetrics: {
      totalDonors: pythonResult.summary.total_donors,
      predictedChurnDonors: pythonResult.summary.predicted_churn_donors,
      predictedChurnRate: pythonResult.summary.predicted_churn_rate,
      averageRiskScore: pythonResult.summary.average_risk_score,
      highRiskDonors: pythonResult.summary.high_risk_donors,
      mediumRiskDonors: pythonResult.summary.medium_risk_donors,
      lowRiskDonors: pythonResult.summary.low_risk_donors,
    },
    riskBands: mapRiskBands(pythonResult.risk_bands),
    topAtRiskDonors,
    donorRiskList,
    segmentRecommendations: mapSegments(pythonResult.segment_recommendations),
    engagementInsights: pythonResult.engagement_insights,
    chartData: {
      riskDistribution: pythonResult.risk_bands.map((item) => ({
        label: item.band,
        value: item.count,
      })),
      topRiskTrend: topAtRiskDonors.map((item) => ({
        donorId: item.donorId,
        score: item.churnRiskScore,
      })),
    },
    modelMetadata: {
      modelName: pythonResult.meta.model.model_name,
      modelFormat: pythonResult.meta.model.model_format,
      decisionThreshold: pythonResult.meta.model.decision_threshold,
      featureCount: pythonResult.meta.model.feature_count,
    },
    managerSummary: pythonResult.manager_summary,
    managerNotes: pythonResult.manager_notes,
  };
}
