import React, { useState, useEffect } from "react";
import { LucideIcon, X, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

/* ================================
   Hook: Fetch Glaze Stats
================================ */
export function useFetchGlazebyGroupStats(
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
      const dbProfile = "glaze";
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
            LEFT(ig.code_cmmt1, 3) AS ItemGroup,
            SUM(g.QtyProc) AS TotalQtyProc,
            SUM(g.QtyMoved) AS TotalQtyMoved,
            SUM(g.QtyScrap) AS TotalQtyScrap
          FROM [Db_glaze].[dbo].[glaze_trans] AS g
          LEFT JOIN [Db_glaze].[dbo].[pt_mstr] AS p
            ON g.Item = p.pt_part
          LEFT JOIN [Db_glaze].[dbo].[itemgroup] AS ig
            ON p.pt_group = ig.code_value1
          WHERE g.[Date] BETWEEN '${formattedStart}' AND '${formattedEnd}'
            AND g.[OP] = 10
            AND g.[Type] = 'BACKFLSH'
          GROUP BY
            LEFT(ig.code_cmmt1, 3)
          ORDER BY
            ItemGroup
        `;

        const mainResponse = await fetch(`${apiBase}/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: mainQuery, db: dbProfile }),
        });

        const mainPayload = await mainResponse.json();
        const records = mainPayload?.recordset || [];
        setStatsData(records);

        const totalQtyProc = records.reduce(
          (sum: number, item: any) => sum + Number(item.TotalQtyProc ?? 0),
          0
        );
        const totalQtyScrap = records.reduce(
          (sum: number, item: any) => sum + Number(item.TotalQtyScrap ?? 0),
          0
        );
        setTotals({ totalQtyProc, totalQtyScrap });

        const classifyGroup = (groupName: string) => {
          const normalized = (groupName || "").toUpperCase();
          if (normalized.includes("SOL")) return "solid";
          if (normalized.includes("TWO") || normalized.includes("TWOTON")) return "twoton";
          return "others";
        };

        const groupedTotals = {
          solid: { totalQtyProc: 0, totalQtyScrap: 0 },
          twoton: { totalQtyProc: 0, totalQtyScrap: 0 },
          others: { totalQtyProc: 0, totalQtyScrap: 0 },
        };

        records.forEach((item: any) => {
          const categoryKey = classifyGroup(String(item.ItemGroup || item.Line || "")) as keyof typeof groupedTotals;
          groupedTotals[categoryKey].totalQtyProc += Number(item.TotalQtyProc ?? 0);
          groupedTotals[categoryKey].totalQtyScrap += Number(item.TotalQtyScrap ?? 0);
        });

        setCategoryTotals(groupedTotals);
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

interface StatCardGlazebyGroupProps {
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

export function StatCardGlazebyGroup({
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
}: StatCardGlazebyGroupProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border bg-card p-4 shadow-sm transition-all duration-300",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <p
            className={cn(
              "text-xs font-medium text-muted-foreground",
              titleClassName
            )}
          >
            {title}
          </p>

          <p
            className={cn(
              "text-2xl font-semibold mt-1",
              valueClassName
            )}
          >
            {value}
          
          </p>

          {change !== undefined && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs mt-1 font-medium",
                changeType === "positive" && "text-green-600",
                changeType === "negative" && "text-red-600",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>
                ยอด A {change}
                {changePercent && (
                  <span className="text-muted-foreground"> ({changePercent})</span>
                )}
              </span>
            </div>
          )}

          {scrap !== undefined && (
            <div className="flex items-center gap-1 text-xs mt-1 font-medium text-red-600">
              <X className="h-3.5 w-3.5" />
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

      <div className="absolute right-3 top-3 h-9 w-9 rounded-lg bg-accent flex items-center justify-center">
        <Icon className="h-4.5 w-4.5 text-accent-foreground" />
      </div>
    </div>
  );
}