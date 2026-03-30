import { GlassPanel } from "../ui/GlassPanel";

export function ModelMetadataPanel({ modelMetadata, uploadMetadata }) {
  return (
    <GlassPanel className="metadata-panel">
      <h3>Model Transparency</h3>
      <div className="status-list">
        <div>
          <span className="label">Model Name</span>
          <span>{modelMetadata.modelName}</span>
        </div>
        <div>
          <span className="label">Format</span>
          <span>{modelMetadata.modelFormat}</span>
        </div>
        <div>
          <span className="label">Decision Threshold</span>
          <span>{modelMetadata.decisionThreshold?.toFixed(4)}</span>
        </div>
        <div>
          <span className="label">Feature Count</span>
          <span>{modelMetadata.featureCount}</span>
        </div>
        <div>
          <span className="label">Source File</span>
          <span>{uploadMetadata.fileName}</span>
        </div>
        <div>
          <span className="label">Donors Scored</span>
          <span>{uploadMetadata.donorCount}</span>
        </div>
      </div>
    </GlassPanel>
  );
}
