import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GlassPanel } from "../ui/GlassPanel";
import { SectionHeader } from "../ui/SectionHeader";

export function RiskTrendSection({ chartData }) {
  const trend = (chartData?.topRiskTrend || []).map((item) => ({
    donor: item.donorId,
    score: Number((item.score * 100).toFixed(2)),
  }));

  return (
    <GlassPanel className="chart-panel large">
      <SectionHeader title="Top At-Risk Score Curve" subtitle="Area view of highest-risk donors in current result set" />
      <div className="chart-shell large">
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={trend} margin={{ top: 15, right: 15, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="riskArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#b7ccb9" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#b7ccb9" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#333535" strokeDasharray="3 3" />
            <XAxis dataKey="donor" stroke="#8d928c" tick={{ fill: "#c3c8c1", fontSize: 12 }} />
            <YAxis stroke="#8d928c" tick={{ fill: "#c3c8c1", fontSize: 12 }} unit="%" />
            <Tooltip
              formatter={(value) => [`${value}%`, "Risk score"]}
              contentStyle={{ background: "#1e2020", border: "1px solid #333535", borderRadius: "12px" }}
            />
            <Area type="monotone" dataKey="score" stroke="#b7ccb9" strokeWidth={2} fill="url(#riskArea)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassPanel>
  );
}
