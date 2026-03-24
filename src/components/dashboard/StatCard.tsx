import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  delay?: number;
}

export function StatCard({ title, value, change, changeType, icon: Icon, delay = 0 }: StatCardProps) {
  return (
    <div 
      className={cn(
        "bg-card rounded-lg border border-border p-6 shadow-card hover:shadow-card-hover transition-all duration-300",
        "opacity-0 animate-fade-in"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{value}</p>
          <div className="flex items-center gap-1 mt-2">
            <span className={cn(
              "text-sm font-medium",
              changeType === "positive" && "text-success",
              changeType === "negative" && "text-destructive",
              changeType === "neutral" && "text-muted-foreground"
            )}>
              {change}
            </span>
            <span className="text-xs text-muted-foreground">vs last month</span>
          </div>
        </div>
        <div className="h-12 w-12 rounded-lg bg-accent flex items-center justify-center">
          <Icon className="h-6 w-6 text-accent-foreground" />
        </div>
      </div>
    </div>
  );
}
