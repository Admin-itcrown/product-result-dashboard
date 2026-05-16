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
  S: "#ef4444", // 🔴 red-500 (ปรับใหม่)
  V: "#2563eb", // 🔵 blue-600 (ปรับใหม่)
};

// ==============================
// Hover Expand Shape
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
      outerRadius={outerRadius + 10}   // 🔥 ใหญ่ขึ้นตอน hover
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      stroke="#fff"
      strokeWidth={2}
    />
  );
};

export function CategoryChartFormming({
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
            AND [OP] = 10
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
  const formatNumber = (num: number) => num.toLocaleString();

  if (error) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <p className="text-center text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border p-6 shadow-card">
      <div className="mb-6">
        <h3 className="text-2xl font-bold">Clay Overview</h3>
        <p className="text-sm text-muted-foreground">
          Production by clay category
        </p>
      </div>

      {/* 🔥 เพิ่มความสูง chart */}
      <div className="h-[380px]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            Loading...
          </div>
        ) : (
          <>
            {/* 🔥 Pie ใหญ่ขึ้น (85% แทน 70%) */}
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={75}   // 🔥 ใหญ่ขึ้น
                  outerRadius={115}  // 🔥 ใหญ่ขึ้น
                  paddingAngle={4}
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  isAnimationActive
                  animationDuration={900}
                >
                  {data.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>

                <text
                  x="50%"
                  y="46%"
                  textAnchor="middle"
                  className="fill-muted-foreground text-sm"
                >
                  TOTAL
                </text>

                <text
                  x="50%"
                  y="54%"
                  textAnchor="middle"
                  className="fill-foreground text-2xl font-bold"
                >
                  {formatNumber(total)}
                </text>

                <Tooltip
                  formatter={(value: number) => {
                    const percent = ((value / total) * 100).toFixed(1);
                    return [`${formatNumber(value)} (${percent}%)`, "Quantity"];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              {data.map((item, index) => {
                const percent = ((item.value / total) * 100).toFixed(1);

                return (
                  <div
                    key={index}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border"
                    style={{ borderColor: item.color }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-bold">{item.name}</span>
                    </div>

                    <span style={{ color: item.color }}>
                      {percent}%
                    </span>
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