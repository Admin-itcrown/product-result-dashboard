import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProductTableFormmProps {
  startDate?: Date;
  endDate?: Date;
}

export function ProductTableFormm({
  startDate,
  endDate,
}: ProductTableFormmProps = {}) {
  const dbProfile = "formming";

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
        SELECT
          [Line],
          [Item],
          [Clay],
          [Description],
[Description2],
[Date],

          SUM([QtyProc]) AS TotalQtyProc,
          SUM([QtyMoved]) AS TotalQtyMoved,
          SUM([QtyScrap]) AS TotalQtyScrap,

          CAST(
            CAST(SUM([QtyScrap]) AS FLOAT)
            / NULLIF(SUM([QtyProc]), 0) * 100
            AS DECIMAL(5,2)
          ) AS ScrapPercent

        FROM [Db_Formming].[dbo].[Formm_trans]

        WHERE [Date] BETWEEN '${formattedStart}' AND '${formattedEnd}'
          AND [OP] = 10

        GROUP BY
          [Line],
          [Item],
          [Clay],
          [Description],
[Description2],
[Date]

        HAVING SUM([QtyProc]) > 0

        ORDER BY ScrapPercent DESC
      `;

      const res = await fetch(`${apiBase}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, db: dbProfile }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Query failed");
      }

      const filtered = (data.recordset || []).sort(
        (a: any, b: any) =>
          Number(b.ScrapPercent || 0) -
          Number(a.ScrapPercent || 0)
      );

      setRows(filtered);

    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  const exportToCsv = () => {
    if (!rows || rows.length === 0) return;

    const headers = [
      "Line",
      "Item",
      "Clay",
      "Description",
      "Description2",
      "Date",
      "Proc",
      "Moved",
      "Scrap Qty",
      "Scrap %",
    ];

    const lines = rows.map((r) => {
      const date = r.Date ? format(new Date(r.Date), "dd/MM/yyyy") : "";
      const lineVal = r.Line ? r.Line.slice(2, 5) : "";

      const escape = (v: any) => {
        if (v === null || v === undefined) return "";
        return String(v).replace(/"/g, '""');
      };

      return [
        `"${escape(lineVal)}"`,
        `"${escape(r.Item)}"`,
        `"${escape(r.Clay)}"`,
        `"${escape(r.Description)}"`,
        `"${escape(r.Description2)}"`,
        `"${escape(date)}"`,
        Number(r.TotalQtyProc || 0),
        Number(r.TotalQtyMoved || 0),
        Number(r.TotalQtyScrap || 0),
        `${Number(r.ScrapPercent || 0).toFixed(2)}%`,
      ].join(",");
    });

    const csv = [headers.join(','), ...lines].join('\n');

    // prepend BOM so Excel opens UTF-8 CSV correctly
    const blob = new Blob(["\uFEFF", csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scrap-analysis_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(rows.length / pageSize);

  const pagedRows = rows.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">

      {/* HEADER */}
      <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">
            Scrap Analysis Dashboard
          </h3>

          <p className="text-sm text-slate-300 mt-1">
            Line / Item / Clay / Description / Production
          </p>
        </div>

        <div>
          <button
            onClick={exportToCsv}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Export to Excel
          </button>
        </div>
      </div>

      <div className="p-5">

        {/* ERROR */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="flex justify-center py-14">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <div className="text-slate-600">
                Loading...
              </div>
            </div>
          </div>
        )}

        {/* EMPTY */}
        {!loading && pagedRows.length === 0 && !error && (
          <div className="text-center py-14 text-slate-500">
            No Data
          </div>
        )}

        {/* TABLE */}
        {!loading && pagedRows.length > 0 && (
          <>
            <ScrollArea className="rounded-xl border border-slate-200">

              <table className="w-full">

                <thead>
                  <tr className="bg-slate-100 border-b">

                    <th className="px-4 py-3 text-left text-xs font-bold">
                      #
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-bold">
                      Line
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-bold">
                      Item
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-bold">
                      Clay
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-bold">
                      Description
                    </th>
 <th className="px-4 py-3 text-left text-xs font-bold">
                      Description2
                    </th>

 <th className="px-4 py-3 text-left text-xs font-bold">
                      Date
                    </th>



                    <th className="px-4 py-3 text-right text-xs font-bold text-blue-600">
                      Proc
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-bold text-green-600">
                      Moved
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-bold text-rose-600">
                      Scrap Qty
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-bold text-rose-600">
                      Scrap %
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {pagedRows.map((row, idx) => {

                    const scrapQty = Number(row.TotalQtyScrap || 0);
                    const scrapPercent = Number(row.ScrapPercent || 0);

                    return (
                      <tr
                        key={idx}
                        className="border-b hover:bg-slate-50 transition"
                      >

                        {/* INDEX */}
                        <td className="px-4 py-3 font-bold">
                          {(page - 1) * pageSize + idx + 1}
                        </td>

                        {/* LINE */}
                        <td className="px-4 py-3 font-semibold">
                          {row.Line ? row.Line.slice(2, 5) : "-"}
                        </td>

                        {/* ITEM */}
                        <td className="px-4 py-3">
                          {row.Item || "-"}
                        </td>

                        {/* CLAY */}
                        <td className="px-4 py-3 text-slate-700">
                          {row.Clay || "-"}
                        </td>

                        {/* DESCRIPTION */}
                        <td className="px-4 py-3 text-slate-600 text-sm">
                          {row.Description || "-"}
                        </td>
 {/* DESCRIPTION */}
                        <td className="px-4 py-3 text-slate-600 text-sm">
                          {row.Description2 || "-"}
                        </td>

 {/* DESCRIPTION */}
                        <td className="px-4 py-3 text-slate-600 text-sm">
                          {row.Date ? format(new Date(row.Date), "dd/MM/yyyy") : "-"}
                        </td>



                        {/* PROC */}
                        <td className="px-4 py-3 text-right text-blue-600 font-medium">
                          {Number(row.TotalQtyProc || 0).toLocaleString()}
                        </td>

                        {/* MOVED */}
                        <td className="px-4 py-3 text-right text-green-600 font-medium">
                          {Number(row.TotalQtyMoved || 0).toLocaleString()}
                        </td>

                        {/* SCRAP QTY */}
                        <td className="px-4 py-3 text-right text-rose-600 font-bold">
                          {scrapQty.toLocaleString()}
                        </td>

                        {/* SCRAP % */}
                        <td className="px-4 py-3 text-right">

                          {scrapQty === 0 ? (
                            <span className="inline-flex px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                              ไม่มี Scrap
                            </span>
                          ) : (
                            <span className="inline-flex px-3 py-1 rounded-full bg-rose-50 text-rose-700 font-bold">
                              {scrapPercent.toFixed(2)}%
                            </span>
                          )}

                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </ScrollArea>

            {/* PAGINATION */}
            <div className="flex items-center justify-between mt-4">

              <div className="text-sm text-slate-500">
                Page {page} / {totalPages || 1}
              </div>

              <div className="flex gap-2">

                <button
                  onClick={() =>
                    setPage((p) => Math.max(p - 1, 1))
                  }
                  disabled={page === 1}
                  className="px-4 py-2 border rounded-lg disabled:opacity-40"
                >
                  Prev
                </button>

                <button
                  onClick={() =>
                    setPage((p) => Math.min(p + 1, totalPages))
                  }
                  disabled={page === totalPages}
                  className="px-4 py-2 border rounded-lg disabled:opacity-40"
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

export default ProductTableFormm;