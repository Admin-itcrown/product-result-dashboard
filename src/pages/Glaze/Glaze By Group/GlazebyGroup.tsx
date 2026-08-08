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
import { ProductionPlanSummary } from "@/components/dashboard/ProductionPlanSummary";

const GlazebyGroup = () => {
  const [startDate, setStartDate] = React.useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = React.useState<Date | undefined>(new Date());

  const [showStart, setShowStart] = React.useState(false);
  const [showEnd, setShowEnd] = React.useState(false);
  const [clayFilter, setClayFilter] = React.useState<string>("ALL");

  const { statsData, loading } = useFetchGlazebyGroupStats(
    startDate,
    endDate,
    clayFilter
  );

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
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Glaze By Group Dashboard
              </h1>
              <p className="text-slate-500">
                Production & Scrap Overview
              </p>
            </div>
            <div className="hidden items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-800 shadow-sm">
              <Calendar size={18} className="text-indigo-600" />
              <span>ช่วงวันที่:</span>
              <span className="text-indigo-950">
                {startDate ? format(startDate, "dd/MM/yyyy", { locale: th }) : "–"}
                {" – "}
                {endDate ? format(endDate, "dd/MM/yyyy", { locale: th }) : "–"}
              </span>
            </div>
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
            
            {/* CLAY FILTER BUTTONS */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-slate-600">Type Clay:</label>

              <div className="flex items-center gap-2">
                {[
                  { key: "ALL", label: "ALL" },
                  { key: "V", label: "ดินขาว" },
                  { key: "S", label: "ดินดำ" },
                ].map((b) => (
                  <button
                    key={b.key}
                    onClick={() => setClayFilter(b.key)}
                    className={`px-3 py-2 rounded-2xl text-sm font-medium transition-shadow ${
                      clayFilter === b.key
                        ? "bg-slate-900 text-white shadow"
                        : "bg-white border border-slate-200 text-slate-700"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* <Tableplaning
            startDate={startDate}
            endDate={endDate}
            clayFilter={clayFilter}
          /> */}

          <section className="rounded-3xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 p-5 shadow-lg shadow-blue-100/60 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-blue-200/80 pb-4">
              <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-md shadow-blue-300/70">
                <Factory size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-blue-950">Glaze Plan</h2>
                <p className="mt-0.5 text-sm text-blue-700/80">เปรียบเทียบยอดผลิตจริงกับแผนที่กำหนด</p>
              </div>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-indigo-200 bg-white/85 px-4 py-2.5 text-sm font-semibold text-indigo-800 shadow-sm">
                <Calendar size={18} className="text-indigo-600" />
                <span>ช่วงวันที่:</span>
                <span className="text-indigo-950">
                  {startDate ? format(startDate, "dd/MM/yyyy", { locale: th }) : "–"}
                  {" – "}
                  {endDate ? format(endDate, "dd/MM/yyyy", { locale: th }) : "–"}
                </span>
              </div>
            </div>
            <ProductionPlanSummary
              actual={totalProc}
              storageKey="glaze-by-group-production-plan"
            />
          </section>

          <section className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-cyan-50 to-sky-50 p-5 shadow-lg shadow-emerald-100/60 sm:p-6">
            <div className="mb-5 flex items-center gap-3 border-b border-emerald-200/80 pb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-md shadow-emerald-300/70">
                <Boxes size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-emerald-950">Data Glaze By Group</h2>
                <p className="mt-0.5 text-sm text-emerald-700/80">รายละเอียดผลผลิตแยกตามกลุ่มสินค้า</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                {stats.map((s, i) => (
                  <StatCardGlazebyGroup key={i} {...s} />
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ProductChartGlazebyGroup startDate={startDate} endDate={endDate} clayFilter={clayFilter} />
                </div>

                <CategoryChartGlazebyGroup startDate={startDate} endDate={endDate} clayFilter={clayFilter} />
              </div>

              <ProductTableGlazebyGroup
                startDate={startDate}
                endDate={endDate}
                clayFilter={clayFilter}
              />
            </div>
          </section>

        </main>
      </div>
    </div>
  );
};

export default GlazebyGroup;
