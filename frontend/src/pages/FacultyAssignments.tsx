import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Upload, Download, Calendar, BookOpen, Edit, Trash2, Eye } from "lucide-react";
import { useApiQuery, useApiMutation } from "@/hooks/useApiQuery";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
const mockAssignments = [
  {
    id: "ASSGN001",
    title: "Data Structures Implementation",
    description: "Implement basic data structures using Python",
    class: "CS101",
    className: "Data Structures",
    dueDate: "2024-01-15",
    totalMarks: 100,
    submissions: 35,
    totalStudents: 45,
    status: "Active"
  },
  {
    id: "ASSGN002", 
    title: "Algorithm Analysis Report",
    description: "Write a report analyzing time complexity of sorting algorithms",
    class: "CS201",
    className: "Algorithms",
    dueDate: "2024-01-20",
    totalMarks: 50,
    submissions: 28,
    totalStudents: 38,
    status: "Active"
  },
  {
    id: "ASSGN003",
    title: "ML Model Training",
    description: "Train and evaluate a machine learning model on provided dataset",
    class: "CS301",
    className: "Machine Learning",
    dueDate: "2024-01-10",
    totalMarks: 100,
    submissions: 32,
    totalStudents: 32,
    status: "Completed"
  }
];

const mockClasses = [
  { id: "CS101", name: "Data Structures", students: 45 },
  { id: "CS201", name: "Algorithms", students: 38 },
  { id: "CS301", name: "Machine Learning", students: 32 }
];

export default function FacultyAssignments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    class: "",
    dueDate: "",
    totalMarks: ""
  });

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

  // Fetch assignments from API
  const { data: assignments, isLoading: assignmentsLoading, error: assignmentsError } = useApiQuery(
    '/faculty/assignments',
    ['faculty-assignments'],
    { enabled: !!user }
  );

  // Fetch classes from API
  const { data: classes, isLoading: classesLoading, error: classesError } = useApiQuery(
    '/faculty/classes',
    ['faculty-classes'],
    { enabled: !!user }
  );

  // Create assignment mutation
  const createAssignmentMutation = useApiMutation('/faculty/assignments', 'POST');

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleCreateAssignment = async () => {
    if (!newAssignment.title || !newAssignment.class || !newAssignment.dueDate) {
      toast({
        title: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const assignmentData = {
        ...newAssignment,
        totalMarks: parseInt(newAssignment.totalMarks) || 100
      };

      await createAssignmentMutation.mutateAsync(assignmentData);
      
      setNewAssignment({ title: "", description: "", class: "", dueDate: "", totalMarks: "" });
      setIsAddDialogOpen(false);

      toast({
        title: "Assignment created successfully!",
        description: `${assignmentData.title} has been created`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to create assignment",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'default';
      case 'Completed': return 'secondary';
      default: return 'outline';
    }
  };

  const getDaysRemaining = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (!user) return null;

  if (assignmentsLoading || classesLoading) {
    return (
      <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <p>Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (assignmentsError || classesError) {
    return (
      <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <p>Error fetching data: {(assignmentsError || classesError)?.message}</p>
        </div>
      </DashboardLayout>
    );
  }

  // Use API data or fallback to mock data
  const assignmentsData = assignments || mockAssignments;
  const classesData = classes || mockClasses;

  return (
    <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
      <div className="space-y-6 erp-animate-enter">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Assignments</h1>
            <p className="text-muted-foreground">Manage assignments and study materials</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="erp-gradient-bg">
                <Plus className="w-4 h-4 mr-2" />
                Create Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Assignment</DialogTitle>
                <DialogDescription>
                  Create a new assignment for your students.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Assignment Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter assignment title"
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter assignment description"
                    value={newAssignment.description}
                    onChange={(e) => setNewAssignment({...newAssignment, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="class">Class</Label>
                    <Select 
                      value={newAssignment.class} 
                      onValueChange={(value) => setNewAssignment({...newAssignment, class: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classesData.map((cls: any) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="totalMarks">Total Marks</Label>
                    <Input
                      id="totalMarks"
                      type="number"
                      placeholder="100"
                      value={newAssignment.totalMarks}
                      onChange={(e) => setNewAssignment({...newAssignment, totalMarks: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={newAssignment.dueDate}
                    onChange={(e) => setNewAssignment({...newAssignment, dueDate: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 erp-gradient-bg" onClick={handleCreateAssignment}>
                  Create Assignment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="erp-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{assignmentsData.length}</p>
                  <p className="text-sm text-muted-foreground">Total Assignments</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="erp-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{assignmentsData.filter((a: any) => a.status === 'Active').length}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="erp-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                  <Upload className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {assignments.reduce((sum, a) => sum + a.submissions, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Submissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="erp-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
                  <Download className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {Math.round((assignmentsData.reduce((sum: number, a: any) => sum + a.submissions, 0) / 
                    assignmentsData.reduce((sum: number, a: any) => sum + a.totalStudents, 0)) * 100) || 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">Submission Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assignments Table */}
        <Card className="erp-card">
          <CardHeader>
            <CardTitle>All Assignments ({assignmentsData.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Total Marks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignmentsData.map((assignment: any) => {
                  const daysRemaining = getDaysRemaining(assignment.dueDate);
                  return (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{assignment.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {assignment.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{assignment.className}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {new Date(assignment.dueDate).toLocaleDateString()}
                          </p>
                          {daysRemaining > 0 && (
                            <p className="text-sm text-muted-foreground">
                              {daysRemaining} days left
                            </p>
                          )}
                          {daysRemaining < 0 && (
                            <p className="text-sm text-red-500">
                              Overdue by {Math.abs(daysRemaining)} days
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <p className="font-medium">
                            {assignment.submissions}/{assignment.totalStudents}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {Math.round((assignment.submissions / assignment.totalStudents) * 100)}%
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{assignment.totalMarks}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(assignment.status)}>
                          {assignment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}