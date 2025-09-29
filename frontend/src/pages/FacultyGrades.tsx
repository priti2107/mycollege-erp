import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Save, Calculator, BookOpen, Users, Trophy } from "lucide-react";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

// Mock data
const mockClasses = [
  { id: "CS101", name: "Data Structures", students: 45 },
  { id: "CS201", name: "Algorithms", students: 38 },
  { id: "CS301", name: "Machine Learning", students: 32 }
];

const mockExams = [
  { id: "MID1", name: "Mid Term 1", maxMarks: 50, type: "Theory" },
  { id: "MID2", name: "Mid Term 2", maxMarks: 50, type: "Theory" },
  { id: "FINAL", name: "Final Exam", maxMarks: 100, type: "Theory" },
  { id: "LAB1", name: "Lab Assignment 1", maxMarks: 25, type: "Practical" },
  { id: "LAB2", name: "Lab Assignment 2", maxMarks: 25, type: "Practical" }
];

const mockStudents = [
  { id: "STU001", name: "John Smith", rollNo: "CS2021001", course: "Computer Science" },
  { id: "STU002", name: "Emma Johnson", rollNo: "CS2021002", course: "Computer Science" },
  { id: "STU003", name: "Michael Brown", rollNo: "CS2021003", course: "Computer Science" },
  { id: "STU004", name: "Sarah Davis", rollNo: "CS2021004", course: "Computer Science" },
  { id: "STU005", name: "David Wilson", rollNo: "CS2021005", course: "Computer Science" }
];

// Mock grades data
const mockGrades: Record<string, Record<string, number>> = {
  "STU001": { "MID1": 42, "MID2": 45, "FINAL": 85, "LAB1": 22, "LAB2": 24 },
  "STU002": { "MID1": 38, "MID2": 41, "FINAL": 78, "LAB1": 20, "LAB2": 23 },
  "STU003": { "MID1": 45, "MID2": 47, "FINAL": 92, "LAB1": 25, "LAB2": 25 },
  "STU004": { "MID1": 40, "MID2": 43, "FINAL": 80, "LAB1": 23, "LAB2": 24 },
  "STU005": { "MID1": 35, "MID2": 38, "FINAL": 72, "LAB1": 19, "LAB2": 21 }
};

export default function FacultyGrades() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [grades, setGrades] = useState<Record<string, Record<string, number>>>(mockGrades);
  const [tempGrades, setTempGrades] = useState<Record<string, string>>({});

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

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleGradeChange = (studentId: string, value: string) => {
    setTempGrades(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  const handleSaveGrades = () => {
    if (!selectedClass || !selectedExam) {
      toast({
        title: "Please select class and exam",
        variant: "destructive",
      });
      return;
    }

    const examInfo = mockExams.find(e => e.id === selectedExam);
    const maxMarks = examInfo?.maxMarks || 100;
    const updatedGrades = { ...grades };

    // Validate and save grades
    let hasError = false;
    for (const [studentId, gradeStr] of Object.entries(tempGrades)) {
      const grade = parseInt(gradeStr);
      if (isNaN(grade) || grade < 0 || grade > maxMarks) {
        toast({
          title: `Invalid grade for student ${studentId}`,
          description: `Grade must be between 0 and ${maxMarks}`,
          variant: "destructive",
        });
        hasError = true;
        break;
      }
      
      if (!updatedGrades[studentId]) {
        updatedGrades[studentId] = {};
      }
      updatedGrades[studentId][selectedExam] = grade;
    }

    if (!hasError) {
      setGrades(updatedGrades);
      setTempGrades({});
      toast({
        title: "Grades saved successfully!",
        description: `Grades for ${examInfo?.name} have been updated`,
      });
    }
  };

  const calculateTotalMarks = (studentId: string) => {
    const studentGrades = grades[studentId] || {};
    return Object.values(studentGrades).reduce((sum, grade) => sum + grade, 0);
  };

  const calculatePercentage = (studentId: string) => {
    const totalMarks = calculateTotalMarks(studentId);
    const maxPossible = mockExams.reduce((sum, exam) => sum + exam.maxMarks, 0);
    return maxPossible > 0 ? Math.round((totalMarks / maxPossible) * 100) : 0;
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 80) return "text-blue-600";
    if (percentage >= 70) return "text-yellow-600";
    if (percentage >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const getLetterGrade = (percentage: number) => {
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B";
    if (percentage >= 60) return "C";
    if (percentage >= 50) return "D";
    return "F";
  };

  if (!user) return null;

  const selectedExamInfo = mockExams.find(e => e.id === selectedExam);
  const classInfo = mockClasses.find(c => c.id === selectedClass);

  return (
    <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
      <div className="space-y-6 erp-animate-enter">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Grades Management</h1>
            <p className="text-muted-foreground">Enter and manage student grades</p>
          </div>
        </div>

        {/* Selection Controls */}
        <Card className="erp-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Select Class & Exam
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
                    {mockClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} ({cls.students} students)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Exam/Assignment</label>
                <Select value={selectedExam} onValueChange={setSelectedExam}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select exam" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockExams.map((exam) => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.name} (Max: {exam.maxMarks}) - {exam.type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedClass && selectedExam && (
          <>
            {/* Grade Entry Info */}
            <Card className="erp-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {selectedExamInfo?.name} - {classInfo?.name}
                    </h3>
                    <p className="text-muted-foreground">
                      Maximum Marks: {selectedExamInfo?.maxMarks} | Type: {selectedExamInfo?.type}
                    </p>
                  </div>
                  <Button onClick={handleSaveGrades} className="erp-gradient-bg">
                    <Save className="w-4 h-4 mr-2" />
                    Save Grades
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Grade Entry Table */}
            <Card className="erp-card">
              <CardHeader>
                <CardTitle>Enter Grades</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Current Grade</TableHead>
                      <TableHead>New Grade</TableHead>
                      <TableHead>Overall Total</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Letter Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockStudents.map((student) => {
                      const currentGrade = grades[student.id]?.[selectedExam] || 0;
                      const totalMarks = calculateTotalMarks(student.id);
                      const percentage = calculatePercentage(student.id);
                      const letterGrade = getLetterGrade(percentage);

                      return (
                        <TableRow key={student.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} />
                                <AvatarFallback>
                                  {student.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{student.name}</p>
                                <p className="text-xs text-muted-foreground">{student.rollNo}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {currentGrade}/{selectedExamInfo?.maxMarks}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max={selectedExamInfo?.maxMarks}
                              placeholder={currentGrade.toString()}
                              value={tempGrades[student.id] || ""}
                              onChange={(e) => handleGradeChange(student.id, e.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{totalMarks}</span>
                            <span className="text-muted-foreground">/{mockExams.reduce((sum, e) => sum + e.maxMarks, 0)}</span>
                          </TableCell>
                          <TableCell>
                            <span className={`font-medium ${getGradeColor(percentage)}`}>
                              {percentage}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={letterGrade === 'F' ? 'destructive' : letterGrade.includes('A') ? 'default' : 'secondary'}
                            >
                              {letterGrade}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {/* Grade Statistics */}
        {selectedClass && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="erp-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{mockStudents.length}</p>
                    <p className="text-sm text-muted-foreground">Total Students</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="erp-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                    <Calculator className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {Math.round(mockStudents.reduce((sum, s) => sum + calculatePercentage(s.id), 0) / mockStudents.length)}%
                    </p>
                    <p className="text-sm text-muted-foreground">Class Average</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="erp-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {Math.max(...mockStudents.map(s => calculatePercentage(s.id)))}%
                    </p>
                    <p className="text-sm text-muted-foreground">Highest Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="erp-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {mockStudents.filter(s => calculatePercentage(s.id) >= 60).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Passing Students</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}