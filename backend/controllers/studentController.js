import { supabase } from '../config/supabaseClient.js'; 
import { supabaseAdmin } from '../config/supabaseAdmin.js'; // Import Admin Client

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ====================================================================
// 1. DASHBOARD CONTROLLERS (src/pages/StudentDashboard.tsx)
// ====================================================================

// @route   GET /api/student/dashboard/stats
export const getStudentDashboardStats = asyncHandler(async (req, res) => {
    const studentId = req.user.id;
    
    console.log('📊 Loading dashboard stats for student:', studentId);

    // Fetch user profile with student details (Using Admin client for guaranteed profile read)
    const { data: userProfile, error: profileError } = await supabaseAdmin // **FIXED: Using supabaseAdmin**
        .from('users')
        .select(`
            id, first_name, last_name, email,
            student_profile:student_profiles!user_id(roll_number, academic_year, course_id, course:courses(name, department:departments(name)))
        `)
        .eq('id', studentId)
        .maybeSingle();

    if (profileError) {
        console.error('Error fetching user profile:', profileError);
    }
    
    const studentProfile = userProfile?.student_profile?.[0];

    if (!studentProfile) {
        return res.json({
            name: userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Student',
            email: userProfile?.email || 'No email',
            rollNumber: 'Not assigned',
            class: 'Not enrolled',
            department: 'Not assigned',
            academicYear: 'N/A',
            attendance: { present: 0, total: 0, percentage: 0 },
            attendancePercentage: 0,
            currentGpa: 'N/A',
            feesDue: 0,
            pendingAssignments: 0,
            overallGrade: 'N/A',
            overallPercentage: 0,
            nextClass: { subject: 'Complete enrollment', room: 'Admin Office', time: 'Contact Admin' }
        });
    }

    // Fetch core stats in parallel (Using Admin client for reliable counts/reads)
    const [
        attendanceRes,
        gpaRes,
        feesRes,
        gradesRes,
    ] = await Promise.all([
        // 1. Attendance Rate 
        supabaseAdmin.from('attendance_entries').select('status', { count: 'exact' }).eq('student_id', studentId), // **FIXED**
        // 2. Latest GPA/CGPA 
        supabaseAdmin.from('student_gpa_history').select('cumulative_gpa').eq('student_id', studentId).order('calculated_at', { ascending: false }).limit(1), // **FIXED**
        // 3. Pending Fees Sum
        supabaseAdmin.from('fee_dues').select('amount').eq('student_id', studentId).eq('is_paid', false), // **FIXED**
        // 4. Recent grades for calculating overall percentage
        supabaseAdmin.from('grades').select('marks_obtained, exam:exams(max_marks)').eq('student_id', studentId).limit(20), // **FIXED**
    ]);

    // Calculate attendance
    const totalEntries = attendanceRes.count || 0;
    const presentEntries = attendanceRes.data?.filter(e => e.status === 'present').length || 0;
    const attendancePercentage = totalEntries > 0 ? parseFloat(((presentEntries / totalEntries) * 100).toFixed(1)) : 0.0;
    const attendance = {
        present: presentEntries,
        total: totalEntries,
        percentage: attendancePercentage
    };

    // GPA
    const currentGpa = gpaRes.data?.[0]?.cumulative_gpa || 'N/A';
    
    // Fees
    const feesDue = feesRes.data?.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0) || 0.0;
    
    // Assignments - try to get real data, fallback to 0
    let pendingAssignments = 0;
    try {
        const { count: assignmentCount } = await supabaseAdmin
            .from('assignments')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', studentId)
            .eq('status', 'pending');
        pendingAssignments = assignmentCount || 0;
    } catch (error) {
        console.log('No assignments table or error fetching assignments, defaulting to 0');
        pendingAssignments = 0;
    } 

    // Calculate overall percentage from recent grades
    const validGrades = gradesRes.data?.filter(g => g.exam && g.exam.max_marks) || [];
    
    let overallPercentage = 0.0;
    let overallGrade = 'N/A';

    if (validGrades.length > 0) {
        const totalMaxMarks = validGrades.reduce((sum, g) => sum + (parseFloat(g.exam.max_marks) || 0), 0);
        const obtainedMarks = validGrades.reduce((sum, g) => sum + (parseFloat(g.marks_obtained) || 0), 0);
        
        overallPercentage = totalMaxMarks > 0 ? parseFloat(((obtainedMarks / totalMaxMarks) * 100).toFixed(1)) : 0.0;
        
        // Grade assignment logic
        if (overallPercentage >= 90) overallGrade = 'A+';
        else if (overallPercentage >= 80) overallGrade = 'A';
        else if (overallPercentage >= 70) overallGrade = 'B+';
        else overallGrade = 'C';
    }


    const responseData = {
        // User info 
        name: `${userProfile.first_name} ${userProfile.last_name}`.trim(),
        email: userProfile.email,
        rollNumber: studentProfile.roll_number,
        class: studentProfile.course?.name || 'Not assigned',
        department: studentProfile.course?.department?.name || 'N/A',
        academicYear: studentProfile.academic_year || 'N/A',
        
        // Stats
        attendance,
        attendancePercentage,
        currentGpa,
        feesDue,
        pendingAssignments,
        overallGrade,
        overallPercentage,
        
        nextClass: { 
            subject: totalEntries > 0 ? 'Check Timetable' : 'No classes scheduled', 
            room: totalEntries > 0 ? 'See Schedule' : 'N/A', 
            time: totalEntries > 0 ? 'Check App' : 'N/A' 
        }
    };
    
    console.log('✅ Dashboard data compiled:', { 
        studentId, 
        hasProfile: !!studentProfile, 
        attendanceEntries: totalEntries,
        validGrades: validGrades.length 
    });
    
    res.json(responseData);
});

// ====================================================================
// 2. ATTENDANCE CONTROLLERS (src/pages/StudentAttendance.tsx)
// ====================================================================

// @route   GET /api/student/attendance
export const getStudentAttendance = asyncHandler(async (req, res) => {
    const studentId = req.user.id;

    // Fetch all attendance entries (Using Admin client)
    const { data: attendanceData, error } = await supabaseAdmin // **FIXED: Using supabaseAdmin**
        .from('attendance_entries')
        .select(`
            status, record_id,
            record:attendance_records(
                id, record_date,
                class:classes(
                    period_time,
                    subject:subjects(name)
                )
            )
        `)
        .eq('student_id', studentId)
        .order('record_date', { foreignTable: 'record', ascending: false });

    if (error) {
        console.error('Database fetch error (student attendance):', error);
        return res.status(500).json({ message: 'Failed to retrieve attendance.' });
    }

    const formattedData = attendanceData.map(entry => {
        const subjectName = entry.record?.class?.subject?.name || 'N/A';
        const periodTime = entry.record?.class?.period_time || 'N/A';
        
        return {
            id: entry.record?.id, 
            date: entry.record?.record_date || 'N/A',
            subject: subjectName,
            period: periodTime,
            status: entry.status || 'absent'
        };
    });

    res.json(formattedData);
});


// ====================================================================
// 3. RESULTS CONTROLLERS (src/pages/StudentResults.tsx)
// ====================================================================

// @route   GET /api/student/results
export const getStudentResults = asyncHandler(async (req, res) => {
    const studentId = req.user.id;

    // Fetch all grades for this student (Using Admin client)
    const { data: results, error } = await supabaseAdmin // **FIXED: Using supabaseAdmin**
        .from('grades')
        .select(`
            marks_obtained,
            exam:exams (
                id, name, max_marks, exam_date,
                class:classes(subject:subjects(name))
            )
        `)
        .eq('student_id', studentId)
        .order('exam_date', { foreignTable: 'exam', ascending: false });

    if (error) {
        console.error('Database fetch error (student results):', error);
        return res.status(500).json({ message: 'Failed to retrieve results.' });
    }

    // Process data to group by exam
    const examsMap = new Map();
    results.forEach(g => {
        const exam = g.exam;
        
        if (!exam || !exam.id || !exam.class?.subject?.name) {
            return;
        }

        if (!examsMap.has(exam.id)) {
            examsMap.set(exam.id, {
                id: exam.id,
                name: exam.name || 'Unnamed Exam',
                date: exam.exam_date,
                status: new Date(exam.exam_date) < new Date() ? 'completed' : 'upcoming',
                subjects: [],
                totalMarks: 0,
                obtainedMarks: 0,
            });
        }

        const currentExam = examsMap.get(exam.id);
        const marksObtained = parseFloat(g.marks_obtained) || 0;
        const maxMarks = parseFloat(exam.max_marks) || 100;
        const percentage = maxMarks > 0 ? (marksObtained / maxMarks) * 100 : 0;
        
        const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B+' : 'C';
        
        currentExam.subjects.push({
            name: exam.class.subject.name,
            maxMarks: maxMarks,
            obtainedMarks: marksObtained,
            percentage: percentage,
            grade: grade
        });

        currentExam.totalMarks += maxMarks;
        currentExam.obtainedMarks += marksObtained;
    });

    const finalExams = Array.from(examsMap.values()).map(exam => {
        exam.percentage = exam.totalMarks > 0 ? parseFloat(((exam.obtainedMarks / exam.totalMarks) * 100).toFixed(1)) : 0;
        exam.grade = exam.percentage >= 90 ? 'A+' : exam.percentage >= 80 ? 'A' : 'B';
        exam.rank = 0;
        return exam;
    });


    res.json({
        exams: finalExams,
        assignments: []
    });
});


// ====================================================================
// 4. FEES CONTROLLERS (src/pages/StudentFees.tsx)
// ====================================================================

// @route   GET /api/student/fees/current
export const getStudentFeesSummary = asyncHandler(async (req, res) => {
    const studentId = req.user.id;

    const { data: feesData, error } = await supabaseAdmin // **FIXED: Using supabaseAdmin**
        .from('fee_dues')
        .select(`
            id, amount, due_date, is_paid,
            category:fee_categories (name),
            payments:payments(amount_paid)
        `)
        .eq('student_id', studentId)
        .order('due_date', { ascending: true });

    if (error) {
        console.error('Database fetch error (student fees summary):', error);
        return res.status(500).json({ message: 'Failed to retrieve fee summary.' });
    }

    const formattedData = feesData.map(due => {
        const totalPaid = due.payments?.reduce((sum, p) => sum + (parseFloat(p.amount_paid) || 0), 0) || 0;
        const pendingAmount = (parseFloat(due.amount) || 0) - totalPaid;

        let status = 'pending';
        if (due.is_paid || pendingAmount <= 0) {
            status = 'paid';
        } else if (due.due_date < new Date().toISOString().split('T')[0]) {
            status = 'overdue';
        }

        return {
            id: due.id,
            category: due.category?.name || 'N/A',
            amount: parseFloat(due.amount) || 0,
            dueDate: due.due_date,
            status: status,
            pendingAmount: parseFloat(pendingAmount.toFixed(2)),
            totalPaid: parseFloat(totalPaid.toFixed(2))
        };
    });

    res.json(formattedData);
});

// @route   GET /api/student/fees/history
export const getStudentPaymentHistory = asyncHandler(async (req, res) => {
    const studentId = req.user.id;
    
    // Fetch payments based on fee_dues linked to the student_id (Using Admin client)
    const { data: payments, error } = await supabaseAdmin // **FIXED: Using supabaseAdmin**
        .from('payments')
        .select(`
            id, amount_paid, payment_date, method, receipt_no,
            due:fee_dues(category:fee_categories(name), student_id)
        `)
        .order('payment_date', { ascending: false });

    if (error) {
        console.error('Database fetch error (student payment history):', error);
        return res.status(500).json({ message: 'Failed to retrieve payment history.' });
    }

    const formattedHistory = payments
        .filter(p => p.due?.student_id === studentId) // Final filter for security/data integrity
        .map(p => ({
            id: p.id,
            date: p.payment_date.split('T')[0],
            amount: parseFloat(p.amount_paid) || 0,
            category: p.due?.category?.name || 'Payment',
            method: p.method || 'Online',
            status: 'completed',
            receiptNo: p.receipt_no
        }));

    res.json(formattedHistory);
});


// ====================================================================
// 5. UTILITY HELPERS
// ====================================================================

// @route   GET /api/student/departments
export const getStudentDepartments = asyncHandler(async (req, res) => {
    const { data: departments, error } = await supabaseAdmin // **FIXED: Using supabaseAdmin**
        .from('departments')
        .select('id, name')
        .order('name', { ascending: true });

    if (error) {
        console.error('Database fetch error (departments):', error);
        return res.status(500).json({ message: 'Failed to retrieve departments.' });
    }

    res.json(departments);
});