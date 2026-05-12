import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  LineChart,
  Line,
} from "recharts";
import {
  Maximize2,
  X,
  Trophy,
  Calendar,
  TrendingUp,
  Crown,
  BarChart3,
} from "lucide-react";

export function ProductChartFormming() {
  const today = new Date();

  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const [data, setData] = useState<any[]>([]);
  const [monthData, setMonthData] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const dbProfile = "Formming";

  const envApi = (import.meta as any)?.env?.VITE_API_URL;
  const apiBase =
    envApi ||
    `${window.location.protocol}//${window.location.hostname}:3001`;

  const fetchData = async () => {
    const query = `
      SELECT TOP 5
        [Description2] AS Customer,
        SUM([QtyMoved]) AS TotalA
      FROM [Db_Formming].[dbo].[Formm_trans]
      WHERE YEAR([Date]) = ${selectedYear}
      GROUP BY [Description2]
      ORDER BY SUM([QtyMoved]) DESC
    `;

    setLoading(true);

    try {
      const res = await fetch(`${apiBase}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, db: dbProfile }),
      });

      const payload = await res.json();

      const raw = payload?.recordset || [];

      setData(
        raw.map((row: any) => ({
          name: row.Customer,
          ยอดA: Number(row.TotalA || 0),
        }))
      );
    } catch (error) {
      console.error(error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthly = async (customer: string) => {
    const query = `
      SELECT
        FORMAT([Date],'MMM') AS MonthName,
        MONTH([Date]) AS MonthNo,
        SUM([QtyMoved]) AS TotalA
      FROM [Db_Formming].[dbo].[Formm_trans]
      WHERE YEAR([Date]) = ${selectedYear}
      AND [Description2] = '${customer}'
      GROUP BY MONTH([Date]), FORMAT([Date],'MMM')
      ORDER BY MONTH([Date])
    `;

    setDetailLoading(true);

    try {
      const res = await fetch(`${apiBase}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, db: dbProfile }),
      });

      const payload = await res.json();

      const raw = payload?.recordset || [];

      setMonthData(
        raw.map((row: any) => ({
          name: row.MonthName,
          ยอดA: Number(row.TotalA || 0),
        }))
      );
    } catch (error) {
      console.error(error);
      setMonthData([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBarClick = (item: any) => {
    setSelectedCustomer(item.name);
    setShowDetail(true);
    fetchMonthly(item.name);
  };

  const COLORS = ["#2563eb", "#f97316", "#22c55e"];

  const total = data.reduce((sum, item) => sum + item.ยอดA, 0);
  const topCustomer = data[0];

  const yearOptions = Array.from(
    { length: 6 },
    (_, i) => today.getFullYear() - i
  );

  const MainChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 30, right: 20, left: 35, bottom: 45 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

        <XAxis
          dataKey="name"
          angle={-12}
          textAnchor="end"
          interval={0}
          height={60}
        />

        <YAxis
          width={75}
          tickFormatter={(v) =>
            Number(v).toLocaleString()
          }
        />

        <Tooltip
          formatter={(v: any) => [
            Number(v).toLocaleString(),
            "ยอด A",
          ]}
        />

        <Bar
          dataKey="ยอดA"
          radius={[10, 10, 0, 0]}
          onClick={handleBarClick}
          cursor="pointer"
        >
          {data.map((_: any, index: number) => (
            <Cell
              key={index}
              fill={COLORS[index % COLORS.length]}
            />
          ))}

          <LabelList
            dataKey="ยอดA"
            position="top"
            formatter={(v: any) =>
              Number(v).toLocaleString()
            }
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const DetailChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={monthData}
        margin={{ top: 20, right: 20, left: 20, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

        <XAxis dataKey="name" />

        <YAxis
          tickFormatter={(v) =>
            Number(v).toLocaleString()
          }
        />

        <Tooltip
          formatter={(v: any) => [
            Number(v).toLocaleString(),
            "ยอด A",
          ]}
        />

        <Line
          type="monotone"
          dataKey="ยอดA"
          stroke="#2563eb"
          strokeWidth={4}
          dot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <>
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl border shadow-xl p-6 relative">

        <button
          onClick={() => setIsFullscreen(true)}
          className="absolute top-5 right-5 p-2 rounded-xl border hover:bg-white"
        >
          <Maximize2 size={18} />
        </button>

        <div className="flex justify-between items-start mb-6 pr-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="text-yellow-500" size={20} />
              <h3 className="text-2xl font-bold">
                Top 3 ลูกค้า (ยอด A)
              </h3>
            </div>

            <p className="text-sm text-slate-500">
              คลิกแท่งกราฟเพื่อดูรายเดือน
            </p>
          </div>

          <div className="bg-white border rounded-xl px-3 py-2">
            <select
              value={selectedYear}
              onChange={(e) =>
                setSelectedYear(Number(e.target.value))
              }
            >
              {yearOptions.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-white rounded-2xl p-4 border">
            <p className="text-sm text-slate-500">ยอดรวม Top 3</p>
            <p className="text-2xl font-bold text-blue-600">
              {total.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border">
            <p className="text-sm text-slate-500">อันดับ 1</p>
            <p className="font-bold text-amber-600 flex gap-2 items-center">
              <Crown size={18} />
              {topCustomer?.name || "-"}
            </p>
          </div>
        </div>

        <div className="h-[390px]">
          {loading ? (
            <div className="h-full flex justify-center items-center">
              Loading...
            </div>
          ) : (
            <MainChart />
          )}
        </div>

        <div className="mt-4 text-xs text-slate-500 flex gap-2 items-center">
          <TrendingUp size={14} />
          Dashboard Drill Down Analysis
        </div>
      </div>

      {showDetail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-6">
          <div className="bg-white rounded-3xl w-full max-w-5xl h-[80vh] shadow-2xl flex flex-col">

            <div className="border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <BarChart3 size={20} />
                  {selectedCustomer}
                </h3>

                <p className="text-sm text-slate-500">
                  ยอด A รายเดือน ปี {selectedYear}
                </p>
              </div>

              <button
                onClick={() => setShowDetail(false)}
                className="p-2 rounded-xl hover:bg-slate-100"
              >
                <X />
              </button>
            </div>

            <div className="flex-1 p-6">
              {detailLoading ? (
                <div className="h-full flex justify-center items-center">
                  Loading...
                </div>
              ) : (
                <DetailChart />
              )}
            </div>
          </div>
        </div>
      )}

      {isFullscreen && (
        <div className="fixed inset-0 bg-black/60 z-40 flex justify-center items-center p-6">
          <div className="bg-white rounded-3xl w-full max-w-7xl h-[92vh] p-6 relative">
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4"
            >
              <X />
            </button>

            <MainChart />
          </div>
        </div>
      )}
    </>
  );
}