import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadPanel } from "../components/analyze/UploadPanel";
import { uploadAndPredict } from "../services/predictionService";
import { usePrediction } from "../context/usePrediction";

function formatUploadError(error) {
  const baseMessage = error?.message || "Prediction failed. Please retry.";
  const missingColumns = error?.details?.pythonErrorDetails?.missing_columns;

  if (Array.isArray(missingColumns) && missingColumns.length > 0) {
    return `${baseMessage}. Missing columns: ${missingColumns.join(", ")}`;
  }

  return baseMessage;
}

export function AnalyzePage() {
  const navigate = useNavigate();
  const { setPrediction } = usePrediction();

  const [selectedFile, setSelectedFile] = useState(null);
  const [topN, setTopN] = useState(25);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const onSubmit = async () => {
    if (!selectedFile) {
      setUploadError("Please select a CSV file.");
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setUploadError("Only CSV files are supported.");
      return;
    }

    setUploadError("");
    setUploading(true);

    try {
      const response = await uploadAndPredict(selectedFile, topN);
      setPrediction(response);
      navigate("/dashboard");
    } catch (error) {
      setUploadError(formatUploadError(error));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-grid analyze-grid analyze-centered">
      <section className="hero-copy">
        <h1>
          Analyze donor risks <span>before it becomes churn</span>
        </h1>
        <p>
          Upload your donor data and let DonorPulse instantly analyze it to identify at-risk donors and recommend
          targeted retention strategies.
        </p>
      </section>

      <UploadPanel
        selectedFile={selectedFile}
        topN={topN}
        uploading={uploading}
        uploadError={uploadError}
        onSelectFile={setSelectedFile}
        onTopNChange={setTopN}
        onSubmit={onSubmit}
      />
    </div>
  );
}
