import { GlassPanel } from "../ui/GlassPanel";
import { SectionHeader } from "../ui/SectionHeader";

export function EngagementInsightsSection({ insights }) {
  return (
    <section>
      <SectionHeader title="Recent Donor Engagement Insights" subtitle="Operational signals extracted from behavior features" />
      <div className="insights-grid">
        {insights.map((item) => (
          <GlassPanel key={item.key} className="insight-card">
            <p className="segment-title">{item.title}</p>
            <h4>{item.value}</h4>
            <p className="muted">{item.insight}</p>
          </GlassPanel>
        ))}
      </div>
    </section>
  );
}
