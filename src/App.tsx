import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "@/lib/queryClient";
import SkipNavigation from "./components/SkipNavigation";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import SubscriptionPricing from "./pages/SubscriptionPricing";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import SubscriptionCancel from "./pages/SubscriptionCancel";
import NotFound from "./pages/NotFound";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SkipNavigation />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pricing" element={<SubscriptionPricing />} />
          <Route path="/subscription/success" element={<SubscriptionSuccess />} />
          <Route path="/subscription/cancel" element={<SubscriptionCancel />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
