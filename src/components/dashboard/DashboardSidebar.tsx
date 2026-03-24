import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  BarChart2,
  Users,
  Settings,
  TrendingUp,
  Boxes,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SubMenuItem {
  label: string;
  path: string;
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path?: string;
  subItems?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  {
    icon: Package,
    label: "Clay",
    subItems: [
      { label: "Clay", path: "/clay1" }
      //{ label: "P2 Electronics", path: "/p2-electronics" },
      //{ label: "P3 Furniture", path: "/p3-furniture" },
    ]
  },
  {
    icon: Boxes,
    label: "Formming",
    subItems: [
      { label: "Formming", path: "/formming1" }
      //{ label: "P2 Electronics", path: "/p2-electronics" },
      //{ label: "P3 Furniture", path: "/p3-furniture" },
    ]
  },
  {
    icon: BarChart2,
    label: "Glaze",
    subItems: [{ label: "Glaze", path: "/glaze1" }
      //{ label: "P2 Electronics", path: "/p2-electronics" },
      //{ label: "P3 Furniture", path: "/p3-furniture" }, },
    ]
  },
  {
    icon: TrendingUp,
    label: "Kiln",
    subItems: [
      { label: "Kiln", path: "/kilnp1" }
      //{ label: "P2 Electronics", path: "/p2-electronics" },
      //{ label: "P3 Furniture", path: "/p3-furniture" },
    ]
  },
  {
    icon: BarChart3,
    label: "Sorting Whiteware",
    subItems: [
      { label: "White ware", path: "/whitewarep1" },
      { label: "Sort Details", path: "/sortdetails" },
      { label: "SortColour", path: "/sortcolour" },
      { label: "OverAllSort", path: "/overallsort" }

      //{ label: "P2 Electronics", path: "/p2-electronics" },
      //{ label: "P3 Furniture", path: "/p3-furniture" },
    ]
  },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function DashboardSidebar() {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<string[]>(["Products"]);

  const toggleMenu = (label: string) => {
    setOpenMenus(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const isActive = (path?: string) => path && location.pathname === path;
  const isSubItemActive = (subItems?: SubMenuItem[]) =>
    subItems?.some(sub => location.pathname === sub.path);

  return (
    <aside className="w-64 min-h-screen sidebar-gradient border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Package className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">Production Result</h1>
            <p className="text-xs text-sidebar-foreground/60">Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item, index) => (
            <li key={item.label}>
              {item.subItems ? (
                <Collapsible
                  open={openMenus.includes(item.label)}
                  onOpenChange={() => toggleMenu(item.label)}
                >
                  <CollapsibleTrigger
                    className={cn(
                      "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                      "opacity-0 animate-slide-in",
                      isSubItemActive(item.subItems) || openMenus.includes(item.label)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-primary"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </div>
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      openMenus.includes(item.label) && "rotate-180"
                    )} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1 ml-4 space-y-1">
                    {item.subItems.map((subItem) => (
                      <Link
                        key={subItem.path}
                        to={subItem.path}
                        className={cn(
                          "block px-4 py-2 rounded-lg text-sm transition-all duration-200",
                          location.pathname === subItem.path
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-primary"
                        )}
                      >
                        {subItem.label}
                      </Link>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <Link
                  to={item.path || "/"}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                    "opacity-0 animate-slide-in",
                    isActive(item.path)
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-primary"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent">
          <div className="h-9 w-9 rounded-full bg-sidebar-primary flex items-center justify-center">
            <span className="text-sm font-medium text-sidebar-primary-foreground">JD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">Sumeth</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
