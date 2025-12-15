import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ManagerialInterviewSimulator from "./components/ManagerialInterviewSimulator";
import HRInterviewSimulator from "./components/HRInterviewSimulator";
import TechnicalInterviewSimulator from "./components/TechnicalInterviewSimulator";
import ResumePDFGenerator from "./components/ResumePDFGenerator";
import PerformanceReport from "./components/PerformanceReport";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route
              path="/managerial-interview"
              element={<ManagerialInterviewSimulator />}
            />
            <Route path="/hr-interview" element={<HRInterviewSimulator />} />
            <Route
              path="/technical-interview"
              element={<TechnicalInterviewSimulator />}
            />
            <Route path="/resume-pdf" element={<ResumePDFGenerator />} />
            <Route path="/performance" element={<PerformanceReport />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
