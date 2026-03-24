import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const data = [
  { name: "Complete", value: 35, color: "hsl(24, 95%, 53%)" },
  { name: "Scrap", value: 25, color: "hsl(217, 91%, 60%)" },
  // { name: "ว่าง", value: 20, color: "hsl(199, 89%, 48%)" },
  { name: "Scrap BF", value: 5, color: "hsl(127, 72%, 47%)" },
  { name: "Reject", value: 35, color: "hsl(222, 47%, 31%)" },
];

export function CategoryChartClay() {
  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-card opacity-0 animate-fade-in" style={{ animationDelay: "250ms" }}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">Sales by Customer</h3>
        <p className="text-sm text-muted-foreground">Distribution across product categories</p>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(214, 32%, 91%)",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              formatter={(value: number) => [`${value}%`, "Share"]}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
