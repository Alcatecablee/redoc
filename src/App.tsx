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
import DashboardNew from "./pages/DashboardNew";
import TeamDashboard from "./pages/TeamDashboard";
import EnterpriseDashboard from "./pages/EnterpriseDashboard";
import EnterpriseSettings from "./pages/EnterpriseSettings";
import SubscriptionPricing from "./pages/SubscriptionPricing";
import TeamManagement from "./pages/TeamManagement";
import Billing from "./pages/Billing";
import Activity from "./pages/Activity";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import SubscriptionCancel from "./pages/SubscriptionCancel";
import GenerationProgress from "./pages/GenerationProgress";
import Quotation from "./pages/Quotation";
import AdminDashboard from "./pages/AdminDashboard";
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
          <Route path="/dashboard" element={<DashboardNew />} />
          <Route path="/dashboard/old" element={<Dashboard />} />
          <Route path="/dashboard/team" element={<TeamDashboard />} />
          <Route path="/dashboard/enterprise" element={<EnterpriseDashboard />} />
          <Route path="/settings" element={<EnterpriseSettings />} />
          <Route path="/pricing" element={<SubscriptionPricing />} />
          <Route path="/team" element={<TeamManagement />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/subscription/success" element={<SubscriptionSuccess />} />
          <Route path="/subscription/cancel" element={<SubscriptionCancel />} />
          <Route path="/quotation" element={<Quotation />} />
          <Route path="/generate/:sessionId" element={<GenerationProgress />} />
          <Route path="/generation/:sessionId" element={<GenerationProgress />} />
          <Route path="/admin" element={<AdminDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
