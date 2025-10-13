import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApiQuery } from "@/hooks/useApiQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Trophy, Search, User, TrendingUp, TrendingDown, Download, Eye } from "lucide-react";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";

const mockStudent = {
  name: "John Smith",
  email: "john.smith@student.edu",
  role: "Student",
  class: "12th Grade - Science",
  rollNumber: "STU001",
};

const mockExams = [
  {
    id: "1",
    name: "Mid-term Examination",
    type: "Mid-term",
    date: "2024-01-15",
    status: "completed",
    subjects: [
      { name: "Mathematics", maxMarks: 100, obtainedMarks: 95, grade: "A+" },
      { name: "Physics", maxMarks: 100, obtainedMarks: 88, grade: "A" },
      { name: "Chemistry", maxMarks: 100, obtainedMarks: 92, grade: "A+" },
      { name: "Biology", maxMarks: 100, obtainedMarks: 82, grade: "B+" },
      { name: "English", maxMarks: 100, obtainedMarks: 90, grade: "A" },
    ],
    totalMarks: 500,
    obtainedMarks: 447,
    percentage: 89.4,
    grade: "A",
    rank: 3,
  },
  {
    id: "2",
    name: "Unit Test 1",
    type: "Unit Test",
    date: "2024-01-08",
    status: "completed",
    subjects: [
      { name: "Mathematics", maxMarks: 50, obtainedMarks: 46, grade: "A+" },
      { name: "Physics", maxMarks: 50, obtainedMarks: 42, grade: "A" },
      { name: "Chemistry", maxMarks: 50, obtainedMarks: 45, grade: "A+" },
    ],
    totalMarks: 150,
    obtainedMarks: 133,
    percentage: 88.7,
    grade: "A",
    rank: 2,
  },
  {
    id: "3",
    name: "Final Examination",
    type: "Final",
    date: "2024-02-15",
    status: "upcoming",
    subjects: [],
    totalMarks: 500,
    obtainedMarks: 0,
    percentage: 0,
    grade: "-",
    rank: 0,
  },
];

const mockAssignments = [
  { name: "Physics Lab Report", subject: "Physics", maxMarks: 20, obtainedMarks: 18, grade: "A", date: "2024-01-10" },
  { name: "Chemistry Project", subject: "Chemistry", maxMarks: 25, obtainedMarks: 23, grade: "A+", date: "2024-01-12" },
  { name: "Math Problem Set", subject: "Mathematics", maxMarks: 15, obtainedMarks: 14, grade: "A", date: "2024-01-14" },
];

export default function StudentResults() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [activeTab, setActiveTab] = useState("exams");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/");
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  // Fetch student results data from API
  const { data: resultsData, isLoading, error } = useApiQuery(
    '/student/results',
    ['student-results'],
    { enabled: !!user }
  );

  const exams = resultsData?.exams || [];
  const assignments = resultsData?.assignments || [];

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/");
  };

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || exam.type.toLowerCase() === selectedType.toLowerCase();
    
    return matchesSearch && matchesType;
  });

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-green-600';
    if (grade.startsWith('B')) return 'text-blue-600';
    if (grade.startsWith('C')) return 'text-yellow-600';
    if (grade.startsWith('D')) return 'text-orange-600';
    return 'text-red-600';
  };

  const getGradeBadgeVariant = (grade: string) => {
    if (grade.startsWith('A')) return 'default';
    if (grade.startsWith('B')) return 'secondary';
    return 'destructive';
  };

  const overallStats = {
    averagePercentage: exams.filter(e => e.status === 'completed').reduce((sum, exam) => sum + exam.percentage, 0) / exams.filter(e => e.status === 'completed').length,
    bestSubject: "Chemistry",
    currentRank: 3,
    totalStudents: 45,
  };

  return (
    <DashboardLayout userRole="student" user={mockStudent} onLogout={handleLogout}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Results</h1>
            <p className="text-muted-foreground mt-2">View your exam results and academic performance</p>
          </div>
          <Badge variant="secondary" className="px-3 py-1">
            <User className="h-4 w-4 mr-1" />
            Student View
          </Badge>
        </div>

        {/* Performance Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Average</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{overallStats.averagePercentage.toFixed(1)}%</div>
              <Progress value={overallStats.averagePercentage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">Grade A performance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Class Rank</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{overallStats.currentRank}</div>
              <p className="text-xs text-muted-foreground mt-2">
                out of {overallStats.totalStudents} students
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Best Subject</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{overallStats.bestSubject}</div>
              <p className="text-xs text-muted-foreground mt-2">92% average</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Improvement</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">+2.5%</div>
              <p className="text-xs text-muted-foreground mt-2">vs last term</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
          <Button
            variant={activeTab === "exams" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("exams")}
          >
            Examinations
          </Button>
          <Button
            variant={activeTab === "assignments" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("assignments")}
          >
            Assignments
          </Button>
        </div>

        {/* Examinations Tab */}
        {activeTab === "exams" && (
          <Card>
            <CardHeader>
              <CardTitle>Examination Results</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search exams..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="mid-term">Mid-term</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="unit test">Unit Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Exam Results */}
              <div className="space-y-6">
                {filteredExams.map((exam) => (
                  <div key={exam.id} className="border rounded-lg p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{exam.name}</h3>
                        <p className="text-sm text-muted-foreground">{exam.date} • {exam.type}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-2 md:mt-0">
                        <Badge variant={exam.status === "completed" ? "default" : "secondary"}>
                          {exam.status}
                        </Badge>
                        {exam.status === "completed" && (
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {exam.status === "completed" ? (
                      <>
                        {/* Overall Result */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Total Marks</p>
                            <p className="font-semibold">{exam.obtainedMarks}/{exam.totalMarks}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Percentage</p>
                            <p className={`font-semibold ${getGradeColor(exam.grade)}`}>
                              {exam.percentage}%
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Grade</p>
                            <Badge variant={getGradeBadgeVariant(exam.grade)}>
                              {exam.grade}
                            </Badge>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Rank</p>
                            <p className="font-semibold">{exam.rank}</p>
                          </div>
                        </div>

                        {/* Subject-wise Results */}
                        {exam.subjects.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-3">Subject-wise Performance</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {exam.subjects.map((subject, index) => (
                                <div key={index} className="p-3 border rounded-lg">
                                  <div className="flex justify-between items-start mb-2">
                                    <h5 className="font-medium text-sm">{subject.name}</h5>
                                    <Badge variant={getGradeBadgeVariant(subject.grade)} className="text-xs">
                                      {subject.grade}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {subject.obtainedMarks}/{subject.maxMarks} marks
                                  </p>
                                  <Progress 
                                    value={(subject.obtainedMarks / subject.maxMarks) * 100} 
                                    className="h-2 mt-2"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Exam scheduled for {exam.date}</p>
                        <p className="text-sm mt-1">Results will be available after completion</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assignments Tab */}
        {activeTab === "assignments" && (
          <Card>
            <CardHeader>
              <CardTitle>Assignment Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assignments.map((assignment, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{assignment.name}</h4>
                      <p className="text-sm text-muted-foreground">{assignment.subject} • {assignment.date}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">
                        {assignment.obtainedMarks}/{assignment.maxMarks} marks
                      </span>
                      <Badge variant={getGradeBadgeVariant(assignment.grade)}>
                        {assignment.grade}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}