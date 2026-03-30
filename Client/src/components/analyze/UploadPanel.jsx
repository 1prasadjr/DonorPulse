import { useMemo } from "react";
import { GlassPanel } from "../ui/GlassPanel";

export function UploadPanel({
  selectedFile,
  topN,
  uploading,
  uploadError,
  onSelectFile,
  onTopNChange,
  onSubmit,
}) {
  const fileMeta = useMemo(() => {
    if (!selectedFile) {
      return "No file selected";
    }

    const sizeMb = (selectedFile.size / (1024 * 1024)).toFixed(2);
    return `${selectedFile.name} (${sizeMb} MB)`;
  }, [selectedFile]);

  return (
    <GlassPanel className="upload-panel">
      <h2>Import Intelligence</h2>
      <p className="muted">Upload donor history CSV to run preprocessing and churn prediction.</p>

      <label className="file-drop" htmlFor="donorCsv">
        <span className="file-drop-title">Select donor CSV</span>
        <span className="muted">Accepted: .csv</span>
      </label>
      <input
        id="donorCsv"
        type="file"
        accept=".csv,text/csv"
        onChange={(event) => onSelectFile(event.target.files?.[0] || null)}
      />

      <p className="file-meta">{fileMeta}</p>

      <div className="inline-form-row">
        <label htmlFor="topN">Top at-risk donors</label>
        <input
          id="topN"
          type="number"
          min={1}
          max={100}
          value={topN}
          onChange={(event) => onTopNChange(Number(event.target.value) || 1)}
        />
      </div>

      {uploadError ? <p className="error-text">{uploadError}</p> : null}

      <button type="button" className="btn btn-primary" disabled={uploading || !selectedFile} onClick={onSubmit}>
        {uploading ? "Running prediction..." : "Upload and Predict"}
      </button>
    </GlassPanel>
  );
}
