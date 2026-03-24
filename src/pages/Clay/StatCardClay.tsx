import React, { useState, useEffect } from "react";
import { LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

/* ================================
   Hook: Fetch Clay Stats
================================ */
export function useFetchClayStats(
  startDate: Date | undefined,
  endDate: Date | undefined
) {
  const [statsData, setStatsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!startDate || !endDate) return;

    const fetchData = async () => {
      const dbProfile = "clay";
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

        const query = `
          SELECT 
            Wkctr,
            SUM(CASE 
                  WHEN [QtyProc] BETWEEN 0 AND 9999 
                  THEN [QtyProc] 
                END) AS SUM_QtyProc
          FROM test_trans
          WHERE [Date] BETWEEN '${formattedStart}' AND '${formattedEnd}'
          GROUP BY Wkctr
        `;

        const response = await fetch(`${apiBase}/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, db: dbProfile }),
        });

        const payload = await response.json();
        setStatsData(payload?.recordset || []);
      } catch (err) {
        console.error("Fetch error:", err);
        setStatsData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  return { statsData, loading };
}

/* ================================
   Stat Card Component
================================ */

interface StatCardClayProps {
  title: string;
  value: string;
  change?: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  delay?: number;
  className?: string;
  valueClassName?: string;
  titleClassName?: string;
}

export function StatCardClay({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  delay = 0,
  className = "",
  valueClassName = "",
  titleClassName = "",
}: StatCardClayProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-6 shadow-sm transition-all duration-300",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
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
            <p
              className={cn(
                "text-sm mt-1 font-medium",
                changeType === "positive" && "text-green-600",
                changeType === "negative" && "text-red-600",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              ยอด A {change}
            </p>
          )}
        </div>

        <div className="h-12 w-12 rounded-lg bg-accent flex items-center justify-center">
          <Icon className="h-6 w-6 text-accent-foreground" />
        </div>
      </div>
    </div>
  );
}