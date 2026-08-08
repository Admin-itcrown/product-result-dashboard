import { ClipboardList, Target, TrendingUp, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

interface ProductionPlanSummaryProps {
  actual: number;
  storageKey: string;
  unit?: string;
}

const formatNumber = (value: number) =>
  new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(value);

export function ProductionPlanSummary({
  actual,
  storageKey,
  unit = "PCS",
}: ProductionPlanSummaryProps) {
  const [planInput, setPlanInput] = useState("");

  useEffect(() => {
    setPlanInput(window.localStorage.getItem(storageKey) ?? "");
  }, [storageKey]);

  const plan = Math.max(0, Number(planInput.replace(/,/g, "")) || 0);
  const achievement = plan > 0 ? (actual / plan) * 100 : 0;
  const remaining = Math.max(plan - actual, 0);
  const overPlan = Math.max(actual - plan, 0);
  const progress = Math.min(achievement, 100);
  const isOnPlan = plan > 0 && actual >= plan;

  const updatePlan = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    setPlanInput(numericValue);
    window.localStorage.setItem(storageKey, numericValue);
  };

  return (
    <section className="space-y-4" aria-label="สรุปเทียบแผนการผลิต">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="production-plan" className="mb-1.5 block text-sm font-semibold text-slate-700">
            กรอกแผนการผลิต ({unit})
          </label>
          <input
            id="production-plan"
            inputMode="numeric"
            value={planInput ? formatNumber(Number(planInput)) : ""}
            onChange={(event) => updatePlan(event.target.value)}
            placeholder="เช่น 12,500"
            className="w-full rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-lg font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <p className="pb-2 text-xs text-slate-500">บันทึกค่าแผนไว้ในเบราว์เซอร์ของเครื่องนี้อัตโนมัติ</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PlanCard title="แผนการผลิต (Plan)" value={plan} unit={unit} icon={ClipboardList} color="blue" />
        <PlanCard title="ผลิตได้จริง (Actual)" value={actual} unit={unit} icon={TrendingUp} color="green" />
        <PlanCard
          title="ประสิทธิภาพ (Achievement)"
          value={achievement}
          suffix="%"
          note={plan ? "เทียบกับแผน" : "กรุณากรอกแผนการผลิต"}
          icon={Trophy}
          color="amber"
        />
        <PlanCard
          title={isOnPlan ? "เกินแผน (Over Plan)" : "คงเหลือ (Remaining)"}
          value={isOnPlan ? overPlan : remaining}
          unit={unit}
          note={isOnPlan ? "ผลิตได้ตามแผนแล้ว" : "ต้องผลิตเพิ่ม"}
          icon={Target}
          color={isOnPlan ? "green" : "red"}
        />
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-800">ความคืบหน้าการผลิต</h2>
            <p className="mt-1 text-sm text-slate-500">
              {plan ? `ผลิตได้ ${formatNumber(actual)} ${unit} จากแผน ${formatNumber(plan)} ${unit}` : "กรอกแผนการผลิตเพื่อเริ่มเปรียบเทียบ"}
            </p>
          </div>
          <span className="text-xl font-bold text-slate-800">{plan ? `${achievement.toFixed(2)}%` : "–"}</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-300 ${isOnPlan ? "bg-green-500" : "bg-blue-600"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </section>
  );
}

function PlanCard({
  title,
  value,
  unit,
  suffix,
  note,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  unit?: string;
  suffix?: string;
  note?: string;
  icon: typeof ClipboardList;
  color: "blue" | "green" | "amber" | "red";
}) {
  const colors = {
    blue: { icon: "bg-blue-100 text-blue-600", value: "text-blue-600" },
    green: { icon: "bg-green-100 text-green-600", value: "text-green-600" },
    amber: { icon: "bg-amber-100 text-amber-600", value: "text-amber-500" },
    red: { icon: "bg-red-100 text-red-600", value: "text-red-600" },
  };

  return (
    <article className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className={`mt-2 text-3xl font-bold ${colors[color].value}`}>
            {suffix ? value.toFixed(2) : formatNumber(value)}
            <span className="ml-1 text-sm font-medium text-slate-500">{suffix ?? unit}</span>
          </p>
          {note && <p className="mt-2 text-xs text-slate-500">{note}</p>}
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-full ${colors[color].icon}`}>
          <Icon size={22} />
        </span>
      </div>
    </article>
  );
}
