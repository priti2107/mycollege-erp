import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Book, Search, Filter, Eye, Download, Plus, BookOpen, Clock } from "lucide-react";
import { useApiQuery, useApiMutation } from "@/hooks/useApiQuery";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// Mock library data
const mockBooks = [
  {
    id: "BK001",
    title: "Introduction to Algorithms",
    author: "Thomas H. Cormen",
    isbn: "978-0262033848",
    category: "Computer Science",
    totalCopies: 5,
    availableCopies: 2,
    issuedCopies: 3,
    publisher: "MIT Press",
    publicationYear: "2009",
    status: "Available"
  },
  {
    id: "BK002",
    title: "Clean Code",
    author: "Robert C. Martin",
    isbn: "978-0132350884",
    category: "Programming",
    totalCopies: 3,
    availableCopies: 0,
    issuedCopies: 3,
    publisher: "Prentice Hall",
    publicationYear: "2008",
    status: "Out of Stock"
  },
  {
    id: "BK003",
    title: "Linear Algebra and Its Applications",
    author: "Gilbert Strang",
    isbn: "978-0030105678",
    category: "Mathematics",
    totalCopies: 4,
    availableCopies: 1,
    issuedCopies: 3,
    publisher: "Brooks Cole",
    publicationYear: "2016",
    status: "Available"
  },
];

const mockIssuedBooks = [
  {
    id: "IS001",
    studentName: "Alice Johnson",
    rollNo: "2023001",
    bookTitle: "Introduction to Algorithms",
    bookId: "BK001",
    issueDate: "2024-01-10",
    dueDate: "2024-01-24",
    status: "Active",
    fine: 0
  },
  {
    id: "IS002",
    studentName: "Bob Smith",
    rollNo: "2023002",
    bookTitle: "Clean Code",
    bookId: "BK002",
    issueDate: "2024-01-05",
    dueDate: "2024-01-19",
    status: "Overdue",
    fine: 50
  },
];

export default function Library() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isAddBookDialogOpen, setIsAddBookDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("books");
  const [isRequestBookDialogOpen, setIsRequestBookDialogOpen] = useState(false);
  const [selectedBookForRequest, setSelectedBookForRequest] = useState<any>(null);
  const [requestPurpose, setRequestPurpose] = useState("");
  const [requestRequiredDate, setRequestRequiredDate] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isViewRequestDialogOpen, setIsViewRequestDialogOpen] = useState(false);
  const [newBook, setNewBook] = useState({
    title: "",
    author: "",
    isbn: "",
    category: "",
    totalCopies: ""
  });

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/");
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  // Fetch library data from API
  const { data: libraryData, isLoading, error, refetch } = useApiQuery(
    '/library/catalog',
    ['library'],
    { enabled: !!user }
  );

  // Fetch departments for category dropdown
  const { data: departmentsData } = useApiQuery(
    '/admin/departments',
    ['departments'],
    { enabled: !!user }
  );

  // Book creation mutation
  const createBookMutation = useApiMutation('/admin/library/books', 'POST');
  
  // Book request mutation
  const requestBookMutation = useApiMutation('/library/requests', 'POST');

  // Fetch book requests for admin
  const { data: requestsData, isLoading: requestsLoading, refetch: refetchRequests } = useApiQuery(
    '/library/requests',
    ['bookRequests'],
    { enabled: !!user && user.role === 'admin' }
  );
  
  // Fetch issued books for admin
  const { data: issuedBooksData, isLoading: issuedBooksLoading, refetch: refetchIssuedBooks } = useApiQuery(
    '/library/issues',
    ['issuedBooks'],
    { enabled: !!user && user.role === 'admin' }
  );
  
  // Update request status mutation
  const updateRequestMutation = useApiMutation('/library/requests', 'PUT');

  const books = libraryData || []; // Backend returns array directly
  const issuedBooks = issuedBooksData || []; // Fetched from /library/issues
  const allRequests = requestsData || [];
  
  // Filter requests - only show pending/approved in Book Requests tab
  // Issued requests should appear in Issued Books tab
  const bookRequests = allRequests.filter((req: any) => 
    req.status === 'pending' || req.status === 'approved'
  );
  
  const departments = departmentsData?.departments || [];

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleAddBook = async () => {
    if (!newBook.title || !newBook.author || !newBook.totalCopies) {
      toast({
        title: "Please fill all required fields",
        description: "Title, author, and total copies are required",
        variant: "destructive",
      });
      return;
    }

    try {
      await createBookMutation.mutateAsync({
        title: newBook.title,
        author: newBook.author,
        isbn: newBook.isbn,
        category: newBook.category,
        totalCopies: parseInt(newBook.totalCopies)
      });

      toast({
        title: "Book added successfully",
      });
      setIsAddBookDialogOpen(false);
      setNewBook({
        title: "",
        author: "",
        isbn: "",
        category: "",
        totalCopies: ""
      });
      refetch();
    } catch (error) {
      toast({
        title: "Failed to add book",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRequestBook = (book: any) => {
    setSelectedBookForRequest(book);
    setIsRequestBookDialogOpen(true);
  };

  const handleSubmitRequest = async () => {
    if (!selectedBookForRequest) return;

    try {
      await requestBookMutation.mutateAsync({
        book_id: selectedBookForRequest.id,
        required_date: requestRequiredDate || undefined,
        purpose: requestPurpose || undefined
      });

      toast({
        title: "Book requested successfully!",
        description: "Your request has been submitted for admin approval.",
      });

      setIsRequestBookDialogOpen(false);
      setSelectedBookForRequest(null);
      setRequestPurpose("");
      setRequestRequiredDate("");
    } catch (error: any) {
      toast({
        title: "Failed to request book",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      await updateRequestMutation.mutateAsync({
        url: `/library/requests/${requestId}`,
        data: { status: newStatus }
      });

      toast({
        title: `Request ${newStatus}!`,
        description: `The book request has been ${newStatus}.`,
      });

      // Refresh both requests and issued books lists
      refetchRequests();
      if (newStatus === 'issued') {
        refetchIssuedBooks();
        refetch(); // Also refresh books to update available_copies
      }
      setIsViewRequestDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Failed to update request",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleViewRequest = (request: any) => {
    setSelectedRequest(request);
    setIsViewRequestDialogOpen(true);
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (book.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || book.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Database returns snake_case, so use total_copies and available_copies
  const totalBooks = books.reduce((sum, book) => sum + (book.total_copies || 0), 0);
  const availableBooks = books.reduce((sum, book) => sum + (book.available_copies || 0), 0);
  const issuedBooksCount = totalBooks - availableBooks;
  const overdueBooks = 0; // TODO: Fetch from book_issues table

  if (!user) return null;

  if (isLoading) {
    return (
      <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <p>Loading library data...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <p>Error fetching library data: {error.message}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={user.role} user={user} onLogout={handleLogout}>
      <div className="space-y-6 erp-animate-enter">
        {/* Request Book Dialog */}
        <Dialog open={isRequestBookDialogOpen} onOpenChange={setIsRequestBookDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request Book</DialogTitle>
              <DialogDescription>
                Submit a request to borrow this book
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Book Title</Label>
                <p className="text-sm font-medium">{selectedBookForRequest?.title}</p>
                <p className="text-xs text-muted-foreground">
                  by {selectedBookForRequest?.author}
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="purpose">Purpose (Optional)</Label>
                <Textarea
                  id="purpose"
                  placeholder="Why do you need this book?"
                  value={requestPurpose}
                  onChange={(e) => setRequestPurpose(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="requiredDate">Required By (Optional)</Label>
                <Input
                  id="requiredDate"
                  type="date"
                  value={requestRequiredDate}
                  onChange={(e) => setRequestRequiredDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setIsRequestBookDialogOpen(false);
                  setSelectedBookForRequest(null);
                  setRequestPurpose("");
                  setRequestRequiredDate("");
                }}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 erp-gradient-bg"
                onClick={handleSubmitRequest}
                disabled={!selectedBookForRequest}
              >
                Submit Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Library</h1>
            <p className="text-muted-foreground">Manage books, issues, and library resources</p>
          </div>
          <div className="flex gap-2">
            {/* <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button> */}
            {user.role === 'admin' && (
              <Dialog open={isAddBookDialogOpen} onOpenChange={setIsAddBookDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="erp-gradient-bg">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Book
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Book</DialogTitle>
                    <DialogDescription>
                      Enter the book details below.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Book Title</Label>
                      <Input 
                        id="title" 
                        placeholder="Enter book title"
                        value={newBook.title}
                        onChange={(e) => setNewBook({...newBook, title: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="author">Author</Label>
                      <Input 
                        id="author" 
                        placeholder="Enter author name"
                        value={newBook.author}
                        onChange={(e) => setNewBook({...newBook, author: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="isbn">ISBN</Label>
                      <Input 
                        id="isbn" 
                        placeholder="Enter ISBN"
                        value={newBook.isbn}
                        onChange={(e) => setNewBook({...newBook, isbn: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={newBook.category} onValueChange={(value) => setNewBook({...newBook, category: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept: any) => (
                            <SelectItem key={dept.id} value={dept.name}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="copies">Number of Copies</Label>
                      <Input 
                        id="copies" 
                        type="number" 
                        placeholder="Enter number of copies"
                        value={newBook.totalCopies}
                        onChange={(e) => setNewBook({...newBook, totalCopies: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setIsAddBookDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button className="flex-1 erp-gradient-bg" onClick={handleAddBook}>
                      Add Book
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="erp-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Book className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalBooks}</p>
                  <p className="text-sm text-muted-foreground">Total Books</p>
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
                  <p className="text-2xl font-bold">{availableBooks}</p>
                  <p className="text-sm text-muted-foreground">Available</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="erp-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{issuedBooksCount}</p>
                  <p className="text-sm text-muted-foreground">Issued</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="erp-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overdueBooks}</p>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button 
            variant={activeTab === "books" ? "default" : "outline"}
            onClick={() => setActiveTab("books")}
          >
            Books Catalog
          </Button>
          {user.role === 'admin' && (
            <Button 
              variant={activeTab === "requests" ? "default" : "outline"}
              onClick={() => setActiveTab("requests")}
            >
              <Clock className="w-4 h-4 mr-2" />
              Book Requests ({bookRequests.length})
            </Button>
          )}
          <Button 
            variant={activeTab === "issued" ? "default" : "outline"}
            onClick={() => setActiveTab("issued")}
          >
            Issued Books
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="erp-card">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search books..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {departments.map((dept: any) => (
                    <SelectItem key={dept.id} value={dept.name}>
                      {dept.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="Programming">Programming</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Books Table */}
        {activeTab === "books" && (
          <Card className="erp-card">
            <CardHeader>
              <CardTitle>Books Catalog ({filteredBooks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book Details</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>ISBN</TableHead>
                    <TableHead>Copies</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBooks.map((book) => (
                    <TableRow key={book.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{book.title}</p>
                          <p className="text-sm text-muted-foreground">{book.publisher}, {book.publicationYear}</p>
                        </div>
                      </TableCell>
                      <TableCell>{book.author}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{book.category}</Badge>
                      </TableCell>
                      <TableCell className="font-mono">{book.isbn}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>Available: <span className="font-medium">{book.available_copies || 0}</span></p>
                          <p>Total: <span className="font-medium">{book.total_copies || 0}</span></p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={(book.available_copies || 0) > 0 ? 'default' : 'destructive'}>
                          {(book.available_copies || 0) > 0 ? 'Available' : 'Out of Stock'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" title="View Details">
                            <Eye className="w-4 h-4" />
                          </Button>
                          {(user.role === 'student' || user.role === 'faculty') && (book.available_copies || 0) > 0 && (
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => handleRequestBook(book)}
                              title="Request this book"
                            >
                              <BookOpen className="w-4 h-4 mr-1" />
                              Request
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Book Requests Table */}
        {activeTab === "requests" && user.role === 'admin' && (
          <>
            {/* View Request Dialog */}
            <Dialog open={isViewRequestDialogOpen} onOpenChange={setIsViewRequestDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Book Request Details</DialogTitle>
                  <DialogDescription>
                    Review and manage this book request
                  </DialogDescription>
                </DialogHeader>
                {selectedRequest && (
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Book Title</Label>
                        <p className="font-medium">{selectedRequest.book?.title || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Author</Label>
                        <p className="font-medium">{selectedRequest.book?.author || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Requester</Label>
                        <p className="font-medium">
                          {selectedRequest.requester?.first_name} {selectedRequest.requester?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{selectedRequest.requester?.email}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Requester Type</Label>
                        <Badge variant="outline" className="mt-1">
                          {selectedRequest.requester_type}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Request Date</Label>
                        <p>{new Date(selectedRequest.request_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Required By</Label>
                        <p>{selectedRequest.required_date ? new Date(selectedRequest.required_date).toLocaleDateString() : 'Not specified'}</p>
                      </div>
                    </div>
                    {selectedRequest.purpose && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Purpose</Label>
                        <p className="text-sm mt-1">{selectedRequest.purpose}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <Badge 
                        variant={
                          selectedRequest.status === 'pending' ? 'secondary' :
                          selectedRequest.status === 'approved' ? 'default' :
                          selectedRequest.status === 'issued' ? 'default' :
                          'destructive'
                        }
                        className="mt-1"
                      >
                        {selectedRequest.status}
                      </Badge>
                    </div>
                  </div>
                )}
                {selectedRequest?.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleUpdateRequestStatus(selectedRequest.id, 'rejected')}
                    >
                      Reject Request
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleUpdateRequestStatus(selectedRequest.id, 'approved')}
                    >
                      Approve Request
                    </Button>
                    <Button 
                      className="flex-1 erp-gradient-bg"
                      onClick={() => handleUpdateRequestStatus(selectedRequest.id, 'issued')}
                    >
                      Issue Book Now
                    </Button>
                  </div>
                )}
                {selectedRequest?.status === 'approved' && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setIsViewRequestDialogOpen(false)}
                    >
                      Close
                    </Button>
                    <Button 
                      className="flex-1 erp-gradient-bg"
                      onClick={() => handleUpdateRequestStatus(selectedRequest.id, 'issued')}
                    >
                      Issue Book Now
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <Card className="erp-card">
              <CardHeader>
                <CardTitle>Book Requests ({bookRequests.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <p className="text-center py-4">Loading requests...</p>
                ) : bookRequests.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">No book requests found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Requester</TableHead>
                        <TableHead>Book</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Request Date</TableHead>
                        <TableHead>Required By</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookRequests.map((request: any) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {request.requester?.first_name} {request.requester?.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {request.requester?.email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{request.book?.title || 'N/A'}</p>
                              <p className="text-xs text-muted-foreground">
                                {request.book?.author || 'N/A'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{request.requester_type}</Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(request.request_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {request.required_date 
                              ? new Date(request.required_date).toLocaleDateString()
                              : '-'
                            }
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                request.status === 'pending' ? 'secondary' :
                                request.status === 'approved' ? 'default' :
                                request.status === 'issued' ? 'default' :
                                'destructive'
                              }
                            >
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleViewRequest(request)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              {request.status === 'pending' && (
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => handleUpdateRequestStatus(request.id, 'issued')}
                                >
                                  Issue
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Issued Books Table */}
        {activeTab === "issued" && (
          <Card className="erp-card">
            <CardHeader>
              <CardTitle>Issued Books ({issuedBooks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {issuedBooksLoading ? (
                <p className="text-center py-4">Loading issued books...</p>
              ) : issuedBooks.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No issued books found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Borrower</TableHead>
                      <TableHead>Book</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fine</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issuedBooks.map((issue: any) => (
                      <TableRow key={issue.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {issue.user?.first_name} {issue.user?.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {issue.user?.email}
                            </p>
                            {issue.user?.student_profile?.roll_number && (
                              <p className="text-xs text-muted-foreground">
                                Roll: {issue.user.student_profile.roll_number}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{issue.book?.title || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">
                              {issue.book?.author || 'N/A'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {issue.issue_date ? new Date(issue.issue_date).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {issue.due_date ? new Date(issue.due_date).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              issue.status === 'Active' ? 'default' : 
                              issue.status === 'Overdue' || issue.is_overdue ? 'destructive' : 
                              'secondary'
                            }
                          >
                            {issue.is_overdue ? 'Overdue' : issue.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(issue.fine_amount || 0) > 0 ? (
                            <span className="text-destructive font-medium">
                              ₹{issue.fine_amount}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">₹0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {issue.status !== 'Returned' && (
                              <>
                                <Button variant="ghost" size="sm">
                                  Return
                                </Button>
                                {issue.status === 'Active' && !issue.is_overdue && (
                                  <Button variant="ghost" size="sm">
                                    Renew
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}