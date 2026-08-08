import { useState, useEffect, useCallback } from "react";
import { FlaskConical, Calendar, RefreshCw } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { QualitySection } from "./QualitySection";
import { toDateStr } from "./KilnDashboardStyles";
import type { QualityRecord, WeeklyQualityRecord } from "./KilnDashboardStyles";
import {
  queryDB,
  buildQualitySQL,
  buildWeeklyQualitySQL,
  mapWeeklyQualityRows,
} from "./kilnApi";

export default function KilnQuality() {
  const [startDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
  });
  const [endDate] = useState(() => toDateStr(new Date()));

  const [qualityData, setQualityData] = useState<QualityRecord[]>([]);
  const [weeklyQuality, setWeeklyQuality] = useState<WeeklyQualityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [qualityRows, weeklyRows] = await Promise.all([
        queryDB(buildQualitySQL(startDate, endDate), "sorting"),
        queryDB(buildWeeklyQualitySQL(endDate), "sorting"),
      ]);
      setQualityData(qualityRows);
      setWeeklyQuality(mapWeeklyQualityRows(weeklyRows));
    } catch (err: unknown) {
      console.error("Kiln Quality fetch error:", err);
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการดึงข้อมูล");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div className="min-h-screen flex w-full bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-y-auto min-w-0">
        <DashboardHeader />

        <div className="px-6 pt-4 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FlaskConical className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground leading-tight">Kiln Quality</h1>
                <p className="text-xs text-muted-foreground">Year-to-date quality monitoring</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded-lg border border-border">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {startDate} → {endDate}
                </span>
              </div>
              <button
                onClick={fetchAll}
                disabled={loading}
                className="p-1.5 rounded-lg bg-muted border border-border hover:bg-accent transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">กำลังโหลดข้อมูล...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-destructive font-semibold mb-2">เกิดข้อผิดพลาด</p>
                <p className="text-sm text-muted-foreground mb-3">{error}</p>
                <button onClick={fetchAll} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">
                  ลองใหม่
                </button>
              </div>
            </div>
          ) : (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🔬</span>
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Quality</h2>
                <div className="flex-1 h-px bg-border" />
              </div>
              <QualitySection rawData={qualityData} weeklyData={weeklyQuality} />
            </section>
          )}
        </div>
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.35s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
