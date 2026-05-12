import React from "react";
import { ArrowUpRight, CheckCircle2, Layers, Shuffle } from "lucide-react";

import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

const summaryMetrics = [
  {
    title: "ยอดรวม",
    value: 84230,
    subtitle: "ชิ้นงานทั้งหมดที่ผ่านการคัดแยก",
    icon: Layers,
    accent: "bg-sky-500/10 text-sky-700",
  },
  {
    title: "ยอด A",
    value: 72140,
    subtitle: "ชิ้นงานคุณภาพ A",
    icon: CheckCircle2,
    accent: "bg-emerald-500/10 text-emerald-700",
  },
  {
    title: "ยอด Scrap",
    value: 5820,
    subtitle: "ชิ้นงานที่ต้องคัดทิ้ง",
    icon: Shuffle,
    accent: "bg-rose-500/10 text-rose-700",
  },
  {
    title: "Scrap %",
    value: "6.9%",
    subtitle: "อัตราส่วน Scrap ต่อยอดรวม",
    icon: ArrowUpRight,
    accent: "bg-violet-500/10 text-violet-700",
  },
];

const formatNumber = (value: number) => value.toLocaleString("th-TH");

const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  accent: string;
}) => (
  <div className="rounded-3xl border border-border bg-white p-6 shadow-card transition hover:-translate-y-1 hover:shadow-card-hover">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      </div>
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${accent}`}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
    <p className="mt-5 text-sm text-slate-500">{subtitle}</p>
  </div>
);

const ProgressRow = ({
  label,
  value,
  percent,
  accent,
}: {
  label: string;
  value: number;
  percent: number;
  accent: string;
}) => (
  <div className="rounded-3xl border border-border bg-white p-5 shadow-card">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-xl font-semibold text-slate-900">{formatNumber(value)}</p>
      </div>
      <div className="text-right">
        <p className="text-sm text-slate-500">เปอร์เซ็นต์</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">{percent.toFixed(1)}%</p>
      </div>
    </div>
    <div className="mt-5 h-3 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full ${accent}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  </div>
);

const SortingBis = () => {
  const total = 84230;
  const totalA = 72140;
  const scrap = 5820;
  const scrapPercent = total > 0 ? (scrap / total) * 100 : 0;
  const aPercent = total > 0 ? (totalA / total) * 100 : 0;

  return (
    <div className="flex min-h-screen bg-slate-100">
      <DashboardSidebar />

      <div className="flex-1 flex flex-col">
        <DashboardHeader />

        <main className="flex-1 p-6 overflow-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900">Sorting Bisque Dashboard</h1>
            <p className="text-slate-500 mt-2">สรุปการคัดแยกชิ้นงาน Bisque พร้อมยอดรวม ยอด A และ Scrap %</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4 mb-8">
            {summaryMetrics.map((metric) => (
              <MetricCard key={metric.title} {...metric} />
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <div className="rounded-3xl border border-border bg-white p-6 shadow-card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">สัดส่วนการคัดแยก</h2>
                  <p className="mt-2 text-sm text-slate-500">แสดงอัตรา A และ Scrap จากยอดรวมทั้งหมด</p>
                </div>
              </div>

              <div className="mt-8 space-y-5">
                <ProgressRow label="ยอด A" value={totalA} percent={aPercent} accent="bg-emerald-500" />
                <ProgressRow label="Scrap" value={scrap} percent={scrapPercent} accent="bg-rose-500" />
                <ProgressRow label="ยอดรวม" value={total} percent={100} accent="bg-sky-500" />
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-white p-6 shadow-card">
              <h2 className="text-xl font-semibold text-slate-900">สรุปด่วน</h2>
              <p className="mt-2 text-sm text-slate-500">ช่วยให้ดูภาพรวมของกระบวนการ Sorting Bisque ได้ทันที</p>

              <div className="mt-6 space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">ชิ้นงาน A</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{formatNumber(totalA)}</p>
                  <p className="text-sm text-slate-500 mt-1">{aPercent.toFixed(1)}% ของยอดรวม</p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Scrap</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{formatNumber(scrap)}</p>
                  <p className="text-sm text-slate-500 mt-1">{scrapPercent.toFixed(2)}% ของยอดรวม</p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">ยอดรวม</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{formatNumber(total)}</p>
                  <p className="text-sm text-slate-500 mt-1">อัปเดตข้อมูลล่าสุด</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SortingBis;
