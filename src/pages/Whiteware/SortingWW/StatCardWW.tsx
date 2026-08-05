import React, { useState, useEffect } from "react";
import { LucideIcon, X, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

/* ================================
   Hook: Fetch Glaze Stats
================================ */
export function useFetchSortWWStats(
  startDate: Date | undefined,
  endDate: Date | undefined
) {
  const [statsData, setStatsData] = useState<any[]>([]);
  const [totals, setTotals] = useState({ totalQtyProc: 0, totalQtyScrap: 0 });
  const [categoryTotals, setCategoryTotals] = useState({
    solid: { totalQtyProc: 0, totalQtyScrap: 0 },
    twoton: { totalQtyProc: 0, totalQtyScrap: 0 },
    others: { totalQtyProc: 0, totalQtyScrap: 0 },
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!startDate || !endDate) return;

    const fetchData = async () => {
      const dbProfile = "mold";
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

        // Main query - all lines grouped
        const mainQuery = `
  SELECT 
    [Line],
    SUM([QtyProc]) AS TotalQtyProc,
    SUM([QtyScrap]) AS TotalQtyScrap,
    SUM([QtyMoved]) AS TotalQtyMoved
  FROM [Db_mold].[dbo].[mold_trans]
  WHERE [Date] BETWEEN '${formattedStart}' AND '${formattedEnd}'  AND [Type] = 'BACKFLSH'
  GROUP BY [Line]
  ORDER BY [Line]
`;

        // Query for SOLID
        const solidQuery = `
          SELECT 
            SUM([QtyProc]) AS TotalQtyProc,
            SUM([QtyScrap]) AS TotalQtyScrap,
            SUM([QtyMoved]) AS TotalQtyMoved
          FROM [Db_mold].[dbo].[mold_trans]
          WHERE [Line] LIKE '42SOLID'
          AND [Date] BETWEEN '${formattedStart}' AND '${formattedEnd}' AND [Type] = 'BACKFLSH'
          ORDER BY [Line]
        `;

        // Query for TWOTONE
        const twotonQuery = `
          SELECT 
            SUM([QtyProc]) AS TotalQtyProc,
            SUM([QtyScrap]) AS TotalQtyScrap,
            SUM([QtyMoved]) AS TotalQtyMoved
          FROM [Db_mold].[dbo].[mold_trans]
          WHERE [Line] LIKE '42TWOTON'
          AND [Date] BETWEEN '${formattedStart}' AND '${formattedEnd}' AND [Type] = 'BACKFLSH'
          ORDER BY [Line]
        `;

        // Query for OTHERS
        const othersQuery = `
          SELECT 
            SUM([QtyProc]) AS TotalQtyProc,
            SUM([QtyScrap]) AS TotalQtyScrap,
            SUM([QtyMoved]) AS TotalQtyMoved
          FROM [Db_mold].[dbo].[mold_trans]
          WHERE [Line] NOT LIKE '42SOLID'
          AND [Line] NOT LIKE '42TWOTON'
          AND [Date] BETWEEN '${formattedStart}' AND '${formattedEnd}'  AND [Type] = 'BACKFLSH'
          ORDER BY [Line]
        `;
        // Fetch all queries in parallel
        const [mainResponse, solidResponse, twotonResponse, othersResponse] = await Promise.all([
          fetch(`${apiBase}/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: mainQuery, db: dbProfile }),
          }),
          fetch(`${apiBase}/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: solidQuery, db: dbProfile }),
          }),
          fetch(`${apiBase}/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: twotonQuery, db: dbProfile }),
          }),
          fetch(`${apiBase}/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: othersQuery, db: dbProfile }),
          }),
        ]);

        const mainPayload = await mainResponse.json();
        const solidPayload = await solidResponse.json();
        const twotonPayload = await twotonResponse.json();
        const othersPayload = await othersResponse.json();

        const records = mainPayload?.recordset || [];
        setStatsData(records);

        // Calculate overall totals
        const totalQtyProc = records.reduce(
          (sum: number, item: any) => sum + Number(item.TotalQtyProc ?? 0),
          0
        );
        const totalQtyScrap = records.reduce(
          (sum: number, item: any) => sum + Number(item.TotalQtyScrap ?? 0),
          0
        );
        setTotals({ totalQtyProc, totalQtyScrap });

        // Set category totals
        const solidData = solidPayload?.recordset?.[0] || {};
        const twotonData = twotonPayload?.recordset?.[0] || {};
        const othersData = othersPayload?.recordset?.[0] || {};

        setCategoryTotals({
          solid: {
            totalQtyProc: Number(solidData.TotalQtyProc ?? 0),
            totalQtyScrap: Number(solidData.TotalQtyScrap ?? 0),
          },
          twoton: {
            totalQtyProc: Number(twotonData.TotalQtyProc ?? 0),
            totalQtyScrap: Number(twotonData.TotalQtyScrap ?? 0),
          },
          others: {
            totalQtyProc: Number(othersData.TotalQtyProc ?? 0),
            totalQtyScrap: Number(othersData.TotalQtyScrap ?? 0),
          },
        });
      } catch (err) {
        console.error("Fetch error:", err);
        setStatsData([]);
        setTotals({ totalQtyProc: 0, totalQtyScrap: 0 });
        setCategoryTotals({
          solid: { totalQtyProc: 0, totalQtyScrap: 0 },
          twoton: { totalQtyProc: 0, totalQtyScrap: 0 },
          others: { totalQtyProc: 0, totalQtyScrap: 0 },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  return { statsData, totals, categoryTotals, loading };
}

/* ================================
   Stat Card Component
================================ */

interface StatCardWWProps {
  title: string;
  value: string;
  valuePercent?: string;
  change?: string;
  changePercent?: string;
  changeType: "positive" | "negative" | "neutral";
  scrap?: string;
  scrapPercent?: string;
  scrapType : "positive" | "negative" | "neutral";
  icon: LucideIcon;
  delay?: number;
  className?: string;
  valueClassName?: string;
  titleClassName?: string;
}

export function StatCardWW({
  title,
  value,
  valuePercent,
  change,
  changePercent,
  changeType,
  scrap,
  scrapPercent,
  scrapType,
  icon: Icon,
  delay = 0,
  className = "",
  valueClassName = "",
  titleClassName = "",
}: StatCardWWProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border bg-card p-6 shadow-sm transition-all duration-300",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <p
            className={cn(
              "text-sm font-medium text-muted-foreground",
              titleClassName
            )}
          >
            {title}
          </p>

          <p
            className={cn(
              "text-3xl font-semibold mt-1",
              valueClassName
            )}
          >
            {value}
          
          </p>

          {change !== undefined && (
            <div
              className={cn(
                "flex items-center gap-1 text-sm mt-1 font-medium",
                changeType === "positive" && "text-green-600",
                changeType === "negative" && "text-red-600",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                ยอด A {change}
                {changePercent && (
                  <span className="text-muted-foreground"> ({changePercent})</span>
                )}
              </span>
            </div>
          )}

          {scrap !== undefined && (
            <div className="flex items-center gap-1 text-sm mt-1 font-medium text-red-600">
              <X className="h-4 w-4" />
              <span>
                Scrap {scrap}
                {scrapPercent && (
                  <span className="text-muted-foreground"> ({scrapPercent})</span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="absolute right-4 top-4 h-12 w-12 rounded-lg bg-accent flex items-center justify-center">
        <Icon className="h-6 w-6 text-accent-foreground" />
      </div>
    </div>
  );
}