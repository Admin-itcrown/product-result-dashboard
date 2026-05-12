import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import {
  Maximize2,
  X,
  Factory,
  PackageCheck,
  PackageX,
  Boxes,
} from "lucide-react";

import { useFetchFinishingStats } from "./StatCardfinishing";

export function ProductChartfinishing({ startDate, endDate }: any) {

  const [monthData, setMonthData] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { statsData, totals, loading } =
    useFetchFinishingStats(startDate, endDate);

  /* =========================
     SMOOTH GROUPING (MEMO)
  ========================= */
  const data = useMemo(() => {
    if (!statsData) return [];

    const grouped: any = {};

    statsData.forEach((row: any) => {
      const key = row.Line?.substring(2, 5);

      if (!grouped[key]) {
        grouped[key] = {
          name: key,
          QtyProc: 0,
          QtyMoved: 0,
          QtyScrap: 0,
        };
      }

      grouped[key].QtyProc += Number(row.TotalQtyProc || 0);
      grouped[key].QtyMoved += Number(row.TotalQtyMoved || 0);
      grouped[key].QtyScrap += Number(row.TotalQtyScrap || 0);
    });

    return Object.values(grouped);
  }, [statsData]);

  /* =========================
     KPI %
  ========================= */
  const movedPct =
    totals.totalQtyProc
      ? (totals.totalQtyMoved / totals.totalQtyProc) * 100
      : 0;

  const scrapPct =
    totals.totalQtyProc
      ? (totals.totalQtyScrap / totals.totalQtyProc) * 100
      : 0;

  /* =========================
     TOOLTIP (LIGHTWEIGHT)
  ========================= */
  const formatNumber = (v: any) =>
    Number(v || 0).toLocaleString();

  /* =========================
     CHART (SMOOTH)
  ========================= */
  const Chart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        key={isFullscreen ? "fs" : "normal"}
        margin={{ top: 20, right: 30, left: 80, bottom: 40 }}
      >

        <CartesianGrid strokeDasharray="3 3" opacity={0.4} />

        <XAxis dataKey="name" />

        <YAxis width={100} />

        <Tooltip
          formatter={(v) => formatNumber(v)}
          animationDuration={200}
        />

        <Legend />

        {/* SMOOTH BARS */}
        <Bar
          dataKey="QtyProc"
          fill="#2563eb"
          radius={[10, 10, 0, 0]}
          isAnimationActive={true}
          animationDuration={600}
        />

        <Bar
          dataKey="QtyMoved"
          fill="#22c55e"
          radius={[10, 10, 0, 0]}
          isAnimationActive={true}
          animationDuration={600}
        />

        <Bar
          dataKey="QtyScrap"
          fill="#ef4444"
          radius={[10, 10, 0, 0]}
          isAnimationActive={true}
          animationDuration={600}
        />

      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <>
      {/* CARD */}
      <div className="bg-white rounded-3xl border shadow-xl p-6 relative">

        <button
          onClick={() => setIsFullscreen(true)}
          className="absolute top-4 right-4 p-2 bg-white border rounded-xl shadow z-10"
        >
          <Maximize2 size={18} />
        </button>

        {/* HEADER */}
        <div className="mb-4 flex items-center gap-2">
          <Factory className="text-blue-600" />
          <h3 className="text-xl font-bold">
            Finishing Production Analysis
          </h3>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-3 gap-4 mb-4">

          <div className="bg-blue-50 p-4 rounded-2xl">
            <Boxes className="text-blue-600 mb-1" />
            <div className="text-sm">QtyProc</div>
            <div className="text-xl font-bold">
              {formatNumber(totals.totalQtyProc)}
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-2xl">
            <PackageCheck className="text-green-600 mb-1" />
            <div className="text-sm">QtyMoved</div>
            <div className="text-xl font-bold">
              {formatNumber(totals.totalQtyMoved)}
            </div>
            <div className="text-sm text-green-600">
              {movedPct.toFixed(1)}%
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-2xl">
            <PackageX className="text-red-500 mb-1" />
            <div className="text-sm">QtyScrap</div>
            <div className="text-xl font-bold">
              {formatNumber(totals.totalQtyScrap)}
            </div>
            <div className="text-sm text-red-500">
              {scrapPct.toFixed(1)}%
            </div>
          </div>

        </div>

        {/* CHART */}
        <div className="h-[520px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              Loading...
            </div>
          ) : (
            <Chart />
          )}
        </div>

      </div>

      {/* FULLSCREEN (SMOOTH FIX) */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">

          <div className="bg-white w-full h-[92vh] rounded-3xl relative overflow-hidden">

            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 p-3 bg-white rounded-xl shadow z-10"
            >
              <X size={26} />
            </button>

            <div className="h-full p-6">
              <Chart />
            </div>

          </div>
        </div>
      )}
    </>
  );
}