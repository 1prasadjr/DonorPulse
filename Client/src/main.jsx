import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./app/App";
import { PredictionProvider } from "./context/PredictionContext.jsx";
import "./styles/theme.css";
import "./styles/app.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HashRouter>
      <PredictionProvider>
        <App />
      </PredictionProvider>
    </HashRouter>
  </StrictMode>,
);
