import { useState, useEffect, useMemo, useCallback } from "react";
import { Flame, Calendar, RefreshCw } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProdStatCard } from "./StatCardKiln";
import { CategoryChartKiln } from "./CategoryChartKiln";
import { TypeRatioChart } from "./TypeRatioChart";
import { ProductChartKiln } from "./ProductChartKiln";
import { QualitySection } from "./QualitySection";
import {
  KILN_WKCTR_MAP,
  FORMM_WKCTR_MAP,
  CATEGORY_COLORS,
  resolveKilnName,
  getApiBase,
  toDateStr,
} from "./KilnDashboardStyles";
import type {
  KilnProductionRecord,
  QualityRecord,
  WeeklyQualityRecord,
  MonthlyData,
  TypeRatioData,
} from "./KilnDashboardStyles";

// ─── API fetcher ───
async function queryDB(sql: string, db: string) {
  const res = await fetch(`${getApiBase()}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql, db }),
  });
  if (!res.ok) throw new Error(`Query failed: ${res.statusText}`);
  const json = await res.json();
  return json.recordset || [];
}

// ─── Build SQL queries ───
function buildKilnSQL(startDate: string, endDate: string) {
  return `
    SELECT
      Wkctr,
      LEFT(Item, 3) AS ItemPrefix,
      LEFT(Doc, 1) AS DocType,
      FORMAT(Date, 'yyyy-MM-dd') AS trx_date,
      SUM(QtyProc) AS QtyProc,
      SUM(QtyMoved) AS QtyMoved,
      SUM(QtyScrap) AS QtyScrap,
      SUM(QtyReject) AS QtyReject
    FROM Kiln_trans
    WHERE Date >= '${startDate}' AND Date <= '${endDate}'
      AND (Item LIKE '142%' OR Item LIKE '143%')
    GROUP BY Wkctr, LEFT(Item, 3), LEFT(Doc, 1), FORMAT(Date, 'yyyy-MM-dd')
  `;
}

function buildFormmSQL(startDate: string, endDate: string) {
  return `
    SELECT
      Wkctr,
      LEFT(Doc, 1) AS DocType,
      FORMAT(Date, 'yyyy-MM-dd') AS trx_date,
      SUM(QtyProc) AS QtyProc,
      SUM(QtyMoved) AS QtyMoved,
      SUM(QtyScrap) AS QtyScrap,
      SUM(QtyReject) AS QtyReject
    FROM Formm_trans
    WHERE OP = '30'
      AND Date >= '${startDate}' AND Date <= '${endDate}'
    GROUP BY Wkctr, LEFT(Doc, 1), FORMAT(Date, 'yyyy-MM-dd')
  `;
}

function buildQualitySQL(startDate: string, endDate: string) {
  return `
    WITH base AS (
      SELECT
        m_doc, m_date, m_kiln, m_part,
        CASE
          WHEN MAX(CASE WHEN m_user LIKE 'somboon%' AND UPPER(RTRIM(LTRIM(m_cp))) = 'C' THEN 1 ELSE 0 END) = 1
          THEN 'Cs'
          ELSE UPPER(RTRIM(LTRIM(m_cp)))
        END AS computed_cp,
        MAX(qtyp) AS qtyp,
        MAX(qtycomp) AS qtycomp,
        MAX(qtyscrp) AS qtyscrp,
        MAX(qtyrjct) AS qtyrjct
      FROM v_rpt_sort
      WHERE m_date >= '${startDate}' AND m_date <= '${endDate}'
        AND m_kiln NOT IN ('DK1T','REWORK')
      GROUP BY m_doc, m_date, m_kiln, m_part, UPPER(RTRIM(LTRIM(m_cp)))
    )
    SELECT
      m_kiln,
      CASE WHEN m_part LIKE '142%' THEN 'WW' WHEN m_part LIKE '143%' THEN 'DW' END AS wareType,
      computed_cp,
      SUM(qtyp) AS totalQtyp,
      SUM(qtycomp) AS totalQtycomp,
      SUM(qtyscrp) AS totalScrap,
      SUM(qtyrjct) AS totalReject
    FROM base
    WHERE m_part LIKE '142%' OR m_part LIKE '143%'
    GROUP BY m_kiln,
      CASE WHEN m_part LIKE '142%' THEN 'WW' WHEN m_part LIKE '143%' THEN 'DW' END,
      computed_cp
  `;
}

function buildWeeklyQualitySQL(endDate: string) {
  // Fetch last 56 days (8 weeks) of daily quality data
  return `
    WITH base AS (
      SELECT
        m_doc, m_date, m_kiln, m_part,
        CASE
          WHEN MAX(CASE WHEN m_user LIKE 'somboon%' AND UPPER(RTRIM(LTRIM(m_cp))) = 'C' THEN 1 ELSE 0 END) = 1
          THEN 'Cs'
          ELSE UPPER(RTRIM(LTRIM(m_cp)))
        END AS computed_cp,
        MAX(qtyp) AS qtyp,
        MAX(qtycomp) AS qtycomp,
        MAX(qtyscrp) AS qtyscrp,
        MAX(qtyrjct) AS qtyrjct
      FROM v_rpt_sort
      WHERE m_date >= DATEADD(DAY, -55, '${endDate}') AND m_date <= '${endDate}'
        AND (m_part LIKE '142%' OR m_part LIKE '143%')
        AND m_kiln NOT IN ('DK1T','REWORK')
      GROUP BY m_doc, m_date, m_kiln, m_part, UPPER(RTRIM(LTRIM(m_cp)))
    )
    SELECT
      m_kiln,
      computed_cp,
      CAST(m_date AS DATE) AS trx_date,
      SUM(qtyp) AS totalQtyp,
      SUM(qtycomp) AS totalQtycomp,
      SUM(qtyscrp) AS totalScrap,
      SUM(qtyrjct) AS totalReject
    FROM base
    GROUP BY m_kiln, computed_cp, CAST(m_date AS DATE)
    ORDER BY trx_date
  `;
}

// ─── Transform data ───
function transformKilnData(rows: Record<string, unknown>[]): KilnProductionRecord[] {
  const results: KilnProductionRecord[] = [];
  for (const r of rows) {
    const kilnName = resolveKilnName(String(r.Wkctr ?? ''), KILN_WKCTR_MAP);
    if (!kilnName) continue;
    const category = r.ItemPrefix === '142' ? 'Glaze' : r.ItemPrefix === '143' ? 'Decal' : null;
    if (!category) continue;
    results.push({
      kilnName,
      category,
      docType: r.DocType === 'D' ? 'Normal' : 'Repair',
      trx_date: String(r.trx_date ?? ''),
      qtyProc: Number(r.QtyProc) || 0,
      qtyMoved: Number(r.QtyMoved) || 0,
      qtyScrap: Number(r.QtyScrap) || 0,
      qtyReject: Number(r.QtyReject) || 0,
    });
  }
  return results;
}

function transformFormmData(rows: Record<string, unknown>[]): KilnProductionRecord[] {
  const results: KilnProductionRecord[] = [];
  for (const r of rows) {
    const kilnName = resolveKilnName(String(r.Wkctr ?? ''), FORMM_WKCTR_MAP);
    if (!kilnName) continue;
    results.push({
      kilnName,
      category: 'Biscuit',
      docType: r.DocType === 'D' ? 'Normal' : 'Repair',
      trx_date: String(r.trx_date ?? ''),
      qtyProc: Number(r.QtyProc) || 0,
      qtyMoved: Number(r.QtyMoved) || 0,
      qtyScrap: Number(r.QtyScrap) || 0,
      qtyReject: Number(r.QtyReject) || 0,
    });
  }
  return results;
}

// ─── Main Page Component ───
export default function KilnP1() {
  const [startDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
  });
  const [endDate] = useState(() => toDateStr(new Date()));

  const [productionData, setProductionData] = useState<KilnProductionRecord[]>([]);
  const [qualityData, setQualityData] = useState<QualityRecord[]>([]);
  const [weeklyQuality, setWeeklyQuality] = useState<WeeklyQualityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [kilnRows, formmRows, qualityRows, weeklyRows] = await Promise.all([
        queryDB(buildKilnSQL(startDate, endDate), 'kiln'),
        queryDB(buildFormmSQL(startDate, endDate), 'formming'),
        queryDB(buildQualitySQL(startDate, endDate), 'sorting'),
        queryDB(buildWeeklyQualitySQL(endDate), 'sorting'),
      ]);
      const kilnProd = transformKilnData(kilnRows);
      const formmProd = transformFormmData(formmRows);
      setProductionData([...kilnProd, ...formmProd]);
      setQualityData(qualityRows);
      setWeeklyQuality(weeklyRows.map((r: Record<string, unknown>) => ({
        m_kiln: String(r.m_kiln ?? ''),
        computed_cp: String(r.computed_cp ?? ''),
        trx_date: String(r.trx_date ?? '').slice(0, 10),
        totalQtyp: Number(r.totalQtyp) || 0,
        totalQtycomp: Number(r.totalQtycomp) || 0,
        totalScrap: Number(r.totalScrap) || 0,
        totalReject: Number(r.totalReject) || 0,
      })));
    } catch (err: unknown) {
      console.error('Kiln Dashboard fetch error:', err);
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Derived state ───
  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of productionData) map.set(r.category, (map.get(r.category) || 0) + r.qtyProc);
    return ['Biscuit', 'Glaze', 'Decal'].map(cat => ({
      name: cat,
      value: map.get(cat) || 0,
      color: CATEGORY_COLORS[cat],
    }));
  }, [productionData]);

  const totalYTD = useMemo(() => categoryTotals.reduce((s, c) => s + c.value, 0), [categoryTotals]);

  const topKilns = useMemo(() => {
    const kilnMap = new Map<string, Map<string, number>>();
    for (const r of productionData) {
      let catMap = kilnMap.get(r.category);
      if (!catMap) { catMap = new Map(); kilnMap.set(r.category, catMap); }
      catMap.set(r.kilnName, (catMap.get(r.kilnName) || 0) + r.qtyProc);
    }
    const result: Record<string, { name: string; qty: number }> = {};
    for (const cat of ['Biscuit', 'Glaze', 'Decal']) {
      const catMap = kilnMap.get(cat);
      if (!catMap || catMap.size === 0) { result[cat] = { name: '-', qty: 0 }; continue; }
      let best = { name: '-', qty: 0 };
      catMap.forEach((qty, name) => { if (qty > best.qty) best = { name, qty }; });
      result[cat] = best;
    }
    return result;
  }, [productionData]);

  const typeRatio = useMemo(() => {
    const calc = (category: string): TypeRatioData => {
      let normal = 0, repair = 0;
      for (const r of productionData) {
        if (r.category !== category) continue;
        if (r.docType === 'Normal') normal += r.qtyProc;
        else repair += r.qtyProc;
      }
      return { normal, repair, total: normal + repair };
    };
    return { glaze: calc('Glaze'), decal: calc('Decal') };
  }, [productionData]);



  return (
    <div className="min-h-screen flex w-full bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-y-auto min-w-0">
        <DashboardHeader />

        {/* Page Header */}
        <div className="px-6 pt-4 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Flame className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground leading-tight">Firing Overview</h1>
                <p className="text-xs text-muted-foreground">Year-to-date production &amp; quality monitoring</p>
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
                <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
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
                <button onClick={fetchAll} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">ลองใหม่</button>
              </div>
            </div>
          ) : (
            <>
              {/* ══════════════════════════════════════════════
                  PRODUCTION SECTION
              ══════════════════════════════════════════════ */}
              <section>
                {/* Section Title */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">🔥</span>
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Production</h2>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Row 1: 4 Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <ProdStatCard label="TOTAL YTD" value={totalYTD} isTotal delay={0} />
                  <ProdStatCard label="#1 Kiln — Biscuit" kilnName={topKilns.Biscuit.name} value={topKilns.Biscuit.qty} category="Biscuit" delay={40} />
                  <ProdStatCard label="#1 Kiln — Glaze" kilnName={topKilns.Glaze.name} value={topKilns.Glaze.qty} category="Glaze" delay={80} />
                  <ProdStatCard label="#1 Kiln — Decal" kilnName={topKilns.Decal.name} value={topKilns.Decal.qty} category="Decal" delay={120} />
                </div>

                {/* Row 2: Charts — donuts compact, production chart wider */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.8fr] gap-4">
                  {/* Process/Kiln Ratio Donut */}
                  <div>
                    <CategoryChartKiln data={productionData} />
                  </div>
                  {/* Type Ratio Donut */}
                  <div>
                    <TypeRatioChart glazeData={typeRatio.glaze} decalData={typeRatio.decal} />
                  </div>
                  {/* Production trend chart — tall */}
                  <div className="h-full min-h-[280px]">
                    <ProductChartKiln data={productionData} />
                  </div>
                </div>
              </section>

              {/* ══════════════════════════════════════════════
                  QUALITY SECTION
              ══════════════════════════════════════════════ */}
              <section>
                {/* Section Title */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">🔬</span>
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Quality</h2>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <QualitySection rawData={qualityData} weeklyData={weeklyQuality} />
              </section>
            </>
          )}
        </div>
      </main>

      {/* Fade-in animation (scoped) */}
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
