import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, BookOpen, CheckCircle, XCircle, UserPlus, Plus, UserCheck, User } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ClassAssignment() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("assign-students");
  
  // Create Class Dialog States
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassSubject, setNewClassSubject] = useState("");
  const [newClassFaculty, setNewClassFaculty] = useState("");
  
  // Assign Faculty Dialog States
  const [isAssignFacultyOpen, setIsAssignFacultyOpen] = useState(false);
  const [selectedClassForFaculty, setSelectedClassForFaculty] = useState("");
  const [selectedFacultyToAssign, setSelectedFacultyToAssign] = useState("");

  // Create Subject Dialog States
  const [isCreateSubjectOpen, setIsCreateSubjectOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCourse, setNewSubjectCourse] = useState("");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/");
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'admin') {
      navigate("/dashboard");
      return;
    }
    setUser(parsedUser);
  }, [navigate]);

  // Fetch all students
  const { data: studentsData, refetch: refetchStudents } = useApiQuery(
    '/admin/students',
    ['students'],
    { enabled: !!user }
  );

  // Fetch all faculty
  const { data: facultyData } = useApiQuery(
    '/admin/faculty',
    ['faculty'],
    { enabled: !!user }
  );

  // Fetch courses
  const { data: coursesData } = useApiQuery(
    '/admin/courses',
    ['courses'],
    { enabled: !!user }
  );

  // Fetch classes
  const { data: classesData, refetch: refetchClasses } = useApiQuery(
    '/admin/classes',
    ['classes'],
    { enabled: !!user }
  );

  // Fetch subjects for class display
  const { data: subjectsData, refetch: refetchSubjects } = useApiQuery(
    '/admin/subjects',
    ['subjects'],
    { enabled: !!user }
  );

  // Mutations
  const assignClassesMutation = useApiMutation('/admin/assign-classes', 'POST');
  const createClassMutation = useApiMutation('/admin/classes', 'POST');
  const assignFacultyMutation = useApiMutation('/admin/assign-faculty', 'POST');
  const createSubjectMutation = useApiMutation('/admin/subjects', 'POST');

  // Parse data - handle different response formats
  const students = Array.isArray(studentsData) ? studentsData : (studentsData?.students || []);
  const faculty = Array.isArray(facultyData) ? facultyData : (facultyData?.faculty || []);
  const courses = Array.isArray(coursesData) ? coursesData : (coursesData?.courses || []);
  const allClasses = Array.isArray(classesData) ? classesData : (classesData?.classes || []);
  const subjects = Array.isArray(subjectsData) ? subjectsData : (subjectsData?.subjects || []);

  console.log('Students data:', students);
  console.log('Faculty data:', faculty);
  console.log('Classes data (raw):', classesData);
  console.log('Classes data (parsed):', allClasses);
  console.log('Subjects data:', subjects);
  console.log('Courses data:', courses);

  // Filter students by selected course
  const filteredStudents = selectedCourse && selectedCourse !== "all"
    ? students.filter((s: any) => s.courseId === selectedCourse)
    : students;

  // Filter classes by selected course
  const filteredClasses = selectedCourse && selectedCourse !== "all"
    ? allClasses.filter((cls: any) => {
        const classSubject = subjects.find((s: any) => s.id === cls.subject_id);
        return classSubject?.course_id === selectedCourse;
      })
    : allClasses;

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleClassToggle = (classId: string) => {
    setSelectedClasses(prev =>
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const handleSelectAllStudents = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map((s: any) => s.id));
    }
  };

  const handleSelectAllClasses = () => {
    if (selectedClasses.length === filteredClasses.length) {
      setSelectedClasses([]);
    } else {
      setSelectedClasses(filteredClasses.map((c: any) => c.id));
    }
  };

  const handleAssignClasses = async () => {
    if (selectedStudents.length === 0) {
      toast({
        title: "No students selected",
        description: "Please select at least one student",
        variant: "destructive",
      });
      return;
    }

    if (selectedClasses.length === 0) {
      toast({
        title: "No classes selected",
        description: "Please select at least one class",
        variant: "destructive",
      });
      return;
    }

    try {
      await assignClassesMutation.mutateAsync({
        studentIds: selectedStudents,
        classIds: selectedClasses,
      });

      toast({
        title: "Classes assigned successfully",
        description: `${selectedStudents.length} student(s) assigned to ${selectedClasses.length} class(es)`,
      });

      // Reset selections
      setSelectedStudents([]);
      setSelectedClasses([]);
      refetchStudents();
    } catch (error: any) {
      toast({
        title: "Failed to assign classes",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleCreateClass = async () => {
    if (!newClassName || !newClassSubject) {
      toast({
        title: "Missing fields",
        description: "Please provide class name and subject",
        variant: "destructive",
      });
      return;
    }

    try {
      await createClassMutation.mutateAsync({
        name: newClassName,
        subjectId: newClassSubject,
        facultyId: newClassFaculty || null,
      });

      toast({
        title: "Class created successfully",
        description: `${newClassName} has been created`,
      });

      // Reset form and close dialog
      setNewClassName("");
      setNewClassSubject("");
      setNewClassFaculty("");
      setIsCreateClassOpen(false);
      refetchClasses();
    } catch (error: any) {
      toast({
        title: "Failed to create class",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleAssignFaculty = async () => {
    if (!selectedClassForFaculty || !selectedFacultyToAssign) {
      toast({
        title: "Missing selection",
        description: "Please select both class and faculty",
        variant: "destructive",
      });
      return;
    }

    try {
      await assignFacultyMutation.mutateAsync({
        classId: selectedClassForFaculty,
        facultyId: selectedFacultyToAssign,
      });

      toast({
        title: "Faculty assigned successfully",
        description: "Teacher has been assigned to the class",
      });

      // Reset and close
      setSelectedClassForFaculty("");
      setSelectedFacultyToAssign("");
      setIsAssignFacultyOpen(false);
      refetchClasses();
    } catch (error: any) {
      toast({
        title: "Failed to assign faculty",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName || !newSubjectCourse) {
      toast({
        title: "Missing fields",
        description: "Please provide subject name and course",
        variant: "destructive",
      });
      return;
    }

    try {
      await createSubjectMutation.mutateAsync({
        name: newSubjectName,
        courseId: newSubjectCourse
      });

      toast({
        title: "Subject created successfully",
        description: `${newSubjectName} has been created`,
      });

      // Reset form and close dialog
      setNewSubjectName("");
      setNewSubjectCourse("");
      setIsCreateSubjectOpen(false);
      refetchSubjects();
    } catch (error: any) {
      toast({
        title: "Failed to create subject",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
      <div className="space-y-6 erp-animate-enter">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Class Management</h1>
            <p className="text-muted-foreground">Create classes, assign teachers, and enroll students</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCreateClassOpen} onOpenChange={setIsCreateClassOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Class
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Class</DialogTitle>
                  <DialogDescription>
                    Add a new class to the system. You can assign a teacher now or later.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="className">Class Name *</Label>
                    <Input
                      id="className"
                      placeholder="e.g. CS101 - Data Structures"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Select value={newClassSubject} onValueChange={setNewClassSubject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            No subjects available. Create a subject first.
                          </div>
                        ) : (
                          subjects.map((subject: any) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="faculty">Assign Teacher (Optional)</Label>
                    <Select value={newClassFaculty} onValueChange={setNewClassFaculty}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {faculty.map((fac: any) => (
                          <SelectItem key={fac.id} value={fac.id}>
                            {fac.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateClassOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateClass}>
                    Create Class
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isAssignFacultyOpen} onOpenChange={setIsAssignFacultyOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <UserCheck className="w-4 h-4 mr-2" />
                  Assign Teacher
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Teacher to Class</DialogTitle>
                  <DialogDescription>
                    Select a class and assign a teacher to it.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="classSelect">Select Class *</Label>
                    <Select value={selectedClassForFaculty} onValueChange={setSelectedClassForFaculty}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {allClasses.map((cls: any) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name} - {cls.subjectName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="facultySelect">Select Teacher *</Label>
                    <Select value={selectedFacultyToAssign} onValueChange={setSelectedFacultyToAssign}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {faculty.map((fac: any) => (
                          <SelectItem key={fac.id} value={fac.id}>
                            {fac.name} - {fac.department}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAssignFacultyOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAssignFaculty}>
                    Assign Teacher
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateSubjectOpen} onOpenChange={setIsCreateSubjectOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Create Subject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Subject</DialogTitle>
                  <DialogDescription>
                    Add a new subject to the system.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="subjectName">Subject Name *</Label>
                    <Input
                      id="subjectName"
                      placeholder="e.g., Data Structures"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subjectCourse">Course *</Label>
                    <Select value={newSubjectCourse} onValueChange={setNewSubjectCourse}>
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
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateSubjectOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateSubject}>
                    Create Subject
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
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
                  <p className="text-2xl font-bold">{allClasses.length}</p>
                  <p className="text-sm text-muted-foreground">Total Classes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="erp-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-accent-foreground" />
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
                <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{faculty.length}</p>
                  <p className="text-sm text-muted-foreground">Total Teachers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="erp-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{selectedStudents.length + selectedClasses.length}</p>
                  <p className="text-sm text-muted-foreground">Selected Items</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different operations */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assign-students">Assign Students to Classes</TabsTrigger>
            <TabsTrigger value="view-classes">View All Classes</TabsTrigger>
          </TabsList>

          <TabsContent value="assign-students" className="space-y-6">
            {/* Course Filter with Assign Button */}
            <Card className="erp-card">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Filter by Course</label>
                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select course to filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Courses</SelectItem>
                        {courses.map((course: any) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    className="erp-gradient-bg" 
                    onClick={handleAssignClasses}
                    disabled={selectedStudents.length === 0 || selectedClasses.length === 0}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Assign {selectedStudents.length} to {selectedClasses.length} Classes
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Students Table */}
            <Card className="erp-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Select Students</CardTitle>
                  {selectedCourse && selectedCourse !== "all" && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Filtered by course • Showing {filteredStudents.length} student(s)
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={handleSelectAllStudents}>
                  {selectedStudents.length === filteredStudents.length && filteredStudents.length > 0 ? "Deselect All" : "Select All"}
                </Button>
              </CardHeader>
              <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Year</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {selectedCourse && selectedCourse !== "all" ? "No students found for the selected course" : "No students available"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student: any) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={() => handleStudentToggle(student.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} />
                            <AvatarFallback>
                              {student.name.split(' ').map((n: string) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{student.rollNo}</TableCell>
                      <TableCell>{student.course}</TableCell>
                      <TableCell>{student.year}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

            {/* Classes Table */}
            <Card className="erp-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Select Classes</CardTitle>
                  {selectedCourse && selectedCourse !== "all" && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Filtered by course • Showing {filteredClasses.length} class(es)
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={handleSelectAllClasses}>
                  {selectedClasses.length === filteredClasses.length && filteredClasses.length > 0 ? "Deselect All" : "Select All"}
                </Button>
              </CardHeader>
              <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Class Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Faculty</TableHead>
                  <TableHead>Schedule</TableHead>
                </TableRow>
              </TableHeader>
                            <TableBody>
                {filteredClasses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {selectedCourse && selectedCourse !== "all" ? "No classes found for the selected course" : "No classes available"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClasses.map((cls: any) => (
                    <TableRow key={cls.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedClasses.includes(cls.id)}
                          onCheckedChange={() => handleClassToggle(cls.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>{cls.subjectName}</TableCell>
                      <TableCell>{cls.courseName}</TableCell>
                      <TableCell>
                        {cls.facultyName ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-green-600" />
                            <span>{cls.facultyName}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {cls.schedule ? (
                          <span className="text-sm">{cls.schedule}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not set</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="view-classes">
            <Card className="erp-card">
              <CardHeader>
                <CardTitle>All Classes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class Name</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Faculty</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Students</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allClasses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No classes available
                        </TableCell>
                      </TableRow>
                    ) : (
                      allClasses.map((cls: any) => (
                        <TableRow key={cls.id}>
                          <TableCell className="font-medium">{cls.name}</TableCell>
                          <TableCell>{cls.subjectName}</TableCell>
                          <TableCell>{cls.courseName}</TableCell>
                          <TableCell>
                            {cls.facultyName ? (
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-green-600" />
                                <span>{cls.facultyName}</span>
                              </div>
                            ) : (
                              <Badge variant="destructive">Not Assigned</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {cls.schedule ? (
                              <span className="text-sm">{cls.schedule}</span>
                            ) : (
                              <span className="text-muted-foreground text-sm">Not set</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{cls.studentCount} enrolled</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
