import { GlassPanel } from "./GlassPanel";

export function StatCard({ label, value, helper, tone = "default" }) {
  return (
    <GlassPanel className={`stat-card ${tone}`}>
      <p className="stat-label">{label}</p>
      <h3 className="stat-value">{value}</h3>
      {helper ? <p className="stat-helper">{helper}</p> : null}
    </GlassPanel>
  );
}
