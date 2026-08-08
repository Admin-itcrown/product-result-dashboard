import { Fragment, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  formatNumber,
  CLAY_COLORS,
  FIRE_COLORS,
  CLAY_LABELS,
  FIRE_LABELS,
  PIECE_SHAPE_LABELS,
} from "./KilnDashboardStyles";
import type {
  GlazeProductionRecord,
  ClayKind,
  FireKind,
  PieceShapeKind,
} from "./KilnDashboardStyles";

export const SHAPE_ORDER: PieceShapeKind[] = [
  "plate",
  "bowl",
  "cup",
  "mug",
  "jar",
  "teapot",
  "vessel",
  "lid",
  "acc",
  "other",
];

function pct(part: number, total: number) {
  return total > 0 ? ((part / total) * 100).toFixed(0) : "0";
}

function avgPerDay(total: number, dayCount: number) {
  if (dayCount <= 0) return 0;
  return Math.round(total / dayCount);
}

/** Shared Recharts tooltip props — keep tooltip above charts, avoid clipping */
const CHART_TOOLTIP_PROPS = {
  wrapperStyle: { zIndex: 80, outline: "none" } as const,
  contentStyle: {
    zIndex: 80,
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 11,
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    padding: "8px 10px",
  },
  allowEscapeViewBox: { x: true, y: true } as const,
  offset: 16,
  cursor: { fill: "rgba(148,163,184,0.12)" },
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; payload?: Record<string, unknown> }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-2.5 py-2 shadow-lg text-[11px] min-w-[120px]">
      {label != null && label !== "" && (
        <p className="font-semibold text-foreground mb-1 border-b border-border pb-1">{label}</p>
      )}
      <div className="space-y-0.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {Number(p.value || 0).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClayRatioPanel({ data }: { data: GlazeProductionRecord[] }) {
  const { white, black, unknown, total, pieData } = useMemo(() => {
    let white = 0;
    let black = 0;
    let unknown = 0;
    for (const r of data) {
      if (r.clayKind === "white") white += r.qtyProc;
      else if (r.clayKind === "black") black += r.qtyProc;
      else unknown += r.qtyProc;
    }
    const total = white + black + unknown;
    const pieData = [
      { name: CLAY_LABELS.white, key: "white" as ClayKind, value: white, color: CLAY_COLORS.white },
      { name: CLAY_LABELS.black, key: "black" as ClayKind, value: black, color: CLAY_COLORS.black },
      ...(unknown > 0
        ? [{ name: CLAY_LABELS.unknown, key: "unknown" as ClayKind, value: unknown, color: CLAY_COLORS.unknown }]
        : []),
    ].filter((d) => d.value > 0);
    return { white, black, unknown, total, pieData };
  }, [data]);

  const display = pieData.length > 0 ? pieData : [{ name: "Empty", key: "unknown" as ClayKind, value: 1, color: "#e5e7eb" }];

  return (
    <div className="bg-card rounded-lg border border-border p-4 shadow-card h-full opacity-0 animate-fade-in overflow-visible" style={{ animationDelay: "80ms" }}>
      <h3 className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-2">ประเภทดิน (Clay)</h3>
      <div className="relative h-[150px] w-full overflow-visible">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Pie data={display} cx="50%" cy="50%" innerRadius={40} outerRadius={56} paddingAngle={pieData.length > 1 ? 3 : 0} dataKey="value">
              {display.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip {...CHART_TOOLTIP_PROPS} content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-base font-bold text-foreground">{formatNumber(total)}</span>
          <span className="text-[9px] text-muted-foreground uppercase">Total</span>
        </div>
      </div>
      <div className="mt-2 space-y-1.5">
        {[
          { label: CLAY_LABELS.white, value: white, color: CLAY_COLORS.white },
          { label: CLAY_LABELS.black, value: black, color: CLAY_COLORS.black },
          ...(unknown > 0 ? [{ label: CLAY_LABELS.unknown, value: unknown, color: CLAY_COLORS.unknown }] : []),
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-2 text-[11px]">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
            <span className="flex-1 text-muted-foreground truncate">{row.label}</span>
            <span className="font-semibold text-foreground tabular-nums">{formatNumber(row.value)}</span>
            <span className="text-muted-foreground w-8 text-right">{pct(row.value, total)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FireRatioPanel({ data }: { data: GlazeProductionRecord[] }) {
  const { glaze, repair, total, pieData } = useMemo(() => {
    let glaze = 0;
    let repair = 0;
    for (const r of data) {
      if (r.fireKind === "glaze") glaze += r.qtyProc;
      else repair += r.qtyProc;
    }
    const total = glaze + repair;
    const pieData = [
      { name: FIRE_LABELS.glaze, value: glaze, color: FIRE_COLORS.glaze },
      { name: FIRE_LABELS.repair, value: repair, color: FIRE_COLORS.repair },
    ].filter((d) => d.value > 0);
    return { glaze, repair, total, pieData };
  }, [data]);

  const display = pieData.length > 0 ? pieData : [{ name: "Empty", value: 1, color: "#e5e7eb" }];

  return (
    <div className="bg-card rounded-lg border border-border p-4 shadow-card h-full opacity-0 animate-fade-in overflow-visible" style={{ animationDelay: "140ms" }}>
      <h3 className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-2">รอบการเผา</h3>
      <div className="relative h-[150px] w-full overflow-visible">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Pie data={display} cx="50%" cy="50%" innerRadius={40} outerRadius={56} paddingAngle={pieData.length > 1 ? 3 : 0} dataKey="value">
              {display.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip {...CHART_TOOLTIP_PROPS} content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-base font-bold text-foreground">{formatNumber(total)}</span>
          <span className="text-[9px] text-muted-foreground uppercase">Total</span>
        </div>
      </div>
      <div className="mt-2 space-y-1.5">
        {[
          { label: FIRE_LABELS.glaze, value: glaze, color: FIRE_COLORS.glaze },
          { label: FIRE_LABELS.repair, value: repair, color: FIRE_COLORS.repair },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-2 text-[11px]">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
            <span className="flex-1 text-muted-foreground truncate">{row.label}</span>
            <span className="font-semibold text-foreground tabular-nums">{formatNumber(row.value)}</span>
            <span className="text-muted-foreground w-8 text-right">{pct(row.value, total)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PieceShapePanel({ data }: { data: GlazeProductionRecord[] }) {
  const rows = useMemo(() => {
    const map = new Map<PieceShapeKind, { total: number; glaze: number; repair: number }>();
    for (const r of data) {
      let entry = map.get(r.pieceShape);
      if (!entry) {
        entry = { total: 0, glaze: 0, repair: 0 };
        map.set(r.pieceShape, entry);
      }
      entry.total += r.qtyProc;
      if (r.fireKind === "glaze") entry.glaze += r.qtyProc;
      else entry.repair += r.qtyProc;
    }
    const grand = Array.from(map.values()).reduce((s, v) => s + v.total, 0);
    return SHAPE_ORDER
      .map((shape) => {
        const v = map.get(shape) || { total: 0, glaze: 0, repair: 0 };
        return {
          shape,
          label: PIECE_SHAPE_LABELS[shape],
          ...v,
          sharePct: grand > 0 ? (v.total / grand) * 100 : 0,
          glazePct: v.total > 0 ? (v.glaze / v.total) * 100 : 0,
          repairPct: v.total > 0 ? (v.repair / v.total) * 100 : 0,
        };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [data]);

  return (
    <div className="bg-card rounded-lg border border-border p-4 shadow-card h-full opacity-0 animate-fade-in" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-[10px] font-bold text-foreground uppercase tracking-wider">ประเภทชิ้นงาน</h3>
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: FIRE_COLORS.glaze }} />
            เผาเคลือบ
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: FIRE_COLORS.repair }} />
            เผาซ่อม
          </span>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="h-[160px] flex items-center justify-center text-sm text-muted-foreground">ไม่มีข้อมูล</div>
      ) : (
        <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
          {rows.map((row) => (
            <div key={row.shape} className="space-y-1">
              <div className="flex items-center justify-between text-[11px] gap-2">
                <span className="font-medium text-foreground">{row.label}</span>
                <span className="tabular-nums text-muted-foreground shrink-0">
                  {formatNumber(row.total)} · {row.sharePct.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                <div
                  className="h-full transition-all"
                  style={{ width: `${row.glazePct}%`, backgroundColor: FIRE_COLORS.glaze }}
                  title={`${FIRE_LABELS.glaze} ${formatNumber(row.glaze)} (${row.glazePct.toFixed(0)}%)`}
                />
                <div
                  className="h-full transition-all"
                  style={{ width: `${row.repairPct}%`, backgroundColor: FIRE_COLORS.repair }}
                  title={`${FIRE_LABELS.repair} ${formatNumber(row.repair)} (${row.repairPct.toFixed(0)}%)`}
                />
              </div>
              <div className="flex items-center justify-between text-[9px] tabular-nums text-muted-foreground">
                <span>
                  {FIRE_LABELS.glaze} {formatNumber(row.glaze)} ({row.glazePct.toFixed(0)}%)
                </span>
                <span>
                  {FIRE_LABELS.repair} {formatNumber(row.repair)} ({row.repairPct.toFixed(0)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type KilnTableView = "summary" | "shape" | "items";

type ItemAgg = {
  description: string;
  shape: PieceShapeKind;
  clay: ClayKind;
  glaze: number;
  repair: number;
  total: number;
};

type PopupFilter = {
  kiln: string;
  title: string;
  fireKind?: FireKind;
  clayKind?: ClayKind;
  shape?: PieceShapeKind;
};

function shapeSortIndex(shape: PieceShapeKind) {
  const idx = SHAPE_ORDER.indexOf(shape);
  return idx < 0 ? 999 : idx;
}

/** Sort: shape order first, then quantity desc */
function sortItemsByShapeThenQty(items: ItemAgg[]) {
  return [...items].sort((a, b) => {
    const sa = shapeSortIndex(a.shape);
    const sb = shapeSortIndex(b.shape);
    if (sa !== sb) return sa - sb;
    return b.total - a.total;
  });
}

function buildItemRowsForExport(data: GlazeProductionRecord[]) {
  const itemMap = new Map<
    string,
    { kiln: string; description: string; shape: PieceShapeKind; clay: ClayKind; glaze: number; repair: number; total: number }
  >();

  for (const r of data) {
    const desc = r.description || "(ไม่ระบุ)";
    const ik = `${r.kilnName}||${desc}`;
    let item = itemMap.get(ik);
    if (!item) {
      item = {
        kiln: r.kilnName,
        description: desc,
        shape: r.pieceShape,
        clay: r.clayKind,
        glaze: 0,
        repair: 0,
        total: 0,
      };
      itemMap.set(ik, item);
    }
    item.total += r.qtyProc;
    if (r.fireKind === "glaze") item.glaze += r.qtyProc;
    else item.repair += r.qtyProc;
  }

  return Array.from(itemMap.values())
    .sort((a, b) => {
      const kilnCmp = a.kiln.localeCompare(b.kiln);
      if (kilnCmp !== 0) return kilnCmp;
      const sa = shapeSortIndex(a.shape);
      const sb = shapeSortIndex(b.shape);
      if (sa !== sb) return sa - sb;
      return b.total - a.total;
    })
    .map((r) => ({
      เตา: r.kiln,
      รายการ: r.description,
      Shape: PIECE_SHAPE_LABELS[r.shape],
      ดิน: CLAY_LABELS[r.clay],
      [FIRE_LABELS.glaze]: r.glaze,
      [FIRE_LABELS.repair]: r.repair,
      รวม: r.total,
    }));
}

function exportGlostExcel(
  data: GlazeProductionRecord[],
  meta: { startDate: string; endDate: string }
) {
  const itemRows = buildItemRowsForExport(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemRows), "รายการเผา");
  const fileName = `glost-firing_${meta.startDate}_${meta.endDate}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

function ClickableQty({
  value,
  onClick,
  className,
  style,
  disabled,
}: {
  value: number;
  onClick: () => void;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
}) {
  if (disabled || value <= 0) {
    return (
      <span className={cn("tabular-nums text-muted-foreground", className)} style={style}>
        {value > 0 ? value.toLocaleString() : "—"}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "tabular-nums underline decoration-dotted underline-offset-2 hover:text-primary hover:decoration-solid transition-colors",
        className
      )}
      style={style}
      title="คลิกดูรายการเผา"
    >
      {value.toLocaleString()}
    </button>
  );
}

const DECO_TABLE_LABEL = "เผารูปลอก";
const DECO_COLOR = "#8b5cf6";
const GLOST_COLOR = "#f59e0b";

function formatNumberFull(n: number): string {
  return n.toLocaleString();
}

function formatDateDMY(iso: string): string {
  const [year, month, day] = iso.split("-");
  return year && month && day ? `${day}-${month}-${year}` : iso;
}

function parsePlanInput(value: string): number {
  const cleaned = value.replace(/,/g, "").trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? Math.max(0, Math.round(num)) : 0;
}

function ManualPlanInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^\d,]/g, ""))}
      placeholder="0"
      className="w-full h-6 rounded-md border border-border bg-background px-2 text-right text-[10px] font-semibold tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    />
  );
}

function AchievementRate({ actual, plan }: { actual: number; plan: number }) {
  if (plan <= 0) return <span className="text-muted-foreground">—</span>;
  const rate = Math.round((actual / plan) * 100);
  return (
    <span
      className={cn(
        "font-bold tabular-nums",
        rate >= 100
          ? "text-emerald-700 dark:text-emerald-400"
          : rate >= 90
            ? "text-amber-700 dark:text-amber-400"
            : "text-rose-700 dark:text-rose-400"
      )}
    >
      {rate}%
    </span>
  );
}

/** By Shape cell: total on top, avg/day below */
function ShapeQtyDual({
  value,
  dayCount,
  onClick,
  strong,
}: {
  value: number;
  dayCount: number;
  onClick?: () => void;
  strong?: boolean;
}) {
  if (value <= 0) {
    return <span className="tabular-nums text-muted-foreground">—</span>;
  }
  const avg = avgPerDay(value, dayCount);
  return (
    <div className="leading-tight">
      {onClick ? (
        <ClickableQty value={value} className={strong ? "font-semibold" : "font-medium"} onClick={onClick} />
      ) : (
        <span className={cn("tabular-nums text-foreground", strong ? "font-bold" : "font-semibold")}>
          {formatNumberFull(value)}
        </span>
      )}
      <div className="text-[9px] text-teal-700 dark:text-teal-400 tabular-nums whitespace-nowrap mt-0.5">
        ≈ {formatNumberFull(avg)}/วัน
      </div>
    </div>
  );
}

export function KilnFiringTable({
  data,
  dayCount,
  planDayCount,
  startDate,
  endDate,
  periodLabel,
  decorationsByKiln = [],
  decorationsDaily = [],
}: {
  data: GlazeProductionRecord[];
  dayCount: number;
  /** Divisor for plan/day: Daily=1, Weekly=7, Monthly=selected month days */
  planDayCount: number;
  startDate: string;
  endDate: string;
  periodLabel: string;
  /** Decorations (In-Glaze) totals per kiln — merged into Summary chart/table */
  decorationsByKiln?: Array<{ kiln: string; total: number }>;
  /** Decorations (In-Glaze) daily totals per kiln */
  decorationsDaily?: Array<{ date: string; kiln: string; total: number }>;
}) {
  const [view, setView] = useState<KilnTableView>("summary");
  const [summaryMode, setSummaryMode] = useState<"monitor" | "plan" | "daily">("monitor");
  const [itemKilnFilter, setItemKilnFilter] = useState<string>("All");
  const [popup, setPopup] = useState<PopupFilter | null>(null);
  const [planByKiln, setPlanByKiln] = useState<Record<string, string>>({});
  const planStorageKey = "kiln-production-plans:latest";
  const legacyPlanStorageKey = useMemo(
    () => `kiln-production-plans:${startDate}:${endDate}`,
    [startDate, endDate]
  );

  useEffect(() => {
    try {
      const saved =
        window.localStorage.getItem(planStorageKey) ??
        window.localStorage.getItem(legacyPlanStorageKey);
      if (!saved) {
        setPlanByKiln({});
        return;
      }
      const parsed = JSON.parse(saved);
      setPlanByKiln(
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Record<string, string>)
          : {}
      );
    } catch {
      setPlanByKiln({});
    }
  }, [legacyPlanStorageKey]);

  const updatePlanValue = (key: string, value: string) => {
    setPlanByKiln((prev) => {
      const next = { ...prev, [key]: value };
      try {
        window.localStorage.setItem(planStorageKey, JSON.stringify(next));
      } catch {
        // Browser storage may be unavailable; keep the current-session value.
      }
      return next;
    });
  };

  const decoMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of decorationsByKiln) {
      if (!d.kiln) continue;
      m.set(d.kiln, (m.get(d.kiln) || 0) + (d.total || 0));
    }
    return m;
  }, [decorationsByKiln]);

  const summaryRows = useMemo(() => {
    const map = new Map<
      string,
      {
        kilnName: string;
        glaze: number;
        repair: number;
        white: number;
        whiteGlaze: number;
        whiteRepair: number;
        black: number;
        blackGlaze: number;
        blackRepair: number;
        glostTotal: number;
        decorations: number;
        total: number;
      }
    >();
    for (const r of data) {
      let entry = map.get(r.kilnName);
      if (!entry) {
        entry = {
          kilnName: r.kilnName,
          glaze: 0,
          repair: 0,
          white: 0,
          whiteGlaze: 0,
          whiteRepair: 0,
          black: 0,
          blackGlaze: 0,
          blackRepair: 0,
          glostTotal: 0,
          decorations: 0,
          total: 0,
        };
        map.set(r.kilnName, entry);
      }
      entry.glostTotal += r.qtyProc;
      if (r.fireKind === "glaze") entry.glaze += r.qtyProc;
      else entry.repair += r.qtyProc;
      if (r.clayKind === "white") {
        entry.white += r.qtyProc;
        if (r.fireKind === "glaze") entry.whiteGlaze += r.qtyProc;
        else entry.whiteRepair += r.qtyProc;
      } else if (r.clayKind === "black") {
        entry.black += r.qtyProc;
        if (r.fireKind === "glaze") entry.blackGlaze += r.qtyProc;
        else entry.blackRepair += r.qtyProc;
      }
    }
    for (const [kiln, qty] of decoMap.entries()) {
      let entry = map.get(kiln);
      if (!entry) {
        entry = {
          kilnName: kiln,
          glaze: 0,
          repair: 0,
          white: 0,
          whiteGlaze: 0,
          whiteRepair: 0,
          black: 0,
          blackGlaze: 0,
          blackRepair: 0,
          glostTotal: 0,
          decorations: 0,
          total: 0,
        };
        map.set(kiln, entry);
      }
      entry.decorations = qty;
    }
    for (const entry of map.values()) {
      entry.total = entry.glostTotal + entry.decorations;
    }
    return Array.from(map.values()).sort((a, b) => {
      // ประเภทการเผาก่อน: เผาเคลือบ → เผารูปลอก → ไม่มีข้อมูล
      const rank = (row: { glostTotal: number; decorations: number }) =>
        row.glostTotal > 0 ? 0 : row.decorations > 0 ? 1 : 2;
      const typeDiff = rank(a) - rank(b);
      return typeDiff !== 0 ? typeDiff : b.total - a.total;
    });
  }, [data, decoMap]);

  const summaryFooter = useMemo(() => {
    const empty = {
      glaze: 0,
      repair: 0,
      whiteGlaze: 0,
      whiteRepair: 0,
      blackGlaze: 0,
      blackRepair: 0,
      glostTotal: 0,
      decorations: 0,
      total: 0,
    };
    if (summaryRows.length === 0) {
      return { total: empty, average: empty, kilnCount: 0 };
    }
    const total = summaryRows.reduce(
      (acc, r) => {
        acc.glaze += r.glaze;
        acc.repair += r.repair;
        acc.whiteGlaze += r.whiteGlaze;
        acc.whiteRepair += r.whiteRepair;
        acc.blackGlaze += r.blackGlaze;
        acc.blackRepair += r.blackRepair;
        acc.glostTotal += r.glostTotal;
        acc.decorations += r.decorations;
        acc.total += r.total;
        return acc;
      },
      { ...empty }
    );
    const n = summaryRows.length;
    const average = {
      glaze: Math.round(total.glaze / n),
      repair: Math.round(total.repair / n),
      whiteGlaze: Math.round(total.whiteGlaze / n),
      whiteRepair: Math.round(total.whiteRepair / n),
      blackGlaze: Math.round(total.blackGlaze / n),
      blackRepair: Math.round(total.blackRepair / n),
      glostTotal: Math.round(total.glostTotal / n),
      decorations: Math.round(total.decorations / n),
      total: Math.round(total.total / n),
    };
    return { total, average, kilnCount: n };
  }, [summaryRows]);

  const shapeMatrix = useMemo(() => {
    const kilnTotals = new Map<string, number>();
    const cell = new Map<string, number>();
    const shapeTotals = new Map<PieceShapeKind, number>();

    for (const r of data) {
      kilnTotals.set(r.kilnName, (kilnTotals.get(r.kilnName) || 0) + r.qtyProc);
      shapeTotals.set(r.pieceShape, (shapeTotals.get(r.pieceShape) || 0) + r.qtyProc);
      const key = `${r.kilnName}|${r.pieceShape}`;
      cell.set(key, (cell.get(key) || 0) + r.qtyProc);
    }

    const kilns = Array.from(kilnTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    const shapes = SHAPE_ORDER.filter((s) => (shapeTotals.get(s) || 0) > 0);

    const rows = kilns.map((kilnName) => {
      const byShape: Record<string, number> = {};
      let total = 0;
      for (const shape of shapes) {
        const v = cell.get(`${kilnName}|${shape}`) || 0;
        byShape[shape] = v;
        total += v;
      }
      return { kilnName, byShape, total };
    });

    const colTotals: Record<string, number> = {};
    let grand = 0;
    for (const shape of shapes) {
      const v = shapeTotals.get(shape) || 0;
      colTotals[shape] = v;
      grand += v;
    }

    return { rows, shapes, colTotals, grand };
  }, [data]);

  const dailyGroups = useMemo(() => {
    const map = new Map<
      string,
      { date: string; kilnName: string; glost: number; decal: number; total: number }
    >();
    const getEntry = (date: string, kilnName: string) => {
      const key = `${date}||${kilnName}`;
      let entry = map.get(key);
      if (!entry) {
        entry = { date, kilnName, glost: 0, decal: 0, total: 0 };
        map.set(key, entry);
      }
      return entry;
    };

    for (const row of data) {
      const date = String(row.trx_date || "").slice(0, 10);
      if (!date) continue;
      getEntry(date, row.kilnName).glost += row.qtyProc;
    }
    for (const row of decorationsDaily) {
      const date = String(row.date || "").slice(0, 10);
      if (!date || !row.kiln) continue;
      getEntry(date, row.kiln).decal += Number(row.total) || 0;
    }
    for (const entry of map.values()) {
      entry.total = entry.glost + entry.decal;
    }

    const byDate = new Map<
      string,
      Array<{ date: string; kilnName: string; glost: number; decal: number; total: number }>
    >();
    for (const entry of Array.from(map.values()).sort(
      (a, b) => a.date.localeCompare(b.date) || a.kilnName.localeCompare(b.kilnName)
    )) {
      const rows = byDate.get(entry.date) || [];
      rows.push(entry);
      byDate.set(entry.date, rows);
    }

    // Include every calendar day in the selected range, including zero-production days.
    const rangeStart = startDate <= endDate ? startDate : endDate;
    const rangeEnd = startDate <= endDate ? endDate : startDate;
    const [startYear, startMonth, startDay] = rangeStart.split("-").map(Number);
    const [endYear, endMonth, endDay] = rangeEnd.split("-").map(Number);
    const cursor = new Date(startYear, startMonth - 1, startDay);
    const last = new Date(endYear, endMonth - 1, endDay);
    while (cursor <= last) {
      const date = [
        cursor.getFullYear(),
        String(cursor.getMonth() + 1).padStart(2, "0"),
        String(cursor.getDate()).padStart(2, "0"),
      ].join("-");
      if (!byDate.has(date)) byDate.set(date, []);
      cursor.setDate(cursor.getDate() + 1);
    }

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, rows]) => ({
      date,
      rows,
      glost: rows.reduce((sum, row) => sum + row.glost, 0),
      decal: rows.reduce((sum, row) => sum + row.decal, 0),
      total: rows.reduce((sum, row) => sum + row.total, 0),
      }));
  }, [data, decorationsDaily, startDate, endDate]);

  const dailyMatrix = useMemo(() => {
    const dates = dailyGroups.map((group) => group.date);
    const kilnNames = Array.from(
      new Set(dailyGroups.flatMap((group) => group.rows.map((row) => row.kilnName)))
    ).sort((a, b) => a.localeCompare(b, "th", { numeric: true }));
    const values = new Map<
      string,
      { glost: number; decal: number }
    >();

    for (const group of dailyGroups) {
      for (const row of group.rows) {
        values.set(`${row.kilnName}||${group.date}`, {
          glost: row.glost,
          decal: row.decal,
        });
      }
    }

    return { dates, kilnNames, values };
  }, [dailyGroups]);

  const itemsByKiln = useMemo(() => {
    const map = new Map<string, ItemAgg[]>();
    const agg = new Map<string, ItemAgg & { kiln: string }>();

    for (const r of data) {
      const desc = r.description || "(ไม่ระบุ)";
      const key = `${r.kilnName}||${desc}`;
      let entry = agg.get(key);
      if (!entry) {
        entry = {
          kiln: r.kilnName,
          description: desc,
          shape: r.pieceShape,
          clay: r.clayKind,
          glaze: 0,
          repair: 0,
          total: 0,
        };
        agg.set(key, entry);
      }
      entry.total += r.qtyProc;
      if (r.fireKind === "glaze") entry.glaze += r.qtyProc;
      else entry.repair += r.qtyProc;
    }

    for (const entry of agg.values()) {
      let list = map.get(entry.kiln);
      if (!list) {
        list = [];
        map.set(entry.kiln, list);
      }
      list.push(entry);
    }
    for (const [kiln, list] of map.entries()) {
      map.set(kiln, sortItemsByShapeThenQty(list));
    }
    return map;
  }, [data]);

  const popupItems = useMemo(() => {
    if (!popup) return [] as ItemAgg[];
    const filtered = data.filter((r) => {
      if (r.kilnName !== popup.kiln) return false;
      if (popup.fireKind && r.fireKind !== popup.fireKind) return false;
      if (popup.clayKind && r.clayKind !== popup.clayKind) return false;
      if (popup.shape && r.pieceShape !== popup.shape) return false;
      return true;
    });

    const agg = new Map<string, ItemAgg>();
    for (const r of filtered) {
      const desc = r.description || "(ไม่ระบุ)";
      let entry = agg.get(desc);
      if (!entry) {
        entry = {
          description: desc,
          shape: r.pieceShape,
          clay: r.clayKind,
          glaze: 0,
          repair: 0,
          total: 0,
        };
        agg.set(desc, entry);
      }
      entry.total += r.qtyProc;
      if (r.fireKind === "glaze") entry.glaze += r.qtyProc;
      else entry.repair += r.qtyProc;
    }
    return sortItemsByShapeThenQty(Array.from(agg.values()));
  }, [data, popup]);

  const kilnOptions = useMemo(() => ["All", ...summaryRows.map((r) => r.kilnName)], [summaryRows]);

  const chartData = useMemo(
    () =>
      summaryRows.map((r) => ({
        name: r.kilnName,
        เผาเคลือบ: r.glostTotal,
        [DECO_TABLE_LABEL]: r.decorations,
      })),
    [summaryRows]
  );

  const planTotals = useMemo(() => {
    const overviewGlost = parsePlanInput(planByKiln["overview:glost"] || "");
    const overviewDecal = parsePlanInput(planByKiln["overview:decal"] || "");
    const detailTotal = summaryRows.reduce(
      (sum, row) => sum + parsePlanInput(planByKiln[`kiln:${row.kilnName}`] || ""),
      0
    );
    return {
      overviewGlost,
      overviewDecal,
      overviewTotal: overviewGlost + overviewDecal,
      detailTotal,
    };
  }, [planByKiln, summaryRows]);

  const openPopup = (filter: PopupFilter) => setPopup(filter);

  return (
    <div className="bg-card rounded-lg border border-border p-4 shadow-card opacity-0 animate-fade-in overflow-visible" style={{ animationDelay: "260ms" }}>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div>
          <h3 className="text-[10px] font-bold text-foreground uppercase tracking-wider">จำนวนเผาของแต่ละเตา</h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-md border border-border overflow-hidden">
            {(
              [
                { key: "summary", label: "Summary" },
                { key: "shape", label: "By Shape" },
                { key: "items", label: "รายการเผา" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setView(tab.key)}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-medium transition-colors",
                  view === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => exportGlostExcel(data, { startDate, endDate })}
            disabled={data.length === 0}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-md border border-border bg-muted hover:bg-accent text-foreground disabled:opacity-50"
          >
            <Download className="h-3 w-3" />
            Export Excel
          </button>
        </div>
      </div>

      {view === "summary" && (
        <>
          <div className="h-[240px] w-full mb-4 overflow-visible relative z-0">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">ไม่มีข้อมูล</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 16, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatNumber(Number(v))} />
                  <Tooltip {...CHART_TOOLTIP_PROPS} content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="เผาเคลือบ" stackId="a" fill={GLOST_COLOR} radius={[0, 0, 0, 0]} />
                  <Bar dataKey={DECO_TABLE_LABEL} stackId="a" fill={DECO_COLOR} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="flex rounded-md border border-border overflow-hidden">
              {([
                { key: "monitor", label: "Monitor" },
                { key: "plan", label: "Result Plan" },
                { key: "daily", label: "รายวัน" },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSummaryMode(tab.key)}
                  className={cn(
                    "px-3 py-1.5 text-[10px] font-semibold transition-colors",
                    summaryMode === tab.key
                      ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {summaryMode === "monitor"
                ? "ติดตามผลผลิตแต่ละเตา"
                : summaryMode === "plan"
                  ? "เปรียบเทียบผลผลิตกับแผน"
                  : "ยอดผลิตรายวันของแต่ละเตา"}
            </span>
          </div>

          {summaryMode === "monitor" && (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-[11px] table-fixed border-collapse min-w-[620px]">
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[21%]" />
                  <col className="w-[21%]" />
                  <col className="w-[20%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-muted-foreground">
                    <th className="text-left font-semibold py-2.5 pl-3 pr-2">เตา</th>
                    <th className="text-right font-semibold py-2.5 px-2">เผาเคลือบ</th>
                    <th className="text-right font-semibold py-2.5 px-2">{DECO_TABLE_LABEL}</th>
                    <th className="text-right font-semibold py-2.5 px-2">รวม</th>
                    <th className="text-right font-semibold py-2.5 pl-2 pr-3">เฉลี่ย/วัน</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.map((row) => (
                    <tr key={row.kilnName} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-2.5 pl-3 pr-2 font-semibold text-foreground">{row.kilnName}</td>
                      <td className="py-2.5 px-2 text-right">
                        <ClickableQty
                          value={row.glostTotal}
                          className="font-semibold"
                          onClick={() =>
                            openPopup({
                              kiln: row.kilnName,
                              title: `${row.kilnName} · เผาเคลือบ`,
                            })
                          }
                        />
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums font-semibold text-violet-700 dark:text-violet-400">
                        {row.decorations > 0 ? formatNumberFull(row.decorations) : "—"}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums font-bold text-foreground">
                        {formatNumberFull(row.total)}
                      </td>
                      <td className="py-2.5 pl-2 pr-3 text-right tabular-nums font-bold text-teal-700 dark:text-teal-400">
                        {formatNumberFull(avgPerDay(row.total, dayCount))}
                      </td>
                    </tr>
                  ))}
                  {summaryRows.length > 0 && (
                    <>
                      <tr className="border-t-2 border-border bg-muted/40">
                        <td className="py-2.5 pl-3 pr-2 font-bold text-foreground">Total</td>
                        <td className="py-2.5 px-2 text-right tabular-nums font-bold text-foreground">
                          {formatNumberFull(summaryFooter.total.glostTotal)}
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums font-bold text-violet-700 dark:text-violet-400">
                          {summaryFooter.total.decorations > 0
                            ? formatNumberFull(summaryFooter.total.decorations)
                            : "—"}
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums font-bold text-foreground">
                          {formatNumberFull(summaryFooter.total.total)}
                        </td>
                        <td className="py-2.5 pl-2 pr-3 text-right tabular-nums font-bold text-teal-700 dark:text-teal-400">
                          {formatNumberFull(avgPerDay(summaryFooter.total.total, dayCount))}
                        </td>
                      </tr>
                      <tr className="border-t border-border/60 bg-muted/25">
                        <td className="py-2.5 pl-3 pr-2 font-bold text-foreground">Average</td>
                        <td className="py-2.5 px-2 text-right tabular-nums font-semibold text-foreground">
                          {formatNumberFull(summaryFooter.average.glostTotal)}
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums font-semibold text-violet-700 dark:text-violet-400">
                          {summaryFooter.average.decorations > 0
                            ? formatNumberFull(summaryFooter.average.decorations)
                            : "—"}
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums font-semibold text-foreground">
                          {formatNumberFull(summaryFooter.average.total)}
                        </td>
                        <td className="py-2.5 pl-2 pr-3 text-right tabular-nums font-semibold text-teal-700 dark:text-teal-400">
                          {formatNumberFull(avgPerDay(summaryFooter.average.total, dayCount))}
                        </td>
                      </tr>
                    </>
                  )}
                  {summaryRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        ไม่มีข้อมูล
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {summaryMode === "plan" && (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-[10px] table-fixed border-collapse min-w-[820px]">
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[16%]" />
                <col className="w-[16%]" />
                <col className="w-[10%]" />
                <col className="w-[17%]" />
                <col className="w-[17%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-muted/50 text-muted-foreground">
                  <th className="text-left font-semibold py-1.5 pl-3 pr-2">ประเภทการเผา / เตา</th>
                  <th className="text-right font-semibold py-1.5 px-2">แผนผลิตรวม</th>
                  <th className="text-right font-semibold py-1.5 px-2">ผลิตได้</th>
                  <th className="text-right font-semibold py-1.5 px-2">%</th>
                  <th className="text-right font-semibold py-1.5 px-2">แผนผลิต/วัน</th>
                  <th className="text-right font-semibold py-1.5 pl-2 pr-3">ผลิตได้/วัน</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-emerald-300/60 bg-emerald-100/70 dark:bg-emerald-950/40">
                  <td colSpan={6} className="py-1 px-3 font-bold text-emerald-900 dark:text-emerald-200">
                    ภาพรวมตามประเภทการเผา
                  </td>
                </tr>

                {([
                  {
                    key: "glost",
                    label: "เผาเคลือบ",
                    actual: summaryFooter.total.glostTotal,
                    plan: planTotals.overviewGlost,
                    colorClass: "text-amber-700 dark:text-amber-400",
                  },
                  {
                    key: "decal",
                    label: DECO_TABLE_LABEL,
                    actual: summaryFooter.total.decorations,
                    plan: planTotals.overviewDecal,
                    colorClass: "text-violet-700 dark:text-violet-400",
                  },
                ] as const).map((row) => (
                  <tr key={row.key} className="border-b border-border/50 hover:bg-muted/20">
                    <td className={cn("py-1.5 pl-5 pr-2 font-bold", row.colorClass)}>{row.label}</td>
                    <td className="py-1 px-2">
                      <ManualPlanInput
                        value={planByKiln[`overview:${row.key}`] || ""}
                        onChange={(value) => updatePlanValue(`overview:${row.key}`, value)}
                      />
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-bold text-foreground">
                      {formatNumberFull(row.actual)}
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <AchievementRate actual={row.actual} plan={row.plan} />
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-semibold text-foreground">
                      {row.plan > 0 ? formatNumberFull(avgPerDay(row.plan, planDayCount)) : "—"}
                    </td>
                    <td className="py-1.5 pl-2 pr-3 text-right tabular-nums font-bold text-teal-700 dark:text-teal-400">
                      {formatNumberFull(avgPerDay(row.actual, dayCount))}
                    </td>
                  </tr>
                ))}

                <tr className="border-b-2 border-border bg-muted/35">
                  <td className="py-1.5 pl-5 pr-2 font-bold text-foreground">รวม</td>
                  <td className="py-1.5 px-2 text-right tabular-nums font-bold text-foreground">
                    {planTotals.overviewTotal > 0 ? formatNumberFull(planTotals.overviewTotal) : "—"}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums font-bold text-foreground">
                    {formatNumberFull(summaryFooter.total.total)}
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <AchievementRate actual={summaryFooter.total.total} plan={planTotals.overviewTotal} />
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums font-bold text-foreground">
                    {planTotals.overviewTotal > 0
                      ? formatNumberFull(avgPerDay(planTotals.overviewTotal, planDayCount))
                      : "—"}
                  </td>
                  <td className="py-1.5 pl-2 pr-3 text-right tabular-nums font-bold text-teal-700 dark:text-teal-400">
                    {formatNumberFull(avgPerDay(summaryFooter.total.total, dayCount))}
                  </td>
                </tr>

                <tr className="border-b border-emerald-300/60 bg-emerald-100/70 dark:bg-emerald-950/40">
                  <td colSpan={6} className="py-1 px-3 font-bold text-emerald-900 dark:text-emerald-200">
                    รายละเอียดแต่ละเตา
                  </td>
                </tr>

                {summaryRows.map((row) => {
                  const planKey = `kiln:${row.kilnName}`;
                  const plan = parsePlanInput(planByKiln[planKey] || "");
                  return (
                    <tr key={planKey} className="border-b border-border/40 hover:bg-muted/20">
                      <td className="py-1.5 pl-5 pr-2 font-semibold text-foreground">{row.kilnName}</td>
                      <td className="py-1 px-2">
                        <ManualPlanInput
                          value={planByKiln[planKey] || ""}
                          onChange={(value) => updatePlanValue(planKey, value)}
                        />
                      </td>
                      <td className="py-1.5 px-2 text-right tabular-nums font-bold text-foreground">
                        {formatNumberFull(row.total)}
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        <AchievementRate actual={row.total} plan={plan} />
                      </td>
                      <td className="py-1.5 px-2 text-right tabular-nums font-semibold text-foreground">
                        {plan > 0 ? formatNumberFull(avgPerDay(plan, planDayCount)) : "—"}
                      </td>
                      <td className="py-1.5 pl-2 pr-3 text-right tabular-nums font-semibold text-teal-700 dark:text-teal-400">
                        {formatNumberFull(avgPerDay(row.total, dayCount))}
                      </td>
                    </tr>
                  );
                })}

                {summaryRows.length > 0 && (
                  <tr className="border-t-2 border-border bg-muted/40">
                    <td className="py-1.5 pl-4 pr-2 font-bold text-foreground">รวมรายละเอียดเตา</td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-bold text-foreground">
                      {planTotals.detailTotal > 0 ? formatNumberFull(planTotals.detailTotal) : "—"}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-bold text-foreground">
                      {formatNumberFull(summaryFooter.total.total)}
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <AchievementRate actual={summaryFooter.total.total} plan={planTotals.detailTotal} />
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-bold text-foreground">
                      {planTotals.detailTotal > 0
                        ? formatNumberFull(avgPerDay(planTotals.detailTotal, planDayCount))
                        : "—"}
                    </td>
                    <td className="py-1.5 pl-2 pr-3 text-right tabular-nums font-bold text-teal-700 dark:text-teal-400">
                      {formatNumberFull(avgPerDay(summaryFooter.total.total, dayCount))}
                    </td>
                  </tr>
                )}

                {summaryRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      ไม่มีข้อมูล
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          )}
        </>
      )}

      {view === "shape" && (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-[11px] min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                <th className="text-left font-semibold py-2.5 pl-3 pr-2 sticky left-0 bg-muted/40 z-10">เตา</th>
                {shapeMatrix.shapes.map((shape) => (
                  <th key={shape} className="text-right font-semibold py-2.5 px-2.5 whitespace-nowrap">
                    {PIECE_SHAPE_LABELS[shape]}
                  </th>
                ))}
                <th className="text-right font-semibold py-2.5 pl-2.5 pr-3">รวม</th>
              </tr>
            </thead>
            <tbody>
              {shapeMatrix.rows.map((r) => (
                <tr key={r.kilnName} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 pl-3 pr-2 font-semibold text-foreground sticky left-0 bg-card z-10 border-r border-border/40 whitespace-nowrap">
                    {r.kilnName}
                  </td>
                  {shapeMatrix.shapes.map((shape) => {
                    const v = r.byShape[shape] || 0;
                    return (
                      <td key={shape} className="py-2.5 px-2.5 text-right align-top">
                        <ShapeQtyDual
                          value={v}
                          dayCount={dayCount}
                          onClick={() =>
                            openPopup({
                              kiln: r.kilnName,
                              title: `${r.kilnName} · ${PIECE_SHAPE_LABELS[shape]}`,
                              shape,
                            })
                          }
                        />
                      </td>
                    );
                  })}
                  <td className="py-2.5 pl-2.5 pr-3 text-right align-top border-l border-border/40">
                    <ShapeQtyDual
                      value={r.total}
                      dayCount={dayCount}
                      strong
                      onClick={() =>
                        openPopup({
                          kiln: r.kilnName,
                          title: `${r.kilnName} · รายการทั้งหมด`,
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
              {shapeMatrix.rows.length > 0 && (
                <>
                  <tr className="border-t-2 border-border bg-muted/40">
                    <td className="py-2.5 pl-3 pr-2 font-bold text-foreground sticky left-0 bg-muted/40 z-10">
                      Total
                    </td>
                    {shapeMatrix.shapes.map((shape) => (
                      <td key={shape} className="py-2.5 px-2.5 text-right align-top">
                        <ShapeQtyDual value={shapeMatrix.colTotals[shape] || 0} dayCount={dayCount} strong />
                      </td>
                    ))}
                    <td className="py-2.5 pl-2.5 pr-3 text-right align-top border-l border-border/40">
                      <ShapeQtyDual value={shapeMatrix.grand} dayCount={dayCount} strong />
                    </td>
                  </tr>
                  <tr className="border-t border-border/60 bg-muted/25">
                    <td className="py-2.5 pl-3 pr-2 font-bold text-foreground sticky left-0 bg-muted/25 z-10">
                      Average
                    </td>
                    {shapeMatrix.shapes.map((shape) => {
                      const col = shapeMatrix.colTotals[shape] || 0;
                      const avgKiln = Math.round(col / shapeMatrix.rows.length);
                      return (
                        <td key={shape} className="py-2.5 px-2.5 text-right align-top">
                          <ShapeQtyDual value={avgKiln} dayCount={dayCount} />
                        </td>
                      );
                    })}
                    <td className="py-2.5 pl-2.5 pr-3 text-right align-top border-l border-border/40">
                      <ShapeQtyDual
                        value={Math.round(shapeMatrix.grand / shapeMatrix.rows.length)}
                        dayCount={dayCount}
                        strong
                      />
                    </td>
                  </tr>
                </>
              )}
              {shapeMatrix.rows.length === 0 && (
                <tr>
                  <td colSpan={Math.max(2, shapeMatrix.shapes.length + 2)} className="py-6 text-center text-muted-foreground">
                    ไม่มีข้อมูล
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {view === "summary" && summaryMode === "daily" && (
        <div className="overflow-hidden rounded-md border border-border max-h-[520px] overflow-y-auto">
          <table
            className={`w-full table-fixed border-collapse ${
              dailyMatrix.dates.length > 20
                ? "text-[8px]"
                : dailyMatrix.dates.length > 10
                  ? "text-[9px]"
                  : "text-[11px]"
            }`}
          >
            <colgroup>
              <col className="w-[76px]" />
              {dailyMatrix.dates.map((date) => (
                <col key={date} />
              ))}
              <col style={{ width: dailyMatrix.dates.length > 20 ? "80px" : "96px" }} />
            </colgroup>
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-border bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900">
                <th className="bg-slate-800 py-2.5 pl-2 pr-1 text-left font-semibold dark:bg-slate-200">
                  เตา
                </th>
                {dailyMatrix.dates.map((date) => (
                  <th
                    key={date}
                    title={formatDateDMY(date)}
                    className="py-2.5 px-0.5 text-right font-semibold tabular-nums whitespace-nowrap"
                  >
                    {date.slice(8, 10)}/{Number(date.slice(5, 7))}
                  </th>
                ))}
                <th className="border-l-2 border-slate-500/70 py-2.5 pl-3 pr-2 text-right font-semibold">รวม</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b-2 border-border bg-muted/45">
                <td className="bg-muted py-2.5 pl-2 pr-1 font-bold text-foreground">
                  รวมทุกเตา
                </td>
                {dailyGroups.map((group) => (
                  <td key={group.date} className="py-2.5 px-0.5 text-right tabular-nums font-bold tracking-tight text-foreground">
                    {formatNumberFull(group.total)}
                  </td>
                ))}
                <td className="border-l-2 border-border py-2.5 pl-3 pr-2 text-right tabular-nums font-bold tracking-tight text-teal-700 dark:text-teal-400">
                  {formatNumberFull(dailyGroups.reduce((sum, group) => sum + group.total, 0))}
                </td>
              </tr>

              {dailyMatrix.kilnNames.map((kilnName) => {
                const values = dailyMatrix.dates.map((date) => {
                  const entry = dailyMatrix.values.get(`${kilnName}||${date}`);
                  return (entry?.glost || 0) + (entry?.decal || 0);
                });
                const total = values.reduce((sum, value) => sum + value, 0);
                if (total <= 0) return null;
                return (
                  <tr key={kilnName} className="border-b border-border/40 hover:bg-muted/20">
                    <td className="bg-background py-2.5 pl-2 pr-1 font-bold text-foreground">
                      {kilnName}
                    </td>
                    {values.map((value, index) => (
                      <td
                        key={dailyMatrix.dates[index]}
                        className="py-2.5 px-0.5 text-right tabular-nums tracking-tight text-foreground"
                      >
                        {value > 0 ? formatNumberFull(value) : "—"}
                      </td>
                    ))}
                    <td className="border-l-2 border-border py-2.5 pl-3 pr-2 text-right tabular-nums font-bold tracking-tight text-foreground">
                      {formatNumberFull(total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {view === "items" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">กรองเตา</span>
            <select
              value={itemKilnFilter}
              onChange={(e) => setItemKilnFilter(e.target.value)}
              className="text-[11px] rounded-md border border-border bg-muted px-2 py-1"
            >
              {kilnOptions.map((k) => (
                <option key={k} value={k}>
                  {k === "All" ? "ทุกเตา" : k}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto rounded-md border border-border max-h-[420px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-800 text-white">
                  <th className="text-left font-semibold py-2 px-2">เตา</th>
                  <th className="text-left font-semibold py-2 px-2">Shape</th>
                  <th className="text-left font-semibold py-2 px-2">รายการ</th>
                  <th className="text-left font-semibold py-2 px-2">ดิน</th>
                  <th className="text-right font-semibold py-2 px-2">เผาเคลือบ</th>
                  <th className="text-right font-semibold py-2 px-2">เผาซ่อม</th>
                  <th className="text-right font-semibold py-2 px-2">รวม</th>
                </tr>
              </thead>
              <tbody>
                {(itemKilnFilter === "All" ? summaryRows.map((r) => r.kilnName) : [itemKilnFilter]).flatMap((kiln, ki) => {
                  const items = itemsByKiln.get(kiln) || [];
                  return items.map((item, ii) => (
                    <tr
                      key={`${kiln}-${item.description}`}
                      className={(ki + ii) % 2 === 0 ? "bg-white dark:bg-slate-950" : "bg-slate-50 dark:bg-slate-900"}
                    >
                      <td className="py-1.5 px-2 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{kiln}</td>
                      <td className="py-1.5 px-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {PIECE_SHAPE_LABELS[item.shape]}
                      </td>
                      <td className="py-1.5 px-2 text-slate-800 dark:text-slate-200 max-w-[320px] truncate" title={item.description}>
                        {item.description}
                      </td>
                      <td className="py-1.5 px-2 text-slate-700 dark:text-slate-300">{CLAY_LABELS[item.clay]}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums font-medium text-teal-800 dark:text-teal-300">
                        {item.glaze.toLocaleString()}
                      </td>
                      <td className="py-1.5 px-2 text-right tabular-nums font-medium text-orange-700 dark:text-orange-300">
                        {item.repair.toLocaleString()}
                      </td>
                      <td className="py-1.5 px-2 text-right tabular-nums font-bold text-slate-900 dark:text-slate-100">
                        {item.total.toLocaleString()}
                      </td>
                    </tr>
                  ));
                })}
                {summaryRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      ไม่มีข้อมูล
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={Boolean(popup)} onOpenChange={(open) => !open && setPopup(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base">{popup?.title ?? "รายการเผา"}</DialogTitle>
            <DialogDescription className="text-xs">
              เรียงตาม Shape แล้วตามจำนวน · {popupItems.length} รายการ · {periodLabel}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto rounded-md border border-border flex-1 min-h-0">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-800 text-white">
                  <th className="text-left font-semibold py-2 px-2">Shape</th>
                  <th className="text-left font-semibold py-2 px-2">รายการ</th>
                  <th className="text-left font-semibold py-2 px-2">ดิน</th>
                  <th className="text-right font-semibold py-2 px-2">เผาเคลือบ</th>
                  <th className="text-right font-semibold py-2 px-2">เผาซ่อม</th>
                  <th className="text-right font-semibold py-2 px-2">รวม</th>
                </tr>
              </thead>
              <tbody>
                {popupItems.map((item, i) => (
                  <tr
                    key={`${item.shape}-${item.description}`}
                    className={i % 2 === 0 ? "bg-white dark:bg-slate-950" : "bg-slate-50 dark:bg-slate-900"}
                  >
                    <td className="py-1.5 px-2 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {PIECE_SHAPE_LABELS[item.shape]}
                    </td>
                    <td className="py-1.5 px-2 text-slate-800 dark:text-slate-200 max-w-[280px]" title={item.description}>
                      {item.description}
                    </td>
                    <td className="py-1.5 px-2 text-slate-700 dark:text-slate-300">{CLAY_LABELS[item.clay]}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-teal-800 dark:text-teal-300">
                      {item.glaze.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-orange-700 dark:text-orange-300">
                      {item.repair.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-bold">{item.total.toLocaleString()}</td>
                  </tr>
                ))}
                {popupItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      ไม่มีรายการ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type ClayFireBreakdown = {
  total: number;
  glaze: number;
  repair: number;
};

export type DecorationsKpi = {
  total: number;
  avgPerDay: number;
};

export function GlazeKpiStrip({
  total,
  white,
  black,
  periodLabel,
  decorations,
}: {
  total: number;
  white: ClayFireBreakdown;
  black: ClayFireBreakdown;
  periodLabel: string;
  decorations?: DecorationsKpi | null;
}) {
  const decoTotal = decorations?.total ?? 0;
  const grandTotal = total + decoTotal;
  const glostOfGrand = pct(total, grandTotal);
  const decoOfGrand = pct(decoTotal, grandTotal);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <div
        className="bg-card rounded-lg border border-border p-3 shadow-card opacity-0 animate-fade-in flex flex-col gap-2"
        style={{ animationDelay: "0ms", borderLeftWidth: "3px", borderLeftColor: "#f59e0b" }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">TOTAL</p>
            <p className="text-xl font-bold text-foreground leading-none tabular-nums mt-0.5">
              {formatNumber(grandTotal)}
              <span className="text-[10px] font-normal text-muted-foreground ml-0.5">pcs</span>
            </p>
          </div>
          <span className="text-[10px] text-muted-foreground">{periodLabel}</span>
        </div>

        <div className="h-1.5 rounded-full bg-muted overflow-hidden flex">
          <div className="h-full" style={{ width: `${glostOfGrand}%`, backgroundColor: "#f59e0b" }} />
          <div className="h-full" style={{ width: `${decoOfGrand}%`, backgroundColor: "#8b5cf6" }} />
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="rounded-md bg-muted/60 px-2 py-1.5">
            <p className="text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
              Glost
            </p>
            <p className="font-semibold text-foreground tabular-nums mt-0.5">
              {formatNumber(total)}
              <span className="font-normal text-muted-foreground ml-1">{glostOfGrand}%</span>
            </p>
          </div>
          <div className="rounded-md bg-muted/60 px-2 py-1.5">
            <p className="text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#8b5cf6" }} />
              Decoration
            </p>
            <p className="font-semibold text-foreground tabular-nums mt-0.5">
              {formatNumber(decoTotal)}
              <span className="font-normal text-muted-foreground ml-1">{decoOfGrand}%</span>
            </p>
          </div>
        </div>
      </div>

      {([
        { key: "white", label: CLAY_LABELS.white, accent: CLAY_COLORS.white, data: white },
        { key: "black", label: CLAY_LABELS.black, accent: CLAY_COLORS.black, data: black },
      ] as const).map((card, i) => {
        const glazePct = pct(card.data.glaze, card.data.total);
        const repairPct = pct(card.data.repair, card.data.total);
        return (
          <div
            key={card.key}
            className="bg-card rounded-lg border border-border p-3 shadow-card opacity-0 animate-fade-in flex flex-col gap-2"
            style={{ animationDelay: `${(i + 1) * 40}ms`, borderLeftWidth: "3px", borderLeftColor: card.accent }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{card.label}</p>
                <p className="text-xl font-bold text-foreground leading-none tabular-nums mt-0.5">
                  {formatNumber(card.data.total)}
                  <span className="text-[10px] font-normal text-muted-foreground ml-0.5">pcs</span>
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums">{pct(card.data.total, grandTotal)}%</span>
            </div>

            <div className="h-1.5 rounded-full bg-muted overflow-hidden flex">
              <div className="h-full" style={{ width: `${glazePct}%`, backgroundColor: FIRE_COLORS.glaze }} />
              <div className="h-full" style={{ width: `${repairPct}%`, backgroundColor: FIRE_COLORS.repair }} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="rounded-md bg-muted/60 px-2 py-1.5">
                <p className="text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: FIRE_COLORS.glaze }} />
                  {FIRE_LABELS.glaze}
                </p>
                <p className="font-semibold text-foreground tabular-nums mt-0.5">
                  {formatNumber(card.data.glaze)}
                  <span className="font-normal text-muted-foreground ml-1">{glazePct}%</span>
                </p>
              </div>
              <div className="rounded-md bg-muted/60 px-2 py-1.5">
                <p className="text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: FIRE_COLORS.repair }} />
                  {FIRE_LABELS.repair}
                </p>
                <p className="font-semibold text-foreground tabular-nums mt-0.5">
                  {formatNumber(card.data.repair)}
                  <span className="font-normal text-muted-foreground ml-1">{repairPct}%</span>
                </p>
              </div>
            </div>
          </div>
        );
      })}

      <div
        className="bg-card rounded-lg border border-border p-3 shadow-card opacity-0 animate-fade-in flex flex-col gap-1"
        style={{ animationDelay: "120ms", borderLeftWidth: "3px", borderLeftColor: "#8b5cf6" }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Decoration</p>
            <p className="text-xl font-bold text-foreground leading-none tabular-nums mt-0.5">
              {formatNumber(decoTotal)}
              <span className="text-[10px] font-normal text-muted-foreground ml-0.5">pcs</span>
            </p>
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">{pct(decoTotal, grandTotal)}%</span>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {decorations && decorations.avgPerDay > 0
            ? `เฉลี่ย/วัน ${decorations.avgPerDay.toLocaleString()}`
            : "In-Glaze · Google Sheet"}
        </p>
      </div>
    </div>
  );
}
