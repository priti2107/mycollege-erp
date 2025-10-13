import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Users, Clock, CheckCircle, XCircle, Download } from "lucide-react";
import { useApiQuery, useApiMutation } from "@/hooks/useApiQuery";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export default function Attendance() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [displayDate] = useState(new Date().toLocaleDateString());

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/");
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  // Fetch attendance data based on selected class
  const currentDate = new Date().toISOString().split('T')[0];
  const attendanceEndpoint = selectedClass && user?.role === 'faculty'
    ? `/faculty/attendance/class/${selectedClass}?date=${currentDate}`
    : selectedClass && user?.role === 'admin'
    ? `/admin/attendance?classId=${selectedClass}&date=${currentDate}`
    : null;
    
  const { data: attendanceResponse, isLoading, error, refetch } = useApiQuery(
    attendanceEndpoint,
    ['attendance', selectedClass, currentDate, user?.role], // Include date in query key
    { enabled: !!user && !!selectedClass }
  );

  // Save attendance mutation for faculty/admin
  const saveAttendanceMutation = useApiMutation('/faculty/attendance/save', 'POST');

  const attendanceData = attendanceResponse?.students || attendanceResponse || [];

  // Fetch classes and subjects for dropdowns
  const { data: classesData } = useApiQuery(
    user?.role === 'faculty' ? '/faculty/classes' : '/admin/classes',
    ['classes'],
    { enabled: !!user }
  );

  const { data: coursesData } = useApiQuery(
    '/admin/courses',
    ['courses'],
    { enabled: !!user }
  );

  const { data: subjectsData } = useApiQuery(
    '/admin/subjects',
    ['subjects'],
    { enabled: !!user }
  );

  // Extract data with proper null checks
  const allClasses = user?.role === 'faculty' 
    ? (Array.isArray(classesData) ? classesData : [])
    : (classesData?.classes || []);
  const courses = Array.isArray(coursesData) ? coursesData : (coursesData?.courses || []);
  const subjects = Array.isArray(subjectsData) ? subjectsData : (subjectsData?.subjects || []);

  // Filter classes by selected course (via subject's course_id)
  const filteredClasses = selectedCourse 
    ? allClasses.filter((cls: any) => {
        const classSubject = subjects.find((s: any) => s.id === cls.subject_id);
        return classSubject?.course_id === selectedCourse;
      })
    : allClasses;

  // When class is selected, auto-set the subject
  useEffect(() => {
    if (selectedClass) {
      const selectedClassObj = allClasses.find((cls: any) => cls.id === selectedClass);
      if (selectedClassObj) {
        setSelectedSubject(selectedClassObj.subject_id || selectedClassObj.subjectName || "");
      }
    }
  }, [selectedClass, allClasses]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const [localAttendanceData, setLocalAttendanceData] = useState<any[]>([]);

  // Update local data when API data changes
  useEffect(() => {
    if (attendanceData && attendanceData.length > 0) {
      console.log('📥 Attendance data from API:', attendanceData);
      setLocalAttendanceData(attendanceData);
    }
  }, [attendanceData]);

  const handleAttendanceToggle = (studentId: string, isPresent: boolean) => {
    console.log(`✏️ Toggling attendance for student ${studentId} to ${isPresent}`);
    setLocalAttendanceData(prev =>
      prev.map(student =>
        student.id === studentId
          ? { ...student, present: isPresent }
          : student
      )
    );
  };

  const handleSubmitAttendance = async () => {
    if (!selectedClass) {
      toast({
        title: "Please select a class",
        variant: "destructive",
      });
      return;
    }

    try {
      const attendanceRecords = localAttendanceData.map(student => ({
        studentId: student.id,
        isPresent: student.present !== undefined ? student.present : false
      }));

      await saveAttendanceMutation.mutateAsync({
        classId: selectedClass,
        date: currentDate,
        attendance: attendanceRecords
      });

      toast({
        title: "Attendance saved successfully",
      });
      
      // Refetch to update the attended count and percentage in the table
      // The checkboxes won't reset because the backend now returns the saved 'present' status
      refetch();
    } catch (error: any) {
      toast({
        title: "Failed to save attendance",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const totalStudents = localAttendanceData.length;
  const presentStudents = localAttendanceData.filter(s => s.present).length;
  const absentStudents = totalStudents - presentStudents;
  const attendancePercentage = totalStudents > 0 ? ((presentStudents / totalStudents) * 100).toFixed(1) : "0";

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
          <p>Error fetching attendance data: {error.message}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
      <div className="space-y-6 erp-animate-enter">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Attendance</h1>
            <p className="text-muted-foreground">Manage student attendance and track records</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            {(user.role === 'admin' || user.role === 'faculty') && (
              <Button className="erp-gradient-bg" onClick={handleSubmitAttendance}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Submit Attendance
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="erp-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalStudents}</p>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="erp-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{presentStudents}</p>
                  <p className="text-sm text-muted-foreground">Present Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="erp-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{absentStudents}</p>
                  <p className="text-sm text-muted-foreground">Absent Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="erp-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{attendancePercentage}%</p>
                  <p className="text-sm text-muted-foreground">Today's Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        {(user.role === 'admin' || user.role === 'faculty') && (
          <Card className="erp-card">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Course</label>
                  <Select value={selectedCourse} onValueChange={(value) => {
                    setSelectedCourse(value);
                    setSelectedClass(""); // Reset class when course changes
                    setSelectedSubject(""); // Reset subject when course changes
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course: any) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Class</label>
                  <Select 
                    value={selectedClass} 
                    onValueChange={setSelectedClass}
                    disabled={!selectedCourse}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedCourse ? "Select class" : "Select course first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredClasses.map((cls: any) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} - {cls.subjectName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Subject</label>
                  <Select value={selectedSubject} disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-selected with class" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject: any) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Date</label>
                  <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{displayDate}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attendance Table */}
        <Card className="erp-card">
          <CardHeader>
            <CardTitle>
              {user.role === 'student' ? 'My Attendance' : `Attendance - ${displayDate}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Classes Held</TableHead>
                  <TableHead>Classes Attended</TableHead>
                  <TableHead>Percentage</TableHead>
                  {(user.role === 'admin' || user.role === 'faculty') && (
                    <TableHead>Today's Status</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {localAttendanceData.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} />
                          <AvatarFallback>
                            {student.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{student.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{student.rollNo}</TableCell>
                    <TableCell>{student.classes}</TableCell>
                    <TableCell>{student.attended}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={student.percentage >= 75 ? 'default' : 'destructive'}
                        className="font-mono"
                      >
                        {student.percentage.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    {(user.role === 'admin' || user.role === 'faculty') && (
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`present-${student.id}`}
                            checked={student.present}
                            onCheckedChange={(checked) => 
                              handleAttendanceToggle(student.id, checked === true)
                            }
                          />
                          <label
                            htmlFor={`present-${student.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Present
                          </label>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}