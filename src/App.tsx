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
import Clay1 from "./pages/Clay/clay1";
import Kilnp1 from "./pages/Kiln/kilnp1";
import Whitewarep1 from "./pages/Whiteware/Whitewarep1";
import Sortdetails from "./pages/Whiteware/Sortdetails";
import SortColour from "./pages/Whiteware/SortColour";
import OverAllSort from "./pages/Whiteware/OverAllSort";
import NotFound from "./pages/NotFound";
import Glaze1 from "./pages/Glaze/glaze1";
import Formming from "./pages/Formming/formming1";

const queryClient = new QueryClient();

/* =========================
   Layout หลัก (สำคัญ)
========================= */
function Layout() {
  return (
    <div className="flex">
      {/* Sidebar ล็อคซ้าย */}
      <DashboardSidebar />

      {/* กันล้น + ดัน content */}
      <main className="flex-1 ml-64 min-h-screen overflow-x-hidden bg-background">
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
      {/* ทุกหน้าใช้ Layout นี้ */}
      <Route element={<Layout />}>
        <Route path="/" element={<Index />} />
        <Route path="/clay1" element={<Clay1 />} />
        <Route path="/glaze1" element={<Glaze1 />} />
        <Route path="/kilnp1" element={<Kilnp1 />} />
        <Route path="/formming1" element={<Formming />} />

        <Route path="/whitewarep1" element={<Whitewarep1 />} />
        <Route path="/sortdetails" element={<Sortdetails />} />
        <Route path="/sortcolour" element={<SortColour />} />
        <Route path="/overallsort" element={<OverAllSort />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </>
  ),
  {
    future: { v7_relativeSplatPath: true },
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