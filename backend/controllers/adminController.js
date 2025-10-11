// controllers/adminController.js

import { supabase } from '../config/supabaseClient.js';
import { supabaseAdmin } from '../config/supabaseAdmin.js';

// Utility function to wrap controller methods for robust error handling
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const ROLE_IDS = {
    STUDENT: 3, 
    FACULTY: 2,
    ADMIN: 1
};


// 1. DASHBOARD CONTROLLERS
//! @route   GET /api/admin/dashboard/stats 
export const getAdminDashboardStats = asyncHandler(async (req, res) => {
    
    const [
        studentsRes,
        facultyRes,
        feesRes,
        attendanceStatsRes
    ] = await Promise.all([
        supabaseAdmin.from('student_profiles').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('faculty_profiles').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('payments').select('amount_paid'), 
        supabaseAdmin.from('attendance_entries').select('status', { count: 'exact' }),
    ]);

    const totalStudents = studentsRes.count || 0;
    const totalFaculty = facultyRes.count || 0;
    
    // Calculate total fees collected
    const feesCollectedTotal = feesRes.data?.reduce((sum, p) => sum + p.amount_paid, 0) || 0;
    
    // Calculate overall attendance rate dynamically
    const totalAttendanceEntries = attendanceStatsRes.count || 0;
    const totalPresentEntries = attendanceStatsRes.data?.filter(e => e.status === 'present').length || 0;
    
    const overallAttendanceRate = totalAttendanceEntries > 0 
        ? ((totalPresentEntries / totalAttendanceEntries) * 100).toFixed(1) 
        : '0.0';

    res.json({
        totalStudents: totalStudents.toLocaleString(),
        facultyMembers: totalFaculty.toLocaleString(),
        feesCollected: `$${(feesCollectedTotal / 1000).toFixed(1)}K`, 
        attendanceRate: `${overallAttendanceRate}%`,
    });
});


// 2. STUDENT MANAGEMENT CONTROLLERS

//! @route   GET /api/admin/students
export const getAllStudents = asyncHandler(async (req, res) => {
    
    const { data: students, error } = await supabaseAdmin
        .from('student_profiles')
        .select(`
            roll_number,
            academic_year,
            user:users (
                id,
                email,
                first_name,
                last_name,
                is_active
            ),
            course:courses (name),
            latest_gpa:student_gpa_history(cumulative_gpa, calculated_at)
        `)
        // Order the nested GPA array to ensure the latest entry is always first in the inner array
        .order('calculated_at', { foreignTable: 'student_gpa_history', ascending: false }) 
        .order('roll_number');

    if (error) {
        console.error('Database fetch error (students):', error);
        return res.status(500).json({ message: 'Failed to retrieve student list.' });
    }

    const formattedStudents = students.map(s => {
        // Access the first element of the ordered inner array for the latest GPA
        const latestGpaEntry = s.latest_gpa && s.latest_gpa.length > 0 ? s.latest_gpa[0] : null;

        return {
            id: s.user.id,
            name: `${s.user.first_name} ${s.user.last_name}`,
            email: s.user.email,
            rollNo: s.roll_number,
            course: s.course?.name || 'N/A',
            year: `${s.academic_year} Year`,
            status: s.user.is_active ? 'Active' : 'Inactive',
            gpa: latestGpaEntry?.cumulative_gpa || '0.0'
        };
    });

    res.json(formattedStudents);
});

//! @route   POST /api/admin/students 
export const createStudent = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, password, courseId, academicYear, rollNumber } = req.body;
    
    if (!email || !password || !rollNumber) {
        return res.status(400).json({ message: 'Missing required fields for student creation.' });
    }

    // 1. Create user in Supabase Auth
    const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName }
    });

    if (authError) {
        console.error('Supabase Auth Creation Error:', authError);
        return res.status(400).json({ message: 'Failed to create Supabase Auth user.', details: authError.message });
    }
    
    const userId = userData.user.id;

    // 2. Create entries in custom tables
    try {
        await supabaseAdmin.from('users').insert({
            id: userId,
            role_id: ROLE_IDS.STUDENT,
            first_name: firstName,
            last_name: lastName,
            email: email,
            is_active: true
        });

        await supabaseAdmin.from('student_profiles').insert({
            user_id: userId,
            roll_number: rollNumber,
            academic_year: academicYear,
            course_id: courseId
        });

        // 3. Log the action
        await supabaseAdmin.from('audit_logs').insert({
            actor_id: req.user.id,
            action_type: 'CREATE',
            table_affected: 'students',
            record_id_affected: userId
        });

        res.status(201).json({ 
            message: `Student ${firstName} ${lastName} created successfully.`, 
            userId 
        });

    } catch (dbError) {
        // CRITICAL: Rollback Auth user creation if profile insert fails
        await supabaseAdmin.auth.admin.deleteUser(userId);
        console.error('DB Profile Creation Error, Auth user deleted:', dbError);
        res.status(500).json({ message: 'Database failed to create student profile. Auth user disabled.' });
    }
});


// 3. FACULTY MANAGEMENT CONTROLLERS

//! @route   GET /api/admin/faculty
export const getAllFaculty = asyncHandler(async (req, res) => {
    const { data: faculty, error } = await supabaseAdmin
        .from('faculty_profiles')
        .select(`
            user:users (
                id,
                email,
                first_name,
                last_name,
                is_active
            ),
            department:departments (name),
            specialization,
            experience_years,
            subjects:faculty_subjects(subject:subjects(name))
        `)
        .order('last_name', { referencedTable: 'user' });

    if (error) {
        console.error('Database fetch error (faculty):', error);
        return res.status(500).json({ message: 'Failed to retrieve faculty list.' });
    }

    const formattedFaculty = faculty.map(f => ({
        id: f.user.id,
        name: `${f.user.first_name} ${f.user.last_name}`,
        email: f.user.email,
        department: f.department?.name || 'N/A',
        specialization: f.specialization,
        experience: `${f.experience_years} years`,
        status: f.user.is_active ? 'Active' : 'On Leave',
        subjects: f.subjects.map(s => s.subject.name)
    }));

    res.json(formattedFaculty);
});

//! @route   POST /api/admin/faculty 
export const createFaculty = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, password, departmentId, specialization, experienceYears, subjectIds } = req.body;
    
    if (!email || !password || !departmentId) {
        return res.status(400).json({ message: 'Missing required fields for faculty creation.' });
    }

    // 1. Create user in Supabase Auth
    const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName }
    });

    if (authError) {
        console.error('Supabase Auth Creation Error:', authError);
        return res.status(400).json({ message: 'Failed to create Supabase Auth user.', details: authError.message });
    }
    
    const userId = userData.user.id;

    // 2. Create entries in custom tables (users, faculty_profiles, faculty_subjects)
    try {
        await supabaseAdmin.from('users').insert({
            id: userId,
            role_id: ROLE_IDS.FACULTY,
            first_name: firstName,
            last_name: lastName,
            email: email,
            is_active: true
        });

        await supabaseAdmin.from('faculty_profiles').insert({
            user_id: userId,
            department_id: departmentId,
            specialization,
            experience_years: experienceYears
        });
        
        if (subjectIds && subjectIds.length > 0) {
            const subjectLinks = subjectIds.map(subject_id => ({ faculty_id: userId, subject_id }));
            await supabaseAdmin.from('faculty_subjects').insert(subjectLinks);
        }

        // 3. Log the action
        await supabaseAdmin.from('audit_logs').insert({
            actor_id: req.user.id,
            action_type: 'CREATE',
            table_affected: 'faculty',
            record_id_affected: userId
        });

        res.status(201).json({ 
            message: `Faculty member ${firstName} ${lastName} created successfully.`, 
            userId 
        });

    } catch (dbError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        console.error('DB Profile Creation Error, Auth user deleted:', dbError);
        res.status(500).json({ message: 'Database failed to create faculty profile. Auth user disabled.' });
    }
});


// 4. ADMIN OVERSIGHT CONTROLLERS (READ-ONLY)

//! @route   GET /api/admin/attendance
export const getAttendanceSummary = asyncHandler(async (req, res) => {
    
    const { data: attendanceData, error } = await supabaseAdmin
        .from('student_profiles')
        .select(`
            user:users (id, first_name, last_name, email),
            roll_number,
            entries:attendance_entries(status)
        `);

    if (error) {
        console.error('Database fetch error (attendance summary):', error);
        return res.status(500).json({ message: 'Failed to retrieve attendance summary.' });
    }

    const formattedData = attendanceData.map(student => {
        const totalClasses = student.entries.length;
        const attendedClasses = student.entries.filter(e => e.status === 'present').length;
        
        const percentage = totalClasses > 0 ? parseFloat(((attendedClasses / totalClasses) * 100).toFixed(1)) : 0.0;
        
        return {
            id: student.user.id,
            name: `${student.user.first_name} ${student.user.last_name}`,
            rollNo: student.roll_number,
            classes: totalClasses,
            attended: attendedClasses,
            percentage: percentage,
            present: false // 'present' status in the mock is used for 'Today's Status', which is dynamic
        };
    });

    res.json(formattedData);
});


//! @route   GET /api/admin/fees
export const getFeeStatus = asyncHandler(async (req, res) => {
    
    const { data: students, error } = await supabaseAdmin
        .from('student_profiles')
        .select(`
            user:users (id, first_name, last_name, email),
            roll_number,
            course:courses (name),
            fees:fee_dues(id, amount, is_paid, due_date, payments(amount_paid))
        `);

    if (error) {
        console.error('Database fetch error (fee status):', error);
        return res.status(500).json({ message: 'Failed to retrieve fee status.' });
    }

    const formattedData = students.map(student => {
        const totalFees = student.fees.reduce((sum, due) => sum + due.amount, 0);
        let totalPaid = 0;
        let isOverdue = false;
        const today = new Date().toISOString().split('T')[0];

        student.fees.forEach(due => {
            if (due.payments) {
                totalPaid += due.payments.reduce((pSum, p) => pSum + p.amount_paid, 0);
            }
            // Check for overdue status (unpaid and due date passed)
            if (!due.is_paid && due.due_date < today) {
                isOverdue = true;
            }
        });

        const pendingFees = totalFees - totalPaid;
        
        let status = 'Paid';
        if (pendingFees > 0) {
            status = totalPaid > 0 ? 'Partial' : 'Pending';
        }
        if (isOverdue && pendingFees > 0) {
            status = 'Overdue';
        }

        return {
            id: student.user.id,
            name: `${student.user.first_name} ${student.user.last_name}`,
            rollNo: student.roll_number,
            course: student.course?.name || 'N/A',
            totalFees: totalFees,
            paidFees: totalPaid,
            pendingFees: parseFloat(pendingFees.toFixed(2)),
            status: status
        };
    });

    res.json(formattedData);
});


//! @route   GET /api/admin/library/catalog
export const getLibraryCatalog = asyncHandler(async (req, res) => {
    
    const { data: books, error } = await supabaseAdmin
        .from('books')
        .select(`
            id,
            title,
            author,
            isbn,
            category,
            publisher,
            publication_year,
            total_copies,
            issued_copies:book_issues(return_date)
        `);

    if (error) {
        console.error('Database fetch error (library catalog):', error);
        return res.status(500).json({ message: 'Failed to retrieve library catalog.' });
    }
    
    const formattedData = books.map(book => {
        // Count active issues where return_date is NULL
        const activeIssues = book.issued_copies.filter(issue => issue.return_date === null).length;
        const availableCopies = Math.max(0, book.total_copies - activeIssues); 

        return {
            id: book.id,
            title: book.title,
            author: book.author,
            isbn: book.isbn,
            category: book.category,
            totalCopies: book.total_copies,
            availableCopies: availableCopies,
            issuedCopies: activeIssues,
            status: availableCopies > 0 ? 'Available' : 'Out of Stock'
        };
    });

    res.json(formattedData);
});

//! @route   GET /api/admin/results
export const getStudentResults = asyncHandler(async (req, res) => {
    
    const { data: students, error } = await supabaseAdmin
        .from('student_profiles')
        .select(`
            user:users (id, first_name, last_name, email),
            roll_number,
            course:courses (name),
            latest_gpa:student_gpa_history(cumulative_gpa, session:academic_sessions(name)),
            grades:grades(marks_obtained, exam:exams(max_marks))
        `);

    if (error) {
        console.error('Database fetch error (results):', error);
        return res.status(500).json({ message: 'Failed to retrieve student results.' });
    }

    const studentsWithMetrics = students.map(s => {
        const latestGpaEntry = s.latest_gpa && s.latest_gpa.length > 0 ? s.latest_gpa[0] : null;

        // Calculate total marks and percentage from all available grades
        const totalMarksObtained = s.grades.reduce((sum, g) => sum + g.marks_obtained, 0);
        const maxMarksPossible = s.grades.reduce((sum, g) => sum + g.exam.max_marks, 0);
        
        const percentage = maxMarksPossible > 0 
            ? parseFloat(((totalMarksObtained / maxMarksPossible) * 100).toFixed(2)) 
            : 0.0;

        return {
            id: s.user.id,
            name: `${s.user.first_name} ${s.user.last_name}`,
            rollNo: s.roll_number,
            course: s.course?.name || 'N/A',
            semester: latestGpaEntry?.session?.name || 'N/A', 
            totalMarks: totalMarksObtained, 
            maxMarks: maxMarksPossible,
            percentage: percentage,
            cgpa: latestGpaEntry?.cumulative_gpa || 0.0,
            rank: 0 
        };
    });

    // Dynamic Rank Calculation
    studentsWithMetrics.sort((a, b) => {
        if (b.cgpa !== a.cgpa) return b.cgpa - a.cgpa;
        return b.percentage - a.percentage;
    });

    let currentRank = 1;
    studentsWithMetrics.forEach((student, index) => {
        if (index > 0 && studentsWithMetrics[index].cgpa < studentsWithMetrics[index - 1].cgpa) {
            currentRank = index + 1;
        }
        student.rank = currentRank;
    });

    res.json(studentsWithMetrics);
});