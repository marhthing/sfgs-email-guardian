import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Files from "./pages/Files";
import Queue from "./pages/Queue";
import SentHistory from "./pages/SentHistory";
import FailedEmails from "./pages/FailedEmails";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Students from "./pages/Students";
import Birthday from "./pages/Birthday";
import StudentPromotion from "./pages/StudentPromotion";
import ArchivedStudents from "./pages/ArchivedStudents";
import CancelledEmails from "./pages/CancelledEmails";

const queryClient = new QueryClient();

const AppInner = () => {
  const { isLoading, user } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary animate-pulse" />
          <div className="flex flex-col items-center gap-2">
            <span className="h-4 w-32 bg-gray-200 rounded" />
            <span className="h-3 w-24 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        <Route
          path="/auth"
          element={
            isLoading ? null : user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Auth />
            )
          }
        />
        <Route
          index
          element={
            isLoading ? null : user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/files" element={<Files />} />
        <Route path="/queue" element={<Queue />} />
        <Route path="/students" element={<Students />} />
        <Route path="/birthdays" element={<Birthday />} />
        <Route path="/history/sent" element={<SentHistory />} />
        <Route path="/history/failed" element={<FailedEmails />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/student-promotion" element={<StudentPromotion />} />
        <Route path="/archived-students" element={<ArchivedStudents />} />
        <Route path="/CancelledEmails" element={<CancelledEmails />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
