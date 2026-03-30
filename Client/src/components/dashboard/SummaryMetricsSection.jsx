import { SectionHeader } from "../ui/SectionHeader";
import { StatCard } from "../ui/StatCard";
import { formatCurrency, formatNumber, formatPercent } from "../../utils/formatters";

function formatProcessedDetails(value) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

export function SummaryMetricsSection({ summaryMetrics, uploadMetadata }) {
  return (
    <section>
      <SectionHeader
        title="Overall Donor Risk Overview"
        subtitle={`CSV ${uploadMetadata?.fileName || "-"} • Processed ${formatProcessedDetails(uploadMetadata?.processedAt)}`}
      />
      <div className="stats-grid">
        <StatCard label="Total Donors" value={formatNumber(summaryMetrics.totalDonors)} />
        <StatCard
          label="Predicted Churn Donors"
          value={formatNumber(summaryMetrics.predictedChurnDonors)}
          helper={formatPercent(summaryMetrics.predictedChurnRate)}
          tone="warning"
        />
        <StatCard label="Average Risk Score" value={formatPercent(summaryMetrics.averageRiskScore)} />
        <StatCard
          label="High Risk Segment"
          value={formatNumber(summaryMetrics.highRiskDonors)}
          helper={`${formatNumber(summaryMetrics.mediumRiskDonors)} medium-risk donors`}
          tone="danger"
        />
        <StatCard
          label="Estimated Revenue Exposure"
          value={formatCurrency(summaryMetrics.predictedChurnDonors * 120)}
          helper="MVP estimate for manager prioritization"
        />
      </div>
    </section>
  );
}
