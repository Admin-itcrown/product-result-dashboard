import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  BarChart3,
  BarChart2,
  Settings,
  TrendingUp,
  Boxes,
  ChevronDown,
  Hexagon,
  Stamp
} from "lucide-react";
import logo from "@/icon/icon2.png";

import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";

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
    icon: Hexagon,
    label: "Mold",
    subItems: [{ label: "Mold", path: "/mold1" }]
  },

  {
    icon: Package,
    label: "Clay",
    subItems: [{ label: "Clay", path: "/clay1" }]
  },

  {
    icon: Boxes,
    label: "Formming",
    subItems: [
      { label: "Formming", path: "/formming1" },
      { label: "Finishing", path: "/finishing" },
      { label: "Bisque Firing", path: "/bisquefiring" },
      { label: "Sorting Bisque", path: "/sortingbis" }
    ]
  },

  {
    icon: BarChart2,
    label: "Glaze",
    subItems: [
      { label: "Glaze", path: "/glaze1" },
      { label: "Glaze By Group", path: "/glazebygroup" }
    ]
  },

  {
    icon: TrendingUp,
    label: "Kiln",
    subItems: [
      { label: "Production", path: "/kilnp1" },
      { label: "Quality", path: "/kilnquality" }
    ]
  },

  {
    icon: BarChart3,
    label: "Sorting Whiteware",
    subItems: [
      { label: "Sorting Whiteware", path: "/sortoverview" },
      { label: "Sorting Details", path: "/sortdetail" },

    ]
  },

  {
    icon: Stamp,
    label: "Decorate Ware",
    subItems: [
      { label: "Stamp", path: "/stamp1" }
    ]
  },

  { icon: Settings, label: "Settings", path: "/settings" }
];

export function DashboardSidebar() {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  // Auto-expand parent menu when navigating to a submenu item
  useEffect(() => {
    const activeParentMenu = menuItems.find((menu) =>
      menu.subItems?.some((sub) => location.pathname === sub.path)
    );

    if (activeParentMenu) {
      setOpenMenus([activeParentMenu.label]);
    } else {
      setOpenMenus([]);
    }
  }, [location.pathname]);

  const toggleMenu = (label: string) => {
    // Toggle: if already open, close it; otherwise close all and open this one
    if (openMenus.includes(label)) {
      setOpenMenus([]);
    } else {
      setOpenMenus([label]);
    }
  };

  const isActive = (path?: string) =>
    path ? location.pathname === path : false;

  const isSubItemActive = (subItems?: SubMenuItem[]) =>
    subItems?.some((sub) => location.pathname === sub.path);

  return (
    <aside className="w-64 fixed top-0 left-0 h-screen flex flex-col sidebar-gradient border-r border-sidebar-border">

      {/* LOGO */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm overflow-hidden p-1">
  <img
    src={logo}
    alt="Logo"
    className="w-full h-full object-contain"
  />
</div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">
              Production Result
            </h1>
            <p className="text-xs text-sidebar-foreground/60">
              Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* NAV */}
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
                      "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                      isSubItemActive(item.subItems) ||
                        openMenus.includes(item.label)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-primary"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </div>

                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        openMenus.includes(item.label) && "rotate-180"
                      )}
                    />
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-1 ml-4 space-y-1">
                    {item.subItems.map((subItem) => (
                      <Link
                        key={subItem.path}
                        to={subItem.path}
                        className={cn(
                          "block px-4 py-2 rounded-lg text-sm transition-all",
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
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                    isActive(item.path)
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-primary"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* USER */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent">
          <div className="h-9 w-9 rounded-full bg-sidebar-primary flex items-center justify-center">
            <span className="text-sm font-medium text-sidebar-primary-foreground">
              JD
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              Sumeth
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              Admin
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}