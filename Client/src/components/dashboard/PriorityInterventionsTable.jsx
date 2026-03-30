import { useMemo, useState } from "react";
import { GlassPanel } from "../ui/GlassPanel";
import { SectionHeader } from "../ui/SectionHeader";
import { formatPercent, titleCaseRiskBand } from "../../utils/formatters";

const DEFAULT_VISIBLE_DONORS = 5;

export function PriorityInterventionsTable({ donors }) {
  const [showAll, setShowAll] = useState(false);
  const safeDonors = Array.isArray(donors) ? donors : [];
  const hasMoreThanDefault = safeDonors.length > DEFAULT_VISIBLE_DONORS;

  const displayedDonors = useMemo(() => {
    if (showAll) {
      return safeDonors;
    }

    return safeDonors.slice(0, DEFAULT_VISIBLE_DONORS);
  }, [safeDonors, showAll]);

  const action = hasMoreThanDefault ? (
    <button type="button" className="btn btn-secondary table-toggle-btn" onClick={() => setShowAll((prev) => !prev)}>
      {showAll ? `Show First ${DEFAULT_VISIBLE_DONORS}` : `View All (${safeDonors.length})`}
    </button>
  ) : null;

  return (
    <section>
      <SectionHeader
        title="Priority Interventions Table"
        subtitle="Most at-risk donors to prioritize for stewardship outreach"
        action={action}
      />
      <GlassPanel className="table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Donor</th>
                <th>Risk Score</th>
                <th>Band</th>
                <th>Recency</th>
                <th>Suggested Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedDonors.map((donor) => (
                <tr key={donor.donorId}>
                  <td>
                    <strong>{donor.donorId}</strong>
                    <small>{donor.segment.donorRegion}</small>
                  </td>
                  <td>{formatPercent(donor.churnRiskScore)}</td>
                  <td>{titleCaseRiskBand(donor.riskBand)}</td>
                  <td>{donor.engagement.daysSinceLastDonation} days</td>
                  <td>{donor.recommendedAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hasMoreThanDefault ? (
          <p className="muted table-toggle-meta">
            Showing {displayedDonors.length} of {safeDonors.length} donors
          </p>
        ) : null}
      </GlassPanel>
    </section>
  );
}
