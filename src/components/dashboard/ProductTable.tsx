import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  category: string;
  sales: number;
  revenue: string;
  status: "active" | "low-stock" | "out-of-stock";
  trend: number;
}

const products: Product[] = [
  { id: "1", name: "Wireless Headphones Pro", category: "Electronics", sales: 1234, revenue: "฿123,400", status: "active", trend: 12.5 },
  { id: "2", name: "Smart Watch Series X", category: "Wearables", sales: 892, revenue: "฿89,200", status: "active", trend: 8.3 },
  { id: "3", name: "Bluetooth Speaker Mini", category: "Audio", sales: 756, revenue: "฿45,360", status: "low-stock", trend: -2.1 },
  { id: "4", name: "USB-C Hub Adapter", category: "Accessories", sales: 623, revenue: "฿31,150", status: "active", trend: 15.7 },
  { id: "5", name: "Wireless Charging Pad", category: "Accessories", sales: 512, revenue: "฿25,600", status: "out-of-stock", trend: -8.4 },
  { id: "6", name: "Premium Laptop Stand", category: "Office", sales: 489, revenue: "฿48,900", status: "active", trend: 5.2 },
];

const statusConfig = {
  "active": { label: "Active", className: "bg-success/10 text-success hover:bg-success/20" },
  "low-stock": { label: "Low Stock", className: "bg-warning/10 text-warning hover:bg-warning/20" },
  "out-of-stock": { label: "Out of Stock", className: "bg-destructive/10 text-destructive hover:bg-destructive/20" },
};

export function ProductTable() {
  return (
    <div className="bg-card rounded-lg border border-border shadow-card opacity-0 animate-fade-in" style={{ animationDelay: "300ms" }}>
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Top Products</h3>
        <p className="text-sm text-muted-foreground">Best performing products this month</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Product</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Category</th>
              <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">Sales</th>
              <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">Revenue</th>
              <th className="text-center py-4 px-6 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">Trend</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <tr 
                key={product.id} 
                className="border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
                style={{ animationDelay: `${400 + index * 50}ms` }}
              >
                <td className="py-4 px-6">
                  <span className="font-medium text-foreground">{product.name}</span>
                </td>
                <td className="py-4 px-6 text-muted-foreground">{product.category}</td>
                <td className="py-4 px-6 text-right text-foreground font-medium">{product.sales.toLocaleString()}</td>
                <td className="py-4 px-6 text-right text-foreground font-medium">{product.revenue}</td>
                <td className="py-4 px-6 text-center">
                  <Badge variant="secondary" className={cn("font-medium", statusConfig[product.status].className)}>
                    {statusConfig[product.status].label}
                  </Badge>
                </td>
                <td className="py-4 px-6 text-right">
                  <span className={cn(
                    "font-medium",
                    product.trend >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {product.trend >= 0 ? "+" : ""}{product.trend}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
