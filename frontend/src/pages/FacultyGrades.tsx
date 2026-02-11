import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Save, Calculator, BookOpen, Users, Trophy } from "lucide-react";
import { useApiQuery, useApiMutation } from "@/hooks/useApiQuery";
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

export default function FacultyGrades() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
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

  // Fetch faculty classes
  const { data: classesData, isLoading: classesLoading } = useApiQuery(
    '/faculty/classes',
    ['faculty-classes'],
    { enabled: !!user }
  );

  // Fetch exams for selected class
  const { data: examsData, isLoading: examsLoading } = useApiQuery(
    `/faculty/grades/exams/${selectedClass}`,
    ['faculty-exams', selectedClass],
    { enabled: !!user && !!selectedClass }
  );

  // Fetch students with grades for selected class
  const { data: studentsData, isLoading: studentsLoading, refetch: refetchStudents } = useApiQuery(
    `/faculty/grades/students/${selectedClass}`,
    ['faculty-students-grades', selectedClass],
    { enabled: !!user && !!selectedClass }
  );

  // Save grades mutation
  const saveGradesMutation = useApiMutation('/faculty/grades/save', 'POST');

  const classes = classesData || [];
  const exams = examsData || [];
  const students = studentsData || [];

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

  const handleSaveGrades = async () => {
    if (!selectedClass || !selectedExam) {
      toast({
        title: "Please select class and exam",
        variant: "destructive",
      });
      return;
    }

    const examInfo = exams.find((e: any) => e.id === selectedExam);
    const maxMarks = examInfo?.maxMarks || 100;

    // Validate grades
    const gradesObject: Record<string, number> = {};
    let hasError = false;
    
    for (const [studentId, gradeStr] of Object.entries(tempGrades)) {
      const grade = parseFloat(gradeStr);
      if (isNaN(grade) || grade < 0 || grade > maxMarks) {
        toast({
          title: `Invalid grade for student ${studentId}`,
          description: `Grade must be between 0 and ${maxMarks}`,
          variant: "destructive",
        });
        hasError = true;
        break;
      }
      gradesObject[studentId] = grade;
    }

    if (!hasError) {
      try {
        await saveGradesMutation.mutateAsync({
          examId: selectedExam,
          grades: gradesObject
        });

        setTempGrades({});
        refetchStudents();
        
        toast({
          title: "Grades saved successfully!",
          description: `Grades for ${examInfo?.name || 'exam'} have been updated`,
        });
      } catch (error: any) {
        toast({
          title: "Failed to save grades",
          description: error.message || "Please try again",
          variant: "destructive",
        });
      }
    }
  };

  const calculateTotalMarks = (student: any) => {
    if (!student.grades) return 0;
    return Object.values(student.grades).reduce((sum: number, grade: any) => sum + (parseFloat(grade) || 0), 0);
  };

  const calculatePercentage = (student: any) => {
    const totalMarks = Number(calculateTotalMarks(student));
    const maxPossible = exams.reduce((sum: number, exam: any) => sum + (exam.maxMarks || 0), 0);
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

  const selectedExamInfo = exams.find((e: any) => e.id === selectedExam);
  const classInfo = classes.find((c: any) => c.id === selectedClass);

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
                    {classes.map((cls: any) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} {cls.subjectName ? `- ${cls.subjectName}` : ''} ({cls.students} students)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Exam/Assignment</label>
                <Select value={selectedExam} onValueChange={setSelectedExam} disabled={!selectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select exam" />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map((exam: any) => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.name} (Max: {exam.maxMarks})
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
                    {students.map((student: any) => {
                      const currentGrade = student.grades?.[selectedExam] || 0;
                      const totalMarks = calculateTotalMarks(student);
                      const percentage = calculatePercentage(student);
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
                            <span className="font-medium">{Number(totalMarks).toFixed(2)}</span>
                            <span className="text-muted-foreground">/{exams.reduce((sum: number, e: any) => sum + (e.maxMarks || 0), 0)}</span>
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
                    <p className="text-2xl font-bold">{students.length}</p>
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
                      {students.length > 0 ? Math.round(students.reduce((sum, s) => sum + calculatePercentage(s), 0) / students.length) : 0}%
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
                      {students.length > 0 ? Math.max(...students.map(s => calculatePercentage(s))) : 0}%
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
                      {students.filter(s => calculatePercentage(s) >= 60).length}
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