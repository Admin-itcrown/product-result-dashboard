import { cn } from "@/lib/utils";
import { Flame, Award, TrendingUp } from "lucide-react";
import { CATEGORY_COLORS, formatNumber } from "./KilnDashboardStyles";

// ─── Production Stat Card ───
interface ProdStatProps {
  label: string;
  kilnName?: string;
  value: number;
  category?: 'Biscuit' | 'Glaze' | 'Decal';
  delay?: number;
  isTotal?: boolean;
}

export function ProdStatCard({ label, kilnName, value, category, delay = 0, isTotal }: ProdStatProps) {
  const accentColor = category ? CATEGORY_COLORS[category] : '#6b7280';

  return (
    <div
      className={cn(
        "bg-card rounded-lg border border-border p-3 shadow-card hover:shadow-md transition-all duration-200",
        "opacity-0 animate-fade-in flex items-center gap-3"
      )}
      style={{ animationDelay: `${delay}ms`, borderLeftWidth: '3px', borderLeftColor: accentColor }}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${accentColor}18` }}
      >
        {isTotal
          ? <TrendingUp className="h-4 w-4" style={{ color: accentColor }} />
          : category === 'Biscuit'
            ? <Flame className="h-4 w-4" style={{ color: accentColor }} />
            : <Award className="h-4 w-4" style={{ color: accentColor }} />
        }
      </div>
      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
        {kilnName && kilnName !== '-' && (
          <p className="text-sm font-bold text-foreground truncate leading-tight">{kilnName}</p>
        )}
        <p className="text-xs font-semibold text-foreground">
          <span className={isTotal ? "text-base" : ""}>{formatNumber(value)}</span>
          <span className="text-[10px] font-normal text-muted-foreground ml-0.5">pcs</span>
        </p>
      </div>
    </div>
  );
}

// ─── Quality KPI Card ───
interface QualityKpiProps {
  label: string;
  value: string;
  subtitle: string;
  type: 'complete' | 'scrap' | 'reject';
  delay?: number;
}

const KPI_CONFIG = {
  complete: { color: '#22c55e', icon: '✅', bg: 'rgba(34,197,94,0.08)' },
  scrap: { color: '#ef4444', icon: '❌', bg: 'rgba(239,68,68,0.08)' },
  reject: { color: '#f97316', icon: '🔧', bg: 'rgba(249,115,22,0.08)' },
};

export function QualityKpiCard({ label, value, subtitle, type, delay = 0 }: QualityKpiProps) {
  const config = KPI_CONFIG[type];

  return (
    <div
      className={cn(
        "bg-card rounded-lg border border-border p-4 shadow-card transition-all duration-200",
        "opacity-0 animate-fade-in"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">{label}</p>
        <span
          className="text-xs px-1.5 py-0.5 rounded-md flex-shrink-0"
          style={{ backgroundColor: config.bg, color: config.color }}
        >
          {config.icon}
        </span>
      </div>
      <p className="text-2xl font-bold leading-none" style={{ color: config.color }}>
        {value}<span className="text-sm ml-0.5">%</span>
      </p>
      <p className="text-[10px] text-muted-foreground mt-1.5">{subtitle}</p>
    </div>
  );
}