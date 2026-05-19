import React from "react";
import { Factory, Calendar } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

import {
  useFetchBisqStats,
  useFetchGroupSummary,
} from "./StatCardBisq";

import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProductTableBisque } from "./ProductTableBisq";
import { ProductChartBisq } from "./ProductChartBisq";
import { CategoryChartBisq } from "./CategoryChartBisq";

/* =========================================
   GROUP LABEL Test
========================================= */
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

const bisqueFiring = () => {
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

  const [showAllGroups, setShowAllGroups] =
    React.useState(false);

  const { statsData, loading } =
    useFetchBisqStats(startDate, endDate);

  const { groupData, loading: groupLoading } =
    useFetchGroupSummary(startDate, endDate);

  const totalProc = statsData.reduce(
    (sum: number, item: any) =>
      sum + Number(item.TotalQtyProc ?? 0),
    0
  );

  const totalMoved = statsData.reduce(
    (sum: number, item: any) =>
      sum + Number(item.TotalQtyMoved ?? 0),
    0
  );

  const totalScrap = statsData.reduce(
    (sum: number, item: any) =>
      sum + Number(item.TotalQtyScrap ?? 0),
    0
  );

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
    : groupData.slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <DashboardSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader />

        <main className="flex-1 overflow-auto p-4">

          {/* ======================================
              HEADER
          ====================================== */}
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-5">

            {/* TITLE */}
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                Bisquefiring Dashboard
              </h1>

              <p className="text-slate-500 mt-1 text-sm">
                Production / A / Scrap
              </p>
            </div>

            {/* FILTER */}
            <div className="flex flex-wrap gap-3">

              {/* START DATE */}
              <div className="relative">

                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                  Start
                </label>

                <div className="relative">
                  <input
                    readOnly
                    value={
                      startDate
                        ? format(startDate, "dd/MM/yyyy", {
                            locale: th,
                          })
                        : ""
                    }
                    onClick={() =>
                      setShowStart(!showStart)
                    }
                    className="
                      w-40 rounded-xl border border-slate-200
                      bg-white px-3 py-2.5 pr-9
                      shadow-sm cursor-pointer
                      text-sm font-semibold
                    "
                  />

                  <Calendar
                    size={16}
                    className="
                      absolute right-3 top-1/2 -translate-y-1/2
                      text-slate-400 cursor-pointer
                    "
                    onClick={() =>
                      setShowStart(!showStart)
                    }
                  />
                </div>

                {showStart && (
                  <div className="absolute right-0 mt-2 z-50 rounded-2xl bg-white shadow-xl border p-3">
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

              {/* END DATE */}
              <div className="relative">

                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                  End
                </label>

                <div className="relative">
                  <input
                    readOnly
                    value={
                      endDate
                        ? format(endDate, "dd/MM/yyyy", {
                            locale: th,
                          })
                        : ""
                    }
                    onClick={() =>
                      setShowEnd(!showEnd)
                    }
                    className="
                      w-40 rounded-xl border border-slate-200
                      bg-white px-3 py-2.5 pr-9
                      shadow-sm cursor-pointer
                      text-sm font-semibold
                    "
                  />

                  <Calendar
                    size={16}
                    className="
                      absolute right-3 top-1/2 -translate-y-1/2
                      text-slate-400 cursor-pointer
                    "
                    onClick={() =>
                      setShowEnd(!showEnd)
                    }
                  />
                </div>

                {showEnd && (
                  <div className="absolute right-0 mt-2 z-50 rounded-2xl bg-white shadow-xl border p-3">
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
          </div>

          {/* ======================================
              SUMMARY SECTION
          ====================================== */}
          <div className="grid grid-cols-1 xl:grid-cols-6 gap-3 mb-5">

            {/* TOTAL CARD */}
            <div className="xl:col-span-1">

              <div
                className="
                  relative overflow-hidden rounded-2xl
                  bg-gradient-to-br from-blue-600 to-indigo-700
                  text-white p-4 shadow-sm h-full
                "
              >
                <div className="absolute top-0 right-0 opacity-10">
                  <Factory size={90} />
                </div>

                <p className="text-xs uppercase tracking-[0.2em] font-bold text-blue-100">
                  Total
                </p>

                <h2 className="mt-2 text-4xl font-black">
                  {loading
                    ? "..."
                    : totalProc.toLocaleString()}
                </h2>

                <div className="mt-5 space-y-3">

                  {/* MOVED */}
                  <div className="bg-white/10 rounded-xl p-3">

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-100 font-semibold">
                        Moved
                      </span>

                      <span className="font-black text-base">
                        {totalMoved.toLocaleString()}
                      </span>
                    </div>

                    <div className="mt-2 h-2 w-full bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400 rounded-full"
                        style={{
                          width: `${
                            totalProc > 0
                              ? (totalMoved / totalProc) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* SCRAP */}
                  <div className="bg-white/10 rounded-xl p-3">

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-100 font-semibold">
                        Scrap
                      </span>

                      <span className="font-black text-base">
                        {totalScrap.toLocaleString()}
                      </span>
                    </div>

                    <div className="mt-2 h-2 w-full bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-400 rounded-full"
                        style={{
                          width: `${
                            totalProc > 0
                              ? (totalScrap / totalProc) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* GROUP CARDS */}
            <div className="xl:col-span-5">

              {groupLoading ? (
                <div className="text-slate-500 text-sm">
                  Loading...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">

                    {visibleGroups.map(
                      (item: any, index: number) => {
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
                                (moved / proc) *
                                100
                              ).toFixed(2)
                            : "0";

                        const scrapPercent =
                          proc > 0
                            ? (
                                (scrap / proc) *
                                100
                              ).toFixed(2)
                            : "0";

                        const groupKey = String(
                          item.GroupCode ?? ""
                        ).trim();

                        return (
                          <div
                            key={index}
                            className="
                              rounded-2xl border border-slate-200
                              bg-white p-3 shadow-sm
                              hover:shadow-md transition
                            "
                          >

                            {/* TOP */}
                            <div className="flex justify-between items-start mb-3">

                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                                  Group
                                </p>

                                <h3 className="text-xl font-black text-slate-900">
                                  {GROUP_LABEL[groupKey] ||
                                    groupKey}
                                </h3>
                              </div>

                              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                                <Factory
                                  size={16}
                                  className="text-blue-600"
                                />
                              </div>
                            </div>

                            {/* PROC */}
                            <div className="mb-3">
                              <p className="text-xs text-slate-400 font-semibold">
                                Proc
                              </p>

                              <h2 className="text-3xl font-black text-slate-900">
                                {proc.toLocaleString()}
                              </h2>
                            </div>

                            {/* MOVED */}
                            <div className="mb-2">

                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-bold text-slate-700">
                                  Moved
                                </span>

                                <span className="font-black text-green-600">
                                  {moved.toLocaleString()} ({movedPercent}%)
                                </span>
                              </div>

                              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full"
                                  style={{
                                    width: `${movedPercent}%`,
                                  }}
                                />
                              </div>
                            </div>

                            {/* SCRAP */}
                            <div>

                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-bold text-slate-700">
                                  Scrap
                                </span>

                                <span className="font-black text-red-500">
                                  {scrap.toLocaleString()} ({scrapPercent}%)
                                </span>
                              </div>

                              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full bg-red-500 rounded-full"
                                  style={{
                                    width: `${scrapPercent}%`,
                                  }}
                                />
                              </div>
                            </div>

                          </div>
                        );
                      }
                    )}
                  </div>

                  {/* BUTTON */}
                  {groupData.length > 5 && (
                    <div className="flex justify-center mt-4">
                      <button
                        onClick={() =>
                          setShowAllGroups(!showAllGroups)
                        }
                        className="
                          px-4 py-2 rounded-xl
                          bg-blue-600 text-white
                          text-sm font-semibold
                          hover:bg-blue-700
                          transition
                        "
                      >
                        {showAllGroups
                          ? "ซ่อนข้อมูล"
                          : "ดูเพิ่มเติม"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ======================================
              CHARTS
          ====================================== */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">

            {/* PRODUCT CHART */}
            <div
              className="
                xl:col-span-2
                rounded-2xl
                border border-slate-200
                bg-white
                p-4
                shadow-sm
              "
            >
              <ProductChartBisq
                startDate={startDate}
                endDate={endDate}
              />
            </div>

            {/* CATEGORY CHART */}
            <div
              className="
                rounded-2xl
                border border-slate-200
                bg-white
                p-4
                shadow-sm
                min-h-[640px]
              "
            >
              <CategoryChartBisq
                startDate={startDate}
                endDate={endDate}
              />
            </div>
          </div>

          {/* ======================================
              TABLE
          ====================================== */}
          <div
            className="
              rounded-2xl
              border border-slate-200
              bg-white
              p-4
              shadow-sm
            "
          >
            <ProductTableBisque
              startDate={startDate}
              endDate={endDate}
            />
          </div>

        </main>
      </div>
    </div>
  );
};

export default bisqueFiring;