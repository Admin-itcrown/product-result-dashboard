import React from "react";
import { Coffee, Wine, Calendar,CupSoda,GlassWater,Milk,Factory,PackageCheck,Blend,Boxes } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

import { StatCardGlaze, useFetchGlazeStats } from "./StatCardGlaze";
import { CategoryChartGlaze } from "./CategoryChartGlaze";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProductTableGlaze } from "./ProductTableGlaze";
import { ProductChartGlaze } from "./ProductChartGlaze";

const Glaze1 = () => {
  const [startDate, setStartDate] = React.useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = React.useState<Date | undefined>(new Date());

  const [showStart, setShowStart] = React.useState(false);
  const [showEnd, setShowEnd] = React.useState(false);

  const { statsData, loading } = useFetchGlazeStats(startDate, endDate);

  /* ===============================
     รวมยอดทั้งหมด
  =============================== */
  const statsSumNumber = statsData.reduce(
    (sum: number, item: any) => sum + Number(item.TotalQtyProc ?? 0),
    0
  );

  const statsSumScrap = statsData.reduce(
    (sum: number, item: any) => sum + Number(item.TotalQtyScrap ?? 0),
    0
  );

  const statsSumMoved = statsData.reduce(
    (sum: number, item: any) => sum + Number(item.TotalQtyMoved ?? 0),
    0
  );

  /* ===============================
     แยกกลุ่ม
  =============================== */
  let solideSum = 0;
  let solidScrap = 0;
  let solidMoved = 0;

  let treetonSum = 0;
  let treetonScrap = 0;
  let twotonMoved = 0;

  let othersSum = 0;
  let othersScrap = 0;
  let othersMoved = 0;

  statsData.forEach((item: any) => {
    const line = String(item.Line || "");

    const proc = Number(item.TotalQtyProc ?? 0);
    const scrap = Number(item.TotalQtyScrap ?? 0);
    const moved = Number(item.TotalQtyMoved ?? 0);

    if (line === "42SOLID") {
      solideSum += proc;
      solidScrap += scrap;
      solidMoved += moved;
    } else if (line.includes("42TWOTON")) {
      treetonSum += proc;
      treetonScrap += scrap;
      twotonMoved += moved;
    } else {
      othersSum += proc;
      othersScrap += scrap;
      othersMoved += moved;
    }
  });

  /* ===============================
     Cards
  =============================== */
  const stats = [
    {
      title: "Total",
      value: loading ? "Loading..." : statsSumNumber.toLocaleString(),
      change: loading ? "" : statsSumMoved.toLocaleString(),
      changeType: "positive" as const,
      scrap: loading ? "" : statsSumScrap.toLocaleString(),
      scrapType: "neutral" as const,
      icon: Factory,
      titleClassName: "text-black text-xl",
      valueClassName: "text-blue-700 text-3xl",
    },

    {
      title: "SOLID",
      value: loading ? "Loading..." : solideSum.toLocaleString(),
      change: loading ? "" : solidMoved.toLocaleString(),
      changeType: "positive" as const,
      scrap: loading ? "" : solidScrap.toLocaleString(),
      scrapType: "neutral" as const,
      icon: Coffee,
      titleClassName: "text-black",
    },

    {
      title: "TWOTON",
      value: loading ? "Loading..." : treetonSum.toLocaleString(),
      change: loading ? "" : twotonMoved.toLocaleString(),
      changeType: "positive" as const,
      scrap: loading ? "" : treetonScrap.toLocaleString(),
      scrapType: "neutral" as const,
      icon: GlassWater,
      titleClassName: "text-black",
    },

    {
      title: "Others",
      value: loading ? "Loading..." : othersSum.toLocaleString(),
      change: loading ? "" : othersMoved.toLocaleString(),
      changeType: "positive" as const,
      scrap: loading ? "" : othersScrap.toLocaleString(),
      scrapType: "neutral" as const,
      icon: Boxes,
      titleClassName: "text-black",
    },
  ];

  const dayPickerProps = {
    mode: "single" as const,
    locale: th,
    captionLayout: "dropdown" as const,
    fromYear: 2020,
    toYear: 2035,
    showOutsideDays: true,
    classNames: {
      caption: "flex justify-center gap-2 mb-4",
      caption_label: "hidden",
      caption_dropdowns: "flex gap-2",
      dropdown: "px-2 py-1 border rounded-md text-sm bg-white",
      table: "w-full",
      head_cell: "text-xs font-semibold text-gray-500 text-center",
      day: "h-10 w-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition",
      day_selected: "bg-blue-600 text-white hover:bg-blue-600",
    },
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />

      <div className="flex-1 flex flex-col">
        <DashboardHeader />

        <main className="flex-1 p-6 overflow-auto">
            {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900">
              Glaze Dashboard
            </h1>
            <p className="text-slate-500 mt-1">
              สรุปยอดการผลิต / ยอด A / Scrap
            </p>
          </div>

          {/* Date Filter */}
          <div className="mb-6 flex gap-8 items-center flex-wrap">

            {/* Start */}
            <div className="relative flex items-center gap-3">
              <label className="text-sm font-semibold text-blue-700">
                วันที่เริ่มต้น:
              </label>

              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={
                    startDate
                      ? format(startDate, "dd/MM/yyyy", { locale: th })
                      : ""
                  }
                  onClick={() => setShowStart(!showStart)}
                  className="px-3 py-2 pr-10 border rounded-lg bg-card cursor-pointer w-44"
                />

                <Calendar
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer"
                  onClick={() => setShowStart(!showStart)}
                />
              </div>

              {showStart && (
                <div className="absolute top-12 left-0 z-50 bg-white shadow-xl rounded-xl p-4">
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
                  type="text"
                  readOnly
                  value={
                    endDate
                      ? format(endDate, "dd/MM/yyyy", { locale: th })
                      : ""
                  }
                  onClick={() => setShowEnd(!showEnd)}
                  className="px-3 py-2 pr-10 border rounded-lg bg-card cursor-pointer w-44"
                />

                <Calendar
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer"
                  onClick={() => setShowEnd(!showEnd)}
                />
              </div>

              {showEnd && (
                <div className="absolute top-12 left-0 z-50 bg-white shadow-xl rounded-xl p-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {stats.map((stat, index) => (
              <StatCardGlaze
                key={stat.title}
                {...stat}
                delay={index * 50}
              />
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <ProductChartGlaze />
            </div>

            <CategoryChartGlaze startDate={startDate} endDate={endDate} />
          </div>

          <ProductTableGlaze />
        </main>
      </div>
    </div>
  );
};

export default Glaze1;