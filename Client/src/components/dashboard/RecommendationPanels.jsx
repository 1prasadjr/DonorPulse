import { GlassPanel } from "../ui/GlassPanel";
import { SectionHeader } from "../ui/SectionHeader";
import { formatPercent, titleCaseRiskBand } from "../../utils/formatters";

export function RecommendationPanels({ recommendations }) {
  return (
    <section>
      <SectionHeader
        title="Segment-wise Recommendations"
        subtitle="Action-oriented recommendations generated from risk segments"
      />
      <div className="recommendation-grid">
        {recommendations.map((item) => (
          <GlassPanel key={item.segmentKey} className="recommendation-card">
            <p className="segment-title">{item.title}</p>
            <p className="muted">{titleCaseRiskBand(item.riskLevel)} • {item.donorCount} donors • Avg {formatPercent(item.averageRiskScore)}</p>
            <p>{item.recommendation}</p>
          </GlassPanel>
        ))}
      </div>
    </section>
  );
}
