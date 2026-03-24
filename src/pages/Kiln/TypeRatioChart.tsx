import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatNumber } from "./KilnDashboardStyles";
import type { TypeRatioData } from "./KilnDashboardStyles";

interface TypeRatioChartProps {
    glazeData: TypeRatioData;
    decalData: TypeRatioData;
}

const TYPE_COLORS = { Normal: '#22c55e', Repair: '#f97316' };

export function TypeRatioChart({ glazeData, decalData }: TypeRatioChartProps) {
    const [activeTab, setActiveTab] = useState<'Glaze' | 'Decal'>('Glaze');

    const current = activeTab === 'Glaze' ? glazeData : decalData;
    const total = current.total;
    const normalPct = total > 0 ? ((current.normal / total) * 100).toFixed(0) : '0';
    const repairPct = total > 0 ? ((current.repair / total) * 100).toFixed(0) : '0';

    const pieData = [
        { name: 'Normal', value: current.normal, color: TYPE_COLORS.Normal },
        { name: 'Repair', value: current.repair, color: TYPE_COLORS.Repair },
    ].filter(d => d.value > 0);

    const displayData = pieData.length > 0 ? pieData : [{ name: 'Empty', value: 1, color: '#e5e7eb' }];

    return (
        <div className="bg-card rounded-lg border border-border p-4 shadow-card opacity-0 animate-fade-in h-full" style={{ animationDelay: "250ms" }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-2 gap-1">
                <h3 className="text-[10px] font-bold text-foreground uppercase tracking-wider leading-tight flex-shrink-0 whitespace-nowrap">Type Ratio</h3>
                <div className="flex rounded-md border border-border overflow-hidden flex-shrink-0">
                    {(['Glaze', 'Decal'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "px-1.5 py-0.5 text-[9px] font-medium transition-colors",
                                activeTab === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Donut */}
            <div className="relative h-[130px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={displayData}
                            cx="50%"
                            cy="50%"
                            innerRadius={42}
                            outerRadius={60}
                            paddingAngle={pieData.length > 1 ? 4 : 0}
                            dataKey="value"
                        >
                            {displayData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip
                            formatter={(value: number, name: string) => [value.toLocaleString(), name]}
                            wrapperStyle={{ zIndex: 100 }}
                            allowEscapeViewBox={{ x: false, y: false }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-base font-bold text-foreground">{formatNumber(total)}</span>
                    <span className="text-[9px] text-muted-foreground uppercase">Total</span>
                </div>
            </div>

            {/* Progress bars */}
            <div className="mt-3 space-y-2">
                {[
                    { label: 'Normal', pct: normalPct, color: TYPE_COLORS.Normal },
                    { label: 'Repair', pct: repairPct, color: TYPE_COLORS.Repair },
                ].map(({ label, pct, color }) => (
                    <div key={label}>
                        <div className="flex justify-between mb-0.5">
                            <span className="text-[11px] text-muted-foreground">{label}</span>
                            <span className="text-[11px] font-bold text-foreground">{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
