import { Outlet, useLocation } from "react-router-dom";
import { TopNav } from "../components/nav/TopNav";

export function AppShell() {
  const location = useLocation();
  const isAnalyzeRoute = location.pathname === "/analyze" || location.pathname === "/";

  return (
    <div className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />
      <TopNav />
      <main className={`app-main container${isAnalyzeRoute ? " app-main-analyze" : ""}`}>
        <Outlet />
      </main>
      <footer className={`app-footer${isAnalyzeRoute ? " app-footer-analyze" : ""}`}>
        <div className="container footer-inner">
          <div>
            <p className="brand">DonorPulse</p>
            <p className="muted">Donor Retention Predictor</p>
          </div>
          <p className="muted">Built for nonprofit fundraising teams</p>
        </div>
      </footer>
    </div>
  );
}
