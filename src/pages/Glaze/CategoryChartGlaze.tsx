import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { format } from "date-fns";

// Color palette for pie chart
const COLORS = [
  "hsl(24, 95%, 53%)",
  "hsl(217, 91%, 60%)",
  "hsl(127, 72%, 47%)",
  "hsl(222, 47%, 31%)",
  "hsl(262, 80%, 50%)",
  "hsl(346, 77%, 50%)",
  "hsl(38, 92%, 50%)",
  "hsl(187, 100%, 42%)",
];

interface CategoryChartGlazeProps {
  startDate?: Date;
  endDate?: Date;
}

export function CategoryChartGlaze({ startDate, endDate }: CategoryChartGlazeProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Format dates for SQL query
        const startStr = startDate ? format(startDate, "yyyy-MM-dd") : null;
        const endStr = endDate ? format(endDate, "yyyy-MM-dd") : null;

        let query = `
          SELECT 
              LEFT([Clay], 1) AS ClayGroup,
              SUM([QtyProc]) AS TotalQtyProc
          FROM [Db_glaze].[dbo].[glaze_trans]
        `;

        // Add date filter if dates are provided
        if (startStr && endStr) {
          query += `
          WHERE [Date] BETWEEN '${startStr}' AND '${endStr}'
          `;
        }

        query += `
          GROUP BY LEFT([Clay], 1)
          ORDER BY ClayGroup
        `;

        const response = await fetch("/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: query,
            db: "glaze",
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.recordset && Array.isArray(result.recordset)) {
          // Transform data for pie chart
          const transformedData = result.recordset.map(
            (item: any, index: number) => ({
              name: item.ClayGroup || `Item ${index + 1}`,
              value: item.TotalQtyProc || 0,
              color: COLORS[index % COLORS.length],
            })
          );
          setData(transformedData);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err) {
        console.error("Error fetching chart data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  if (error) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 shadow-card opacity-0 animate-fade-in" style={{ animationDelay: "250ms" }}>
        <div className="text-center text-red-500">
          <p className="font-semibold">Error loading chart</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-card opacity-0 animate-fade-in" style={{ animationDelay: "250ms" }}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">Clay Distribution</h3>
        <p className="text-sm text-muted-foreground">Distribution by Clay Group</p>
      </div>
      <div className="h-[280px]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading chart...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0, 0%, 100%)",
                  border: "1px solid hsl(214, 32%, 91%)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                formatter={(value: number) => [`${value}`, "Quantity"]}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
