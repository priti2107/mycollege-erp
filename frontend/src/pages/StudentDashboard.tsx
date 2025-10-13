import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, BookOpen, Trophy, Clock, User, Bell } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";

const mockStudent = {
  name: "John Smith",
  email: "john.smith@student.edu",
  role: "Student",
  class: "12th Grade - Science",
  rollNumber: "STU001",
  avatar: "",
};

const mockAttendance = {
  present: 85,
  total: 100,
  percentage: 85,
};

const mockSubjects = [
  { name: "Mathematics", grade: "A+", percentage: 95 },
  { name: "Physics", grade: "A", percentage: 88 },
  { name: "Chemistry", grade: "A", percentage: 92 },
  { name: "Biology", grade: "B+", percentage: 82 },
  { name: "English", grade: "A", percentage: 90 },
];

const mockAssignments = [
  { title: "Physics Lab Report", subject: "Physics", dueDate: "2024-01-15", status: "pending" },
  { title: "Chemistry Project", subject: "Chemistry", dueDate: "2024-01-18", status: "submitted" },
  { title: "Math Problem Set 5", subject: "Mathematics", dueDate: "2024-01-20", status: "pending" },
];

const mockAnnouncements = [
  { title: "Science Fair 2024", date: "2024-01-10", type: "event" },
  { title: "Winter Break Schedule", date: "2024-01-08", type: "announcement" },
  { title: "Parent-Teacher Meeting", date: "2024-01-12", type: "meeting" },
];

export default function StudentDashboard() {
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

  // Fetch all student dashboard data from API
  const { data: dashboardData, isLoading, error } = useApiQuery(
    '/student/dashboard/stats',
    ['student-dashboard-stats'],
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

  // Extract data from API response or use fallback values
  const attendance = dashboardData?.attendance || mockAttendance;
  const subjects = dashboardData?.subjects || mockSubjects;
  const assignments = dashboardData?.assignments || mockAssignments;
  const announcements = dashboardData?.announcements || mockAnnouncements;
  const nextClass = dashboardData?.nextClass || { subject: "Physics", room: "Room 201", time: "10:30 AM" };
  const overallGrade = dashboardData?.overallGrade || "A";
  const averagePercentage = dashboardData?.averagePercentage || 89.4;

  return (
    <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Welcome back, {user.name}!</h1>
            <p className="text-muted-foreground mt-2">
              {dashboardData?.class || "Student"} • Roll No: {dashboardData?.rollNumber || user.studentId || "N/A"}
            </p>
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
              <p className="text-xs text-muted-foreground mt-2">{averagePercentage}% Average</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Assignments</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {assignments.filter((a: any) => a.status === "pending").length}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Due this week</p>
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
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Assignments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Recent Assignments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {assignments.map((assignment: any, index: number) => (
                    <div key={index} className="p-3 rounded-lg border">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{assignment.title}</h4>
                        <Badge 
                          variant={assignment.status === "submitted" ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {assignment.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{assignment.subject}</p>
                      <p className="text-xs text-muted-foreground">Due: {assignment.dueDate}</p>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">
                  View All Assignments
                </Button>
              </CardContent>
            </Card>

            {/* Announcements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Announcements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {announcements.map((announcement: any, index: number) => (
                    <div key={index} className="p-3 rounded-lg border">
                      <h4 className="font-medium text-sm">{announcement.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{announcement.date}</p>
                      <Badge variant="outline" className="text-xs mt-2">
                        {announcement.type}
                      </Badge>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">
                  View All Announcements
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}