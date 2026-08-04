import React from "react";
import { Factory, Boxes, Calendar,GlassWater,Coffee , MoreHorizontal} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

import { StatCardGlazebyGroup, useFetchGlazebyGroupStats } from "./StatCardGlazebyGroup";
import { ProductChartGlazebyGroup } from "./ProductChartGlazebyGroup";
import { CategoryChartGlazebyGroup } from "./CategoryChartGlazebyGroup";
import { ProductTableGlazebyGroup } from "./ProductTableGlazebyGroup";

import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

const GlazebyGroup = () => {
  const [startDate, setStartDate] = React.useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = React.useState<Date | undefined>(new Date());

  const [showStart, setShowStart] = React.useState(false);
  const [showEnd, setShowEnd] = React.useState(false);

  const { statsData, loading } = useFetchGlazebyGroupStats(startDate, endDate);

  /* =========================
     SUM TOTAL
  ========================= */
  const sum = (key: string) =>
    statsData.reduce((s: number, i: any) => s + Number(i[key] ?? 0), 0);

  const totalProc = sum("TotalQtyProc");
  const totalScrap = sum("TotalQtyScrap");
  const totalMoved = sum("TotalQtyMoved");

  /* =========================
     GROUP DATA
  ========================= */
  const itemGroupCards = statsData.map((item: any) => {
    const groupName = String(item.ItemGroup || item.Line || "").trim();
    const p = Number(item.TotalQtyProc ?? 0);
    const s = Number(item.TotalQtyScrap ?? 0);
    const m = Number(item.TotalQtyMoved ?? 0);

    return {
      title: groupName || "UNKNOWN",
      icon: Factory,
      value: loading ? "Loading..." : p.toLocaleString(),
      scrap: loading ? "" : s.toLocaleString(),
      change: loading ? "" : m.toLocaleString(),
      valuePercent: "",
      changePercent: p ? ((m / p) * 100).toFixed(2) + "%" : "",
      scrapPercent: p ? ((s / p) * 100).toFixed(2) + "%" : "",
      changeType: "positive" as const,
      scrapType: "neutral" as const,
      titleClassName: "text-slate-600",
      valueClassName: "text-slate-900 text-2xl font-bold",
    };
  });

  const card = (title: string, icon: any, d: any) => ({
    title,
    icon,
    value: loading ? "Loading..." : d.p.toLocaleString(),
    scrap: loading ? "" : d.s.toLocaleString(),
    change: loading ? "" : d.m.toLocaleString(),
    valuePercent: "",
    changePercent: d.p ? ((d.m / d.p) * 100).toFixed(2) + "%" : "",
    scrapPercent: d.p ? ((d.s / d.p) * 100).toFixed(2) + "%" : "",
    changeType: "positive" as const,
    scrapType: "neutral" as const,
    titleClassName: "text-slate-600",
    valueClassName: "text-slate-900 text-2xl font-bold",
  });

  const stats = [
    card("TOTAL", Factory, { p: totalProc, s: totalScrap, m: totalMoved }),
    ...itemGroupCards,
  ];

  return (
    <div className="flex min-h-screen bg-slate-100">
      <DashboardSidebar />

      <div className="flex-1 flex flex-col">
        <DashboardHeader />

        <main className="flex-1 p-6 space-y-8">

          {/* HEADER */}
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Glaze By Group Dashboard
            </h1>
            <p className="text-slate-500">
              Production & Scrap Overview
            </p>
          </div>

          {/* DATE FILTER (ORIGINAL STYLE) */}
          <div className="mb-6 flex gap-10 items-center flex-wrap">

            {/* START */}
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
                    mode="single"
                    locale={th}
                    captionLayout="dropdown"
                    fromYear={2020}
                    toYear={2035}
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      setShowStart(false);
                    }}
                  />
                </div>
              )}
            </div>

            {/* END */}
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
                    mode="single"
                    locale={th}
                    captionLayout="dropdown"
                    fromYear={2020}
                    toYear={2035}
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

          {/* CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            {stats.map((s, i) => (
              <StatCardGlazebyGroup key={i} {...s} />
            ))}
          </div>

          {/* CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ProductChartGlazebyGroup startDate={startDate} endDate={endDate} />
            </div>

            <CategoryChartGlazebyGroup startDate={startDate} endDate={endDate} />
          </div>

          {/* TABLE */}
          <ProductTableGlazebyGroup
            startDate={startDate}
            endDate={endDate}
          />

        </main>
      </div>
    </div>
  );
};

export default GlazebyGroup;