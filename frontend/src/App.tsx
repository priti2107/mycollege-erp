import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Faculty from "./pages/Faculty";
import Attendance from "./pages/Attendance";
import Results from "./pages/Results";
import Fees from "./pages/Fees";
import Library from "./pages/Library";
import Settings from "./pages/Settings";
import FacultyAttendance from "./pages/FacultyAttendance";
import FacultyAssignments from "./pages/FacultyAssignments";
import FacultyGrades from "./pages/FacultyGrades";
import StudentDashboard from "./pages/StudentDashboard";
import StudentAttendance from "./pages/StudentAttendance";
import StudentResults from "./pages/StudentResults";
import StudentFees from "./pages/StudentFees";
import ClassAssignment from "./pages/ClassAssignment";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          
          {/* Admin routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/students" element={<Students />} />
          <Route path="/faculty" element={<Faculty />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/results" element={<Results />} />
          <Route path="/fees" element={<Fees />} />
          <Route path="/library" element={<Library />} />
          <Route path="/class-assignment" element={<ClassAssignment />} />
          <Route path="/settings" element={<Settings />} />
          
          {/* Faculty specific routes */}
          <Route path="/faculty-attendance" element={<FacultyAttendance />} />
          <Route path="/faculty-assignments" element={<FacultyAssignments />} />
          <Route path="/faculty-grades" element={<FacultyGrades />} />
          
          {/* Student specific routes */}
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/student-attendance" element={<StudentAttendance />} />
          <Route path="/student-results" element={<StudentResults />} />
          <Route path="/student-fees" element={<StudentFees />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
