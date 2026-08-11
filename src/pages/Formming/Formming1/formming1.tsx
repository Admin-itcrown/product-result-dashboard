import React from "react";
import { Factory, Calendar } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { th } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

import {
  StatCardFormm,
  useFetchFormmingStats,
  useFetchGroupSummary,
} from "./StatCardFormm";

import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProductTableFormm } from "./ProductTableFormm";
import { ProductChartFormm } from "./ProductChartGFormm";
import { CategoryChartFormming } from "./CategoryChartFormm";

/* ===============================
   GROUP LABEL
================================ */
const GROUP_LABEL: Record<string, string> = {
  "101-104": "MUG",
  "105-106": "EMB/MUG",
  "201-204": "PLATE",
  "205": "EMB/PLATE",
  "301-304": "BOWL",
  "401-404": "ACC",
  "501-504": "RAM",
  "601-604": "ISO/STA",
  "701-704": "HPC",
  "801-804": "ISO/NON",
};

const Formming1 = () => {
  const [startDate, setStartDate] = React.useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = React.useState<Date | undefined>(new Date());

  const [showStart, setShowStart] = React.useState(false);
  const [showEnd, setShowEnd] = React.useState(false);

  const [showAllGroups, setShowAllGroups] = React.useState(false);

  const { statsData, loading } = useFetchFormmingStats(startDate, endDate);
  const { groupData, loading: groupLoading } = useFetchGroupSummary(
    startDate,
    endDate
  );

  const totalProc = statsData.reduce(
    (sum: number, item: any) => sum + Number(item.TotalQtyProc ?? 0),
    0
  );

  const totalMoved = statsData.reduce(
    (sum: number, item: any) => sum + Number(item.TotalQtyMoved ?? 0),
    0
  );

  const totalScrap = statsData.reduce(
    (sum: number, item: any) => sum + Number(item.TotalQtyScrap ?? 0),
    0
  );

  const allCards = [
    {
      title: "Formming Total",
      value: loading ? "Loading..." : totalProc.toLocaleString(),
      change: loading
        ? ""
        : `${totalMoved.toLocaleString()} (${(
            totalProc > 0 ? (totalMoved / totalProc) * 100 : 0
          ).toFixed(2)}%)`,
      scrap: loading ? "" : totalScrap.toLocaleString(),
      scrapPercent:
        loading || totalProc === 0
          ? ""
          : `${((totalScrap / totalProc) * 100).toFixed(2)}%`,
      icon: Factory,
    },
  ];

  const dayPickerProps = {
    mode: "single" as const,
    locale: th,
    captionLayout: "dropdown" as const,
    fromYear: 2020,
    toYear: 2035,
    showOutsideDays: true,
  };

  const visibleGroups = showAllGroups
    ? groupData
    : groupData.slice(0, 4);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <DashboardSidebar />

      <div className="flex-1 flex flex-col">
        <DashboardHeader />

        <main className="flex-1 p-6 overflow-auto">

          {/* HEADER */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900">
              Formming Dashboard
            </h1>
            <p className="text-slate-500 mt-1">
              สรุปยอดการผลิต / ยอด A / Scrap
            </p>
          </div>

          {/* DATE FILTER */}
          <div className="mb-8 flex gap-10 items-center flex-wrap">

            <div className="relative flex items-center gap-3">
              <label className="text-sm font-semibold text-blue-700">
                วันที่เริ่มต้น:
              </label>

              <div className="relative">
                <input
                  readOnly
                  value={
                    startDate
                      ? format(startDate, "dd/MM/yyyy", { locale: th })
                      : ""
                  }
                  onClick={() => setShowStart(!showStart)}
                  className="px-4 py-3 pr-10 rounded-2xl bg-white shadow-sm w-56 cursor-pointer"
                />

                <Calendar
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                  onClick={() => setShowStart(!showStart)}
                />
              </div>

              {showStart && (
                <div className="absolute top-14 z-50 bg-white shadow-xl rounded-2xl p-4">
                  <DayPicker
                    {...dayPickerProps}
                    selected={startDate}
                    onSelect={(d) => {
                      setStartDate(d);
                      setShowStart(false);
                    }}
                  />
                </div>
              )}
            </div>

            <div className="relative flex items-center gap-3">
              <label className="text-sm font-semibold text-red-700">
                วันที่สิ้นสุด:
              </label>

              <div className="relative">
                <input
                  readOnly
                  value={
                    endDate
                      ? format(endDate, "dd/MM/yyyy", { locale: th })
                      : ""
                  }
                  onClick={() => setShowEnd(!showEnd)}
                  className="px-4 py-3 pr-10 rounded-2xl bg-white shadow-sm w-56 cursor-pointer"
                />

                <Calendar
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                  onClick={() => setShowEnd(!showEnd)}
                />
              </div>

              {showEnd && (
                <div className="absolute top-14 z-50 bg-white shadow-xl rounded-2xl p-4">
                  <DayPicker
                    {...dayPickerProps}
                    selected={endDate}
                    onSelect={(d) => {
                      setEndDate(d);
                      setShowEnd(false);
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* SUMMARY */}
          <div className="mb-8">
            {groupLoading ? (
              <div className="text-slate-500">Loading...</div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5">

                  <StatCardFormm {...allCards[0]} />

                  {visibleGroups.map((item: any, index: number) => {
                    const proc = Number(item.Ptotal || 0);
                    const moved = Number(item.sumA || 0);
                    const scrap = Number(item.sumscrap || 0);

                    const movedPercent =
                      proc > 0 ? ((moved / proc) * 100).toFixed(2) : "0.00";

                    const scrapPercent =
                      proc > 0 ? ((scrap / proc) * 100).toFixed(2) : "0.00";

                    const groupKey = String(item.GroupCode ?? "").trim();

                    return (
                      <div
                        key={index}
                        className="rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition"
                      >
                        <div className="mb-4">
                          {/* 🔥 SMALLER TEXT HERE */}
                          <p className="text-lg font-medium text-slate-500">
                            Group:{" "}
                            <span className="text-blue-700 font-bold">
                              {GROUP_LABEL[groupKey] || groupKey}
                            </span>
                          </p>
                        </div>

                        <div className="space-y-2 text-sm font-medium">

                          <div className="flex justify-between">
                            <span className="text-slate-700 font-extrabold text-xl">
                              Proc
                            </span>
                            <span className="text-blue-700 font-extrabold text-xl">
                              {proc.toLocaleString()}
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span>Moved</span>
                            <span className="text-green-600">
                              {moved.toLocaleString()} ({movedPercent}%)
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span>Scrap</span>
                            <span className="text-red-600">
                              {scrap.toLocaleString()} ({scrapPercent}%)
                            </span>
                          </div>

                        </div>
                      </div>
                    );
                  })}

                </div>

                {/* BUTTON */}
                {groupData.length > 5 && (
                  <div className="flex justify-center mt-4">
                    <button
                      onClick={() => setShowAllGroups(!showAllGroups)}
                      className="px-6 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition"
                    >
                      {showAllGroups ? "ซ่อนข้อมูล" : "ดูเพิ่มเติม"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <ProductChartFormm startDate={startDate} endDate={endDate} />
            </div>

            <CategoryChartFormming startDate={startDate} endDate={endDate} />
          </div>

          {/* TABLE */}
          <ProductTableFormm startDate={startDate} endDate={endDate} />

        </main>
      </div>
    </div>
  );
};

export default Formming1;
