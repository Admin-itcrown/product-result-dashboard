import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProductTablefinishingProps {
  startDate?: Date;
  endDate?: Date;
}

export function ProductTablefinishing({
  startDate,
  endDate,
}: ProductTablefinishingProps = {}) {
  const dbProfile = "formming";

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 🔥 pagination state
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    setRows([]);

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

      // ❗ ไม่ใช้ TOP 10 แล้ว
      const query = `
        SELECT
          [Line],
          [Item],
          [Clay],
          SUM([QtyProc]) AS TotalQtyProc,
          SUM([QtyScrap]) AS TotalQtyScrap,
          CAST(
            CAST(SUM([QtyScrap]) AS FLOAT)
            / NULLIF(SUM([QtyProc]), 0) * 100
            AS DECIMAL(5,2)
          ) AS ScrapPercent
        FROM [Db_Formming].[dbo].[Formm_trans]
        WHERE [Date] BETWEEN '${formattedStart}' AND '${formattedEnd}'
          AND [OP] = 20
        GROUP BY [Line], [Item], [Clay]
        ORDER BY 
          CAST(
            CAST(SUM([QtyScrap]) AS FLOAT)
            / NULLIF(SUM([QtyProc]), 0) * 100
            AS DECIMAL(5,2)
          ) DESC
      `;

      const res = await fetch(`${apiBase}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          db: dbProfile,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Query failed");

      const sorted = (data.recordset || []).sort(
        (a: any, b: any) =>
          Number(b.ScrapPercent || 0) - Number(a.ScrapPercent || 0)
      );

      setRows(sorted);
      setPage(1); // reset page
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  // 🔥 pagination logic
  const totalPages = Math.ceil(rows.length / pageSize);

  const pagedRows = rows.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const nextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  const prevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800">
        <h3 className="text-xl font-bold text-white">
          Scrap Analysis
        </h3>
        <p className="text-sm text-slate-300 mt-1">
          เรียงตามเปอร์เซ็นต์ Scrap
        </p>
      </div>

      {/* Content */}
      <div className="p-5">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-14">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <div className="text-slate-600">
                กำลังดึงข้อมูล...
              </div>
            </div>
          </div>
        )}

        {!loading && pagedRows.length === 0 && !error && (
          <div className="text-center py-14 text-slate-500">
            ไม่มีข้อมูล
          </div>
        )}

        {!loading && pagedRows.length > 0 && (
          <>
            <ScrollArea className="rounded-xl border border-slate-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-100 border-b">
                    <th className="px-4 py-3 text-left text-xs font-bold">#</th>
                    <th className="px-4 py-3 text-left text-xs font-bold">Line</th>
                    <th className="px-4 py-3 text-left text-xs font-bold">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-bold">Clay</th>
                    <th className="px-4 py-3 text-right text-xs font-bold">Proc</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-rose-700">
                      Scrap
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-rose-700">
                      Scrap %
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {pagedRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b hover:bg-slate-50 transition"
                    >
                      <td className="px-4 py-3 font-bold">
                        {(page - 1) * pageSize + idx + 1}
                      </td>

                      <td className="px-4 py-3 font-semibold">
                        {row.Line ? row.Line.slice(2, 5) : "-"}
                      </td>

                      <td className="px-4 py-3">{row.Item || "-"}</td>

                      <td className="px-4 py-3 text-slate-600">
                        {row.Clay || "-"}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {Number(row.TotalQtyProc || 0).toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-rose-600">
                        {Number(row.TotalQtyScrap || 0).toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 font-bold">
                          {row.ScrapPercent || 0}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>

            {/* 🔥 Pagination Controls */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-slate-500">
                Page {page} of {totalPages || 1}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={prevPage}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg border bg-white disabled:opacity-40"
                >
                  Prev
                </button>

                <button
                  onClick={nextPage}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-lg border bg-white disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ProductTablefinishing;