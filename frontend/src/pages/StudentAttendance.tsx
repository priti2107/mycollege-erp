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

  // Fetch attendance data from API
  const { data: attendanceData, isLoading, error } = useApiQuery(
    '/student/attendance',
    ['student-attendance'],
    { enabled: !!user }
  );

  // DEBUG LOGGING
  console.log('=== FRONTEND ATTENDANCE DEBUG ===');
  console.log('Raw attendanceData from API:', attendanceData);
  console.log('isLoading:', isLoading);
  console.log('error:', error);
  console.log('Type of attendanceData:', typeof attendanceData);
  console.log('Is Array:', Array.isArray(attendanceData));

  const attendanceRecords = attendanceData || [];
  console.log('attendanceRecords (after || []):', attendanceRecords);
  console.log('attendanceRecords length:', attendanceRecords.length);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/");
  };

  const filteredAttendance = attendanceRecords.filter((record: any) => {
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

  // Calculate overall stats
  const totalRecords = attendanceRecords.length;
  const presentCount = attendanceRecords.filter((r: any) => r.status === 'present').length;
  const overallPercentage = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

  console.log('Overall stats calculated:');
  console.log('  totalRecords:', totalRecords);
  console.log('  presentCount:', presentCount);
  console.log('  overallPercentage:', overallPercentage);

  // Calculate subject-wise stats
  const subjectStatsMap = new Map();
  attendanceRecords.forEach((record: any) => {
    console.log('Processing record for subject stats:', record);
    if (!subjectStatsMap.has(record.subject)) {
      subjectStatsMap.set(record.subject, { subject: record.subject, present: 0, total: 0 });
    }
    const stat = subjectStatsMap.get(record.subject);
    stat.total++;
    if (record.status === 'present') stat.present++;
  });
  
  const subjectStats = Array.from(subjectStatsMap.values()).map(stat => ({
    ...stat,
    percentage: stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : 0
  }));

  console.log('subjectStats calculated:', subjectStats);

  // Get unique subjects for filter
  const uniqueSubjects = Array.from(new Set(attendanceRecords.map((r: any) => r.subject)));
  console.log('uniqueSubjects:', uniqueSubjects);

  // Find best subject (highest attendance percentage)
  let bestSubject = 'N/A';
  let bestPercentage = 0;
  
  console.log('Finding best subject from subjectStats:', subjectStats);
  subjectStats.forEach(stat => {
    console.log(`Checking subject "${stat.subject}": ${stat.percentage}% (current best: ${bestPercentage}%)`);
    if (stat.percentage > bestPercentage) {
      bestPercentage = stat.percentage;
      bestSubject = stat.subject;
      console.log(`  → New best subject: ${bestSubject} with ${bestPercentage}%`);
    }
  });
  
  console.log('FINAL BEST SUBJECT:', bestSubject, 'with', bestPercentage, '%');
  console.log('=== END FRONTEND ATTENDANCE DEBUG ===\n');

  if (!user) return null;

  if (isLoading) {
    return (
      <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <p>Loading attendance data...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Error: {error.message}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
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
              <div className="text-2xl font-bold text-primary">{overallPercentage}%</div>
              <p className="text-xs text-muted-foreground mt-2">
                {presentCount}/{totalRecords} classes present
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totalRecords}</div>
              <p className="text-xs text-muted-foreground mt-2">Attendance recorded</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{subjectStats.length}</div>
              <p className="text-xs text-muted-foreground mt-2">Subjects enrolled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Best Subject</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{bestSubject}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {bestPercentage}% attendance
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Subject-wise Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Subject-wise Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            {subjectStats.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjectStats.map((stat, index) => (
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
            ) : (
              <p className="text-center py-4 text-muted-foreground">No attendance data available</p>
            )}
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
                  {uniqueSubjects.map((subject: any, index: number) => (
                    <SelectItem key={index} value={subject}>
                      {subject}
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