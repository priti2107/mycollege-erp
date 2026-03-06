import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, BookOpen, Trophy, Clock, User, Bell, DollarSign } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [userLoaded, setUserLoaded] = useState(false);

  useEffect(() => {
    console.log('🔄 StudentDashboard: Loading user from localStorage');
    const userData = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    
    console.log('📝 Auth check:', { 
      hasUserData: !!userData, 
      hasToken: !!token,
      userDataLength: userData?.length 
    });
    
    if (!userData || !token) {
      console.log('❌ No user data or token, redirecting to login');
      navigate("/");
      return;
    }
    
    try {
      const parsedUser = JSON.parse(userData);
      console.log('✅ User loaded:', { id: parsedUser.id, role: parsedUser.role, name: parsedUser.name });
      
      // Clear any existing cache for this user to force fresh data
      queryClient.invalidateQueries({ 
        queryKey: ['student-dashboard-stats'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['student-results'] 
      });
      
      setUser(parsedUser);
      setUserLoaded(true);
    } catch (error) {
      console.error('❌ Failed to parse user data:', error);
      navigate("/");
    }
  }, [navigate]);

  // Fetch all student dashboard data from API - only when user is properly loaded
  const { data: dashboardData, isLoading, error, isFetched, dataUpdatedAt } = useApiQuery(
    '/student/dashboard/stats',
    ['student-dashboard-stats', user?.id], // Include user ID in query key
    { 
      enabled: userLoaded && !!user && !!user.id, // Wait for user to be loaded
      staleTime: 0, // Always treat as stale
      refetchOnMount: 'always', // Always refetch when component mounts
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: 1000
    }
  );

  // Fetch student results for subject performance
  const { data: resultsData, isLoading: resultsLoading, isFetched: resultsFetched } = useApiQuery(
    '/student/results',
    ['student-results', user?.id], // Include user ID in query key
    { 
      enabled: userLoaded && !!user && !!user.id, // Wait for user to be loaded
      staleTime: 0, // Always treat as stale
      refetchOnMount: 'always', // Always refetch when component mounts
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: 1000
    }
  );

  // Track when we receive real data to end first load state
  useEffect(() => {
    if (dashboardData && isFetched && !isLoading) {
      console.log('✅ Dashboard data loaded, ending first load state');
      console.log('📦 Dashboard data content:', dashboardData);
      setIsFirstLoad(false);
    }
  }, [dashboardData, isFetched, isLoading]);

  // Timeout mechanism - if we don't get data within 5 seconds, something is wrong
  useEffect(() => {
    if (userLoaded && user?.id) {
      const timeout = setTimeout(() => {
        if (isFirstLoad && !dashboardData) {
          console.warn('⚠️ Dashboard taking too long to load, forcing refetch...');
          queryClient.refetchQueries({
            queryKey: ['student-dashboard-stats', user.id]
          });
        }
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [userLoaded, user?.id, isFirstLoad, dashboardData, queryClient]);

  // Debug logging
  console.log('📊 StudentDashboard State:', {
    userLoaded,
    user: user ? { id: user.id, role: user.role } : null,
    isLoading,
    resultsLoading,
    isFetched,
    resultsFetched,
    dashboardData: dashboardData ? 'HAS_DATA' : 'NO_DATA',
    resultsData: resultsData ? 'HAS_DATA' : 'NO_DATA',
    isFirstLoad,
    dataUpdatedAt: new Date(dataUpdatedAt || 0).toLocaleTimeString(),
    error: error?.message
  });

  // Log when queries are enabled/disabled
  console.log('🔍 Query Status:', {
    dashboardEnabled: userLoaded && !!user && !!user.id,
    resultsEnabled: userLoaded && !!user && !!user.id,
    userExists: !!user,
    userId: user?.id
  });

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/");
  };

  if (!user) return null;

  if (error) {
    return (
      <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive mb-2">Failed to load dashboard data</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline" 
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show loading state while data is being fetched
  const isActuallyLoading = isFirstLoad || isLoading || resultsLoading || !isFetched || !resultsFetched;
  const hasValidData = dashboardData && 
                       typeof dashboardData === 'object' && 
                       Object.keys(dashboardData).length > 0 &&
                       dashboardData.name; // Ensure we have essential data
  
  console.log('🔍 Data validation:', {
    isActuallyLoading,
    hasValidData,
    dashboardDataKeys: dashboardData ? Object.keys(dashboardData) : null
  });
  
  if (isActuallyLoading || !hasValidData) {
    return (
      <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
        <div className="space-y-8">
          {/* Loading Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 bg-gray-300 rounded animate-pulse w-64"></div>
                <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-48"></div>
            </div>
          </div>
          
          {/* Loading message */}
          <div className="text-center">
            <p className="text-muted-foreground">Loading your dashboard...</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isLoading ? 'Fetching profile data...' : resultsLoading ? 'Loading academic results...' : 'Almost ready!'}
            </p>
          </div>
          
          {/* Loading Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {['Attendance', 'Overall Grade', 'Assignments', 'Next Class'].map((title, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-300 rounded w-16 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Loading Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-300 rounded w-40"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </CardContent>
            </Card>
            <Card className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-300 rounded w-32"></div>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Extract data from API response - only render when data is available
  const attendance = dashboardData.attendance || { present: 0, total: 0, percentage: 0 };
  const nextClass = dashboardData.nextClass || { subject: "Loading...", room: "...", time: "..." };
  const overallGrade = dashboardData.overallGrade || "N/A";
  const overallPercentage = dashboardData.overallPercentage || 0;
  const pendingAssignments = dashboardData.pendingAssignments || 0;
  const feesDue = dashboardData.feesDue || 0;

  // Process subjects from results data
  const subjectsMap = new Map();
  resultsData?.exams?.forEach((exam: any) => {
    exam.subjects?.forEach((subject: any) => {
      if (!subjectsMap.has(subject.name)) {
        subjectsMap.set(subject.name, {
          name: subject.name,
          totalMarks: 0,
          obtainedMarks: 0,
          count: 0
        });
      }
      const subj = subjectsMap.get(subject.name);
      subj.totalMarks += subject.maxMarks;
      subj.obtainedMarks += subject.obtainedMarks;
      subj.count++;
    });
  });
  
  const subjects = Array.from(subjectsMap.values()).map(s => {
    const percentage = s.totalMarks > 0 ? Math.round((s.obtainedMarks / s.totalMarks) * 100) : 0;
    let grade = 'F';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B+';
    else if (percentage >= 60) grade = 'B';
    else if (percentage >= 50) grade = 'C';
    
    return { ...s, percentage, grade };
  });

  return (
    <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {dashboardData?.name || user.name || 'Student'}!
            </h1>
            <p className="text-muted-foreground mt-2">
              {dashboardData?.class || "Student"} • Roll No: {dashboardData?.rollNumber || "N/A"}
            </p>
            {dashboardData?.department && (
              <p className="text-sm text-muted-foreground">
                {dashboardData.department} • Year: {dashboardData.academicYear || "N/A"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1">
              <User className="h-4 w-4 mr-1" />
              Student
            </Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{attendance.percentage}%</div>
              <Progress value={attendance.percentage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {attendance.present}/{attendance.total} days present
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Grade</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{overallGrade}</div>
              <p className="text-xs text-muted-foreground mt-2">{overallPercentage}% Average</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Assignments</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {pendingAssignments}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Not yet submitted</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Class</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{nextClass.subject}</div>
              <p className="text-xs text-muted-foreground mt-2">{nextClass.room} • {nextClass.time}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Subject Performance */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Subject Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {subjects.length > 0 ? (
                  <div className="space-y-4">
                    {subjects.map((subject: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium">{subject.name}</h3>
                            <Badge variant={subject.grade.startsWith('A') ? 'default' : 'secondary'}>
                              {subject.grade}
                            </Badge>
                          </div>
                          <Progress value={subject.percentage} className="h-2" />
                          <p className="text-sm text-muted-foreground mt-1">{subject.percentage}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No exam results available yet</p>
                    <p className="text-sm text-muted-foreground mt-2">Results will appear here once exams are graded</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Fee Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {feesDue > 0 ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Pending Amount</span>
                      <span className="text-lg font-bold text-destructive">₹{feesDue.toLocaleString()}</span>
                    </div>
                    <Button 
                      variant="default" 
                      className="w-full mt-2"
                      onClick={() => navigate("/student/fees")}
                    >
                      Pay Now
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-green-600">All fees paid! 🎉</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate("/student/attendance")}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    View Attendance
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate("/student/results")}
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Check Results
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate("/student/library")}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Library
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}