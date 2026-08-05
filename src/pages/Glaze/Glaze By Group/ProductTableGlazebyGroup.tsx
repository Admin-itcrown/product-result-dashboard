import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { FileDown } from "lucide-react";
import { normalizeGlazeScrapRows } from "@/lib/glazeScrapRows";

interface ProductTableGlazebyGroupProps {
  startDate?: Date;
  endDate?: Date;
  clayFilter?: string;
}

export function ProductTableGlazebyGroup({
  startDate,
  endDate,
  clayFilter,
}: ProductTableGlazebyGroupProps = {}) {
  const dbProfile = "glaze";

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, clayFilter]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    setRows([]);
    setIsSheetOpen(false);

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

        const clayClause =
          clayFilter && clayFilter !== "ALL"
            ? ` AND LEFT(g.[Clay],1) = '${clayFilter.replace("'", "''")}' `
            : "";

        const query = `
        SELECT 
            p.pt_group,
            i.code_cmmt1,
            g.Clay,
            g.[Date],
            SUM(g.QtyProc)    AS SumQtyProc,
            SUM(g.QtyMoved)   AS SumQtyMoved,
            SUM(g.QtyScrap)   AS SumQtyScrap,
            CAST(SUM(g.QtyScrap) AS DECIMAL(18,6)) / NULLIF(SUM(g.QtyProc), 0) AS Yscrap
        FROM pt_mstr AS p
        INNER JOIN itemgroup AS i
            ON p.pt_group = i.code_value1
        INNER JOIN glaze_trans AS g
            ON p.pt_part = g.Item
        WHERE g.[date] >= '${formattedStart}'
          AND g.[date] <= '${formattedEnd}'

          AND g.[Type] = 'BACKFLSH'
          ${clayClause}
        GROUP BY
            p.pt_group,
            i.code_cmmt1,
            g.Clay,
            g.[Date]
        ORDER BY
            g.[Date] ,
            p.pt_group ASC
      `;

      console.log("ProductTable fetch params:", { formattedStart, formattedEnd, clayFilter });
      console.log("ProductTable query:", query);

      const res = await fetch(`${apiBase}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, db: dbProfile }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Query failed");

      const result = normalizeGlazeScrapRows(data.recordset || []);

      setRows(result);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  const displayedRows = rows.slice(0, 10);
  const rowStartIndex = 0;

  const formatNumber = (value: any) =>
    Number(value ?? 0).toLocaleString();

  const formatPercent = (value: any) => {
    const numberValue = Number(value ?? 0);
    if (Number.isNaN(numberValue)) return "0.00%";
    return `${numberValue.toFixed(2)}%`;
  };

  const formatDateCell = (value: any) =>
    value ? format(new Date(value), "dd/MM/yyyy") : "-";

  const selectedDateText = (() => {
    const today = new Date();
    const start = startDate || today;
    const end = endDate || today;
    const formattedStart = format(start, "dd/MM/yyyy");
    const formattedEnd = format(end, "dd/MM/yyyy");
    return formattedStart === formattedEnd
      ? formattedStart
      : `${formattedStart} - ${formattedEnd}`;
  })();

  const handleExportExcel = () => {
    if (rows.length === 0) return;

    const escapeCsvValue = (value: any) => {
      const text = value == null ? "" : String(value);
      const escaped = text.replace(/"/g, '""');
      return text.includes(",") || text.includes("\n") || text.includes('"')
        ? `"${escaped}"`
        : text;
    };

    const headers = [
      "Group",
      "Comment/Description",
      "Clay",
      "Date",
      "Proc",
      "Moved",
      "Scrap",
      "Scrap%",
    ];

    const csvRows = rows.map((row) => [
      row.pt_group,
      row.code_cmmt1,
      row.Clay,
      row.Date ? formatDateCell(row.Date) : "",
      row.SumQtyProc ?? "",
      row.SumQtyMoved ?? "",
      row.SumQtyScrap ?? "",
      formatPercent(row.YscrapPercent),
    ]);

    const csvContent = [headers, ...csvRows]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `glaze-group-scrap-${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-bold text-white">
            Glaze Total Scrap Records by Group ({rows.length})
          </h3>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" /> Export to Excel
          </button>
        </div>
      </div>

      <div className="p-5">
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-10 text-slate-500">Loading...</div>
        )}

        {!loading && displayedRows.length === 0 && (
          <div className="text-center py-10 text-slate-500">No Data</div>
        )}

        {!loading && displayedRows.length > 0 && (
          <ScrollArea className="border rounded-xl">
            <table className="w-full table-fixed min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
                <tr>
                  <th className="w-12 p-3 text-left">#</th>
                  <th className="w-24 p-3 text-left">Group</th>
                  <th className="w-[280px] p-3 text-left">Description</th>
                  <th className="w-24 p-3 text-left">Clay</th>
                  <th className="w-28 p-3 text-left">Date</th>
                  <th className="w-28 p-3 text-right text-blue-600">Proc</th>
                  <th className="w-28 p-3 text-right text-green-600">Moved</th>
                  <th className="w-28 p-3 text-right text-rose-600">Scrap</th>
                  <th className="w-28 p-3 text-right text-rose-600">Scrap%</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="w-12 p-3 text-left">{rowStartIndex + idx + 1}</td>
                    <td className="w-24 p-3 text-left font-medium">{row.pt_group}</td>
                    <td className="w-[280px] p-3 text-left">{row.code_cmmt1}</td>
                    <td className="w-24 p-3 text-left">{row.Clay}</td>
                    <td className="w-28 p-3 text-left">
                      {row.Date
                        ? format(new Date(row.Date), "dd/MM/yyyy")
                        : "-"}
                    </td>
                    <td className="w-28 p-3 text-right text-blue-600">
                      {formatNumber(row.SumQtyProc)}
                    </td>
                    <td className="w-28 p-3 text-right text-green-600">
                      {formatNumber(row.SumQtyMoved)}
                    </td>
                    <td className="w-28 p-3 text-right text-rose-600">
                      {formatNumber(row.SumQtyScrap)}
                    </td>
                    <td className="w-28 p-3 text-right font-bold">
                      {formatPercent(row.YscrapPercent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        )}

        {!loading && rows.length > 10 && (
          <div className="mt-4 text-center">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  More
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[90vh]">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">
                      All Glaze Group Scrap Records
                    </h2>
                    <p className="text-sm text-slate-500">
                      Showing {rows.length} records for{" "}
                      <span className="text-rose-600">{selectedDateText}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    <FileDown className="h-4 w-4" /> Export to Excel
                  </button>
                </div>

                <ScrollArea className="border rounded-xl h-[65vh]">
                  <table className="w-full table-fixed min-w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
                      <tr>
                        <th className="w-12 p-3 text-left">#</th>
                        <th className="w-24 p-3 text-left">Group</th>
                        <th className="w-[280px] p-3 text-left">Description</th>
                        <th className="w-24 p-3 text-left">Clay</th>
                        <th className="w-28 p-3 text-left">Date</th>
                        <th className="w-28 p-3 text-right text-blue-600">Proc</th>
                        <th className="w-28 p-3 text-right text-green-600">Moved</th>
                        <th className="w-28 p-3 text-right text-rose-600">Scrap</th>
                        <th className="w-28 p-3 text-right text-rose-600">Scrap%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="w-12 p-3 text-left">{idx + 1}</td>
                          <td className="w-24 p-3 text-left font-medium">{row.pt_group}</td>
                          <td className="w-[280px] p-3 text-left">{row.code_cmmt1}</td>
                          <td className="w-24 p-3 text-left">{row.Clay}</td>
                          <td className="w-28 p-3 text-left">
                            {row.Date
                              ? format(new Date(row.Date), "dd/MM/yyyy")
                              : "-"}
                          </td>
                          <td className="w-28 p-3 text-right text-blue-600">
                            {formatNumber(row.SumQtyProc)}
                          </td>
                          <td className="w-28 p-3 text-right text-green-600">
                            {formatNumber(row.SumQtyMoved)}
                          </td>
                          <td className="w-28 p-3 text-right text-rose-600">
                            {formatNumber(row.SumQtyScrap)}
                          </td>
                          <td className="w-28 p-3 text-right font-bold">
                            {formatPercent(row.YscrapPercent)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductTableGlazebyGroup;