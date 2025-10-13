import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Book, Search, Filter, Eye, Download, Plus, BookOpen, Clock } from "lucide-react";
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
    '/admin/library/catalog',
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

  const books = libraryData || []; // Backend returns array directly
  const issuedBooks = []; // This needs a separate endpoint or should be included in the library response
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

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || book.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const totalBooks = books.reduce((sum, book) => sum + book.totalCopies, 0);
  const availableBooks = books.reduce((sum, book) => sum + book.availableCopies, 0);
  const issuedBooksCount = issuedBooks.length;
  const overdueBooks = issuedBooks.filter(book => book.status === 'Overdue').length;

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
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Library</h1>
            <p className="text-muted-foreground">Manage books, issues, and library resources</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
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
                          <p>Available: <span className="font-medium">{book.availableCopies}</span></p>
                          <p>Total: <span className="font-medium">{book.totalCopies}</span></p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={book.status === 'Available' ? 'default' : 'destructive'}>
                          {book.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          {user.role === 'student' && book.availableCopies > 0 && (
                            <Button variant="ghost" size="sm">
                              Issue
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

        {/* Issued Books Table */}
        {activeTab === "issued" && (
          <Card className="erp-card">
            <CardHeader>
              <CardTitle>Issued Books ({issuedBooks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Book</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fine</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issuedBooks.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{issue.studentName}</p>
                          <p className="text-sm text-muted-foreground">{issue.rollNo}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{issue.bookTitle}</p>
                      </TableCell>
                      <TableCell>{issue.issueDate}</TableCell>
                      <TableCell>{issue.dueDate}</TableCell>
                      <TableCell>
                        <Badge variant={issue.status === 'Active' ? 'default' : 'destructive'}>
                          {issue.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {issue.fine > 0 ? (
                          <span className="text-destructive font-medium">₹{issue.fine}</span>
                        ) : (
                          <span className="text-muted-foreground">₹0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            Return
                          </Button>
                          <Button variant="ghost" size="sm">
                            Renew
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}