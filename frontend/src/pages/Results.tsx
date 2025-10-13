import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, TrendingUp, Download, Eye, Filter, Users } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
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
import { Progress } from "@/components/ui/progress";

// Mock results data
const mockResults = [
  {
    id: "ST001",
    name: "Alice Johnson",
    rollNo: "2023001",
    course: "Computer Science",
    semester: "4th Semester",
    subjects: [
      { name: "Data Structures", marks: 92, total: 100, grade: "A+" },
      { name: "Algorithms", marks: 88, total: 100, grade: "A" },
      { name: "Database Systems", marks: 85, total: 100, grade: "A" },
      { name: "Web Development", marks: 90, total: 100, grade: "A+" }
    ],
    totalMarks: 355,
    maxMarks: 400,
    percentage: 88.75,
    cgpa: 9.2,
    rank: 2
  },
  {
    id: "ST002",
    name: "Bob Smith",
    rollNo: "2023002",
    course: "Computer Science",
    semester: "4th Semester",
    subjects: [
      { name: "Data Structures", marks: 78, total: 100, grade: "B+" },
      { name: "Algorithms", marks: 82, total: 100, grade: "A-" },
      { name: "Database Systems", marks: 79, total: 100, grade: "B+" },
      { name: "Web Development", marks: 85, total: 100, grade: "A" }
    ],
    totalMarks: 324,
    maxMarks: 400,
    percentage: 81.0,
    cgpa: 8.1,
    rank: 5
  },
  {
    id: "ST003",
    name: "Carol Davis",
    rollNo: "2023003",
    course: "Computer Science",
    semester: "4th Semester",
    subjects: [
      { name: "Data Structures", marks: 95, total: 100, grade: "A+" },
      { name: "Algorithms", marks: 94, total: 100, grade: "A+" },
      { name: "Database Systems", marks: 92, total: 100, grade: "A+" },
      { name: "Web Development", marks: 96, total: 100, grade: "A+" }
    ],
    totalMarks: 377,
    maxMarks: 400,
    percentage: 94.25,
    cgpa: 9.8,
    rank: 1
  },
];

export default function Results() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/");
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  // Build query params for filtering
  const queryParams = new URLSearchParams();
  if (selectedCourse) queryParams.append('courseId', selectedCourse);
  if (selectedSemester) queryParams.append('semester', selectedSemester);
  const queryString = queryParams.toString();

  // Fetch results data based on user role
  const resultsEndpoint = user?.role === 'student' 
    ? '/student/results' 
    : `/admin/results${queryString ? `?${queryString}` : ''}`;
    
  const { data: resultsResponse, isLoading, error, refetch } = useApiQuery(
    resultsEndpoint,
    ['results', user?.role, selectedCourse, selectedSemester],
    { enabled: !!user }
  );

  // Fetch courses for filter dropdown
  const { data: coursesData } = useApiQuery(
    '/admin/courses',
    ['courses'],
    { enabled: !!user && user.role !== 'student' }
  );

  // Handle different data structures from backend
  let results = [];
  if (user?.role === 'student') {
    // For students, the API returns exam data with different structure
    results = resultsResponse?.exams || [];
  } else {
    // For admin, it returns student results array directly
    results = Array.isArray(resultsResponse) ? resultsResponse : [];
  }

  const courses = coursesData?.courses || [];

  // Fetch detailed results for selected student
  const { data: detailedResults, isLoading: detailedLoading } = useApiQuery(
    `/admin/students/${selectedStudentId}/results`,
    ['studentDetailedResults', selectedStudentId],
    { enabled: !!selectedStudentId && !!user }
  );

  console.log('Results data:', results);
  console.log('Detailed results:', detailedResults);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': return 'text-green-600';
      case 'A': return 'text-green-500';
      case 'A-': return 'text-blue-500';
      case 'B+': return 'text-blue-400';
      case 'B': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  // Calculate stats based on user role and data structure
  let averagePercentage = "0";
  let topPerformer = null;
  let passRate = "0";

  if (user?.role === 'student') {
    // For student view, calculate from exam data
    if (results.length > 0) {
      const percentages = results.map((exam: any) => {
        if (exam.totalMarks > 0) {
          return (exam.obtainedMarks / exam.totalMarks) * 100;
        }
        return 0;
      });
      averagePercentage = (percentages.reduce((sum: number, p: number) => sum + p, 0) / percentages.length).toFixed(1);
      topPerformer = { cgpa: Math.max(...percentages) / 10 };
      passRate = ((percentages.filter((p: number) => p >= 40).length / percentages.length) * 100).toFixed(1);
    }
  } else {
    // For admin view, calculate from student data
    if (results.length > 0) {
      averagePercentage = (results.reduce((sum: number, student: any) => sum + (student.percentage || 0), 0) / results.length).toFixed(1);
      topPerformer = results.find((student: any) => student.rank === 1) || { cgpa: 0 };
      passRate = ((results.filter((student: any) => (student.percentage || 0) >= 40).length / results.length) * 100).toFixed(1);
    }
  }

  if (!user) return null;

  if (isLoading) {
    return (
      <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <p>Loading results...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <p>Error fetching results: {error.message}</p>
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
            <h1 className="text-3xl font-bold">Results</h1>
            <p className="text-muted-foreground">
              {user.role === 'student' ? 'View your academic results' : 'Manage student results and grades'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Results
            </Button>
            {user.role === 'admin' && (
              <Button className="erp-gradient-bg">
                <TrendingUp className="w-4 h-4 mr-2" />
                Generate Report
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
                  <p className="text-2xl font-bold">{results.length}</p>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="erp-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{averagePercentage}%</p>
                  <p className="text-sm text-muted-foreground">Average Score</p>
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
                  <p className="text-2xl font-bold">{passRate}%</p>
                  <p className="text-sm text-muted-foreground">Pass Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="erp-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-lg font-bold">{topPerformer?.cgpa}</p>
                  <p className="text-sm text-muted-foreground">Highest CGPA</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        {user.role !== 'student' && (
          <Card className="erp-card">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Course</label>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
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
                  <label className="text-sm font-medium mb-2 block">Semester</label>
                  <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st Semester</SelectItem>
                      <SelectItem value="2">2nd Semester</SelectItem>
                      <SelectItem value="3">3rd Semester</SelectItem>
                      <SelectItem value="4">4th Semester</SelectItem>
                      <SelectItem value="5">5th Semester</SelectItem>
                      <SelectItem value="6">6th Semester</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={() => refetch()}>
                    <Filter className="w-4 h-4 mr-2" />
                    Apply Filter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Table */}
        <Card className="erp-card">
          <CardHeader>
            <CardTitle>
              {user.role === 'student' ? 'My Results' : 'Student Results - 4th Semester'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Total Marks</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>CGPA</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((student) => (
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
                          <p className="text-sm text-muted-foreground">{student.course}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{student.rollNo}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{student.totalMarks}/{student.maxMarks}</p>
                        <Progress value={(student.totalMarks / student.maxMarks) * 100} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={student.percentage >= 75 ? 'default' : student.percentage >= 60 ? 'secondary' : 'destructive'}
                        className="font-mono"
                      >
                        {student.percentage.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{student.cgpa}</span>
                        {student.cgpa >= 9.0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">#{student.rank}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSelectedStudentId(student.id);
                          setSelectedStudent(student);
                        }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Subject-wise Details Modal */}
        {selectedStudent && selectedStudentId && (
          <Card className="erp-card">
            <CardHeader>
              <CardTitle>{selectedStudent.name} - Subject-wise Results</CardTitle>
            </CardHeader>
            <CardContent>
              {detailedLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p>Loading subject details...</p>
                </div>
              ) : detailedResults && detailedResults.subjects ? (
                <>
                  <div className="grid gap-4">
                    {detailedResults.subjects.map((subject: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{subject.subjectName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {subject.obtainedMarks}/{subject.maxMarks} marks • {subject.examType}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Progress value={subject.percentage} className="w-20 h-2" />
                          <Badge className={getGradeColor(subject.grade)}>{subject.grade}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  {detailedResults.summary && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Marks</p>
                          <p className="text-lg font-bold">
                            {detailedResults.summary.totalObtained}/{detailedResults.summary.totalMax}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Overall Percentage</p>
                          <p className="text-lg font-bold">{detailedResults.summary.percentage}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Subjects</p>
                          <p className="text-lg font-bold">{detailedResults.summary.totalSubjects}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No subject details available
                </div>
              )}
              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setSelectedStudent(null);
                  setSelectedStudentId(null);
                }}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}