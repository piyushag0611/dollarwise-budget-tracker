import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DatabaseProvider } from "@/contexts/DatabaseContext";
import { getDatabase } from "@/integrations/sqlite/db";
import { AppLayout } from "@/components/AppLayout";
import ExpensesPage from "@/pages/ExpensesPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<AppLayout><ExpensesPage /></AppLayout>} />
    <Route path="/analytics" element={<AppLayout><AnalyticsPage /></AppLayout>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <DatabaseProvider adapterFactory={getDatabase}>
            <AppRoutes />
          </DatabaseProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
