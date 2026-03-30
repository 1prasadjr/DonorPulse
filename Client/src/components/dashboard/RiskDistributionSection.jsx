import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { GlassPanel } from "../ui/GlassPanel";
import { SectionHeader } from "../ui/SectionHeader";
import { titleCaseRiskBand } from "../../utils/formatters";

const colorMap = {
  high_risk: "#ff9d9d",
  medium_risk: "#ffbf7d",
  low_risk: "#b7ccb9",
};

export function RiskDistributionSection({ riskBands, chartData }) {
  const graphData = (chartData?.riskDistribution || []).map((item) => ({
    name: titleCaseRiskBand(item.label),
    value: item.value,
    color: colorMap[item.label] || "#c3c8c1",
  }));

  return (
    <section className="split-section">
      <GlassPanel className="risk-band-panel">
        <SectionHeader title="Risk Band Distribution" subtitle="Count and percentage by risk category" />
        <ul className="risk-band-list">
          {riskBands.map((band) => (
            <li key={band.band}>
              <div>
                <strong>{titleCaseRiskBand(band.band)}</strong>
                <p className="muted">{band.scoreRangeLabel}</p>
              </div>
              <div className="risk-band-values">
                <span>{band.count}</span>
                <span className="muted">{band.percentage}%</span>
              </div>
            </li>
          ))}
        </ul>
      </GlassPanel>

      <GlassPanel className="chart-panel">
        <SectionHeader title="Distribution Chart" subtitle="Visual split of donor risk groups" />
        <div className="chart-shell">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={graphData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} innerRadius={55}>
                {graphData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [value, name]}
                contentStyle={{ background: "#1e2020", border: "1px solid #333535", borderRadius: "12px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>
    </section>
  );
}
