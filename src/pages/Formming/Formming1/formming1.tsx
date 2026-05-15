import React from "react";
import { Factory, Calendar } from "lucide-react";
import { format } from "date-fns";
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
import { ProductChartFormming } from "./ProductChartGFormm";
import { CategoryChartFormming } from "./CategoryChartFormm";

const Formming1 = () => {
  const [startDate, setStartDate] =
    React.useState<Date | undefined>(
      new Date()
    );

  const [endDate, setEndDate] =
    React.useState<Date | undefined>(
      new Date()
    );

  const [showStart, setShowStart] =
    React.useState(false);

  const [showEnd, setShowEnd] =
    React.useState(false);

  /* ===============================
     Fetch Data
  =============================== */

  const {
    statsData,
    loading,
  } = useFetchFormmingStats(
    startDate,
    endDate
  );

  const {
    groupData,
    loading: groupLoading,
  } = useFetchGroupSummary(
    startDate,
    endDate
  );

  /* ===============================
     Total Summary
  =============================== */

  const totalProc = statsData.reduce(
    (sum: number, item: any) =>
      sum +
      Number(item.TotalQtyProc ?? 0),
    0
  );

  const totalMoved = statsData.reduce(
    (sum: number, item: any) =>
      sum +
      Number(item.TotalQtyMoved ?? 0),
    0
  );

  const totalScrap = statsData.reduce(
    (sum: number, item: any) =>
      sum +
      Number(item.TotalQtyScrap ?? 0),
    0
  );

  /* ===============================
     Total Card
  =============================== */

  const allCards = [
    {
      title: "Formming Total",

      value: loading
        ? "Loading..."
        : totalProc.toLocaleString(),

      change: loading
        ? ""
        : `${totalMoved.toLocaleString()} (${(
            (totalMoved / totalProc) *
            100
          ).toFixed(2)}%)`,

      scrap: loading
        ? ""
        : totalScrap.toLocaleString(),

      scrapPercent:
        loading || totalProc === 0
          ? ""
          : `${(
              (totalScrap / totalProc) *
              100
            ).toFixed(2)}%`,

      icon: Factory,
    },
  ];

  /* ===============================
     Day Picker
  =============================== */

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
              Formming Dashboard
            </h1>

            <p className="text-slate-500 mt-1">
              สรุปยอดการผลิต / ยอด A / Scrap
            </p>
          </div>

          {/* ===============================
              Date Filter
          =============================== */}

          <div className="mb-8 flex gap-10 items-center flex-wrap">

            {/* Start Date */}
            <div className="relative flex items-center gap-3">

              <label className="text-sm font-semibold text-blue-700">
                วันที่เริ่มต้น:
              </label>

              <div className="relative">
                <input
                  readOnly
                  value={
                    startDate
                      ? format(
                          startDate,
                          "dd/MM/yyyy",
                          {
                            locale: th,
                          }
                        )
                      : ""
                  }
                  onClick={() =>
                    setShowStart(
                      !showStart
                    )
                  }
                  className="px-4 py-3 pr-10 rounded-2xl bg-white shadow-sm w-56 cursor-pointer font-medium text-slate-700"
                />

                <Calendar
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                  onClick={() =>
                    setShowStart(
                      !showStart
                    )
                  }
                />
              </div>

              {showStart && (
                <div className="absolute top-14 left-0 z-50 bg-white shadow-xl rounded-2xl p-4">
                  <DayPicker
                    {...dayPickerProps}
                    selected={
                      startDate
                    }
                    onSelect={(
                      date
                    ) => {
                      setStartDate(
                        date
                      );

                      setShowStart(
                        false
                      );
                    }}
                  />
                </div>
              )}
            </div>

            {/* End Date */}
            <div className="relative flex items-center gap-3">

              <label className="text-sm font-semibold text-red-700">
                วันที่สิ้นสุด:
              </label>

              <div className="relative">
                <input
                  readOnly
                  value={
                    endDate
                      ? format(
                          endDate,
                          "dd/MM/yyyy",
                          {
                            locale: th,
                          }
                        )
                      : ""
                  }
                  onClick={() =>
                    setShowEnd(
                      !showEnd
                    )
                  }
                  className="px-4 py-3 pr-10 rounded-2xl bg-white shadow-sm w-56 cursor-pointer font-medium text-slate-700"
                />

                <Calendar
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                  onClick={() =>
                    setShowEnd(
                      !showEnd
                    )
                  }
                />
              </div>

              {showEnd && (
                <div className="absolute top-14 left-0 z-50 bg-white shadow-xl rounded-2xl p-4">
                  <DayPicker
                    {...dayPickerProps}
                    selected={
                      endDate
                    }
                    onSelect={(
                      date
                    ) => {
                      setEndDate(
                        date
                      );

                      setShowEnd(
                        false
                      );
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ===============================
              Summary + Groups
          =============================== */}

          <div className="mb-8">

            {groupLoading ? (
              <div className="text-slate-500">
                Loading...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5">

                {/* Total */}
                <div>
                  <StatCardFormm
                    {...allCards[0]}
                  />
                </div>

                {/* Groups */}
                {groupData.map(
                  (
                    item: any,
                    index: number
                  ) => {
                    const proc = Number(
                      item.Ptotal || 0
                    );

                    const moved = Number(
                      item.sumA || 0
                    );

                    const scrap = Number(
                      item.sumscrap || 0
                    );

                    const movedPercent =
                      proc > 0
                        ? (
                            (moved /
                              proc) *
                            100
                          ).toFixed(2)
                        : "0.00";

                    const scrapPercent =
                      proc > 0
                        ? (
                            (scrap /
                              proc) *
                            100
                          ).toFixed(2)
                        : "0.00";

                    return (
                      <div
                        key={index}
                        className="rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition"
                      >

                        <div className="mb-4">

                          <p className="text-sm text-slate-500 font-medium">
                            Group
                          </p>

                          <h2 className="text-2xl font-bold text-blue-700 leading-tight">
                            {
                              item.GroupName
                            }
                          </h2>

                        </div>

                        <div className="space-y-2 text-sm font-medium">

                          {/* Proc */}
                          <div className="flex justify-between">
                            <span className="text-slate-600">
                              Proc
                            </span>

                            <span className="text-slate-900 font-semibold">
                              {proc.toLocaleString()}
                            </span>
                          </div>

                          {/* Moved */}
                          <div className="flex justify-between">
                            <span className="text-slate-600">
                              Moved
                            </span>

                            <span className="text-green-600">
                              {moved.toLocaleString()} (
                              {
                                movedPercent
                              }
                              %)
                            </span>
                          </div>

                          {/* Scrap */}
                          <div className="flex justify-between">
                            <span className="text-slate-600">
                              Scrap
                            </span>

                            <span className="text-red-600">
                              {scrap.toLocaleString()} (
                              {
                                scrapPercent
                              }
                              %)
                            </span>
                          </div>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            )}
          </div>

          {/* ===============================
              Charts
          =============================== */}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

            <div className="lg:col-span-2">
              <ProductChartFormming
                startDate={
                  startDate
                }
                endDate={
                  endDate
                }
              />
            </div>

            <CategoryChartFormming
              startDate={
                startDate
              }
              endDate={
                endDate
              }
            />
          </div>

          {/* ===============================
              Table
          =============================== */}

          <ProductTableFormm
            startDate={startDate}
            endDate={endDate}
          />

        </main>
      </div>
    </div>
  );
};

export default Formming1;