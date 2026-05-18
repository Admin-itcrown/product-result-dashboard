import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Sector,
} from "recharts";
import {
  Layers3,
  CircleDollarSign,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";

// ==============================
// Config
// ==============================
const CLAY_GROUP_NAMES: Record<string, string> = {
  S: "ดินดำ",
  V: "ดินขาว",
};

const CLAY_GROUP_COLORS: Record<string, string> = {
  S: "#ef4444",
  V: "#2563eb",
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
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 12}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      stroke="#fff"
      strokeWidth={3}
    />
  );
};

export function CategoryChartSort({
  startDate,
  endDate,
}: any) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

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
            AND [OP] = 40
          `;
        }

        query += `
          GROUP BY LEFT([Clay],1)
          ORDER BY ClayGroup
        `;

        const response = await fetch("/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, db: "glaze" }),
        });

        const result = await response.json();

        const transformed =
          result.recordset?.map((item: any) => {
            const code = item.ClayGroup;

            return {
              code,
              name: CLAY_GROUP_NAMES[code] || code,
              value: item.TotalQtyProc || 0,
              color: CLAY_GROUP_COLORS[code] || "#8884d8",
            };
          }) || [];

        const sorted = transformed.sort((a, b) => {
          const order: Record<string, number> = {
            V: 0,
            S: 1,
          };

          return (order[a.code] ?? 2) - (order[b.code] ?? 2);
        });

        setData(sorted);
      } catch (err) {
        setError("Failed to load chart");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const formatNumber = (num: number) =>
    num.toLocaleString();

  if (error) {
    return (
      <div className="bg-card rounded-3xl border border-red-200 p-6 shadow-sm">
        <p className="text-center text-red-500 font-medium">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-xl p-6">
      
      {/* Glow Background */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 blur-3xl rounded-full" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-red-500/10 blur-3xl rounded-full" />

      {/* Header */}
      <div className="relative z-10 flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <Layers3 size={20} />
            </div>

            <h3 className="text-2xl font-bold tracking-tight">
              Clay Overview
            </h3>
          </div>

          <p className="text-sm text-muted-foreground">
            Production summary by clay category
          </p>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-full">
          <Sparkles size={14} />
          Live Analytics
        </div>
      </div>

      {/* Chart */}
      <div className="relative z-10 h-[430px]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">
                Loading Chart...
              </span>
            </div>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="78%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={85}
                  outerRadius={125}
                  paddingAngle={5}
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, index) =>
                    setActiveIndex(index)
                  }
                  isAnimationActive
                  animationDuration={900}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.color}
                      stroke="rgba(255,255,255,0.7)"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>

                {/* Center Text */}
                <text
                  x="50%"
                  y="45%"
                  textAnchor="middle"
                  className="fill-muted-foreground text-sm"
                >
                  TOTAL OUTPUT
                </text>

                <text
                  x="50%"
                  y="54%"
                  textAnchor="middle"
                  className="fill-foreground text-[30px] font-extrabold"
                >
                  {formatNumber(total)}
                </text>

                <text
                  x="50%"
                  y="62%"
                  textAnchor="middle"
                  className="fill-muted-foreground text-xs"
                >
                  pcs production
                </text>

                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    border: "none",
                    boxShadow:
                      "0 10px 30px rgba(0,0,0,0.15)",
                    padding: "10px 14px",
                  }}
                  formatter={(value: number) => {
                    const percent = (
                      (value / total) *
                      100
                    ).toFixed(1);

                    return [
                      `${formatNumber(
                        value
                      )} pcs (${percent}%)`,
                      "Quantity",
                    ];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Bottom Summary */}
            <div className="grid grid-cols-2 gap-4 -mt-2">
              {data.map((item, index) => {
                const percent = (
                  (item.value / total) *
                  100
                ).toFixed(1);

                return (
                  <div
                    key={index}
                    className="group relative overflow-hidden rounded-2xl border bg-white/70 dark:bg-slate-900/70 backdrop-blur p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                    style={{
                      borderColor: `${item.color}40`,
                    }}
                  >
                    {/* Glow */}
                    <div
                      className="absolute inset-0 opacity-10 group-hover:opacity-20 transition"
                      style={{
                        background: item.color,
                      }}
                    />

                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-md shadow"
                            style={{
                              backgroundColor: item.color,
                            }}
                          />

                          <span className="font-bold text-base">
                            {item.name}
                          </span>
                        </div>

                        <CircleDollarSign
                          size={18}
                          style={{
                            color: item.color,
                          }}
                        />
                      </div>

                      <div className="space-y-1">
                        <div
                          className="text-2xl font-extrabold"
                          style={{
                            color: item.color,
                          }}
                        >
                          {percent}%
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {formatNumber(item.value)} pcs
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="mt-3 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}