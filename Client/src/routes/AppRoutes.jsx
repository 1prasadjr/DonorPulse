import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { AnalyzePage } from "../pages/AnalyzePage";
import { DashboardPage } from "../pages/DashboardPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/analyze" element={<AnalyzePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/analyze" replace />} />
      <Route path="*" element={<Navigate to="/analyze" replace />} />
    </Routes>
  );
}
