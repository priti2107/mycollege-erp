import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Users, Clock, CheckCircle, XCircle, Download } from "lucide-react";
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

// Mock attendance data
const mockAttendanceData = [
  {
    id: "ST001",
    name: "Alice Johnson",
    rollNo: "2023001",
    present: true,
    classes: 45,
    attended: 42,
    percentage: 93.3
  },
  {
    id: "ST002",
    name: "Bob Smith",
    rollNo: "2023002",
    present: false,
    classes: 45,
    attended: 38,
    percentage: 84.4
  },
  {
    id: "ST003",
    name: "Carol Davis",
    rollNo: "2023003",
    present: true,
    classes: 45,
    attended: 44,
    percentage: 97.8
  },
];

export default function Attendance() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [attendanceData, setAttendanceData] = useState(mockAttendanceData);
  const [currentDate] = useState(new Date().toLocaleDateString());

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/");
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleAttendanceToggle = (studentId: string, isPresent: boolean) => {
    setAttendanceData(prev =>
      prev.map(student =>
        student.id === studentId
          ? { ...student, present: isPresent }
          : student
      )
    );
  };

  const handleSubmitAttendance = () => {
    // Handle attendance submission logic
    console.log("Attendance submitted:", attendanceData);
  };

  const totalStudents = attendanceData.length;
  const presentStudents = attendanceData.filter(s => s.present).length;
  const absentStudents = totalStudents - presentStudents;
  const attendancePercentage = ((presentStudents / totalStudents) * 100).toFixed(1);

  if (!user) return null;

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
                  <label className="text-sm font-medium mb-2 block">Class</label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cs-1">Computer Science - 1st Year</SelectItem>
                      <SelectItem value="cs-2">Computer Science - 2nd Year</SelectItem>
                      <SelectItem value="math-1">Mathematics - 1st Year</SelectItem>
                      <SelectItem value="physics-1">Physics - 1st Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Subject</label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ds">Data Structures</SelectItem>
                      <SelectItem value="algo">Algorithms</SelectItem>
                      <SelectItem value="calculus">Calculus</SelectItem>
                      <SelectItem value="physics">Physics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Date</label>
                  <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{currentDate}</span>
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
              {user.role === 'student' ? 'My Attendance' : `Attendance - ${currentDate}`}
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
                {attendanceData.map((student) => (
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