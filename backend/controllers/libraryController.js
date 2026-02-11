import { supabaseAdmin } from '../config/supabaseAdmin.js';

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ====================================================================
// LIBRARY CATALOG
// ====================================================================

// @desc    Get all available books in library catalog
// @route   GET /api/library/catalog
// @access  Private (All roles)
export const getLibraryCatalog = asyncHandler(async (req, res) => {
    const { search, available_only } = req.query;

    let query = supabaseAdmin
        .from('books')
        .select('*')
        .order('title', { ascending: true });

    if (search) {
        query = query.or(`title.ilike.%${search}%,isbn.ilike.%${search}%`);
    }

    if (available_only === 'true') {
        query = query.gt('available_copies', 0);
    }

    const { data: books, error } = await query;

    if (error) {
        console.error('Database fetch error (library catalog):', error);
        return res.status(500).json({ message: 'Failed to retrieve library catalog.' });
    }

    res.json(books || []);
});

// @desc    Get book details by ID
// @route   GET /api/library/books/:bookId
// @access  Private (All roles)
export const getBookDetails = asyncHandler(async (req, res) => {
    const { bookId } = req.params;

    const { data: book, error } = await supabaseAdmin
        .from('books')
        .select(`
            *,
            current_issues:book_issues!book_id(
                id,
                student:student_profiles!student_id(
                    user:users!user_id(
                        first_name,
                        last_name,
                        email
                    )
                ),
                issue_date,
                due_date,
                status
            )
        `)
        .eq('id', bookId)
        .single();

    if (error || !book) {
        console.error('Database fetch error (book details):', error);
        return res.status(404).json({ message: 'Book not found.' });
    }

    // Filter only active issues
    book.active_issues = book.current_issues.filter(issue => issue.status === 'Active');
    delete book.current_issues;

    res.json(book);
});

// ====================================================================
// BOOK REQUESTS (Faculty & Students)
// ====================================================================

// @desc    Create a book request
// @route   POST /api/library/requests
// @access  Private (Faculty & Students)
export const createBookRequest = asyncHandler(async (req, res) => {
    const { book_id, required_date, purpose } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role_id;

    // Validate required fields
    if (!book_id) {
        return res.status(400).json({ message: 'Book ID is required' });
    }

    // Determine requester type
    let requester_type;
    if (userRole === 2) {
        requester_type = 'faculty';
    } else if (userRole === 3) {
        requester_type = 'student';
    } else {
        return res.status(403).json({ message: 'Only faculty and students can request books' });
    }

    // Check if book exists
    const { data: book, error: bookError } = await supabaseAdmin
        .from('books')
        .select('id, title, available_copies')
        .eq('id', book_id)
        .single();

    if (bookError || !book) {
        return res.status(404).json({ message: 'Book not found' });
    }

    // Check for existing pending request
    const { data: existingRequest } = await supabaseAdmin
        .from('book_requests')
        .select('id')
        .eq('book_id', book_id)
        .eq('requester_id', userId)
        .in('status', ['pending', 'approved'])
        .maybeSingle();

    if (existingRequest) {
        return res.status(400).json({ 
            message: 'You already have a pending or approved request for this book' 
        });
    }

    // Create book request
    const { data: request, error } = await supabaseAdmin
        .from('book_requests')
        .insert({
            book_id,
            requester_id: userId,
            requester_type,
            required_date,
            purpose: purpose || 'General reading',
            status: 'pending'
        })
        .select(`
            *,
            book:books(title, isbn),
            requester:users!requester_id(first_name, last_name, email)
        `)
        .single();

    if (error) {
        console.error('Database insert error (book request):', error);
        return res.status(500).json({ message: 'Failed to create book request' });
    }

    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
        actor_id: userId,
        action_type: 'CREATE_BOOK_REQUEST',
        table_affected: 'book_requests',
        record_id_affected: request.id,
        details: { book_id, book_title: book.title }
    });

    res.status(201).json({
        message: 'Book request created successfully',
        request
    });
});

// @desc    Get user's book requests
// @route   GET /api/library/requests/my
// @access  Private (Faculty & Students)
export const getMyBookRequests = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const { data: requests, error } = await supabaseAdmin
        .from('book_requests')
        .select(`
            *,
            book:books(id, title, isbn, available_copies),
            approved_by_user:users!approved_by(first_name, last_name)
        `)
        .eq('requester_id', userId)
        .order('request_date', { ascending: false });

    if (error) {
        console.error('Database fetch error (my book requests):', error);
        return res.status(500).json({ message: 'Failed to retrieve book requests' });
    }

    res.json(requests || []);
});

// @desc    Get all book requests (Admin only)
// @route   GET /api/library/requests
// @access  Private (Admin only)
export const getAllBookRequests = asyncHandler(async (req, res) => {
    const { status } = req.query;

    let query = supabaseAdmin
        .from('book_requests')
        .select(`
            *,
            book:books(id, title, isbn, available_copies),
            requester:users!requester_id(
                id,
                first_name,
                last_name,
                email,
                role:roles(name)
            ),
            approved_by_user:users!approved_by(first_name, last_name)
        `)
        .order('request_date', { ascending: false });

    if (status) {
        query = query.eq('status', status);
    }

    const { data: requests, error } = await query;

    if (error) {
        console.error('Database fetch error (all book requests):', error);
        return res.status(500).json({ message: 'Failed to retrieve book requests' });
    }

    res.json(requests || []);
});

// @desc    Update book request status (Admin)
// @route   PATCH /api/library/requests/:requestId
// @access  Private (Admin only)
export const updateBookRequestStatus = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const { status, notes } = req.body;
    const adminId = req.user.id;

    // Validate status
    const validStatuses = ['approved', 'rejected', 'issued', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
    }

    // Get request details with book info
    const { data: request, error: fetchError } = await supabaseAdmin
        .from('book_requests')
        .select('*, book:books(id, title, available_copies)')
        .eq('id', requestId)
        .single();

    if (fetchError || !request) {
        return res.status(404).json({ message: 'Book request not found' });
    }

    // If issuing book, check availability
    if (status === 'issued') {
        if (request.book.available_copies <= 0) {
            return res.status(400).json({ 
                message: 'Book is not available for issue. No copies available.' 
            });
        }

        // Get default loan period from settings (fallback to 14 if settings table doesn't exist)
        let loanPeriodDays = 14;
        try {
            const { data: loanPeriodSetting } = await supabaseAdmin
                .from('library_settings')
                .select('setting_value')
                .eq('setting_key', 'default_loan_period_days')
                .single();
            loanPeriodDays = parseInt(loanPeriodSetting?.setting_value || '14');
        } catch (error) {
            // Settings table might not exist yet, use default
            console.log('Using default loan period (settings table not found)');
        }

        // Use user_id directly for book_issues.student_id
        // Note: After running fix_book_issues_fkey.sql migration, 
        // student_id references users table (supports both students and faculty)
        const borrowerId = request.requester_id;

        // Create book issue record
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + loanPeriodDays);

        const { data: bookIssue, error: issueError } = await supabaseAdmin
            .from('book_issues')
            .insert({
                book_id: request.book_id,
                student_id: borrowerId,
                issue_date: new Date().toISOString(),
                due_date: dueDate.toISOString(),
                status: 'Active',
                issued_by: adminId
            })
            .select()
            .single();

        if (issueError) {
            console.error('Database insert error (book issue):', issueError);
            return res.status(500).json({ message: 'Failed to issue book' });
        }

        // Decrease available copies
        const { error: updateBookError } = await supabaseAdmin
            .from('books')
            .update({ 
                available_copies: request.book.available_copies - 1,
                updated_at: new Date().toISOString()
            })
            .eq('id', request.book_id);

        if (updateBookError) {
            console.error('Database update error (decrease book copies):', updateBookError);
            // Rollback: delete the book issue
            await supabaseAdmin.from('book_issues').delete().eq('id', bookIssue.id);
            return res.status(500).json({ message: 'Failed to update book availability' });
        }

        // Log book issue audit
        await supabaseAdmin.from('audit_logs').insert({
            actor_id: adminId,
            action_type: 'ISSUE_BOOK',
            table_affected: 'book_issues',
            record_id_affected: bookIssue.id,
            details: { 
                book_id: request.book_id, 
                book_title: request.book.title,
                requester_id: request.requester_id,
                due_date: dueDate.toISOString()
            }
        });
    }

    // Update request status
    const updateData = {
        status,
        notes,
        updated_at: new Date().toISOString()
    };

    if (status === 'approved' || status === 'rejected' || status === 'issued') {
        updateData.approved_by = adminId;
        updateData.approval_date = new Date().toISOString();
    }

    const { data: updated, error } = await supabaseAdmin
        .from('book_requests')
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single();

    if (error) {
        console.error('Database update error (book request):', error);
        return res.status(500).json({ message: 'Failed to update book request' });
    }

    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
        actor_id: adminId,
        action_type: 'UPDATE_BOOK_REQUEST',
        table_affected: 'book_requests',
        record_id_affected: requestId,
        details: { status, book_title: request.book.title }
    });

    res.json({
        message: `Book request ${status} successfully${status === 'issued' ? '. Book has been issued and available copies decreased.' : ''}`,
        request: updated
    });
});

// @desc    Cancel own book request
// @route   DELETE /api/library/requests/:requestId
// @access  Private (Faculty & Students - own requests only)
export const cancelBookRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const { data: request, error: fetchError } = await supabaseAdmin
        .from('book_requests')
        .select('requester_id, status')
        .eq('id', requestId)
        .single();

    if (fetchError || !request) {
        return res.status(404).json({ message: 'Book request not found' });
    }

    if (request.requester_id !== userId && req.user.role_id !== 1) {
        return res.status(403).json({ message: 'You can only cancel your own requests' });
    }

    if (request.status === 'issued') {
        return res.status(400).json({ message: 'Cannot cancel a request that has been issued' });
    }

    // Update status to cancelled
    const { error } = await supabaseAdmin
        .from('book_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', requestId);

    if (error) {
        console.error('Database update error (cancel request):', error);
        return res.status(500).json({ message: 'Failed to cancel book request' });
    }

    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
        actor_id: userId,
        action_type: 'CANCEL_BOOK_REQUEST',
        table_affected: 'book_requests',
        record_id_affected: requestId
    });

    res.json({ message: 'Book request cancelled successfully' });
});

// ====================================================================
// BOOK ISSUES (For Students)
// ====================================================================

// @desc    Get issued books for current user
// @route   GET /api/library/my-books
// @access  Private (Students)
export const getMyIssuedBooks = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Get student profile ID
    const { data: profile } = await supabaseAdmin
        .from('student_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .single();

    if (!profile) {
        return res.status(404).json({ message: 'Student profile not found' });
    }

    const { data: issues, error } = await supabaseAdmin
        .from('book_issues')
        .select(`
            *,
            book:books(id, title, isbn)
        `)
        .eq('student_id', profile.user_id)
        .order('issue_date', { ascending: false });

    if (error) {
        console.error('Database fetch error (my issued books):', error);
        return res.status(500).json({ message: 'Failed to retrieve issued books' });
    }

    res.json(issues || []);
});

// @desc    Get all issued books (Admin only)
// @route   GET /api/library/issues
// @access  Private (Admin only)
export const getAllIssuedBooks = asyncHandler(async (req, res) => {
    const { status } = req.query;

    let query = supabaseAdmin
        .from('book_issues')
        .select(`
            *,
            book:books(id, title, isbn, author),
            user:users!student_id(
                id,
                first_name,
                last_name,
                email
            ),
            issued_by_user:users!issued_by(first_name, last_name)
        `)
        .order('issue_date', { ascending: false });

    if (status) {
        query = query.eq('status', status);
    }

    const { data: issues, error } = await query;

    if (error) {
        console.error('Database fetch error (all issued books):', error);
        return res.status(500).json({ message: 'Failed to retrieve issued books' });
    }

    // Calculate overdue books
    const now = new Date();
    const issuesWithOverdue = issues?.map(issue => {
        const dueDate = new Date(issue.due_date);
        const isOverdue = dueDate < now && issue.status === 'Active';
        
        return {
            ...issue,
            is_overdue: isOverdue,
            days_overdue: isOverdue ? Math.floor((now - dueDate) / (1000 * 60 * 60 * 24)) : 0
        };
    }) || [];

    res.json(issuesWithOverdue);
});

// @desc    Return a book
// @route   POST /api/library/return/:issueId
// @access  Private (All authenticated users)
export const returnBook = asyncHandler(async (req, res) => {
    const { issueId } = req.params;
    const userId = req.user.id;
    const { condition, notes } = req.body;

    // Get issue details
    const { data: issue, error: fetchError } = await supabaseAdmin
        .from('book_issues')
        .select('*, book:books(id, title, available_copies, total_copies)')
        .eq('id', issueId)
        .single();

    if (fetchError || !issue) {
        return res.status(404).json({ message: 'Book issue record not found' });
    }

    // Check if already returned
    if (issue.status === 'Returned') {
        return res.status(400).json({ message: 'This book has already been returned' });
    }

    // Verify ownership (student returning their own book) or admin
    if (issue.student_id !== userId && req.user.role_id !== 1) {
        return res.status(403).json({ message: 'You can only return your own books' });
    }

    // Get fine per day from settings (fallback to 5.00 if settings table doesn't exist)
    let finePerDay = 5.00;
    try {
        const { data: finePerDaySetting } = await supabaseAdmin
            .from('library_settings')
            .select('setting_value')
            .eq('setting_key', 'fine_per_day')
            .single();
        finePerDay = parseFloat(finePerDaySetting?.setting_value || '5.00');
    } catch (error) {
        // Settings table might not exist yet, use default
        console.log('Using default fine per day (settings table not found)');
    }

    // Calculate fine for overdue
    const dueDate = new Date(issue.due_date);
    const returnDate = new Date();
    const daysOverdue = Math.floor((returnDate - dueDate) / (1000 * 60 * 60 * 24));
    const fine = daysOverdue > 0 ? daysOverdue * finePerDay : 0;

    // Update book issue record
    const { error: updateError } = await supabaseAdmin
        .from('book_issues')
        .update({
            status: 'Returned',
            return_date: returnDate.toISOString(),
            fine_amount: fine,
            condition_on_return: condition || 'Good',
            return_notes: notes
        })
        .eq('id', issueId);

    if (updateError) {
        console.error('Database update error (return book):', updateError);
        return res.status(500).json({ message: 'Failed to update book issue record' });
    }

    // Increase available copies
    const { error: bookUpdateError } = await supabaseAdmin
        .from('books')
        .update({
            available_copies: issue.book.available_copies + 1,
            updated_at: new Date().toISOString()
        })
        .eq('id', issue.book_id);

    if (bookUpdateError) {
        console.error('Database update error (increase book copies):', bookUpdateError);
        return res.status(500).json({ message: 'Failed to update book availability' });
    }

    // Update request status if exists
    await supabaseAdmin
        .from('book_requests')
        .update({ status: 'returned', updated_at: new Date().toISOString() })
        .eq('book_id', issue.book_id)
        .eq('requester_id', issue.student_id)
        .eq('status', 'issued');

    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
        actor_id: userId,
        action_type: 'RETURN_BOOK',
        table_affected: 'book_issues',
        record_id_affected: issueId,
        details: {
            book_id: issue.book_id,
            book_title: issue.book.title,
            days_overdue: daysOverdue,
            fine: fine
        }
    });

    res.json({
        message: `Book returned successfully${fine > 0 ? `. Fine of ₹${fine} applies for ${daysOverdue} days overdue.` : '.'}`,
        fine_amount: fine,
        days_overdue: Math.max(0, daysOverdue),
        issue_id: issueId
    });
});

// @desc    Renew a book issue
// @route   POST /api/library/renew/:issueId
// @access  Private (Students)
export const renewBook = asyncHandler(async (req, res) => {
    const { issueId } = req.params;
    const userId = req.user.id;

    // Get issue details
    const { data: issue, error: fetchError } = await supabaseAdmin
        .from('book_issues')
        .select('*, book:books(title)')
        .eq('id', issueId)
        .single();

    if (fetchError || !issue) {
        return res.status(404).json({ message: 'Book issue record not found' });
    }

    // Verify ownership
    if (issue.student_id !== userId) {
        return res.status(403).json({ message: 'You can only renew your own books' });
    }

    // Check if already returned
    if (issue.status === 'Returned') {
        return res.status(400).json({ message: 'This book has already been returned' });
    }

    // Check if overdue
    const dueDate = new Date(issue.due_date);
    const now = new Date();
    if (dueDate < now) {
        return res.status(400).json({ 
            message: 'Cannot renew overdue books. Please return the book and pay the fine.' 
        });
    }

    // Get settings for renewal (fallback to defaults if settings table doesn't exist)
    let maxRenewals = 2;
    let extensionDays = 7;
    try {
        const { data: maxRenewalsSetting } = await supabaseAdmin
            .from('library_settings')
            .select('setting_value')
            .eq('setting_key', 'max_renewals')
            .single();

        const { data: renewalExtensionSetting } = await supabaseAdmin
            .from('library_settings')
            .select('setting_value')
            .eq('setting_key', 'renewal_extension_days')
            .single();

        maxRenewals = parseInt(maxRenewalsSetting?.setting_value || '2');
        extensionDays = parseInt(renewalExtensionSetting?.setting_value || '7');
    } catch (error) {
        // Settings table might not exist yet, use defaults
        console.log('Using default renewal settings (settings table not found)');
    }

    // Check renewal count
    const renewalCount = issue.renewal_count || 0;
    if (renewalCount >= maxRenewals) {
        return res.status(400).json({ 
            message: `Maximum renewal limit (${maxRenewals}) reached` 
        });
    }

    // Extend due date by configured days
    const newDueDate = new Date(dueDate);
    newDueDate.setDate(newDueDate.getDate() + extensionDays);
    newDueDate.setDate(newDueDate.getDate() + 7);

    // Update issue
    const { error: updateError } = await supabaseAdmin
        .from('book_issues')
        .update({
            due_date: newDueDate.toISOString(),
            renewal_count: renewalCount + 1,
            last_renewed_at: new Date().toISOString()
        })
        .eq('id', issueId);

    if (updateError) {
        console.error('Database update error (renew book):', updateError);
        return res.status(500).json({ message: 'Failed to renew book' });
    }

    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
        actor_id: userId,
        action_type: 'RENEW_BOOK',
        table_affected: 'book_issues',
        record_id_affected: issueId,
        details: {
            book_id: issue.book_id,
            book_title: issue.book.title,
            new_due_date: newDueDate.toISOString(),
            renewal_count: renewalCount + 1
        }
    });

    res.json({
        message: 'Book renewed successfully',
        new_due_date: newDueDate.toISOString(),
        renewal_count: renewalCount + 1
    });
});

export default {
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
};
