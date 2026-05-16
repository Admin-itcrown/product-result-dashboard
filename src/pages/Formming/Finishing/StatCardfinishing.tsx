import React from "react";

/* ================================
   STAT CARD (NO ICON VERSION)
================================ */

export function StatCardfinishing({
  title,
  value,
  change,
  scrap,
  scrapPercent,
}: any) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition">

      {/* TITLE */}
      <p className="text-xl font-bold text-blue-700">
        {title}
      </p>

      {/* VALUE */}
      <p className="text-3xl font-bold mt-2 text-slate-800">
        {value}
      </p>

      {/* MOVED */}
      {change && (
        <div className="text-green-600 mt-3 text-sm font-medium">
          Moved {change}
        </div>
      )}

      {/* SCRAP */}
      {scrap && (
        <div className="text-red-600 mt-1 text-sm font-medium">
          Scrap {scrap} {scrapPercent ? `(${scrapPercent})` : ""}
        </div>
      )}

    </div>
  );
}

/* ================================
   FETCH: FORMING STATS
================================ */

import { useEffect, useState } from "react";
import { format } from "date-fns";

export function useFetchFinishingStats(
  startDate: Date | undefined,
  endDate: Date | undefined
) {
  const [statsData, setStatsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!startDate || !endDate) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const apiBase =
          (import.meta as any)?.env?.VITE_API_URL ||
          `${window.location.protocol}//${window.location.hostname}:3001`;

        const sql = `
          SELECT 
            SUM(QtyProc) AS TotalQtyProc,
            SUM(QtyMoved) AS TotalQtyMoved,
            SUM(QtyScrap) AS TotalQtyScrap
          FROM [Db_Formming].[dbo].[Formm_trans]
          WHERE [Date] BETWEEN '${format(startDate, "yyyy-MM-dd")}'
          AND '${format(endDate, "yyyy-MM-dd")}'
          AND [OP] = 20
        `;

        const res = await fetch(`${apiBase}/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: sql, db: "formming" }),
        });

        const json = await res.json();
        setStatsData(json?.recordset || []);
      } catch (err) {
        console.error(err);
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
   FETCH GROUP SUMMARY
================================ */

export function useFetchGroupSummary(
  startDate: Date | undefined,
  endDate: Date | undefined
) {
  const [groupData, setGroupData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const GROUP_SQL = `
    SELECT
      CASE
        WHEN itemgroup.code_value1 IN ('101','102','103','104') THEN '101-104'
        WHEN itemgroup.code_value1 IN ('105','106') THEN '105-106'
        WHEN itemgroup.code_value1 IN ('201','202','203','204') THEN '201-204'
        WHEN itemgroup.code_value1 = '205' THEN '205'
        WHEN itemgroup.code_value1 IN ('301','302','303','304') THEN '301-304'
        WHEN itemgroup.code_value1 IN ('401','402','403','404') THEN '401-404'
        WHEN itemgroup.code_value1 IN ('501','502','503','504') THEN '501-504'
        WHEN itemgroup.code_value1 IN ('601','602','603','604') THEN '601-604'
        WHEN itemgroup.code_value1 IN ('701','702','703','704') THEN '701-704'
        WHEN itemgroup.code_value1 IN ('801','802','803','804') THEN '801-804'
      END AS GroupCode,

      SUM(Formm_trans.QtyProc) AS Ptotal,
      SUM(Formm_trans.QtyMoved) AS sumA,
      SUM(Formm_trans.QtyScrap) AS sumscrap

    FROM Formm_trans
    INNER JOIN pt_mstr ON Formm_trans.Item = pt_mstr.pt_part
    INNER JOIN itemgroup ON pt_mstr.pt_group = itemgroup.code_value1

    WHERE [Date] BETWEEN @start AND @end
    AND [OP] = 20

    GROUP BY
      CASE
        WHEN itemgroup.code_value1 IN ('101','102','103','104') THEN '101-104'
        WHEN itemgroup.code_value1 IN ('105','106') THEN '105-106'
        WHEN itemgroup.code_value1 IN ('201','202','203','204') THEN '201-204'
        WHEN itemgroup.code_value1 = '205' THEN '205'
        WHEN itemgroup.code_value1 IN ('301','302','303','304') THEN '301-304'
        WHEN itemgroup.code_value1 IN ('401','402','403','404') THEN '401-404'
        WHEN itemgroup.code_value1 IN ('501','502','503','504') THEN '501-504'
        WHEN itemgroup.code_value1 IN ('601','602','603','604') THEN '601-604'
        WHEN itemgroup.code_value1 IN ('701','702','703','704') THEN '701-704'
        WHEN itemgroup.code_value1 IN ('801','802','803','804') THEN '801-804'
      END
  `;

  useEffect(() => {
    if (!startDate || !endDate) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const apiBase =
          (import.meta as any)?.env?.VITE_API_URL ||
          `${window.location.protocol}//${window.location.hostname}:3001`;

        const res = await fetch(`${apiBase}/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: GROUP_SQL
              .replace("@start", `'${format(startDate, "yyyy-MM-dd")}'`)
              .replace("@end", `'${format(endDate, "yyyy-MM-dd")}'`),
            db: "formming",
          }),
        });

        const json = await res.json();
        setGroupData(json?.recordset || []);
      } catch (err) {
        console.error(err);
        setGroupData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  return { groupData, loading };
}