import type { QualityKilnMetrics } from "./KilnDashboardStyles";
import { QUALITY_COLORS } from "./KilnDashboardStyles";

interface Top3ListProps {
  title: string;
  icon: string;
  items: { name: string; value: string }[];
  colorKey: 'complete' | 'scrap' | 'reject';
}

function Top3List({ title, icon, items, colorKey }: Top3ListProps) {
  const color = QUALITY_COLORS[colorKey];
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="text-xs">{icon}</span>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Top 3 {title}</span>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">—</p>
        ) : (
          items.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="flex-shrink-0 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                  style={{ backgroundColor: color }}
                >
                  {i + 1}
                </span>
                <span className="text-xs text-foreground truncate">{item.name}</span>
              </div>
              <span className="text-xs font-bold flex-shrink-0" style={{ color }}>{item.value}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function getTop3(metrics: QualityKilnMetrics[], field: 'compRate' | 'scrapRate' | 'rejectRate', order: 'desc' | 'asc' = 'desc') {
  return [...metrics]
    .filter(m => m.totalQtyp > 0)
    .sort((a, b) => order === 'desc' ? b[field] - a[field] : a[field] - b[field])
    .slice(0, 3)
    .map(m => ({ name: m.m_kiln, value: m[field].toFixed(1) + '%' }));
}

// ─── Main Export ───
interface ProductTableKilnProps {
  title: string;
  titleColor?: string;
  kilnMetrics: QualityKilnMetrics[];
  delay?: number;
}

export function ProductTableKiln({ title, titleColor, kilnMetrics, delay = 0 }: ProductTableKilnProps) {
  const top3Complete = getTop3(kilnMetrics, 'compRate', 'desc');
  const top3Scrap = getTop3(kilnMetrics, 'scrapRate', 'desc');
  const top3Reject = getTop3(kilnMetrics, 'rejectRate', 'desc');

  return (
    <div
      className="bg-card rounded-lg border border-border p-4 shadow-card opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h4 className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: titleColor || '#6b7280' }}>
        {title}
      </h4>
      <div className="grid grid-cols-3 gap-4">
        <Top3List title="Complete" icon="✅" items={top3Complete} colorKey="complete" />
        <Top3List title="Scrap" icon="❌" items={top3Scrap} colorKey="scrap" />
        <Top3List title="Reject" icon="🔧" items={top3Reject} colorKey="reject" />
      </div>
    </div>
  );
}
