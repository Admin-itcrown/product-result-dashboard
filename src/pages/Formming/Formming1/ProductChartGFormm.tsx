import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Trophy } from "lucide-react";

interface ProductChartFormmingProps {
  startDate?: Date;
  endDate?: Date;
}

export function ProductChartFormming({
  startDate,
  endDate,
}: ProductChartFormmingProps) {
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [totalQtyProc, setTotalQtyProc] = useState(0);
  const [totalQtyMoved, setTotalQtyMoved] = useState(0);
  const [totalQtyScrap, setTotalQtyScrap] = useState(0);

  useEffect(() => {
    if (!startDate || !endDate) return;
    fetchSummary();
  }, [startDate, endDate]);

  const dbProfile = "Formming";

  const envApi = (import.meta as any)?.env?.VITE_API_URL;
  const apiBase =
    envApi ||
    `${window.location.protocol}//${window.location.hostname}:3001`;

const fetchSummary = async () => {
    if (!startDate || !endDate) return;

    const formattedStart = format(startDate, "yyyy-MM-dd");
    const formattedEnd = format(endDate, "yyyy-MM-dd");

    const query = `
      SELECT
        SUM([QtyProc]) AS TotalQtyProc,
        SUM([QtyMoved]) AS TotalQtyMoved,
        SUM([QtyScrap]) AS TotalQtyScrap
      FROM [Db_Formming].[dbo].[Formm_trans]
      WHERE [Date] BETWEEN '${formattedStart}' AND '${formattedEnd}'
        AND [OP] = 10
    `;

    setSummaryLoading(true);

    try {
      const res = await fetch(`${apiBase}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, db: dbProfile }),
      });

      const payload = await res.json();
      const row = (payload?.recordset || [])[0] || {};

      setTotalQtyProc(Number(row.TotalQtyProc || 0));
      setTotalQtyMoved(Number(row.TotalQtyMoved || 0));
      setTotalQtyScrap(Number(row.TotalQtyScrap || 0));
    } catch (error) {
      console.error(error);
      setTotalQtyProc(0);
      setTotalQtyMoved(0);
      setTotalQtyScrap(0);
    } finally {
      setSummaryLoading(false);
    }
  };

  const aPercent =
    totalQtyProc > 0
      ? (totalQtyMoved / totalQtyProc) * 100
      : 0;
  const scrapPercent =
    totalQtyProc > 0
      ? (totalQtyScrap / totalQtyProc) * 100
      : 0;

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white shadow-xl p-6 overflow-hidden">
      <div className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="text-yellow-500" size={20} />
              <h3 className="text-2xl font-bold text-slate-900">สัดส่วนการคัดแยก</h3>
            </div>
            <p className="text-sm text-slate-500 max-w-2xl">
              แสดงอัตรา A และ Scrap จากยอดรวมทั้งหมด ในช่วงวันที่เลือก
            </p>
          </div>

          <div className="inline-flex min-w-[220px] items-center justify-center rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200/70">
            {startDate && endDate ? (
              <span>
                จาก {format(startDate, "dd/MM/yyyy")} ถึง {format(endDate, "dd/MM/yyyy")}
              </span>
            ) : (
              <span>ยังไม่ได้เลือกช่วงวันที่</span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:shadow-md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                ยอดรวม
              </p>
              <p className="mt-3 text-5xl font-extrabold text-slate-900">
                {totalQtyProc.toLocaleString()}
              </p>
            </div>
            <div className="inline-flex items-center rounded-full bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-700">
              100%
            </div>
          </div>
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-sky-500 shadow-sm" style={{ width: "100%" }} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:shadow-md min-h-[170px]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  ยอด A
                </p>
                <p className="mt-3 text-3xl font-bold text-slate-900">
                  {totalQtyMoved.toLocaleString()}
                </p>
              </div>
              <div className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                {aPercent.toFixed(1)}%
              </div>
            </div>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500 shadow-sm"
                style={{ width: `${Math.min(aPercent, 100)}%` }}
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:shadow-md min-h-[170px]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Scrap
                </p>
                <p className="mt-3 text-3xl font-bold text-slate-900">
                  {totalQtyScrap.toLocaleString()}
                </p>
              </div>
              <div className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-700">
                {scrapPercent.toFixed(1)}%
              </div>
            </div>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-rose-500 shadow-sm"
                style={{ width: `${Math.min(scrapPercent, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {summaryLoading && (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 text-center text-slate-600 shadow-sm">
          กำลังโหลดข้อมูล...
        </div>
      )}
    </div>
  );
}