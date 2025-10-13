import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, IndianRupee, Clock, CheckCircle, AlertCircle, Download, Plus } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function Fees() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isAddDueDialogOpen, setIsAddDueDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    studentId: "",
    amount: "",
    dueId: "",
    selectedDue: null as any
  });
  const [newDue, setNewDue] = useState({
    studentId: "",
    categoryId: "",
    amount: "",
    dueDate: ""
  });

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/");
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  // Fetch fees data from API
  const { data: feesData, isLoading, error, refetch } = useApiQuery(
    '/admin/fees',
    ['fees'],
    { enabled: !!user }
  );

  // Fetch reference data
  const { data: feeCategoriesData } = useApiQuery(
    '/admin/fee-categories',
    ['fee-categories'],
    { enabled: !!user }
  );

  const { data: coursesData } = useApiQuery(
    '/admin/courses',
    ['courses'],
    { enabled: !!user }
  );

  const feeCategories = feeCategoriesData?.categories || [];
  const courses = coursesData?.courses || [];

  // Fetch dues for selected student
  const { data: studentDuesData, refetch: refetchDues } = useApiQuery(
    paymentForm.studentId ? `/admin/students/${paymentForm.studentId}/dues` : null,
    ['student-dues', paymentForm.studentId],
    { enabled: !!paymentForm.studentId }
  );

  const studentDues = studentDuesData?.dues || [];

  // Payment and due creation mutations
  const createPaymentMutation = useApiMutation('/admin/payments', 'POST');
  const createDueMutation = useApiMutation('/admin/fees/dues', 'POST');

  const handleRecordPayment = async () => {
    if (!paymentForm.studentId || !paymentForm.amount || !paymentForm.dueId) {
      toast({
        title: "Please fill all required fields",
        description: "Student, due selection, and amount are required",
        variant: "destructive",
      });
      return;
    }

    // Validate payment amount
    const amount = parseFloat(paymentForm.amount);
    if (amount <= 0 || amount > paymentForm.selectedDue?.remainingAmount) {
      toast({
        title: "Invalid amount",
        description: `Amount must be between ₹1 and ₹${paymentForm.selectedDue?.remainingAmount}`,
        variant: "destructive",
      });
      return;
    }

    try {
      await createPaymentMutation.mutateAsync({
        dueId: paymentForm.dueId,
        amountPaid: parseFloat(paymentForm.amount),
        receiptNo: `RCP${Date.now()}` // Generate a unique receipt number
      });
      
      setPaymentForm({ studentId: "", amount: "", dueId: "", selectedDue: null });
      setIsPaymentDialogOpen(false);
      refetch();

      toast({
        title: "Payment recorded successfully!",
        description: `Payment of ₹${paymentForm.amount} has been recorded`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to record payment",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleAddDue = async () => {
    if (!newDue.studentId || !newDue.amount || !newDue.dueDate) {
      toast({
        title: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await createDueMutation.mutateAsync({
        studentId: newDue.studentId,
        categoryId: newDue.categoryId,
        amount: parseFloat(newDue.amount),
        dueDate: newDue.dueDate
      });
      
      setNewDue({ studentId: "", categoryId: "", amount: "", dueDate: "" });
      setIsAddDueDialogOpen(false);
      refetch();

      toast({
        title: "Fee due added successfully!",
        description: `New fee due of ₹${newDue.amount} has been added`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to add fee due",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/");
  };

  // Recalculate fee totals from fetched data
  const totalFeesCollected = feesData?.reduce((sum: number, student: any) => sum + student.paidFees, 0) || 0;
  const totalPendingFees = feesData?.reduce((sum: number, student: any) => sum + student.pendingFees, 0) || 0;
  const totalFees = feesData?.reduce((sum: number, student: any) => sum + student.totalFees, 0) || 0;
  const collectionRate = totalFees > 0 ? ((totalFeesCollected / totalFees) * 100).toFixed(1) : '0';
  const overdueStudents = feesData?.filter((student: any) => student.status === 'Overdue').length || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'default';
      case 'Partial': return 'secondary';
      case 'Overdue': return 'destructive';
      default: return 'outline';
    }
  };

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
            <h1 className="text-3xl font-bold">Fees Management</h1>
            <p className="text-muted-foreground">
              {user.role === 'student' ? 'View your fee payments and dues' : 'Manage student fees and payments'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            {user.role === 'admin' && (
              <>
                <Dialog open={isAddDueDialogOpen} onOpenChange={setIsAddDueDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Due
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Fee Due</DialogTitle>
                      <DialogDescription>
                        Add a new fee due for a student.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="student">Student</Label>
                        <Select value={newDue.studentId} onValueChange={(value) => setNewDue({...newDue, studentId: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select student" />
                          </SelectTrigger>
                          <SelectContent>
                            {feesData?.map((student: any) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.name} ({student.rollNo})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="category">Fee Category</Label>
                        <Select value={newDue.categoryId} onValueChange={(value) => setNewDue({...newDue, categoryId: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {feeCategories.map((category: any) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input 
                          id="amount" 
                          type="number" 
                          placeholder="Enter amount"
                          value={newDue.amount}
                          onChange={(e) => setNewDue({...newDue, amount: e.target.value})}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="dueDate">Due Date</Label>
                        <Input 
                          id="dueDate" 
                          type="date"
                          value={newDue.dueDate}
                          onChange={(e) => setNewDue({...newDue, dueDate: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setIsAddDueDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        className="flex-1 erp-gradient-bg" 
                        onClick={handleAddDue}
                        disabled={createDueMutation.isPending}
                      >
                        {createDueMutation.isPending ? "Adding..." : "Add Due"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="erp-gradient-bg">
                    <Plus className="w-4 h-4 mr-2" />
                    Record Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Record Fee Payment</DialogTitle>
                    <DialogDescription>
                      Record a new fee payment for a student.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="paymentStudent">Student</Label>
                      <Select 
                        value={paymentForm.studentId} 
                        onValueChange={(value) => setPaymentForm({
                          ...paymentForm, 
                          studentId: value, 
                          dueId: "", 
                          selectedDue: null,
                          amount: ""
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select student" />
                        </SelectTrigger>
                        <SelectContent>
                          {feesData?.map((student: any) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.name} ({student.rollNo})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {paymentForm.studentId && (
                      <div className="grid gap-2">
                        <Label htmlFor="dueSelection">Select Due</Label>
                        <Select 
                          value={paymentForm.dueId} 
                          onValueChange={(value) => {
                            const selectedDue = studentDues.find(due => due.id.toString() === value);
                            setPaymentForm({
                              ...paymentForm, 
                              dueId: value,
                              selectedDue,
                              amount: selectedDue?.remainingAmount?.toString() || ""
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a due to pay" />
                          </SelectTrigger>
                          <SelectContent>
                            {studentDues.map((due: any) => (
                              <SelectItem key={due.id} value={due.id.toString()}>
                                {due.categoryName} - ₹{due.remainingAmount} due 
                                {due.dueDate && ` (Due: ${new Date(due.dueDate).toLocaleDateString()})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {studentDues.length === 0 && (
                          <p className="text-sm text-muted-foreground">No pending dues for this student</p>
                        )}
                      </div>
                    )}
                    <div className="grid gap-2">
                      <Label htmlFor="paymentAmount">Amount</Label>
                      <div className="space-y-2">
                        <Input 
                          id="paymentAmount" 
                          type="number" 
                          placeholder="Enter amount"
                          value={paymentForm.amount}
                          onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                          max={paymentForm.selectedDue?.remainingAmount}
                          disabled={!paymentForm.dueId}
                        />
                        {paymentForm.selectedDue && (
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Total Due: ₹{paymentForm.selectedDue.amount}</p>
                            <p>Already Paid: ₹{paymentForm.selectedDue.totalPaid}</p>
                            <p>Remaining: ₹{paymentForm.selectedDue.remainingAmount}</p>
                            <div className="flex gap-2">
                              <Button 
                                type="button"
                                variant="outline" 
                                size="sm"
                                onClick={() => setPaymentForm({...paymentForm, amount: paymentForm.selectedDue.remainingAmount.toString()})}
                              >
                                Pay Full Amount
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setIsPaymentDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      className="flex-1 erp-gradient-bg" 
                      onClick={handleRecordPayment}
                      disabled={createPaymentMutation.isPending}
                    >
                      {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                    </Button>
                  </div>
                </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="erp-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <IndianRupee className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">₹{totalFeesCollected.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Collected</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="erp-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">₹{totalPendingFees.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
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
                  <p className="text-2xl font-bold">{collectionRate}%</p>
                  <p className="text-sm text-muted-foreground">Collection Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="erp-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overdueStudents}</p>
                  <p className="text-sm text-muted-foreground">Overdue</p>
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
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course: any) => (
                        <SelectItem key={course.id} value={course.id.toString()}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Academic Year</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fees Table */}
        <Card className="erp-card">
          <CardHeader>
            <CardTitle>
              {user.role === 'student' ? 'My Fee Details' : 'Student Fee Status'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Total Fees</TableHead>
                  <TableHead>Paid Amount</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feesData?.map((student: any) => (
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
                          <p className="text-sm text-muted-foreground">{student.rollNo}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{student.course}</p>
                        <p className="text-sm text-muted-foreground">{student.year}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">₹{student.totalFees.toLocaleString()}</p>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">₹{student.paidFees.toLocaleString()}</p>
                        <Progress value={(student.paidFees / student.totalFees) * 100} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-warning">₹{student.pendingFees.toLocaleString()}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(student.status)}>
                        {student.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <CreditCard className="w-4 h-4" />
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
      </div>
    </DashboardLayout>
  );
}