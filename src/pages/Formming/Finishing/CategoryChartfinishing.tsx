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
// Config (NEW COLORS)
// ==============================
const CLAY_GROUP_NAMES: Record<string, string> = {
  S: "ดินดำ",
  V: "ดินขาว",
};

const CLAY_GROUP_COLORS: Record<string, string> = {
  V: "#10b981", // emerald (ดินขาว)
  S: "#6366f1", // indigo (ดินดำ)
};

interface CategoryChartFormmingProps {
  startDate?: Date;
  endDate?: Date;
}

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
      outerRadius={outerRadius + 8}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      stroke="#fff"
      strokeWidth={2}
    />
  );
};

export function CategoryChartfinishing({
  startDate,
  endDate,
}: CategoryChartFormmingProps) {
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
            WHERE [Date] BETWEEN '${startStr}' AND '${endStr}' AND [OP] = 20
          `;
        }

        query += `
          GROUP BY LEFT([Clay],1)
          ORDER BY ClayGroup
        `;

        const response = await fetch("/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            db: "finishing",
          }),
        });

        if (!response.ok) {
          throw new Error("Load data failed");
        }

        const result = await response.json();

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

        const sorted = transformed.sort((a: any, b: any) => {
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
      <div className="bg-card rounded-lg border border-border p-6 shadow-card">
        <p className="text-center text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="sticky top-6 bg-card rounded-lg border border-border p-6 shadow-card">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-foreground">
          Clay Overview
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Production by clay category
        </p>
      </div>

      <div className="h-[320px]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            Loading...
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="70%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                >
                  {data.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>

                <text
                  x="50%"
                  y="46%"
                  textAnchor="middle"
                  className="fill-muted-foreground text-sm font-semibold"
                >
                  TOTAL
                </text>

                <text
                  x="50%"
                  y="54%"
                  textAnchor="middle"
                  className="fill-foreground text-xl font-bold"
                >
                  {formatNumber(total)}
                </text>

                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => {
                    const percent = ((value / total) * 100).toFixed(1);
                    return [`${formatNumber(value)} (${percent}%)`, "Quantity"];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-4 h-[25%] mt-8">
              {data.map((item, index) => {
                const percent = ((item.value / total) * 100).toFixed(1);

                return (
                  <div
                    key={index}
                    className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 px-4 py-4"
                    style={{ borderColor: item.color }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-5 w-5 rounded-md"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-lg font-bold">
                        {item.name}
                      </span>
                    </div>

                    <span
                      className="text-base font-bold"
                      style={{ color: item.color }}
                    >
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