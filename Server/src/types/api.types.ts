export type RiskBand = "high_risk" | "medium_risk" | "low_risk";

export interface UploadMetadata {
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  rawRowCount: number;
  donorCount: number;
  processedAt: string;
  snapshotDate: string;
}

export interface SummaryMetrics {
  totalDonors: number;
  predictedChurnDonors: number;
  predictedChurnRate: number;
  averageRiskScore: number;
  highRiskDonors: number;
  mediumRiskDonors: number;
  lowRiskDonors: number;
}

export interface RiskBandDistributionItem {
  band: RiskBand;
  count: number;
  percentage: number;
  scoreRangeLabel: string;
}

export interface DonorRiskRow {
  donorId: string;
  churnRiskScore: number;
  predictedChurnLabel: 0 | 1;
  riskBand: RiskBand;
  recommendedAction: string;
  segment: {
    donorRegion: string;
    acquisitionSource: string;
    preferredCampaignSource: string;
    isRecurringDonor: boolean;
  };
  engagement: {
    daysSinceLastDonation: number;
    daysSinceLastCommunication: number;
    openRateLast90d: number;
    clickRateLast90d: number;
  };
}

export interface SegmentRecommendation {
  segmentKey: string;
  title: string;
  riskLevel: RiskBand;
  donorCount: number;
  averageRiskScore: number;
  recommendation: string;
}

export interface EngagementInsight {
  key: string;
  title: string;
  value: string;
  insight: string;
}

export interface ChartData {
  riskDistribution: Array<{ label: string; value: number }>;
  topRiskTrend: Array<{ donorId: string; score: number }>;
}

export interface ModelMetadata {
  modelName: string;
  modelFormat: string;
  decisionThreshold: number;
  featureCount: number;
}

export interface PredictionApiData {
  uploadMetadata: UploadMetadata;
  summaryMetrics: SummaryMetrics;
  riskBands: RiskBandDistributionItem[];
  topAtRiskDonors: DonorRiskRow[];
  donorRiskList: DonorRiskRow[];
  segmentRecommendations: SegmentRecommendation[];
  engagementInsights: EngagementInsight[];
  chartData: ChartData;
  modelMetadata: ModelMetadata;
  managerSummary: string;
  managerNotes: string[];
}

export interface PredictionApiResponse {
  status: "success";
  requestId: string;
  data: PredictionApiData;
}

export interface ErrorApiResponse {
  status: "error";
  requestId: string;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
