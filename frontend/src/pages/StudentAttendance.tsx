import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApiQuery } from "@/hooks/useApiQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Search, User, CalendarDays, TrendingUp, TrendingDown } from "lucide-react";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";

const mockStudent = {
  name: "John Smith",
  email: "john.smith@student.edu",
  role: "Student",
  class: "12th Grade - Science",
  rollNumber: "STU001",
};

const mockAttendanceData = [
  { date: "2024-01-15", subject: "Mathematics", status: "present", period: "1st Period" },
  { date: "2024-01-15", subject: "Physics", status: "present", period: "2nd Period" },
  { date: "2024-01-15", subject: "Chemistry", status: "absent", period: "3rd Period" },
  { date: "2024-01-15", subject: "Biology", status: "present", period: "4th Period" },
  { date: "2024-01-14", subject: "Mathematics", status: "present", period: "1st Period" },
  { date: "2024-01-14", subject: "Physics", status: "present", period: "2nd Period" },
  { date: "2024-01-14", subject: "Chemistry", status: "present", period: "3rd Period" },
  { date: "2024-01-14", subject: "Biology", status: "late", period: "4th Period" },
  { date: "2024-01-13", subject: "Mathematics", status: "present", period: "1st Period" },
  { date: "2024-01-13", subject: "Physics", status: "absent", period: "2nd Period" },
];

const mockSubjectStats = [
  { subject: "Mathematics", present: 18, total: 20, percentage: 90 },
  { subject: "Physics", present: 16, total: 20, percentage: 80 },
  { subject: "Chemistry", present: 17, total: 20, percentage: 85 },
  { subject: "Biology", present: 19, total: 20, percentage: 95 },
  { subject: "English", present: 18, total: 20, percentage: 90 },
];

export default function StudentAttendance() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/");
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  // Fetch subjects for dropdown
  const { data: subjectsData } = useApiQuery(
    '/admin/subjects',
    ['subjects'],
    { enabled: !!user }
  );

  const subjects = subjectsData?.subjects || [];

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const filteredAttendance = mockAttendanceData.filter(record => {
    const matchesSearch = record.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.date.includes(searchTerm);
    const matchesSubject = selectedSubject === "all" || record.subject === selectedSubject;
    const matchesStatus = selectedStatus === "all" || record.status === selectedStatus;
    
    return matchesSearch && matchesSubject && matchesStatus;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "present": return "default";
      case "absent": return "destructive";
      case "late": return "secondary";
      default: return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present": return "✓";
      case "absent": return "✗";
      case "late": return "⏰";
      default: return "?";
    }
  };

  const overallStats = {
    totalDays: mockAttendanceData.length / 4, // Assuming 4 periods per day
    presentDays: mockAttendanceData.filter(r => r.status === "present").length / 4,
    percentage: Math.round((mockAttendanceData.filter(r => r.status === "present").length / mockAttendanceData.length) * 100)
  };

  return (
    <DashboardLayout userRole="student" user={mockStudent} onLogout={handleLogout}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Attendance</h1>
            <p className="text-muted-foreground mt-2">Track your attendance records and statistics</p>
          </div>
          <Badge variant="secondary" className="px-3 py-1">
            <User className="h-4 w-4 mr-1" />
            Student View
          </Badge>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Attendance</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{overallStats.percentage}%</div>
              <p className="text-xs text-muted-foreground mt-2">
                {Math.round(overallStats.presentDays)}/{Math.round(overallStats.totalDays)} days present
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">92%</div>
              <p className="text-xs text-muted-foreground mt-2">23/25 days present</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trend</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">+5%</div>
              <p className="text-xs text-muted-foreground mt-2">vs last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Best Subject</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">Biology</div>
              <p className="text-xs text-muted-foreground mt-2">95% attendance</p>
            </CardContent>
          </Card>
        </div>

        {/* Subject-wise Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Subject-wise Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockSubjectStats.map((stat, index) => (
                <div key={index} className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{stat.subject}</h3>
                    <Badge variant={stat.percentage >= 90 ? "default" : stat.percentage >= 80 ? "secondary" : "destructive"}>
                      {stat.percentage}%
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {stat.present}/{stat.total} classes attended
                  </p>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div 
                      className={`h-2 rounded-full ${stat.percentage >= 90 ? 'bg-green-500' : stat.percentage >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${stat.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by subject or date..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map((subject: any) => (
                    <SelectItem key={subject.id} value={subject.name}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Attendance Records */}
            <div className="space-y-3">
              {filteredAttendance.map((record, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg border hover:shadow-sm transition-shadow">
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">{getStatusIcon(record.status)}</div>
                    <div>
                      <h3 className="font-medium">{record.subject}</h3>
                      <p className="text-sm text-muted-foreground">{record.period}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-muted-foreground">{record.date}</span>
                    <Badge variant={getStatusBadgeVariant(record.status)}>
                      {record.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {filteredAttendance.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No attendance records found.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}