import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProductTableGlazeProps {
  startDate?: Date;
  endDate?: Date;
}

export function ProductTableGlaze({
  startDate,
  endDate,
}: ProductTableGlazeProps = {}) {
  const dbProfile = "glaze";

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    setRows([]);
    setPage(1);

    try {
      const envApi = (import.meta as any)?.env?.VITE_API_URL;

      const apiBase =
        envApi ||
        (typeof window !== "undefined"
          ? `${window.location.protocol}//${window.location.hostname}:3001`
          : "http://localhost:3001");

      const today = new Date();

      const formattedStart = format(startDate || today, "yyyy-MM-dd");
      const formattedEnd = format(endDate || today, "yyyy-MM-dd");

      const query = `
        SELECT TOP (10)
            Item,
            Description,
            Description2,
            Clay,
           
            GlazeDesc,
            SUM(QtyProc)   AS Sumpro,
            SUM(QtyMoved)  AS SumA,
            SUM(QtyReject) AS SumReject,
            SUM(QtyScrap)  AS Sumscrap,
            CAST(SUM(QtyScrap) AS DECIMAL(18,6)) / NULLIF(SUM(QtyProc), 0) AS Yscrap
        FROM (
            SELECT *
            FROM glaze_trans
            WHERE [date] >= '${formattedStart}'
              AND [date] <= '${formattedEnd}'
        ) AS glaze_transA
        WHERE OP = 10
          AND type = 'BACKFLSH'
        GROUP BY Item, Description, Description2, Clay, GlazeDesc
        ORDER BY Yscrap DESC
      `;

      const res = await fetch(`${apiBase}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, db: dbProfile }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Query failed");

      const result = (data.recordset || [])
        .map((r: any) => ({
          ...r,
          YscrapPercent: (Number(r.Yscrap || 0) * 100).toFixed(2),
        }))
        .filter((r: any) => Number(r.Yscrap || 0) > 0);

      setRows(result);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(rows.length / pageSize);

  const pagedRows = rows.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">

      <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800">
        <h3 className="text-xl font-bold text-white">
          Glaze Scrap Top 10
        </h3>
      </div>

      <div className="p-5">

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-10 text-slate-500">
            Loading...
          </div>
        )}

        {!loading && pagedRows.length === 0 && (
          <div className="text-center py-10 text-slate-500">
            No Data
          </div>
        )}

        {!loading && pagedRows.length > 0 && (
          <ScrollArea className="border rounded-xl">
            <table className="w-full">

              <thead>
                <tr className="bg-slate-100">
                  <th className="p-3">#</th>
                  <th className="p-3">Item</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Clay</th>
                  
                  <th className="p-3">Glaze</th>

                  <th className="p-3 text-right text-blue-600">Proc</th>
                  <th className="p-3 text-right text-green-600">Moved</th>
                  <th className="p-3 text-right text-rose-600">Scrap</th>
                  <th className="p-3 text-right text-rose-600">Scrap%</th>
                </tr>
              </thead>

              <tbody>
                {pagedRows.map((row, idx) => (
                  <tr key={idx} className="border-b">

                    <td className="p-3">
                      {(page - 1) * pageSize + idx + 1}
                    </td>

                    <td className="p-3">{row.Item}</td>
                    <td className="p-3">{row.Description}</td>
                    <td className="p-3">{row.Clay}</td>
                    
                    <td className="p-3">{row.GlazeDesc}</td>

                    <td className="p-3 text-right text-blue-600">
                      {Number(row.Sumpro || 0).toLocaleString()}
                    </td>

                    <td className="p-3 text-right text-green-600">
                      {Number(row.SumA || 0).toLocaleString()}
                    </td>

                    <td className="p-3 text-right text-rose-600">
                      {Number(row.Sumscrap || 0).toLocaleString()}
                    </td>

                    <td className="p-3 text-right font-bold">
                      {row.YscrapPercent}%
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

export default ProductTableGlaze;