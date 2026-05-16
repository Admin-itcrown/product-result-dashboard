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
import {
  Sparkles,
  Layers3,
  Activity,
  TrendingUp,
} from "lucide-react";

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
// Hover Shape
// ==============================
const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#fff"
        strokeWidth={3}
      />

      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 14}
        outerRadius={outerRadius + 18}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.15}
      />
    </g>
  );
};

export function CategoryChartfinishing({
  startDate,
  endDate,
}: any) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const startStr = startDate
        ? format(startDate, "yyyy-MM-dd")
        : null;

      const endStr = endDate
        ? format(endDate, "yyyy-MM-dd")
        : null;

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          db: "glaze",
        }),
      });

      const result = await res.json();

      const transformed =
        result.recordset?.map((item: any) => {
          const code = item.ClayGroup;

          return {
            code,
            name: CLAY_GROUP_NAMES[code] || code,
            value: item.TotalQtyProc || 0,
            color:
              CLAY_GROUP_COLORS[code] || "#94a3b8",
          };
        }) || [];

      setData(transformed);
      setLoading(false);
    };

    fetchData();
  }, [startDate, endDate]);

  const total = data.reduce(
    (a, b) => a + b.value,
    0
  );

  const formatNumber = (n: number) =>
    n.toLocaleString();

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">

      {/* Glow Background */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-cyan-200/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-orange-200/20 rounded-full blur-3xl" />

      {/* Header */}
      <div className="relative z-10 p-6 border-b bg-white/70 backdrop-blur-xl">

        <div className="flex items-start justify-between">

          <div className="flex items-center gap-3">

            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg">
              <Layers3 className="w-5 h-5 text-white" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                Clay Overview
              </h2>

              <p className="text-sm text-slate-500">
                Production Distribution
              </p>
            </div>
          </div>

          {/* KPI */}
          <div className="text-right">

            <div className="flex items-center justify-end gap-1 text-slate-500 text-xs mb-1">
              <Activity className="w-3 h-3" />
              TOTAL OUTPUT
            </div>

            <h1 className="text-3xl font-black text-slate-800 tracking-tight">
              {formatNumber(total)}
            </h1>

            <div className="flex items-center justify-end gap-1 text-emerald-500 text-xs font-semibold mt-1">
              <TrendingUp className="w-3 h-3" />
              Live Production
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative z-10 p-6">

        {/* ลดขนาดกราฟ */}
        <div className="h-[360px]">

          {loading ? (
            <div className="flex h-full items-center justify-center">

              <div className="flex flex-col items-center gap-3">

                <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />

                <p className="text-sm text-slate-500">
                  Loading production...
                </p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>

                <defs>
                  <linearGradient
                    id="centerGlow"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#ffffff"
                    />

                    <stop
                      offset="100%"
                      stopColor="#f1f5f9"
                    />
                  </linearGradient>
                </defs>

                <Pie
                  data={data}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={78}
                  outerRadius={118}
                  paddingAngle={5}
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, index) =>
                    setActiveIndex(index)
                  }
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.color}
                      stroke="#fff"
                      strokeWidth={3}
                    />
                  ))}
                </Pie>

                {/* Center */}
                <circle
                  cx="50%"
                  cy="50%"
                  r="58"
                  fill="url(#centerGlow)"
                />

                <text
                  x="50%"
                  y="46%"
                  textAnchor="middle"
                  className="fill-slate-400 text-[10px] font-semibold tracking-widest"
                >
                  TOTAL
                </text>

                <text
                  x="50%"
                  y="54%"
                  textAnchor="middle"
                  className="fill-slate-800 text-[28px] font-black"
                >
                  {formatNumber(total)}
                </text>

                <text
                  x="50%"
                  y="62%"
                  textAnchor="middle"
                  className="fill-emerald-500 text-[11px] font-bold"
                >
                  Production
                </text>

                {/* Tooltip */}
                <Tooltip
                  contentStyle={{
                    borderRadius: 18,
                    border: "none",
                    background:
                      "rgba(255,255,255,0.95)",
                    backdropFilter: "blur(10px)",
                    boxShadow:
                      "0 20px 40px rgba(0,0,0,0.12)",
                  }}
                  formatter={(value: number) => {
                    const percent = (
                      (value / total) *
                      100
                    ).toFixed(1);

                    return [
                      `${formatNumber(
                        value
                      )} (${percent}%)`,
                      "Qty",
                    ];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend + Percent */}
        {!loading && (
          <div className="flex items-center justify-center gap-5 mt-2 flex-wrap">

            {data.map((item, index) => {
              const percent = (
                (item.value / total) *
                100
              ).toFixed(1);

              return (
                <div
                  key={index}
                  className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white border shadow-sm"
                >

                  <div
                    className="w-4 h-4 rounded-full"
                    style={{
                      backgroundColor: item.color,
                    }}
                  />

                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700 text-sm">
                      {item.name}
                    </span>

                    <span
                      className="text-sm font-bold"
                      style={{
                        color: item.color,
                      }}
                    >
                      {percent}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t text-xs text-slate-400">

          <div className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Smart Analytics Dashboard
          </div>

          <div>
            {startDate && endDate
              ? `${format(
                  startDate,
                  "dd/MM/yyyy"
                )} - ${format(
                  endDate,
                  "dd/MM/yyyy"
                )}`
              : "Realtime Data"}
          </div>
        </div>
      </div>
    </div>
  );
}