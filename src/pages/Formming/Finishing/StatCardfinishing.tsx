import React, { useState, useEffect } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

/* ================================
   Hook: Fetch Finishing Stats
================================ */
export function useFetchFinishingStats(
  startDate: Date | undefined,
  endDate: Date | undefined
) {
  const [statsData, setStatsData] = useState<any[]>([]);
  const [lineSummary, setLineSummary] = useState<any[]>([]);
  const [totals, setTotals] = useState({
    totalQtyProc: 0,
    totalQtyScrap: 0,
    totalQtyMoved: 0,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!startDate || !endDate) return;

    const fetchData = async () => {
      const dbProfile = "finishing";
      const envApi = (import.meta as any)?.env?.VITE_API_URL;

      const apiBase =
        envApi ||
        (typeof window !== "undefined"
          ? `${window.location.protocol}//${window.location.hostname}:3001`
          : "http://localhost:3001");

      setLoading(true);

      try {
        const formattedStart = format(startDate, "yyyy-MM-dd");
        const formattedEnd = format(endDate, "yyyy-MM-dd");

        const mainQuery = `
          SELECT 
            [Line],
            SUM([QtyProc]) AS TotalQtyProc,
            SUM([QtyMoved]) AS TotalQtyMoved,
            SUM([QtyScrap]) AS TotalQtyScrap
          FROM [Db_Formming].[dbo].[Formm_trans]
          WHERE [Date] BETWEEN '${formattedStart}' AND '${formattedEnd}' AND [OP] = 20
          GROUP BY [Line]
          ORDER BY [Line]
        `;

        const lineCodeQuery = `
          SELECT 
            SUBSTRING([Line],3,3) AS LineCode,
            SUM([QtyProc])  AS TotalQtyProc,
            SUM([QtyMoved]) AS TotalQtyMoved,
            SUM([QtyScrap]) AS TotalQtyScrap
          FROM [Db_Formming].[dbo].[Formm_trans]
          WHERE [Date] BETWEEN '${formattedStart}' AND '${formattedEnd}' AND [OP] = 20
          GROUP BY SUBSTRING([Line],3,3)
          ORDER BY LineCode
        `;

        const [mainResponse, lineResponse] = await Promise.all([
          fetch(`${apiBase}/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: mainQuery, db: dbProfile }),
          }),

          fetch(`${apiBase}/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: lineCodeQuery, db: dbProfile }),
          }),
        ]);

        const mainPayload = await mainResponse.json();
        const linePayload = await lineResponse.json();

        const records = mainPayload?.recordset || [];
        const lineRecords = linePayload?.recordset || [];

        setStatsData(records);
        setLineSummary(lineRecords);

        const totalQtyProc = records.reduce(
          (sum: number, item: any) => sum + Number(item.TotalQtyProc ?? 0),
          0
        );

        const totalQtyMoved = records.reduce(
          (sum: number, item: any) => sum + Number(item.TotalQtyMoved ?? 0),
          0
        );

        const totalQtyScrap = records.reduce(
          (sum: number, item: any) => sum + Number(item.TotalQtyScrap ?? 0),
          0
        );

        setTotals({
          totalQtyProc,
          totalQtyMoved,
          totalQtyScrap,
        });
      } catch (err) {
        console.error(err);
        setStatsData([]);
        setLineSummary([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  return {
    statsData,
    lineSummary,
    totals,
    loading,
  };
}

/* ================================
   Stat Card
================================ */
interface StatCardFinishingProps {
  title: string;
  value: string;
  change?: string;
  aPercent?: string;
  scrap?: string;
  scrapPercent?: string;
}

export function StatCardFinishing({
  title,
  value,
  change,
  aPercent,
  scrap,
  scrapPercent,
}: StatCardFinishingProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50 p-4 shadow-sm shadow-slate-200/40 transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
          {title}
        </p>
        <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">
          {value}
        </p>
      </div>

      <div className="mt-4 space-y-2 text-sm font-medium">
        {change && (
          <div className="flex items-center gap-2 rounded-2xl bg-sky-50 px-3 py-2 text-sky-800 shadow-sm shadow-sky-100/80">
            <CheckCircle2 className="h-4 w-4 text-sky-600" />
            <span className="text-sm">
              ยอด A {change}
              {aPercent ? ` (${aPercent})` : ""}
            </span>
          </div>
        )}

        {scrap !== undefined && scrap !== "" && (
          <div className="flex items-center gap-2 rounded-2xl bg-rose-50 px-3 py-2 text-rose-800 shadow-sm shadow-rose-100/80">
            <X className="h-4 w-4 text-rose-600" />
            <span className="text-sm">
              Scrap {scrap}
              {scrapPercent ? ` (${scrapPercent})` : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================
   LineCode Blocks
================================ */
export function LineCodeBlocks({ data }: { data: any[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4 mt-5">
      {data.map((item, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm shadow-slate-200/40 transition duration-300 hover:-translate-y-1 hover:shadow-md"
        >
          <div className="bg-slate-100 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Line Code
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {item.LineCode}
            </p>
          </div>

          <div className="space-y-3 px-5 py-5 text-sm text-slate-700">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3">
              <span className="font-medium text-slate-600">Proc</span>
              <span className="font-semibold text-slate-900">
                {Number(item.TotalQtyProc).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-sky-50 px-3 py-3 text-sky-700">
              <span className="font-medium">ยอด A</span>
              <span className="font-semibold">
                {Number(item.TotalQtyMoved).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-rose-50 px-3 py-3 text-rose-700">
              <span className="font-medium">Scrap</span>
              <span className="font-semibold">
                {Number(item.TotalQtyScrap).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}