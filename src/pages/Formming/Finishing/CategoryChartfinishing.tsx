import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Sector,
} from "recharts";
import { format } from "date-fns";

// ==============================
// Config
// ==============================
const CLAY_GROUP_NAMES: Record<string, string> = {
  S: "ดินดำ",
  V: "ดินขาว",
};

const CLAY_GROUP_COLORS: Record<string, string> = {
  S: "#14b8a6",
  V: "#f97316",
};

// ==============================
// Hover Shape (Glow effect)
// ==============================
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 12}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#fff"
        strokeWidth={2}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 14}
        outerRadius={outerRadius + 18}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.2}
      />
    </g>
  );
};

export function CategoryChartfinishing({ startDate, endDate }: any) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const startStr = startDate ? format(startDate, "yyyy-MM-dd") : null;
      const endStr = endDate ? format(endDate, "yyyy-MM-dd") : null;

      let query = `
        SELECT 
          LEFT([Clay],1) AS ClayGroup,
          SUM([QtyProc]) AS TotalQtyProc
        FROM [Db_Formming].[dbo].[Formm_trans]
      `;

      if (startStr && endStr) {
        query += `
          WHERE [Date] BETWEEN '${startStr}' AND '${endStr}'
          AND [OP] = 20
        `;
      }

      query += `
        GROUP BY LEFT([Clay],1)
        ORDER BY ClayGroup
      `;

      const res = await fetch("/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, db: "glaze" }),
      });

      const result = await res.json();

      const transformed =
        result.recordset?.map((item: any) => {
          const code = item.ClayGroup;
          return {
            code,
            name: CLAY_GROUP_NAMES[code] || code,
            value: item.TotalQtyProc || 0,
            color: CLAY_GROUP_COLORS[code] || "#94a3b8",
          };
        }) || [];

      setData(transformed);
      setLoading(false);
    };

    fetchData();
  }, [startDate, endDate]);

  const total = data.reduce((a, b) => a + b.value, 0);
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border shadow-md p-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">
            Clay Overview
          </h3>
          <p className="text-xs text-slate-500">
            Production distribution by category
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-slate-500">TOTAL OUTPUT</p>
          <p className="text-xl font-bold text-slate-800">
            {formatNumber(total)}
          </p>
        </div>
      </div>

      {/* CHART */}
      <div className="h-[440px]">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm">
            Loading...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <defs>
                <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fff" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#000" stopOpacity={0} />
                </radialGradient>
              </defs>

              <Pie
                data={data}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={90}
                outerRadius={135}
                paddingAngle={6}
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                onMouseEnter={(_, i) => setActiveIndex(i)}
              >
                {data.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>

              {/* CENTER KPI */}
              <text x="50%" y="48%" textAnchor="middle" className="fill-slate-400 text-xs">
                TOTAL PRODUCTION
              </text>

              <text x="50%" y="56%" textAnchor="middle" className="fill-slate-800 text-3xl font-bold">
                {formatNumber(total)}
              </text>

              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "none",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                }}
                formatter={(value: number) => {
                  const percent = ((value / total) * 100).toFixed(1);
                  return [`${formatNumber(value)} (${percent}%)`, "Qty"];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}

        {/* LEGEND (CARD STYLE) */}
        {!loading && (
          <div className="grid grid-cols-2 gap-4 mt-6">
            {data.map((item, i) => {
              const percent = ((item.value / total) * 100).toFixed(1);

              return (
                <div
                  key={i}
                  className="group flex items-center justify-between p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-semibold text-slate-700 group-hover:text-slate-900">
                      {item.name}
                    </span>
                  </div>

                  <span
                    className="font-bold text-lg"
                    style={{ color: item.color }}
                  >
                    {percent}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}