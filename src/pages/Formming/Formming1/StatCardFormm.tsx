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
        const formattedStart = format(
          startDate,
          "yyyy-MM-dd"
        );

        const formattedEnd = format(
          endDate,
          "yyyy-MM-dd"
        );

        const mainQuery = `
          SELECT 
            SUM([QtyProc]) AS TotalQtyProc,
            SUM([QtyMoved]) AS TotalQtyMoved,
            SUM([QtyScrap]) AS TotalQtyScrap
          FROM [Db_Formming].[dbo].[Formm_trans]
          WHERE [Date] BETWEEN '${formattedStart}' AND '${formattedEnd}'
          AND [OP] = 10
        `;

        const response = await fetch(
          `${apiBase}/query`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              query: mainQuery,
              db: dbProfile,
            }),
          }
        );

        const payload =
          await response.json();

        setStatsData(
          payload?.recordset || []
        );
      } catch (err) {
        console.error(err);

        setStatsData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  return {
    statsData,
    loading,
  };
}

/* ================================
   Group Config
================================ */

const GROUPS = [
  {
    title: "101-104",
    codes: ["101", "102", "103", "104"],
  },

  {
    title: "105-106",
    codes: ["105", "106"],
  },

  {
    title: "201-204",
    codes: ["201", "202", "203", "204"],
  },

  {
    title: "205",
    codes: ["205"],
  },

  {
    title: "301-304",
    codes: ["301", "302", "303", "304"],
  },

  {
    title: "401-404",
    codes: ["401", "402", "403", "404"],
  },

  {
    title: "501-504",
    codes: ["501", "502", "503", "504"],
  },

  {
    title: "601-604",
    codes: ["601", "602", "603", "604"],
  },

  {
    title: "701-704",
    codes: ["701", "702", "703", "704"],
  },

  {
    title: "801-804",
    codes: ["801", "802", "803", "804"],
  },
];

/* ================================
   Hook: Fetch Group Summary
================================ */

export function useFetchGroupSummary(
  startDate: Date | undefined,
  endDate: Date | undefined
) {
  const [groupData, setGroupData] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    if (!startDate || !endDate) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const dbProfile = "formming";

        const envApi =
          (import.meta as any)?.env
            ?.VITE_API_URL;

        const apiBase =
          envApi ||
          `${window.location.protocol}//${window.location.hostname}:3001`;

        const formattedStart = format(
          startDate,
          "yyyy-MM-dd"
        );

        const formattedEnd = format(
          endDate,
          "yyyy-MM-dd"
        );

        const queries = GROUPS.map(
          (group) => {
            return `
              SELECT
                '${group.title}' + ' ' +
                MAX(LEFT(itemgroup.code_cmmt1,3)) AS GroupName,

                SUM(Formm_trans.QtyProc) AS Ptotal,

                SUM(Formm_trans.QtyMoved) AS sumA,

                SUM(Formm_trans.QtyScrap) AS sumscrap

              FROM Formm_trans

              INNER JOIN pt_mstr
                ON Formm_trans.Item = pt_mstr.pt_part

              INNER JOIN itemgroup
                ON pt_mstr.pt_group = itemgroup.code_value1

              WHERE itemgroup.code_value1 IN (${group.codes
                .map((c) => `'${c}'`)
                .join(",")})

              AND [Date] BETWEEN '${formattedStart}' AND '${formattedEnd}'

              AND [OP] = 10
            `;
          }
        );

        const fullQuery =
          queries.join(" UNION ALL ");

        const response = await fetch(
          `${apiBase}/query`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              query: fullQuery,
              db: dbProfile,
            }),
          }
        );

        const payload =
          await response.json();

        const records =
          payload?.recordset?.filter(
            (item: any) =>
              Number(item.Ptotal || 0) > 0
          ) || [];

        setGroupData(records);
      } catch (error) {
        console.error(error);

        setGroupData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  return {
    groupData,
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
    <div className="rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition">
      <div>

        <p className="text-xl font-semibold text-blue-700">
          {title}
        </p>

        <p className="text-3xl font-bold mt-2 text-slate-800">
          {value}
        </p>

        {change && (
          <div className="flex items-center gap-1 mt-3 text-green-600 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />

            <span>
              Moved {change}
            </span>
          </div>
        )}

        {scrap && (
          <div className="flex items-center gap-1 mt-1 text-red-600 text-sm font-medium">
            <X className="h-4 w-4" />

            <span>
              Scrap {scrap}

              {scrapPercent
                ? ` (${scrapPercent})`
                : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================
   Group Block
================================ */

function GroupBlock({
  title,
  proc,
  moved,
  scrap,
}: {
  title: string;
  proc: number;
  moved: number;
  scrap: number;
}) {
  const scrapPercent =
    proc > 0
      ? ((scrap / proc) * 100).toFixed(2)
      : "0.00";

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition">

      <div className="mb-4">

        <p className="text-sm text-slate-500 font-medium">
          Group
        </p>

        <h2 className="text-xl font-bold text-blue-700 leading-tight">
          {title}
        </h2>

      </div>

      <div className="space-y-2 text-sm font-medium">

        <div className="flex justify-between">
          <span className="text-slate-600">
            Proc
          </span>

          <span className="text-blue-600">
            {proc.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-600">
            Moved
          </span>

          <span className="text-green-600">
            {moved.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-600">
            Scrap
          </span>

          <span className="text-red-600">
            {scrap.toLocaleString()} (
            {scrapPercent}%)
          </span>
        </div>

      </div>
    </div>
  );
}

/* ================================
   Group Summary Blocks
================================ */

export function GroupSummaryBlocks({
  data,
}: {
  data: any[];
}) {
  if (!data?.length) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">

      {data.map((item, index) => (
        <GroupBlock
          key={index}
          title={item.GroupName}
          proc={Number(item.Ptotal || 0)}
          moved={Number(item.sumA || 0)}
          scrap={Number(item.sumscrap || 0)}
        />
      ))}

    </div>
  );
}