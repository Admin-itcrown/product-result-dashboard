import React, { useState, useEffect } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

/* ================================
   Hook: Fetch Formming Stats
================================ */
export function useFetchFormmingStats(
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
      const dbProfile = "formming";
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
          WHERE [Date] BETWEEN '${formattedStart}' AND '${formattedEnd}'
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
          WHERE [Date] BETWEEN '${formattedStart}' AND '${formattedEnd}'
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
interface StatCardFormmProps {
  title: string;
  value: string;
  change?: string;
  scrap?: string;
  scrapPercent?: string;
}

export function StatCardFormm({
  title,
  value,
  change,
  scrap,
  scrapPercent,
}: StatCardFormmProps) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition">
      <div>
        <p className="text-xl font-semibold text-blue-700">{title}</p>

        <p className="text-3xl font-bold mt-2 text-slate-800">{value}</p>

        {change && (
          <div className="flex items-center gap-1 mt-3 text-green-600 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />
            <span>ยอด A {change}</span>
          </div>
        )}

        {scrap && (
          <div className="flex items-center gap-1 mt-1 text-red-600 text-sm font-medium">
            <X className="h-4 w-4" />
            <span>
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
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4 mt-5">
      {data.map((item, index) => (
        <div
          key={index}
          className="rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition"
        >
          <div className="mb-3">
            <p className="text-sm font-medium text-slate-500">
              Line Code
            </p>

            <p className="text-2xl font-bold text-blue-700">
              {item.LineCode}
            </p>
          </div>

          <div className="space-y-1 text-sm font-medium">
            <p className="text-slate-700">
              Proc : {Number(item.TotalQtyProc).toLocaleString()}
            </p>

            <p className="text-green-600">
              ยอด A : {Number(item.TotalQtyMoved).toLocaleString()}
            </p>

            <p className="text-red-600">
              Scrap : {Number(item.TotalQtyScrap).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}