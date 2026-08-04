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
  S: "#7C3AED",
  V: "#06B6D4",
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
      outerRadius={outerRadius + 10}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      stroke="#fff"
      strokeWidth={3}
    />
  );
};

export function CategoryChartGlazebyGroup({
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
                ? format(
                    startDate,
                    "yyyy-MM-dd"
                  )
                : null;
      
              const endStr = endDate
                ? format(
                    endDate,
                    "yyyy-MM-dd"
                  )
                : null;
      
              let query = `
                SELECT 
                  LEFT([Clay],1) AS ClayGroup,
                  SUM([QtyProc]) AS TotalQtyProc
                FROM [Db_glaze].[dbo].[glaze_trans]
              `;
      
              if (startStr && endStr) {
                query += `
                  WHERE [Date] BETWEEN '${startStr}' AND '${endStr}' AND [OP]=10
                `;
              }
      
              query += `
                GROUP BY LEFT([Clay],1)
                ORDER BY ClayGroup
              `;
      
              const response =
                await fetch("/query", {
                  method: "POST",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  body: JSON.stringify({
                    query,
                    db: "glaze",
                  }),
                });
      
              if (!response.ok) {
                throw new Error(
                  "Load data failed"
                );
              }
      
              const result =
                await response.json();
      
              const transformed =
                result.recordset?.map(
                  (item: any) => {
                    const code =
                      item.ClayGroup;
      
                    return {
                      code: code,
                      name:
                        CLAY_GROUP_NAMES[
                          code
                        ] || code,
                      value:
                        item.TotalQtyProc ||
                        0,
                      color:
                        CLAY_GROUP_COLORS[
                          code
                        ] || "#8884d8",
                    };
                  }
                ) || [];
      
              // Sort to show ดินขาว (V) first, then ดินดำ (S)
              const sorted = transformed.sort(
                (a: any, b: any) => {
                  const order: Record<string, number> = {
                    "V": 0, // ดินขาว first
                    "S": 1, // ดินดำ second
                  };
                  return (order[a.code] ?? 2) - (order[b.code] ?? 2);
                }
              );
      
              setData(sorted);
            } catch (err) {
              setError(
                "Failed to load chart"
              );
            } finally {
              setLoading(false);
            }
    };

    fetchData();
  }, [startDate, endDate]);

  const total = data.reduce(
    (sum, item) => sum + item.value,
    0
  );

  const formatNumber = (num: number) =>
    num.toLocaleString();

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <p className="text-center text-red-500 font-medium">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div
      className="
        relative overflow-hidden rounded-2xl border
        bg-gradient-to-br from-white via-slate-50 to-violet-50
        shadow-sm p-5
      "
    >

      {/* BACKGROUND */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-cyan-400/10 blur-3xl rounded-full" />
      <div className="absolute bottom-0 left-0 w-44 h-44 bg-violet-500/10 blur-3xl rounded-full" />

      {/* HEADER */}
      <div className="relative z-10 flex items-center justify-between mb-4">

        <div>
          <div className="flex items-center gap-3">

            <div className="p-2.5 rounded-2xl bg-violet-100 text-violet-700">
              <Layers3 size={20} />
            </div>

            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-900">
                Clay Overview
              </h3>

              <p className="text-sm text-slate-500 mt-0.5">
                Production by clay category
              </p>
            </div>
          </div>
        </div>

        <div
          className="
            hidden md:flex items-center gap-2
            text-xs
            bg-violet-100 text-violet-700
            px-3 py-2 rounded-full font-bold
          "
        >
          <Sparkles size={12} />
          Live Analytics
        </div>
      </div>

      {/* ======================================
          CHART
      ====================================== */}
      <div className="relative z-10 h-[520px]">

        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />

              <span className="text-sm text-slate-500">
                Loading...
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* PIE */}
            <ResponsiveContainer width="100%" height="72%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={95}
                  outerRadius={145}
                  paddingAngle={5}
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, index) =>
                    setActiveIndex(index)
                  }
                  animationDuration={700}
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

                {/* CENTER TEXT */}
                <text
                  x="50%"
                  y="44%"
                  textAnchor="middle"
                  className="fill-slate-400 text-[13px]"
                >
                  TOTAL OUTPUT
                </text>

                <text
                  x="50%"
                  y="53%"
                  textAnchor="middle"
                  className="fill-slate-900 text-[36px] font-black"
                >
                  {formatNumber(total)}
                </text>

                <text
                  x="50%"
                  y="62%"
                  textAnchor="middle"
                  className="fill-slate-400 text-[12px]"
                >
                  pcs production
                </text>

                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    border: "none",
                    boxShadow:
                      "0 10px 30px rgba(0,0,0,0.12)",
                    padding: "12px 16px",
                    fontSize: "14px",
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

            {/* SUMMARY */}
            <div className="grid grid-cols-2 gap-4 mt-2">

              {data.map((item, index) => {
                const percent = (
                  (item.value / total) *
                  100
                ).toFixed(1);

                return (
                  <div
                    key={index}
                    className="
                      rounded-2xl border bg-white/80
                      backdrop-blur p-4 shadow-sm
                    "
                    style={{
                      borderColor: `${item.color}30`,
                    }}
                  >
                    {/* TOP */}
                    <div className="flex items-center justify-between mb-3">

                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-md"
                          style={{
                            backgroundColor: item.color,
                          }}
                        />

                        <span className="font-black text-base text-slate-800">
                          {item.name}
                        </span>
                      </div>

                    </div>

                    {/* PERCENT */}
                    <div
                      className="text-3xl font-black leading-none"
                      style={{
                        color: item.color,
                      }}
                    >
                      {percent}%
                    </div>

                    {/* VALUE */}
                    <div className="text-sm text-slate-500 mt-2">
                      {formatNumber(item.value)} pcs
                    </div>

                    {/* PROGRESS */}
                    <div className="mt-4 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: item.color,
                        }}
                      />
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