import { GlassPanel } from "../ui/GlassPanel";
import { formatPercent } from "../../utils/formatters";

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

export function ManagerBriefingPanel({ summary, notes, summaryMetrics, uploadMetadata }) {
  const details = [
    {
      label: "Source CSV",
      value: uploadMetadata?.fileName || "-",
    },
    {
      label: "Processed",
      value: formatProcessedDetails(uploadMetadata?.processedAt),
    },
    {
      label: "Snapshot",
      value: uploadMetadata?.snapshotDate || "-",
    },
    {
      label: "Predicted Churn Rate",
      value:
        typeof summaryMetrics?.predictedChurnRate === "number"
          ? formatPercent(summaryMetrics.predictedChurnRate)
          : "-",
    },
  ];

  return (
    <GlassPanel className="briefing-panel">
      <h3>Manager Briefing</h3>
      <p>{summary}</p>
      <div className="briefing-details-grid">
        {details.map((item) => (
          <div key={item.label} className="briefing-detail-item">
            <span className="label">{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
      <ul>
        {notes?.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </GlassPanel>
  );
}
