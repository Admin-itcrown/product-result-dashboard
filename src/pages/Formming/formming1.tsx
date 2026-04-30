import React from "react";
import {
  Factory,
  Boxes,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

import {
  StatCardFormm,
  useFetchFormmingStats,
} from "./StatCardFormm";

import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProductTableFormm } from "./ProductTableFormm";
import { ProductChartFormming } from "./ProductChartGFormm";
import { CategoryChartFormming } from "./CategoryChartFormm";

const Formming1 = () => {
  const [startDate, setStartDate] = React.useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = React.useState<Date | undefined>(new Date());

  const [showStart, setShowStart] = React.useState(false);
  const [showEnd, setShowEnd] = React.useState(false);
  const [showMore, setShowMore] = React.useState(false);

  const { statsData, lineSummary, loading } =
    useFetchFormmingStats(startDate, endDate);

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
      change: loading ? "" : totalMoved.toLocaleString(),
      scrap: loading ? "" : totalScrap.toLocaleString(),
      icon: Factory,
    },

    ...lineSummary.map((item: any) => ({
      title: item.LineCode,
      value: loading
        ? "Loading..."
        : Number(item.TotalQtyProc ?? 0).toLocaleString(),

      change: loading
        ? ""
        : Number(item.TotalQtyMoved ?? 0).toLocaleString(),

      scrap: loading
        ? ""
        : Number(item.TotalQtyScrap ?? 0).toLocaleString(),

      icon: Boxes,
    })),
  ];

  const dayPickerProps = {
    mode: "single" as const,
    locale: th,
    captionLayout: "dropdown" as const,
    fromYear: 2020,
    toYear: 2035,
    showOutsideDays: true,
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar />

      <div className="flex-1 flex flex-col">
        <DashboardHeader />

        <main className="flex-1 p-6 overflow-auto">

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800">
              Formming Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              สรุปยอดการผลิต / ยอด A / Scrap
            </p>
          </div>

          {/* Date Filter */}
          <div className="mb-6 flex gap-8 items-center flex-wrap">

            {/* Start */}
            <div className="relative flex items-center gap-3">
              <label className="text-sm font-semibold text-blue-700">
                วันที่เริ่มต้น
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
                  className="px-3 py-2 pr-10 rounded-xl bg-white shadow-sm w-44 cursor-pointer"
                />

                <Calendar
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                  onClick={() => setShowStart(!showStart)}
                />
              </div>

              {showStart && (
                <div className="absolute top-12 left-0 z-50 bg-white shadow-xl rounded-2xl p-4">
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
                วันที่สิ้นสุด
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
                  className="px-3 py-2 pr-10 rounded-xl bg-white shadow-sm w-44 cursor-pointer"
                />

                <Calendar
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                  onClick={() => setShowEnd(!showEnd)}
                />
              </div>

              {showEnd && (
                <div className="absolute top-12 left-0 z-50 bg-white shadow-xl rounded-2xl p-4">
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

            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-12 gap-5">

              <div className="xl:col-span-4">
                <StatCardFormm {...allCards[0]} />
              </div>

              {allCards.slice(1, 5).map((stat, index) => (
                <div key={index} className="xl:col-span-2">
                  <StatCardFormm {...stat} />
                </div>
              ))}
            </div>

            {/* Row 2 */}
            {showMore && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-12 gap-5">
                {allCards.slice(5, 11).map((stat, index) => (
                  <div key={index} className="xl:col-span-2">
                    <StatCardFormm {...stat} />
                  </div>
                ))}
              </div>
            )}

            {/* Arrow */}
            {allCards.length > 5 && (
              <div className="flex justify-center">
                <button
                  onClick={() => setShowMore(!showMore)}
                  className="h-10 w-10 rounded-full bg-white shadow hover:scale-105 transition"
                >
                  <div className="flex items-center justify-center h-full">
                    {showMore ? (
                      <ChevronUp size={18} />
                    ) : (
                      <ChevronDown size={18} />
                    )}
                  </div>
                </button>
              </div>
            )}

          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <ProductChartFormming />
            </div>

            <CategoryChartFormming
              startDate={startDate}
              endDate={endDate}
            />
          </div>

          {/* Table */}
          <ProductTableFormm />

        </main>
      </div>
    </div>
  );
};

export default Formming1;