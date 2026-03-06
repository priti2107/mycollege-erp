import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Edit, Trash2, Eye, BookOpen, Users } from "lucide-react";
import { useApiQuery, useApiMutation } from "@/hooks/useApiQuery";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function Faculty() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<any>(null);
  const [newFaculty, setNewFaculty] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    departmentId: "",
    specialization: "",
    qualification: "",
    experienceYears: ""
  });
  const [editFaculty, setEditFaculty] = useState({
    firstName: "",
    lastName: "",
    email: "",
    departmentId: "",
    specialization: "",
    qualification: "",
    experienceYears: ""
  });

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/");
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  // Fetch faculty data from API
  const { data: faculty, isLoading, error, refetch } = useApiQuery(
    '/admin/faculty',
    ['faculty'],
    { enabled: !!user }
  );

  // Fetch reference data
  const { data: departmentsData } = useApiQuery(
    '/admin/departments',
    ['departments'],
    { enabled: !!user }
  );

  const departments = departmentsData?.departments || [];

  // CRUD mutations
  const createFacultyMutation = useApiMutation('/admin/faculty', 'POST');

  const handleCreateFaculty = async () => {
    if (!newFaculty.firstName || !newFaculty.lastName || !newFaculty.email || !newFaculty.password || 
        !newFaculty.departmentId || !newFaculty.specialization || !newFaculty.experienceYears) {
      toast({
        title: "Please fill all required fields",
        description: "First name, last name, email, password, department, specialization, and experience are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const facultyData = {
        firstName: newFaculty.firstName,
        lastName: newFaculty.lastName,
        email: newFaculty.email,
        password: newFaculty.password,
        departmentId: newFaculty.departmentId, // Keep as UUID string
        specialization: newFaculty.specialization,
        experienceYears: parseInt(newFaculty.experienceYears),
        subjectIds: [] // Default empty array, can be updated later
      };
      
      await createFacultyMutation.mutateAsync(facultyData);
      toast({
        title: "Faculty member added successfully",
      });
      setIsAddDialogOpen(false);
      setNewFaculty({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        departmentId: "",
        specialization: "",
        qualification: "",
        experienceYears: ""
      });
      refetch();
    } catch (error) {
      toast({
        title: "Failed to add faculty member",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleViewFaculty = (facultyMember: any) => {
    setSelectedFaculty(facultyMember);
    setIsViewDialogOpen(true);
  };

  const handleEditFaculty = (facultyMember: any) => {
    setSelectedFaculty(facultyMember);
    setEditFaculty({
      firstName: facultyMember.firstName || facultyMember.name?.split(' ')[0] || '',
      lastName: facultyMember.lastName || facultyMember.name?.split(' ').slice(1).join(' ') || '',
      email: facultyMember.email || '',
      departmentId: facultyMember.departmentId || '',
      specialization: facultyMember.specialization || '',
      qualification: facultyMember.qualification || '',
      experienceYears: facultyMember.experienceYears ? facultyMember.experienceYears.toString() : ''
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateFaculty = async () => {
    if (!editFaculty.firstName || !editFaculty.lastName || !editFaculty.email || !editFaculty.departmentId || !editFaculty.experienceYears) {
      toast({
        title: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Prepare the data with correct types
      const updateData = {
        firstName: editFaculty.firstName,
        lastName: editFaculty.lastName,
        email: editFaculty.email,
        departmentId: editFaculty.departmentId, // Keep as UUID string
        specialization: editFaculty.specialization,
        experienceYears: parseInt(editFaculty.experienceYears),
        isActive: true // Default to active status
      };

      const response = await fetch(`http://localhost:5001/api/admin/faculty/${selectedFaculty?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update faculty member');
      }

      toast({
        title: "Faculty member updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditFaculty({
        firstName: "",
        lastName: "",
        email: "",
        departmentId: "",
        specialization: "",
        qualification: "",
        experienceYears: ""
      });
      refetch();
    } catch (error) {
      toast({
        title: "Failed to update faculty member",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteFaculty = async (facultyMember: any) => {
    if (confirm(`Are you sure you want to delete faculty member ${facultyMember.name}?`)) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5001/api/admin/faculty/${facultyMember.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to delete faculty member');
        }

        toast({
          title: "Faculty member deleted successfully",
        });
        refetch();
      } catch (error) {
        toast({
          title: "Failed to delete faculty member",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/");
  };

  const filteredFaculty = faculty?.filter((member: any) =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (!user) return null;

  if (isLoading) {
    return (
      <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <p>Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <p>Error fetching data: {error.message}</p>
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
            <h1 className="text-3xl font-bold">Faculty</h1>
            <p className="text-muted-foreground">Manage faculty members and their information</p>
          </div>
          {user.role === 'admin' && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="erp-gradient-bg">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Faculty
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Faculty</DialogTitle>
                  <DialogDescription>
                    Enter the faculty member's information below.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input 
                        id="firstName" 
                        placeholder="First name"
                        value={newFaculty.firstName}
                        onChange={(e) => setNewFaculty({...newFaculty, firstName: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input 
                        id="lastName" 
                        placeholder="Last name"
                        value={newFaculty.lastName}
                        onChange={(e) => setNewFaculty({...newFaculty, lastName: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="faculty@college.edu"
                      value={newFaculty.email}
                      onChange={(e) => setNewFaculty({...newFaculty, email: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="Enter password"
                      value={newFaculty.password}
                      onChange={(e) => setNewFaculty({...newFaculty, password: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="department">Department</Label>
                    <Select value={newFaculty.departmentId} onValueChange={(value) => setNewFaculty({...newFaculty, departmentId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept: any) => (
                          <SelectItem key={dept.id} value={dept.id.toString()}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="specialization">Specialization</Label>
                    <Input 
                      id="specialization" 
                      placeholder="Enter specialization"
                      value={newFaculty.specialization}
                      onChange={(e) => setNewFaculty({...newFaculty, specialization: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="qualification">Qualification</Label>
                    <Input 
                      id="qualification" 
                      placeholder="e.g., PhD Computer Science"
                      value={newFaculty.qualification}
                      onChange={(e) => setNewFaculty({...newFaculty, qualification: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="experience">Experience</Label>
                    <Input 
                      id="experienceYears" 
                      type="number"
                      placeholder="e.g., 5"
                      value={newFaculty.experienceYears}
                      onChange={(e) => setNewFaculty({...newFaculty, experienceYears: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 erp-gradient-bg" 
                    onClick={handleCreateFaculty}
                    disabled={createFacultyMutation.isPending}
                  >
                    {createFacultyMutation.isPending ? "Adding..." : "Add Faculty"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
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
                  <p className="text-2xl font-bold">{faculty?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Faculty</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="erp-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">4</p>
                  <p className="text-sm text-muted-foreground">Departments</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="erp-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{faculty?.filter((f: any) => f.status === 'Active').length || 0}</p>
                  <p className="text-sm text-muted-foreground">Active Faculty</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="erp-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{faculty?.filter((f: any) => f.status === 'On Leave').length || 0}</p>
                  <p className="text-sm text-muted-foreground">On Leave</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="erp-card">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search faculty..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Faculty Table */}
        <Card className="erp-card">
          <CardHeader>
            <CardTitle>All Faculty ({filteredFaculty.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faculty</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFaculty.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} />
                          <AvatarFallback>
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{member.department}</TableCell>
                    <TableCell>{member.specialization}</TableCell>
                    <TableCell>{member.experience}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {member.subjects.slice(0, 2).map((subject, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {subject}
                          </Badge>
                        ))}
                        {member.subjects.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{member.subjects.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.status === 'Active' ? 'default' : 'secondary'}>
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleViewFaculty(member)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {user.role === 'admin' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleEditFaculty(member)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive"
                              onClick={() => handleDeleteFaculty(member)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* View Faculty Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Faculty Details</DialogTitle>
              <DialogDescription>
                View faculty member information and details.
              </DialogDescription>
            </DialogHeader>
            {selectedFaculty && (
              <div className="grid gap-4 py-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedFaculty.name}`} />
                    <AvatarFallback>
                      {selectedFaculty.name.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedFaculty.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedFaculty.email}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Department:</span>
                    <span>{selectedFaculty.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Specialization:</span>
                    <span>{selectedFaculty.specialization}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Experience:</span>
                    <span>{selectedFaculty.experience}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Qualification:</span>
                    <span>{selectedFaculty.qualification}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <Badge variant={selectedFaculty.status === 'Active' ? 'default' : 'secondary'}>
                      {selectedFaculty.status}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <span className="font-medium">Subjects:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedFaculty.subjects?.map((subject: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
              {user.role === 'admin' && (
                <Button className="flex-1" onClick={() => {
                  setIsViewDialogOpen(false);
                  handleEditFaculty(selectedFaculty);
                }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Faculty
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Faculty Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Faculty</DialogTitle>
              <DialogDescription>
                Update faculty member information.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="editFirstName">First Name</Label>
                  <Input 
                    id="editFirstName" 
                    placeholder="First name"
                    value={editFaculty.firstName}
                    onChange={(e) => setEditFaculty({...editFaculty, firstName: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editLastName">Last Name</Label>
                  <Input 
                    id="editLastName" 
                    placeholder="Last name"
                    value={editFaculty.lastName}
                    onChange={(e) => setEditFaculty({...editFaculty, lastName: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editEmail">Email</Label>
                <Input 
                  id="editEmail" 
                  type="email" 
                  placeholder="faculty@college.edu"
                  value={editFaculty.email}
                  onChange={(e) => setEditFaculty({...editFaculty, email: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editDepartment">Department</Label>
                <Select value={editFaculty.departmentId} onValueChange={(value) => setEditFaculty({...editFaculty, departmentId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept: any) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editSpecialization">Specialization</Label>
                <Input 
                  id="editSpecialization" 
                  placeholder="Enter specialization"
                  value={editFaculty.specialization}
                  onChange={(e) => setEditFaculty({...editFaculty, specialization: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editQualification">Qualification</Label>
                <Input 
                  id="editQualification" 
                  placeholder="e.g., PhD Computer Science"
                  value={editFaculty.qualification}
                  onChange={(e) => setEditFaculty({...editFaculty, qualification: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editExperience">Experience</Label>
                <Input 
                  id="editExperience" 
                  placeholder="e.g., 5 years"
                  value={editFaculty.experienceYears}
                  onChange={(e) => setEditFaculty({...editFaculty, experienceYears: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="flex-1 erp-gradient-bg" 
                onClick={handleUpdateFaculty}
              >
                Update Faculty
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}