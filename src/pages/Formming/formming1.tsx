import React from 'react'
import { Package, DollarSign, ShoppingBag, TrendingUp } from "lucide-react";



import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatCardFormming } from './StatCardFormm';
import { ProductChartFormm } from './ProductChartGFormm';
import { CategoryChartFormm } from './CategoryChartFormm';
import { ProductTableFormm } from './ProductTableFormm';



const stats = [
  {
    title: "Foromming Totol",
    value: "1,284,000",
    change: "+12.5%",
    changeType: "positive" as const,
    icon: Package,
  },
  {
    title: "QtyMoved",
    value: "฿2.4M",
    change: "+8.2%",
    changeType: "positive" as const,
    icon: DollarSign,
  },
  {
    title: "QtyRework",
    value: "8,492",
    change: "+23.1%",
    changeType: "positive" as const,
    icon: ShoppingBag,
    
  },
  {
    title: "ActRun",
    value: "3.24%",
    change: "-0.8%",
    changeType: "negative" as const,
    icon: TrendingUp,
  },
  //  {
  //   title: "Glaze Reject",
  //   value: "3.33%",
  //   change: "-0.9%",
  //   changeType: "negative" as const,
  //   icon: TrendingUp,
  // },
];




const formming1 = () => {
  return (
    <div className="flex min-h-screen bg-background ">
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
              {/* <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-6"> */}
                {stats.map((stat, index) => (
                  <StatCardFormming
                    key={stat.title}
                    {...stat}
                    delay={index * 50}
                  />
                ))}
              </div>
    
              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2">
                  <ProductChartFormm />
                </div>
                <CategoryChartFormm />
              </div>
    
              {/* Products Table */}
              <ProductTableFormm />
            </main>
          </div>
        </div>
  )
}

export default formming1