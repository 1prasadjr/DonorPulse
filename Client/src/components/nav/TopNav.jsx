import { NavLink } from "react-router-dom";

export function TopNav() {
  return (
    <header className="top-nav" aria-label="Application navigation">
      <div className="container top-nav-inner">
        <div className="top-nav-content">
          <div className="top-nav-brand-block">
            <p className="top-nav-brand">DonorPulse</p>
          </div>

          <nav className="top-nav-links" aria-label="Primary">
            <NavLink
              to="/analyze"
              className={({ isActive }) => `top-nav-link${isActive ? " is-active" : ""}`}
            >
              Analyze
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `top-nav-link${isActive ? " is-active" : ""}`}
            >
              Dashboard
            </NavLink>
          </nav>
        </div>
      </div>
    </header>
  );
}
