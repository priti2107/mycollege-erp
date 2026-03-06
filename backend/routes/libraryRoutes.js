import express from 'express';
import { protect, facultyOrAdmin, adminOnly } from '../middleware/authMiddleware.js';
import {
    getLibraryCatalog,
    getBookDetails,
    createBookRequest,
    getMyBookRequests,
    getAllBookRequests,
    updateBookRequestStatus,
    cancelBookRequest,
    getMyIssuedBooks,
    getAllIssuedBooks,
    returnBook,
    renewBook
} from '../controllers/libraryController.js';

const router = express.Router();

router.use(protect);

// --- Library Catalog (All users) ---
// @route   GET /api/library/catalog
router.get('/catalog', getLibraryCatalog);

// @route   GET /api/library/books/:bookId
router.get('/books/:bookId', getBookDetails);

// --- Book Requests ---
// @route   POST /api/library/requests
router.post('/requests', createBookRequest);

// @route   GET /api/library/requests/my (MUST come before /requests)
router.get('/requests/my', getMyBookRequests);

// @route   DELETE /api/library/requests/:requestId
router.delete('/requests/:requestId', cancelBookRequest);

// @route   PUT /api/library/requests/:requestId (Admin only)
router.put('/requests/:requestId', adminOnly, updateBookRequestStatus);

// @route   GET /api/library/requests (Admin only - MUST come after /requests/my)
router.get('/requests', adminOnly, getAllBookRequests);

// --- Book Issues ---
// @route   GET /api/library/my-books (Student/Faculty - own issued books)
router.get('/my-books', getMyIssuedBooks);

// @route   GET /api/library/issues (Admin - all issued books)
router.get('/issues', adminOnly, getAllIssuedBooks);

// @route   POST /api/library/return/:issueId (Return a book)
router.post('/return/:issueId', returnBook);

// @route   POST /api/library/renew/:issueId (Renew a book)
router.post('/renew/:issueId', renewBook);

export default router;
