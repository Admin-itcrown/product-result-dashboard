import React from "react";
import { Coffee, Wine, Calendar } from "lucide-react";
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
  const [startDate, setStartDate] = React.useState<Date | undefined>(
    new Date()
  );
  const [endDate, setEndDate] = React.useState<Date | undefined>(
    new Date()
  );

  const [showStart, setShowStart] = React.useState(false);
  const [showEnd, setShowEnd] = React.useState(false);

  const { statsData, loading } = useFetchGlazeStats(
    startDate,
    endDate
  );

  const wkctrList = [
    "W517001",
    "W517002",
    "W517003",
    "W517004",
    "W517006",
    "W517009",
    "W518001",
  ];

  const statsSumNumber = statsData.reduce(
    (sum: number, item: any) =>
      sum + Number(item.SUM_QtyProc ?? 0),
    0
  );

  const statsSum = loading
    ? "Loading..."
    : statsSumNumber.toLocaleString();

  const stats = [
    {
      title: "Total All Wkctr",
      value: statsSum,
      change: loading ? "" : "100%",
      changeType: "positive" as const,
      icon: Coffee,
      titleClassName: "text-black text-xl",
      valueClassName: "text-blue-700 text-3xl",
    },
    ...wkctrList.map((wk) => {
      const found = statsData.find(
        (d: any) => d.Wkctr === wk
      );

      const valueNumber = Number(
        found?.SUM_QtyProc ?? 0
      );

      const percent =
        statsSumNumber > 0
          ? ((valueNumber / statsSumNumber) * 100).toFixed(2)
          : "0.00";

      return {
        title: `Wkctr ${wk}`,
        value: loading
          ? "Loading..."
          : valueNumber.toLocaleString(),
        change: loading ? "" : `${percent}%`,
        changeType: "positive" as const,
        icon: Wine,
        titleClassName: "text-black",
      };
    }),
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
      caption_label: "hidden", // ✅ ซ่อนชื่อเดือน/ปีที่ซ้ำ
      caption_dropdowns: "flex gap-2",
      dropdown: "px-2 py-1 border rounded-md text-sm bg-white",

      table: "w-full",
      head_cell:
        "text-xs font-semibold text-gray-500 text-center",

      day: "h-10 w-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition",
      day_selected:
        "bg-blue-600 text-white hover:bg-blue-600",
    },
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />

      <div className="flex-1 flex flex-col">
        <DashboardHeader />

        <main className="flex-1 p-6 overflow-auto">
          {/* ================= Date Filter ================= */}
          <div className="mb-6 flex gap-8 items-center flex-wrap">

            {/* Start Date */}
            <div className="relative flex items-center gap-3">
              <label className="text-sm font-medium whitespace-nowrap">
                วันที่เริ่มต้น:
              </label>

              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={
                    startDate
                      ? format(startDate, "dd/MM/yyyy", {
                          locale: th,
                        })
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

            {/* End Date */}
            <div className="relative flex items-center gap-3">
              <label className="text-sm font-medium whitespace-nowrap">
                วันที่สิ้นสุด:
              </label>

              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={
                    endDate
                      ? format(endDate, "dd/MM/yyyy", {
                          locale: th,
                        })
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

          {/* ================= Stat Cards ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {stats.map((stat, index) => (
              <StatCardGlaze
                key={stat.title}
                {...stat}
                delay={index * 50}
              />
            ))}
          </div>

          {/* ================= Charts ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <ProductChartGlaze />
            </div>

            <CategoryChartGlaze />
          </div>

          <ProductTableGlaze />
        </main>
      </div>
    </div>
  );
};

export default Glaze1;