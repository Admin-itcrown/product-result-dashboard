import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route } from "react-router-dom";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* Use data-router API so we can opt-in to future flags (v7_relativeSplatPath) */}
      <RouterProvider
        router={createBrowserRouter(
          createRoutesFromElements(
            <>
              <Route path="/" element={<Index />} />
              <Route path="/clay1" element={<Clay1 />} />
              <Route path="/glaze1" element={<Glaze1 />} />
              <Route path="/kilnp1" element={<Kilnp1 />} />
              <Route path="/formming1" element={<Formming />} />

              {/* <Route path="/whitewarep1" element={<Whitewarep1 />} /> */}
              <Route path="/sortdetails" element={<Sortdetails />} />
              <Route path="/sortcolour" element={<SortColour />} />
              <Route path="/overallsort" element={<OverAllSort />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </>
          ),
          { future: { v7_relativeSplatPath: true } }
        )}
      />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
