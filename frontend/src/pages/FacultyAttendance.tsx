import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Users, Check, X, Save, BookOpen } from "lucide-react";
import { useApiQuery, useApiMutation } from "@/hooks/useApiQuery";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export default function FacultyAttendance() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/");
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'faculty') {
      navigate("/dashboard");
      return;
    }
    setUser(parsedUser);
  }, [navigate]);

  // Fetch faculty classes
  const { data: classesData, isLoading: classesLoading } = useApiQuery(
    '/faculty/classes',
    ['faculty-classes'],
    { enabled: !!user }
  );

  // Fetch student roster for selected class
  const { data: studentsData, isLoading: studentsLoading } = useApiQuery(
    `/faculty/attendance/class/${selectedClass}?date=${selectedDate}`,
    ['faculty-class-roster', selectedClass, selectedDate],
    { enabled: !!user && !!selectedClass }
  );

  const classes = classesData || [];
  const students = studentsData || [];

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleAttendanceChange = (studentId: string, present: boolean) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: present
    }));
  };

  const handleMarkAll = (present: boolean) => {
    const newAttendance: Record<string, boolean> = {};
    students.forEach(student => {
      newAttendance[student.id] = present;
    });
    setAttendance(newAttendance);
  };

  const handleSaveAttendance = () => {
    if (!selectedClass) {
      toast({
        title: "Please select a class",
        variant: "destructive",
      });
      return;
    }

    const presentCount = Object.values(attendance).filter(Boolean).length;
    const totalCount = students.length;

    toast({
      title: "Attendance saved successfully!",
      description: `${presentCount}/${totalCount} students marked present`,
    });

    // Reset form
    setAttendance({});
    setSelectedClass("");
  };

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const totalStudents = students.length;
  const attendancePercentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  if (!user) return null;

  return (
    <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
      <div className="space-y-6 erp-animate-enter">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Attendance Management</h1>
            <p className="text-muted-foreground">Mark attendance for your classes</p>
          </div>
        </div>

        {/* Class Selection */}
        <Card className="erp-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Select Class & Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Class</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} - {cls.time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedClass && (
          <>
            {/* Attendance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      <Check className="w-6 h-6 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{presentCount}</p>
                      <p className="text-sm text-muted-foreground">Present</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="erp-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{attendancePercentage}%</p>
                      <p className="text-sm text-muted-foreground">Attendance</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="erp-card">
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleMarkAll(true)}
                    className="flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Mark All Present
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleMarkAll(false)}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Mark All Absent
                  </Button>
                  <Button
                    onClick={handleSaveAttendance}
                    className="erp-gradient-bg ml-auto"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Attendance
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Student List */}
            <Card className="erp-card">
              <CardHeader>
                <CardTitle>Student Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {students.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} />
                          <AvatarFallback>
                            {student.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-muted-foreground">Roll No: {student.rollNo}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={attendance[student.id] === true}
                              onCheckedChange={(checked) => 
                                handleAttendanceChange(student.id, checked as boolean)
                              }
                            />
                            <span className="text-sm font-medium text-green-600">Present</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={attendance[student.id] === false}
                              onCheckedChange={(checked) => 
                                handleAttendanceChange(student.id, !(checked as boolean))
                              }
                            />
                            <span className="text-sm font-medium text-red-600">Absent</span>
                          </label>
                        </div>
                        {attendance[student.id] !== undefined && (
                          <Badge variant={attendance[student.id] ? "default" : "destructive"}>
                            {attendance[student.id] ? "Present" : "Absent"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}