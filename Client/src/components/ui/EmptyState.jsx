import { Link } from "react-router-dom";
import { GlassPanel } from "./GlassPanel";

export function EmptyState({
  title = "No analysis available yet",
  description = "Upload a donor history CSV on the Analyze page to generate predictions.",
}) {
  return (
    <GlassPanel className="empty-state">
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      <Link to="/analyze" className="btn btn-primary">
        Go to Analyze
      </Link>
    </GlassPanel>
  );
}
