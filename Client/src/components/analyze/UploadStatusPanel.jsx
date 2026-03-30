import { GlassPanel } from "../ui/GlassPanel";

function statusText(health) {
  if (!health) {
    return "Checking backend readiness...";
  }
  if (health.status === "ok") {
    return "Backend, model, and inference bridge are ready.";
  }
  return "Backend is reachable but one or more checks are degraded.";
}

export function UploadStatusPanel({ health, modelMetadata, loading, error, onRetry }) {
  return (
    <GlassPanel className="status-panel">
      <h3>Upload Status and Validation</h3>
      <p className="muted">{loading ? "Loading backend status..." : statusText(health)}</p>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="status-list">
        <div>
          <span className="label">Health</span>
          <span>{health?.status || "unknown"}</span>
        </div>
        <div>
          <span className="label">Model</span>
          <span>{modelMetadata?.data?.manifest?.model_name || "unknown"}</span>
        </div>
        <div>
          <span className="label">Threshold</span>
          <span>
            {typeof modelMetadata?.data?.manifest?.decision_threshold === "number"
              ? modelMetadata.data.manifest.decision_threshold.toFixed(4)
              : "unknown"}
          </span>
        </div>
      </div>

      <button type="button" className="btn btn-secondary" onClick={onRetry}>
        Re-check Backend
      </button>
    </GlassPanel>
  );
}
