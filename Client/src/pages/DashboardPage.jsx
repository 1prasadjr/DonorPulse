import { Link } from "react-router-dom";
import { SummaryMetricsSection } from "../components/dashboard/SummaryMetricsSection";
import { RiskDistributionSection } from "../components/dashboard/RiskDistributionSection";
import { RiskTrendSection } from "../components/dashboard/RiskTrendSection";
import { PriorityInterventionsTable } from "../components/dashboard/PriorityInterventionsTable";
import { RecommendationPanels } from "../components/dashboard/RecommendationPanels";
import { EngagementInsightsSection } from "../components/dashboard/EngagementInsightsSection";
import { ManagerBriefingPanel } from "../components/dashboard/ManagerBriefingPanel";
import { EmptyState } from "../components/ui/EmptyState";
import { usePrediction } from "../context/usePrediction";

export function DashboardPage() {
  const { predictionResponse } = usePrediction();

  if (!predictionResponse?.data) {
    return <EmptyState />;
  }

  const data = predictionResponse.data;

  return (
    <div className="dashboard-stack">
      <SummaryMetricsSection summaryMetrics={data.summaryMetrics} uploadMetadata={data.uploadMetadata} />
      <RiskDistributionSection riskBands={data.riskBands} chartData={data.chartData} />
      <RiskTrendSection chartData={data.chartData} />
      <PriorityInterventionsTable donors={data.topAtRiskDonors} />
      <RecommendationPanels recommendations={data.segmentRecommendations} />
      <EngagementInsightsSection insights={data.engagementInsights} />
      <ManagerBriefingPanel
        summary={data.managerSummary}
        notes={data.managerNotes}
        summaryMetrics={data.summaryMetrics}
        uploadMetadata={data.uploadMetadata}
      />

      <div className="dashboard-actions">
        <Link className="btn btn-secondary" to="/analyze">
          Run New Analysis
        </Link>
      </div>
    </div>
  );
}
