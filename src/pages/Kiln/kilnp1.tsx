import { useState, useEffect, useMemo, useCallback } from "react";
import { Flame, Calendar, RefreshCw } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { cn } from "@/lib/utils";
import { toDateStr } from "./KilnDashboardStyles";
import type { GlazeProductionRecord } from "./KilnDashboardStyles";
import {
  queryDB,
  buildGlazeKilnSQL,
  transformGlazeKilnData,
  fetchInGlazeData,
} from "./kilnApi";
import {
  GlazeKpiStrip,
  ClayRatioPanel,
  FireRatioPanel,
  PieceShapePanel,
  KilnFiringTable,
} from "./GlazeProductionPanels";
import { type InGlazePayload } from "./InGlazePanel";

type PeriodMode = "Daily" | "Weekly" | "Monthly";

function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Display yyyy-mm-dd as dd-mm-yyyy */
function formatDMY(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

function getISOWeek(iso: string): number {
  const source = parseDateOnly(iso);
  const date = new Date(Date.UTC(source.getFullYear(), source.getMonth(), source.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeekLabel(start: string, end: string): string {
  const startWeek = getISOWeek(start);
  const endWeek = getISOWeek(end);
  return startWeek === endWeek ? `W${startWeek}` : `W${startWeek}–W${endWeek}`;
}

function lastDayOfMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

/** Default ranges anchored on today */
function getDefaultRange(period: PeriodMode, today = new Date()): { start: string; end: string } {
  const end = toDateStr(today);
  if (period === "Daily") {
    return { start: end, end };
  }
  if (period === "Monthly") {
    const start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    return { start, end };
  }
  // Weekly: last 7 days inclusive (today - 6 → today)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  start.setDate(start.getDate() - 6);
  return { start: toDateStr(start), end };
}

function monthKeyFromIso(iso: string): string {
  return iso.slice(0, 7); // yyyy-mm
}

function rangeFromMonthKey(ym: string, todayIso: string): { start: string; end: string } {
  const [y, m] = ym.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const last = lastDayOfMonth(y, m - 1);
  const monthEnd = `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  // If selected month is current month, end at today
  const end = monthEnd > todayIso ? todayIso : monthEnd;
  return { start, end };
}

function periodTitle(period: PeriodMode): string {
  if (period === "Daily") return "Daily";
  if (period === "Monthly") return "Monthly";
  return "Weekly";
}

const dateInputClass =
  "h-7 rounded-md border border-border bg-background px-1.5 text-[11px] text-foreground tabular-nums focus:outline-none focus:ring-1 focus:ring-primary";

export default function KilnP1() {
  const todayIso = toDateStr(new Date());
  const [period, setPeriod] = useState<PeriodMode>("Weekly");
  const [startDate, setStartDate] = useState(() => getDefaultRange("Weekly").start);
  const [endDate, setEndDate] = useState(() => getDefaultRange("Weekly").end);
  const [productionData, setProductionData] = useState<GlazeProductionRecord[]>([]);
  const [inGlaze, setInGlaze] = useState<InGlazePayload | null>(null);
  const [inGlazeError, setInGlazeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyPeriodDefaults = useCallback((mode: PeriodMode) => {
    const range = getDefaultRange(mode);
    setStartDate(range.start);
    setEndDate(range.end);
  }, []);

  const handlePeriodChange = (mode: PeriodMode) => {
    setPeriod(mode);
    applyPeriodDefaults(mode);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setInGlazeError(null);
    try {
      const rangeStart = startDate <= endDate ? startDate : endDate;
      const rangeEnd = startDate <= endDate ? endDate : startDate;

      const [rows, inGlazeData] = await Promise.all([
        queryDB(buildGlazeKilnSQL(rangeStart, rangeEnd), "kiln"),
        fetchInGlazeData(rangeStart, rangeEnd, true).catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          setInGlazeError(msg);
          return null;
        }),
      ]);

      setProductionData(transformGlazeKilnData(rows));
      if (inGlazeData?.ok) setInGlaze(inGlazeData);
      else setInGlaze(null);
    } catch (err: unknown) {
      console.error("Kiln Production fetch error:", err);
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการดึงข้อมูล");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const totals = useMemo(() => {
    let total = 0;
    const white = { total: 0, glaze: 0, repair: 0 };
    const black = { total: 0, glaze: 0, repair: 0 };
    for (const r of productionData) {
      total += r.qtyProc;
      const bucket = r.clayKind === "white" ? white : r.clayKind === "black" ? black : null;
      if (!bucket) continue;
      bucket.total += r.qtyProc;
      if (r.fireKind === "glaze") bucket.glaze += r.qtyProc;
      else bucket.repair += r.qtyProc;
    }
    return { total, white, black };
  }, [productionData]);

  const dayCount = useMemo(() => {
    const start = parseDateOnly(startDate <= endDate ? startDate : endDate);
    const end = parseDateOnly(startDate <= endDate ? endDate : startDate);
    const diff = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    return Math.max(1, diff);
  }, [startDate, endDate]);

  const rangeLabel =
    startDate === endDate
      ? formatDMY(startDate)
      : `${formatDMY(startDate)} → ${formatDMY(endDate)}`;
  const weekLabel = getWeekLabel(startDate, endDate);

  return (
    <div className="min-h-screen flex w-full bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-y-auto min-w-0">
        <DashboardHeader />

        <div className="px-6 pt-4 pb-3 border-b border-border">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Flame className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground leading-tight">
                  Kiln Production · Glost & Decorated
                </h1>
                <p className="text-xs text-muted-foreground">
                  Glost (142) + Decorations (In-Glaze จาก Google Sheet)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-md border border-border overflow-hidden">
                {(["Daily", "Weekly", "Monthly"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handlePeriodChange(mode)}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-medium transition-colors",
                      period === mode
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-lg border border-border flex-wrap">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

                {period === "Daily" && (
                  <input
                    type="date"
                    value={endDate}
                    max={todayIso}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) return;
                      setStartDate(v);
                      setEndDate(v);
                    }}
                    className={dateInputClass}
                    title={formatDMY(endDate)}
                  />
                )}

                {period === "Weekly" && (
                  <>
                    <input
                      type="date"
                      value={startDate}
                      max={endDate}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return;
                        setStartDate(v);
                        if (v > endDate) setEndDate(v);
                      }}
                      className={dateInputClass}
                      title={formatDMY(startDate)}
                    />
                    <span className="text-[10px] text-muted-foreground">→</span>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      max={todayIso}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return;
                        setEndDate(v);
                        if (v < startDate) setStartDate(v);
                      }}
                      className={dateInputClass}
                      title={formatDMY(endDate)}
                    />
                  </>
                )}

                {period === "Monthly" && (
                  <input
                    type="month"
                    value={monthKeyFromIso(startDate)}
                    max={monthKeyFromIso(todayIso)}
                    onChange={(e) => {
                      const ym = e.target.value;
                      if (!ym) return;
                      const range = rangeFromMonthKey(ym, todayIso);
                      setStartDate(range.start);
                      setEndDate(range.end);
                    }}
                    className={dateInputClass}
                    title={rangeLabel}
                  />
                )}

                <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap pl-0.5">
                  {rangeLabel}
                </span>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary whitespace-nowrap">
                  {weekLabel}
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
            <section className="space-y-5">
              <div className="flex items-center gap-2">
                <span className="text-base">🔥</span>
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Glost & Decorated
                </h2>
                <div className="flex-1 h-px bg-border" />
              </div>

              <GlazeKpiStrip
                total={totals.total}
                white={totals.white}
                black={totals.black}
                periodLabel={periodTitle(period)}
                decorations={
                  inGlaze
                    ? {
                        total: inGlaze.total,
                        avgPerDay: inGlaze.avgPerDay,
                      }
                    : null
                }
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ClayRatioPanel data={productionData} />
                <FireRatioPanel data={productionData} />
                <PieceShapePanel data={productionData} />
              </div>

              <KilnFiringTable
                data={productionData}
                dayCount={dayCount}
                planDayCount={period === "Weekly" ? 7 : period === "Daily" ? 1 : dayCount}
                startDate={startDate}
                endDate={endDate}
                periodLabel={periodTitle(period)}
                decorationsByKiln={
                  inGlaze?.kilnSummary?.map((k) => ({ kiln: k.kiln, total: k.total })) ?? []
                }
                decorationsDaily={
                  inGlaze?.rows?.map((row) => ({
                    date: row.date,
                    kiln: row.kiln,
                    total: row.total,
                  })) ?? []
                }
              />

              {inGlazeError && (
                <p className="text-[11px] text-destructive">โหลด Decorations ไม่สำเร็จ: {inGlazeError}</p>
              )}
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
