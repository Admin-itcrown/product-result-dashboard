import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Maximize2, X } from "lucide-react";

export function ProductChartGlaze() {
  const today = new Date();

  const [mode, setMode] = useState("month");

  const [selectedMonth, setSelectedMonth] = useState(
    `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}`
  );

  const [selectedYear, setSelectedYear] = useState(
    today.getFullYear()
  );

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [mode, selectedMonth, selectedYear]);

  const fetchData = async () => {
    const dbProfile = "glaze";

    const envApi = (import.meta as any)?.env?.VITE_API_URL;

    const apiBase =
      envApi ||
      `${window.location.protocol}//${window.location.hostname}:3001`;

    let whereDate = "";
    let groupBy = "";
    let label = "";

    if (mode === "month") {
      whereDate = `FORMAT([Date],'yyyy-MM')='${selectedMonth}'`;
      groupBy = "DAY([Date])";
      label = "CAST(DAY([Date]) AS VARCHAR)";
    }

    if (mode === "year") {
      whereDate = `YEAR([Date])=${selectedYear}`;
      groupBy = "MONTH([Date])";
      label = "FORMAT([Date],'MMM')";
    }

    const query = `
      SELECT
        ${label} AS Period,

        SUM(
          CASE
            WHEN Line = '42SOLID'
            THEN [QtyMoved]
            ELSE 0
          END
        ) AS SOLID,

        SUM(
          CASE
            WHEN Line = '42TWOTON'
            THEN [QtyMoved]
            ELSE 0
          END
        ) AS TWOTON,

        SUM(
          CASE
            WHEN Line NOT IN ('42SOLID','42TWOTON')
            THEN [QtyMoved]
            ELSE 0
          END
        ) AS Others

      FROM glaze_trans

      WHERE ${whereDate}
        AND [OP] = 10

      GROUP BY ${groupBy}, ${label}

      ORDER BY ${groupBy}
    `;

    setLoading(true);

    try {
      const res = await fetch(`${apiBase}/query`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          query,
          db: dbProfile,
        }),
      });

      const payload = await res.json();

      const raw = payload?.recordset || [];

      setData(
        raw.map((row: any) => {
          const solid = Number(row.SOLID || 0);
          const twotone = Number(row.TWOTON || 0);
          const others = Number(row.Others || 0);

          return {
            name: row.Period,

            SOLID: solid,
            TWOTONE: twotone,
            Others: others,

            Total: solid + twotone + others,
          };
        })
      );
    } catch (error) {
      console.error(error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = {
    SOLID: {
      stroke: "#1e3a8a",
      fill: "#3b82f6",
    },

    TWOTONE: {
      stroke: "#c2410c",
      fill: "#fb923c",
    },

    Others: {
      stroke: "#166534",
      fill: "#4ade80",
    },

    Total: {
      stroke: "#7c3aed",
      fill: "#a78bfa",
    },
  };

  const ChartBox = () => (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{
          top: 10,
          right: 20,
          left: 55,
          bottom: 10,
        }}
      >
        <defs>
          <linearGradient
            id="solidGrad"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="5%"
              stopColor="#3b82f6"
              stopOpacity={0.6}
            />

            <stop
              offset="95%"
              stopColor="#3b82f6"
              stopOpacity={0.05}
            />
          </linearGradient>

          <linearGradient
            id="twotoneGrad"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="5%"
              stopColor="#fb923c"
              stopOpacity={0.6}
            />

            <stop
              offset="95%"
              stopColor="#fb923c"
              stopOpacity={0.05}
            />
          </linearGradient>

          <linearGradient
            id="otherGrad"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="5%"
              stopColor="#4ade80"
              stopOpacity={0.5}
            />

            <stop
              offset="95%"
              stopColor="#4ade80"
              stopOpacity={0.05}
            />
          </linearGradient>

          <linearGradient
            id="totalGrad"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="5%"
              stopColor="#a78bfa"
              stopOpacity={0.6}
            />

            <stop
              offset="95%"
              stopColor="#a78bfa"
              stopOpacity={0.05}
            />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#e5e7eb"
        />

        <XAxis dataKey="name" />

        <YAxis />

        <Tooltip
          itemSorter={(item: any) => -item.value}
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
          }}
        />

        <Legend />

        <Area
          type="monotone"
          dataKey="SOLID"
          stroke={COLORS.SOLID.stroke}
          fill="url(#solidGrad)"
          strokeWidth={2.5}
        />

        <Area
          type="monotone"
          dataKey="TWOTONE"
          stroke={COLORS.TWOTONE.stroke}
          fill="url(#twotoneGrad)"
          strokeWidth={2.5}
        />

        <Area
          type="monotone"
          dataKey="Others"
          stroke={COLORS.Others.stroke}
          fill="url(#otherGrad)"
          strokeWidth={2.5}
        />

        <Area
          type="monotone"
          dataKey="Total"
          stroke={COLORS.Total.stroke}
          fill="url(#totalGrad)"
          strokeWidth={3}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  const yearOptions = Array.from(
    { length: 6 },
    (_, i) => today.getFullYear() - i
  );

  return (
    <>
      <div className="bg-white rounded-2xl border shadow-lg p-6 relative">

        <button
          onClick={() => setIsFullscreen(true)}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100"
        >
          <Maximize2 size={18} />
        </button>

        <div className="flex justify-between items-center mb-5 pr-10">
          <h3 className="text-xl font-semibold text-gray-800">
            Product Complete Performance Glaze
          </h3>

          <div className="flex gap-3">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="border rounded-lg px-3 py-1"
            >
              <option value="month">รายเดือน</option>

              <option value="year">รายปี</option>
            </select>

            {mode === "month" && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) =>
                  setSelectedMonth(e.target.value)
                }
                className="border rounded-lg px-3 py-1"
              />
            )}

            {mode === "year" && (
              <select
                value={selectedYear}
                onChange={(e) =>
                  setSelectedYear(Number(e.target.value))
                }
                className="border rounded-lg px-3 py-1"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="h-[380px]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              Loading chart...
            </div>
          ) : (
            <ChartBox />
          )}
        </div>
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-white w-[95vw] h-[90vh] rounded-2xl flex flex-col">

            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h3 className="font-semibold text-lg">
                Product Performance Glaze
              </h3>

              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X />
              </button>
            </div>

            <div className="flex-1 p-6">
              <ChartBox />
            </div>
          </div>
        </div>
      )}
    </>
  );
}