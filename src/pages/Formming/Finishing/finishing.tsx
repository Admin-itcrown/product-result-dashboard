import React from "react";
import { Factory, Boxes, Calendar } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

import { useFetchFinishingStats } from "./StatCardfinishing";
import { StatCardFinishing } from "./StatCardfinishing";
import { ProductChartfinishing } from "./ProductChartGfinishing";
import { CategoryChartfinishing } from "./CategoryChartfinishing";
import { ProductTablefinishing } from "./ProductTablefinishing";

import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";


const Finishing = () => {
  const [startDate, setStartDate] = React.useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = React.useState<Date | undefined>(new Date());

  const [showStart, setShowStart] = React.useState(false);
  const [showEnd, setShowEnd] = React.useState(false);
  const [showMore, setShowMore] = React.useState(false);

  const { statsData, lineSummary, loading } =
    useFetchFinishingStats(startDate, endDate);

  /* ===============================
     Total Summary
  =============================== */
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

  /* ===============================
     Cards Data
  =============================== */
  const allCards = [
    {
      title: "Finishing Total",
      value: loading ? "Loading..." : totalProc.toLocaleString(),
      change: loading ? "" : totalMoved.toLocaleString(),
      aPercent:
        loading || totalProc === 0
          ? ""
          : `${((totalMoved / totalProc) * 100).toFixed(2)}%`,
      scrap: loading ? "" : totalScrap.toLocaleString(),
      scrapPercent:
        loading || totalProc === 0
          ? ""
          : `${((totalScrap / totalProc) * 100).toFixed(2)}%`,
      icon: Factory,
    },

    ...lineSummary.map((item: any) => {
      const proc = Number(item.TotalQtyProc ?? 0);
      const movedValue = Number(item.TotalQtyMoved ?? 0);
      const scrapValue = Number(item.TotalQtyScrap ?? 0);

      return {
        title: item.LineCode,
        value: loading
          ? "Loading..."
          : proc.toLocaleString(),
        change: loading
          ? ""
          : movedValue.toLocaleString(),
        aPercent:
          loading || proc === 0
            ? ""
            : `${((movedValue / proc) * 100).toFixed(2)}%`,
        scrap: loading ? "" : scrapValue.toLocaleString(),
        scrapPercent:
          loading || proc === 0
            ? ""
            : `${((scrapValue / proc) * 100).toFixed(2)}%`,
        icon: Boxes,
      };
    }),
  ];

  const firstRow = allCards.slice(0, 4);
  const secondRow = allCards.slice(4);

  const dayPickerProps = {
    mode: "single" as const,
    locale: th,
    captionLayout: "dropdown" as const,
    fromYear: 2020,
    toYear: 2035,
    showOutsideDays: true,
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <DashboardSidebar />

      <div className="flex-1 flex flex-col">
        <DashboardHeader />

        <main className="flex-1 p-6 overflow-auto">

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900">
              Finishing Dashboard
            </h1>
            <p className="text-slate-500 mt-1">
              สรุปยอดการผลิต / ยอด A / Scrap
            </p>
          </div>

          {/* Date Filter */}
          <div className="mb-8 flex gap-10 items-center flex-wrap">

            {/* Start */}
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
                  className="px-4 py-3 pr-10 rounded-2xl bg-white shadow-sm w-56 cursor-pointer font-medium text-slate-700"
                />

                <Calendar
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                  onClick={() => setShowStart(!showStart)}
                />
              </div>

              {showStart && (
                <div className="absolute top-14 left-0 z-50 bg-white shadow-xl rounded-2xl p-4">
                  <DayPicker
                    {...dayPickerProps}
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      setShowStart(false);
                    }}
                  />
                </div>
              )}
            </div>

            {/* End */}
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
                  className="px-4 py-3 pr-10 rounded-2xl bg-white shadow-sm w-56 cursor-pointer font-medium text-slate-700"
                />

                <Calendar
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                  onClick={() => setShowEnd(!showEnd)}
                />
              </div>

              {showEnd && (
                <div className="absolute top-14 left-0 z-50 bg-white shadow-xl rounded-2xl p-4">
                  <DayPicker
                    {...dayPickerProps}
                    selected={endDate}
                    onSelect={(date) => {
                      setEndDate(date);
                      setShowEnd(false);
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Cards */}
          <div className="space-y-5 mb-8">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {firstRow.map((stat, index) => (
                <div key={index}>
                  <StatCardFinishing {...stat} />
                </div>
              ))}
            </div>

            {secondRow.length > 0 && showMore && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {secondRow.map((stat, index) => (
                  <div key={index}>
                    <StatCardFinishing {...stat} />
                  </div>
                ))}
              </div>
            )}

            {secondRow.length > 0 && (
              <div className="flex justify-center pt-1">
                <button
                  onClick={() => setShowMore(!showMore)}
                  className="h-11 w-11 rounded-full bg-white shadow hover:shadow-md hover:scale-105 transition text-slate-700 font-bold"
                >
                  {showMore ? "▲" : "▼"}
                </button>
              </div>
            )}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <ProductChartfinishing
                startDate={startDate}
                endDate={endDate}
              />
            </div>

            <CategoryChartfinishing
              startDate={startDate}
              endDate={endDate}
            />
          </div>

          {/* Table */}
          <ProductTablefinishing 
            startDate={startDate}
            endDate={endDate}
          />

        </main>
      </div>
    </div>
  );
};

export default Finishing