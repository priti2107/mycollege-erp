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
          <p>Loading results...</p>
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

  const exams = resultsData?.exams || [];
  const assignments = resultsData?.assignments || [];

  const filteredExams = exams.filter((exam: any) => {
    const matchesSearch = exam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || exam.type?.toLowerCase() === selectedType.toLowerCase();
    
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

  // Calculate overall stats
  const completedExams = exams.filter((e: any) => e.status === 'completed');
  const averagePercentage = completedExams.length > 0 
    ? completedExams.reduce((sum: number, exam: any) => sum + exam.percentage, 0) / completedExams.length 
    : 0;

  // Find best subject
  const subjectScores = new Map();
  completedExams.forEach((exam: any) => {
    exam.subjects?.forEach((subject: any) => {
      if (!subjectScores.has(subject.name)) {
        subjectScores.set(subject.name, []);
      }
      subjectScores.get(subject.name).push(subject.percentage);
    });
  });
  
  let bestSubject = "N/A";
  let highestAvg = 0;
  subjectScores.forEach((scores, subjectName) => {
    const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
    if (avg > highestAvg) {
      highestAvg = avg;
      bestSubject = subjectName;
    }
  });

  return (
    <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
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
              <div className="text-2xl font-bold text-primary">{averagePercentage.toFixed(1)}%</div>
              <Progress value={averagePercentage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {averagePercentage >= 90 ? 'A+ Grade' : averagePercentage >= 80 ? 'A Grade' : averagePercentage >= 70 ? 'B+ Grade' : 'B Grade'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{completedExams.length}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Completed assessments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Best Subject</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{bestSubject}</div>
              <p className="text-xs text-muted-foreground mt-2">Top performer</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
              <Trophy className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{subjectScores.size}</div>
              <p className="text-xs text-muted-foreground mt-2">Subjects enrolled</p>
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