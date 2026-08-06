import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  Route,
  Outlet,
} from "react-router-dom";

import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

import Index from "./pages/Index";
import Mold1 from "./pages/Mold/MoldTotal/Moldtotal";
import Clay1 from "./pages/Clay/clay1";
import Kilnp1 from "./pages/Kiln/kilnp1";
import Sortdetail from "./pages/Whiteware/Sortdetails";
import SortOverview from "./pages/Whiteware/OverAllSort";
import SortingWW from "./pages/Whiteware/SortingWW/SortingWW";
import SortingDetail from "./pages/Whiteware/SortingWW/SortingDetail";


import NotFound from "./pages/NotFound";
import Glaze1 from "./pages/Glaze/GlazeTotal/glaze1";
import GlazebyGroup from "./pages/Glaze/Glaze By Group/GlazebyGroup";
import Formming from "./pages/Formming/Formming1/formming1";
import Sortingbis from "./pages/Formming/SortingBis/sortingbis";
import Finishing from "./pages/Formming/Finishing/finishing";
import BisqueFiring from "./pages/Formming/Bisque Firing/bisquefiring";

const queryClient = new QueryClient();

/* =========================
   Layout หลัก
========================= */
function Layout() {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar Fixed */}
      <DashboardSidebar />

      {/* Content */}
      <main className="ml-64 pt-16 min-h-screen overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}

/* =========================
   Router
========================= */
const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* ใช้ Layout หลัก */}
      <Route element={<Layout />}>
        <Route path="/" element={<Index />} />
        <Route path="/mold1" element={<Mold1 />} />
        <Route path="/clay1" element={<Clay1 />} />
        <Route path="/glaze1" element={<Glaze1 />} />
        <Route path="/glazebygroup" element={<GlazebyGroup />} />
        <Route path="/kilnp1" element={<Kilnp1 />} />
        <Route path="/formming1" element={<Formming />} />
        <Route path="/bisquefiring" element={<BisqueFiring />} />
        <Route path="/finishing" element={<Finishing />} />
        <Route path="/sortingbis" element={<Sortingbis />} />
        <Route path="/sortdetail" element={<Sortdetail />} />
        <Route path="/sortoverview" element={<SortOverview />} />
        {/* <Route path="/sortingww" element={<SortingWW />} />
        <Route path="/sortingdetail" element={<SortingDetail />} /> */}

      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </>
  ),
  {
    future: {
      v7_relativeSplatPath: true,
    },
  }
);

/* =========================
   App
========================= */
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;