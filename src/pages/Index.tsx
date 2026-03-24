import { Package, DollarSign, ShoppingBag, TrendingUp } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProductChart } from "@/components/dashboard/ProductChart";
import { ProductTable } from "@/components/dashboard/ProductTable";
import { CategoryChart } from "@/components/dashboard/CategoryChart";

const stats = [
  {
    title: "ยอดสุทธิ ของ Clay",
    value: "1,284,000",
    change: "+12.5%",
    changeType: "positive" as const,
    icon: Package,
  },
  {
    title: "Total Revenue  Test IT2",
    value: "฿2.4M",
    change: "+8.2%",
    changeType: "positive" as const,
    icon: DollarSign,
  },
  {
    title: "Orders  Test IT3",
    value: "8,492",
    change: "+23.1%",
    changeType: "positive" as const,
    icon: ShoppingBag,
  },
  {
    title: "Conversion Rate  Test IT4",
    value: "3.24%",
    change: "-0.8%",
    changeType: "negative" as const,
    icon: TrendingUp,
  },
];

const Index = () => {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <DashboardHeader />

        {/* Dashboard Content */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {stats.map((stat, index) => (
              <StatCard
                key={stat.title}
                {...stat}
                delay={index * 50}
              />
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <ProductChart />
            </div>
            <CategoryChart />
          </div>

          {/* Products Table */}
          <ProductTable />
        </main>
      </div>
    </div>
  );
};

export default Index;
