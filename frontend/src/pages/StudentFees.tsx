import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Search, User, Calendar, Download, AlertCircle, CheckCircle } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";

export default function StudentFees() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("current");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/");
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  // Fetch current fee structure
  const { data: currentFees, isLoading: isCurrentLoading, error: currentError } = useApiQuery(
    '/student/fees/current',
    ['student-fees-current'],
    { enabled: !!user }
  );

  // Fetch payment history
  const { data: paymentHistory, isLoading: isHistoryLoading, error: historyError } = useApiQuery(
    '/student/fees/history',
    ['student-fees-history'],
    { enabled: !!user }
  );

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/");
  };

  // Use API data
  const feeStructure = currentFees || [];
  const payments = paymentHistory || [];

  const filteredFees = feeStructure.filter((fee: any) => {
    const matchesSearch = fee.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || fee.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const filteredPayments = payments.filter((payment: any) => {
    const matchesSearch = payment.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.receiptNo.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "paid":
      case "completed": return "default";
      case "pending": return "secondary";
      case "overdue": return "destructive";
      default: return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "pending": return <AlertCircle className="h-4 w-4" />;
      case "overdue": return <AlertCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  // Recalculate fee totals from fetched data
  const totalFees = feeStructure.reduce((sum: number, fee: any) => sum + fee.amount, 0);
  const paidFees = feeStructure.filter((fee: any) => fee.status === "paid").reduce((sum: number, fee: any) => sum + fee.amount, 0);
  const pendingFees = feeStructure.filter((fee: any) => fee.status === "pending").reduce((sum: number, fee: any) => sum + fee.amount, 0);

  if (!user) return null;

  if (isCurrentLoading || isHistoryLoading) {
    return (
      <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <p>Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (currentError || historyError) {
    return (
      <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <p>Error fetching data: {(currentError || historyError)?.message}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Fee Management</h1>
            <p className="text-muted-foreground mt-2">View and manage your fee payments</p>
          </div>
          <Badge variant="secondary" className="px-3 py-1">
            <User className="h-4 w-4 mr-1" />
            Student View
          </Badge>
        </div>

        {/* Fee Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">₹{totalFees.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-2">Academic Year 2023-24</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₹{paidFees.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {Math.round((paidFees / totalFees) * 100)}% completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">₹{pendingFees.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-2">Due this term</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
          <Button
            variant={activeTab === "current" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("current")}
          >
            Current Fees
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("history")}
          >
            Payment History
          </Button>
        </div>

        {/* Current Fees Tab */}
        {activeTab === "current" && (
          <Card>
            <CardHeader>
              <CardTitle>Fee Structure - Academic Year 2023-24</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search fee categories..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full md:w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fee Structure */}
              <div className="space-y-4">
                {filteredFees.map((fee: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(fee.status)}
                      <div>
                        <h3 className="font-medium">{fee.category}</h3>
                        <p className="text-sm text-muted-foreground">
                          Due: {fee.dueDate}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-lg font-semibold">₹{fee.amount.toLocaleString()}</span>
                      <Badge variant={getStatusBadgeVariant(fee.status)}>
                        {fee.status}
                      </Badge>
                      {fee.status === "pending" && (
                        <Button size="sm">
                          <CreditCard className="h-4 w-4 mr-1" />
                          Pay Now
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {filteredFees.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No fee records found.</p>
                </div>
              )}

              {/* Pending Fees Summary */}
              {pendingFees > 0 && (
                <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-orange-800">Pending Payment</h3>
                      <p className="text-sm text-orange-600">
                        Total pending amount: ₹{pendingFees.toLocaleString()}
                      </p>
                    </div>
                    <Button className="bg-orange-600 hover:bg-orange-700">
                      <CreditCard className="h-4 w-4 mr-1" />
                      Pay All Pending
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment History Tab */}
        {activeTab === "history" && (
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search payments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Payment Records */}
              <div className="space-y-4">
                {filteredPayments.map((payment: any) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <h3 className="font-medium">{payment.category}</h3>
                        <p className="text-sm text-muted-foreground">
                          {payment.date} • {payment.method} • Receipt: {payment.receiptNo}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-lg font-semibold">₹{payment.amount.toLocaleString()}</span>
                      <Badge variant="default">Completed</Badge>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Receipt
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {filteredPayments.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No payment history found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}