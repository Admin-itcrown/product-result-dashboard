import {
  KILN_WKCTR_MAP,
  FORMM_WKCTR_MAP,
  resolveKilnName,
  getApiBase,
  classifyClay,
  classifyFireFromDoc,
} from "./KilnDashboardStyles";
import type {
  KilnProductionRecord,
  GlazeProductionRecord,
  WeeklyQualityRecord,
} from "./KilnDashboardStyles";
import { getPieceShapeFromDescription } from "./kilnPieceUtils";

export async function queryDB(sql: string, db: string) {
  const res = await fetch(`${getApiBase()}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql, db }),
  });
  if (!res.ok) throw new Error(`Query failed: ${res.statusText}`);
  const json = await res.json();
  return json.recordset || [];
}

export async function fetchInGlazeData(startDate: string, endDate: string, refresh = false) {
  const params = new URLSearchParams({
    start: startDate,
    end: endDate,
  });
  if (refresh) params.set("refresh", "1");
  const res = await fetch(`${getApiBase()}/api/in-glaze?${params.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `In-Glaze fetch failed: ${res.statusText}`);
  }
  return res.json();
}

/** Fetch only max date from In-Glaze sheet (no date filter). */
export async function fetchInGlazeMeta() {
  const res = await fetch(`${getApiBase()}/api/in-glaze`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `In-Glaze meta failed: ${res.statusText}`);
  }
  return res.json();
}

export function buildKilnSQL(startDate: string, endDate: string) {
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

/** Glaze only (Item 142…) — includes Clay + Description for clay/shape classification */
export function buildGlazeKilnSQL(startDate: string, endDate: string) {
  return `
    SELECT
      Wkctr,
      ISNULL(Clay, '') AS Clay,
      LEFT(Doc, 1) AS DocPrefix,
      ISNULL(Description, '') AS Description,
      FORMAT(Date, 'yyyy-MM-dd') AS trx_date,
      SUM(QtyProc) AS QtyProc,
      SUM(QtyMoved) AS QtyMoved,
      SUM(QtyScrap) AS QtyScrap,
      SUM(QtyReject) AS QtyReject
    FROM Kiln_trans
    WHERE Date >= '${startDate}' AND Date <= '${endDate}'
      AND Item LIKE '142%'
      AND LEFT(Doc, 1) IN ('D', 'P')
    GROUP BY
      Wkctr,
      ISNULL(Clay, ''),
      LEFT(Doc, 1),
      ISNULL(Description, ''),
      FORMAT(Date, 'yyyy-MM-dd')
  `;
}

/** Latest available Glost firing date in Kiln_trans */
export function buildGlazeMaxDateSQL() {
  return `
    SELECT FORMAT(MAX(Date), 'yyyy-MM-dd') AS maxDate
    FROM Kiln_trans
    WHERE Item LIKE '142%'
      AND LEFT(Doc, 1) IN ('D', 'P')
  `;
}

export function buildFormmSQL(startDate: string, endDate: string) {
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

export function buildQualitySQL(startDate: string, endDate: string) {
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

export function buildWeeklyQualitySQL(endDate: string) {
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

export function transformKilnData(rows: Record<string, unknown>[]): KilnProductionRecord[] {
  const results: KilnProductionRecord[] = [];
  for (const r of rows) {
    const kilnName = resolveKilnName(String(r.Wkctr ?? ""), KILN_WKCTR_MAP);
    if (!kilnName) continue;
    const category = r.ItemPrefix === "142" ? "Glaze" : r.ItemPrefix === "143" ? "Decal" : null;
    if (!category) continue;
    results.push({
      kilnName,
      category,
      docType: r.DocType === "D" ? "Normal" : "Repair",
      trx_date: String(r.trx_date ?? ""),
      qtyProc: Number(r.QtyProc) || 0,
      qtyMoved: Number(r.QtyMoved) || 0,
      qtyScrap: Number(r.QtyScrap) || 0,
      qtyReject: Number(r.QtyReject) || 0,
    });
  }
  return results;
}

export function transformGlazeKilnData(rows: Record<string, unknown>[]): GlazeProductionRecord[] {
  const results: GlazeProductionRecord[] = [];
  for (const r of rows) {
    const kilnName = resolveKilnName(String(r.Wkctr ?? ""), KILN_WKCTR_MAP);
    if (!kilnName) continue;
    const fireKind = classifyFireFromDoc(String(r.DocPrefix ?? ""));
    if (!fireKind) continue;
    const clayRaw = String(r.Clay ?? "").trim();
    results.push({
      kilnName,
      clayKind: classifyClay(clayRaw),
      clayRaw,
      fireKind,
      pieceShape: getPieceShapeFromDescription(String(r.Description ?? "")),
      description: String(r.Description ?? "").trim(),
      trx_date: String(r.trx_date ?? ""),
      qtyProc: Number(r.QtyProc) || 0,
      qtyMoved: Number(r.QtyMoved) || 0,
      qtyScrap: Number(r.QtyScrap) || 0,
      qtyReject: Number(r.QtyReject) || 0,
    });
  }
  return results;
}

export function transformFormmData(rows: Record<string, unknown>[]): KilnProductionRecord[] {
  const results: KilnProductionRecord[] = [];
  for (const r of rows) {
    const kilnName = resolveKilnName(String(r.Wkctr ?? ""), FORMM_WKCTR_MAP);
    if (!kilnName) continue;
    results.push({
      kilnName,
      category: "Biscuit",
      docType: r.DocType === "D" ? "Normal" : "Repair",
      trx_date: String(r.trx_date ?? ""),
      qtyProc: Number(r.QtyProc) || 0,
      qtyMoved: Number(r.QtyMoved) || 0,
      qtyScrap: Number(r.QtyScrap) || 0,
      qtyReject: Number(r.QtyReject) || 0,
    });
  }
  return results;
}

export function mapWeeklyQualityRows(rows: Record<string, unknown>[]): WeeklyQualityRecord[] {
  return rows.map((r) => ({
    m_kiln: String(r.m_kiln ?? ""),
    computed_cp: String(r.computed_cp ?? ""),
    trx_date: String(r.trx_date ?? "").slice(0, 10),
    totalQtyp: Number(r.totalQtyp) || 0,
    totalQtycomp: Number(r.totalQtycomp) || 0,
    totalScrap: Number(r.totalScrap) || 0,
    totalReject: Number(r.totalReject) || 0,
  }));
}
