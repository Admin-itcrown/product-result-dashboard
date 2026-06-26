import { Bell, Search, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
};

export function DashboardHeader() {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}:${seconds}`);

      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      setCurrentDate(`${day}/${month}/${year}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="fixed top-0 left-64 right-0 z-50 h-16 border-b border-border bg-card px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Reporting production totals
          </h2>
          <p className="text-sm text-muted-foreground">
            Overview of your product performance
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        {/* <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="w-64 pl-10 bg-secondary border-border"
          />
        </div> */}

        {/* Date */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-secondary text-foreground">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {currentDate || "00/00/0000"}
          </span>
        </div>

        {/* Time */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-md bg-secondary text-foreground min-w-[120px] justify-center">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {currentTime || "00:00:00"}
          </span>
        </div>

        {/* Bell */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full text-[10px] font-medium text-primary-foreground flex items-center justify-center">
            3
          </span>
        </Button>
      </div>
    </header>
  );
}