import React from "react";
import { Factory, Boxes, Calendar,GlassWater,Coffee , MoreHorizontal} from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { th } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

import { useFetchMoldStats } from "./StatCardMold";
import { StatCardMold } from "./StatCardMold";
import { ProductChartMold } from "./ProductChartMold";
import { CategoryChartMold } from "./CategoryChartMold";
import { ProductTableMold} from "./ProductTableMold";

import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

const MoldTotal = () => {
  const [startDate, setStartDate] = React.useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = React.useState<Date | undefined>(new Date());

  const [showStart, setShowStart] = React.useState(false);
  const [showEnd, setShowEnd] = React.useState(false);

  const { statsData, loading } = useFetchMoldStats(startDate, endDate);

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
  let solid = { p: 0, s: 0, m: 0 };
  let twoton = { p: 0, s: 0, m: 0 };
  let others = { p: 0, s: 0, m: 0 };

  statsData.forEach((i: any) => {
    const line = String(i.Line || "");
    const p = Number(i.TotalQtyProc ?? 0);
    const s = Number(i.TotalQtyScrap ?? 0);
    const m = Number(i.TotalQtyMoved ?? 0);

    if (line === "42SOLID") {
      solid.p += p;
      solid.s += s;
      solid.m += m;
    } else if (line.includes("42TWOTON")) {
      twoton.p += p;
      twoton.s += s;
      twoton.m += m;
    } else {
      others.p += p;
      others.s += s;
      others.m += m;
    }
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
    card("SOLID", GlassWater, solid),
    card("TWOTONE", Coffee, twoton),
    card("OTHERS", MoreHorizontal, others),
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
              Mold Dashboard
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <StatCardMold key={i} {...s} />
            ))}
          </div>

          {/* CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div  className="
                xl:col-span-2
                rounded-2xl
                border border-slate-200
                bg-white
                p-4
                shadow-sm
              ">
              <ProductChartMold />
            </div>

            <CategoryChartMold startDate={startDate} endDate={endDate} />
          </div>

          {/* TABLE */}
          <ProductTableMold
            startDate={startDate}
            endDate={endDate}
          />

        </main>
      </div>
    </div>
  );
};

export default MoldTotal;
