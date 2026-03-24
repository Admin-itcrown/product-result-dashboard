import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Maximize2, X } from "lucide-react";

export function ProductChartClay() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const fetchData = async () => {
      const dbProfile = "glaze";
      const envApi = (import.meta as any)?.env?.VITE_API_URL;
      const apiBase =
        envApi ||
        (typeof window !== "undefined"
          ? `${window.location.protocol}//${window.location.hostname}:3001`
          : "http://localhost:3001");

      setLoading(true);

      try {
        const query = `
          SELECT 
            MONTH([Date]) AS MonthNumber,
            FORMAT([Date], 'MMM') AS MonthName,
            Line,
            SUM(CASE 
                  WHEN [QtyProc] BETWEEN 0 AND 9999 
                  THEN [QtyProc] 
                END) AS TotalQty
          FROM glaze_trans
          WHERE [Date] BETWEEN '${startDate}' AND '${endDate}'
            AND Line IN ('42TWOTON', '42SOLID')
          GROUP BY MONTH([Date]), FORMAT([Date], 'MMM'), Line
          ORDER BY MonthNumber
        `;

        const response = await fetch(`${apiBase}/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, db: dbProfile }),
        });

        const payload = await response.json();
        const rawData = payload?.recordset || [];

        const months = [
          "Jan","Feb","Mar","Apr","May","Jun",
          "Jul","Aug","Sep","Oct","Nov","Dec"
        ];

        const formattedData = months.map((month) => {
          const twoton = rawData.find(
            (d: any) => d.MonthName === month && d.Line === "42TWOTON"
          );
          const solid = rawData.find(
            (d: any) => d.MonthName === month && d.Line === "42SOLID"
          );

          return {
            name: month,
            TWOTON: twoton ? Number(twoton.TotalQty) : 0,
            SOLID: solid ? Number(solid.TotalQty) : 0,
          };
        });

        setData(formattedData);
      } catch (err) {
        console.error("Chart fetch error:", err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [year]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const sorted = [...payload].sort(
        (a, b) => Number(b.value) - Number(a.value)
      );

      return (
        <div className="bg-white border rounded p-3 shadow">
          <p className="font-semibold mb-1">{label}</p>
          {sorted.map((entry: any, index: number) => (
            <p
              key={entry.dataKey}
              style={{ color: entry.color }}
              className={index === 0 ? "font-bold" : ""}
            >
              {entry.dataKey} :{" "}
              {Number(entry.value).toLocaleString("en-US")}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const ChartContent = () => (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 20, left: 60, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" />
        <YAxis tickFormatter={(v) => Number(v).toLocaleString("en-US")} />
        <Tooltip content={<CustomTooltip />} />

        {/* TWOTON วาดก่อน */}
        <Area
          type="monotone"
          dataKey="TWOTON"
          stroke="#f97316"
          fill="#f97316"
          fillOpacity={0.3}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5 }}
        />

        {/* SOLID วาดทีหลัง */}
        <Area
          type="monotone"
          dataKey="SOLID"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.3}
          strokeWidth={3}
          dot={false}
          activeDot={{ r: 6 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  return (
    <>
      <div className="relative bg-card rounded-lg border border-border p-6 shadow-card">

        {/* ปุ่มขยาย */}
        <button
          onClick={() => setIsFullscreen(true)}
          className="absolute top-4 right-4 p-2 rounded-md hover:bg-gray-200 transition"
          title="Expand"
        >
          <Maximize2 size={18} />
        </button>

        <div className="flex items-center justify-between mb-4 pr-10">
          <h3 className="text-lg font-semibold">
            Product Performance Glaze
          </h3>

          <div className="flex items-center gap-6">
            {/* Legend */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <span>SOLID</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                <span>TWOTON</span>
              </div>
            </div>

            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-1 border rounded-lg bg-white"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="h-[300px]">
          <ChartContent />
        </div>

        {loading && (
          <p className="text-sm text-gray-500 mt-2">Loading...</p>
        )}
      </div>

      {/* Fullscreen */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white w-[95vw] h-[90vh] rounded-lg shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">
                Product Performance Glaze ({year})
              </h3>
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-md hover:bg-gray-200 transition"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 p-6">
              <ChartContent />
            </div>
          </div>
        </div>
      )}
    </>
  );
}