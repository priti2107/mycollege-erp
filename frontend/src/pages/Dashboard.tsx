import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  UserCheck, 
  IndianRupee, 
  BookOpen, 
  Calendar,
  Clock,
  TrendingUp,
  Award
} from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { StatsCard } from "@/components/Dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Mock data for different user roles
const dashboardData = {
  admin: {
    stats: [
      { title: "Total Students", value: "2,847", change: "+12% from last month", changeType: "positive" as const, icon: Users },
      { title: "Faculty Members", value: "142", change: "+3 new this month", changeType: "positive" as const, icon: UserCheck },
      { title: "Fees Collected", value: "₹847K", change: "+8% from last month", changeType: "positive" as const, icon: IndianRupee },
      { title: "Attendance Rate", value: "94.2%", change: "+2.1% from last week", changeType: "positive" as const, icon: TrendingUp },
    ],
    recentActivities: [
      { activity: "New student enrollment - Sarah Wilson", time: "2 minutes ago", type: "enrollment" },
      { activity: "Fee payment received - ₹2,500", time: "15 minutes ago", type: "payment" },
      { activity: "Faculty meeting scheduled", time: "1 hour ago", type: "meeting" },
      { activity: "Library book returned - Advanced Mathematics", time: "2 hours ago", type: "library" },
    ]
  },
  faculty: {
    stats: [
      { title: "Classes Today", value: "4", change: "2 remaining", changeType: "neutral" as const, icon: BookOpen },
      { title: "Assignments Pending", value: "23", change: "Review needed", changeType: "neutral" as const, icon: Clock },
      { title: "Students Taught", value: "156", change: "Across 3 subjects", changeType: "positive" as const, icon: Users },
      { title: "Attendance Rate", value: "92.8%", change: "Your classes avg", changeType: "positive" as const, icon: TrendingUp },
    ],
    recentActivities: [
      { activity: "Assignment submitted by John Doe", time: "5 minutes ago", type: "assignment" },
      { activity: "Grade updated for Mathematics Quiz", time: "30 minutes ago", type: "grade" },
      { activity: "Next class: Physics Lab at 2:00 PM", time: "Upcoming", type: "class" },
      { activity: "Parent meeting scheduled for tomorrow", time: "1 day", type: "meeting" },
    ]
  },
  student: {
    stats: [
      { title: "Attendance", value: "96.5%", change: "Above class average", changeType: "positive" as const, icon: Calendar },
      { title: "Current GPA", value: "3.84", change: "+0.12 this semester", changeType: "positive" as const, icon: Award },
      { title: "Fees Due", value: "₹850", change: "Due in 15 days", changeType: "neutral" as const, icon: IndianRupee },
      { title: "Assignments", value: "3", change: "Pending submission", changeType: "neutral" as const, icon: BookOpen },
    ],
    recentActivities: [
      { activity: "Assignment submitted: Data Structures", time: "10 minutes ago", type: "assignment" },
      { activity: "Grade received: 95% in Chemistry Lab", time: "2 hours ago", type: "grade" },
      { activity: "Next class: Advanced Mathematics at 10:00 AM", time: "Tomorrow", type: "class" },
      { activity: "Library book due in 3 days", time: "3 days", type: "library" },
    ]
  }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/");
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  // Fetch dashboard stats based on user role
  const { data: dashboardStats, isLoading, error } = useApiQuery(
    user?.role === 'admin' ? '/admin/dashboard/stats' :
    user?.role === 'faculty' ? '/faculty/dashboard/stats' :
    user?.role === 'student' ? '/student/dashboard/stats' : '',
    ['dashboard-stats', user?.role],
    { enabled: !!user }
  );

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/");
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <p>Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <p>Error fetching data: {error.message}</p>
        </div>
      </DashboardLayout>
    );
  }

  // Map API data to stats format based on user role
  const getStatsFromApiData = () => {
    if (!dashboardStats) return [];
    
    if (user.role === 'admin') {
      return [
        { 
          title: "Total Students", 
          value: dashboardStats.totalStudents || "0", 
          change: "+12% from last month", 
          changeType: "positive" as const, 
          icon: Users 
        },
        { 
          title: "Faculty Members", 
          value: dashboardStats.facultyMembers || "0", 
          change: "+3 new this month", 
          changeType: "positive" as const, 
          icon: UserCheck 
        },
        { 
          title: "Fees Collected", 
          value: dashboardStats.feesCollected || "₹0", 
          change: "+8% from last month", 
          changeType: "positive" as const, 
          icon: IndianRupee 
        },
        { 
          title: "Attendance Rate", 
          value: dashboardStats.attendanceRate || "0%", 
          change: "+2.1% from last week", 
          changeType: "positive" as const, 
          icon: TrendingUp 
        },
      ];
    } else if (user.role === 'faculty') {
      return [
        { 
          title: "Classes Today", 
          value: dashboardStats.classesToday?.toString() || "0", 
          change: `${dashboardStats.classesRemaining || 0} remaining`, 
          changeType: "neutral" as const, 
          icon: BookOpen 
        },
        { 
          title: "Assignments Pending", 
          value: dashboardStats.assignmentsPending?.toString() || "0", 
          change: "Review needed", 
          changeType: "neutral" as const, 
          icon: Clock 
        },
        { 
          title: "Students Taught", 
          value: dashboardStats.studentsTaught?.toString() || "0", 
          change: "Across subjects", 
          changeType: "positive" as const, 
          icon: Users 
        },
        { 
          title: "Attendance Rate", 
          value: `${dashboardStats.attendanceRate || 0}%`, 
          change: "Your classes avg", 
          changeType: "positive" as const, 
          icon: TrendingUp 
        },
      ];
    } else if (user.role === 'student') {
      return [
        { 
          title: "Attendance", 
          value: `${dashboardStats.attendancePercentage || 0}%`, 
          change: "Above class average", 
          changeType: "positive" as const, 
          icon: Calendar 
        },
        { 
          title: "Current GPA", 
          value: dashboardStats.currentGpa?.toString() || "0.00", 
          change: "+0.12 this semester", 
          changeType: "positive" as const, 
          icon: Award 
        },
        { 
          title: "Fees Due", 
          value: `₹${dashboardStats.feesDue || 0}`, 
          change: "Due soon", 
          changeType: "neutral" as const, 
          icon: IndianRupee 
        },
        { 
          title: "Assignments", 
          value: dashboardStats.pendingAssignments?.toString() || "0", 
          change: "Pending submission", 
          changeType: "neutral" as const, 
          icon: BookOpen 
        },
      ];
    }
    return [];
  };

  const stats = getStatsFromApiData();
  const recentActivities = dashboardStats?.recentActivities || [];

  // Fallback data for activities if API doesn't provide them
  const data = dashboardData[user.role as keyof typeof dashboardData];

  return (
    <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
      <div className="space-y-8 erp-animate-enter">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {user.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-xl text-muted-foreground">
            Here's what's happening with your {user.role === 'admin' ? 'institution' : user.role === 'faculty' ? 'classes' : 'studies'} today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activities */}
          <Card className="lg:col-span-2 erp-card">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Recent Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(recentActivities.length > 0 ? recentActivities : data.recentActivities).map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.activity}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {activity.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="erp-card">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {user.role === 'admin' && (
                  <>
                    <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/students')}>
                      <Users className="w-4 h-4 mr-2" />
                      Add New Student
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/faculty')}>
                      <UserCheck className="w-4 h-4 mr-2" />
                      Add Faculty Member
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/results')}>
                      <IndianRupee className="w-4 h-4 mr-2" />
                      Generate Reports
                    </Button>
                  </>
                )}
                {user.role === 'faculty' && (
                  <>
                    <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/faculty-assignments')}>
                      <BookOpen className="w-4 h-4 mr-2" />
                      Create Assignment
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/faculty-attendance')}>
                      <Calendar className="w-4 h-4 mr-2" />
                      Mark Attendance
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/faculty-grades')}>
                      <Award className="w-4 h-4 mr-2" />
                      Grade Submissions
                    </Button>
                  </>
                )}
                {user.role === 'student' && (
                  <>
                    <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/student-dashboard')}>
                      <BookOpen className="w-4 h-4 mr-2" />
                      View Assignments
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/student-fees')}>
                      <IndianRupee className="w-4 h-4 mr-2" />
                      Pay Fees
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/student-attendance')}>
                      <Calendar className="w-4 h-4 mr-2" />
                      View Attendance
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}