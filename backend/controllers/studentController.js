import { supabase } from '../config/supabaseClient.js';

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ====================================================================
// 1. DASHBOARD CONTROLLERS (src/pages/StudentDashboard.tsx)
// ====================================================================

// @route   GET /api/student/dashboard/stats
export const getStudentDashboardStats = asyncHandler(async (req, res) => {
    const studentId = req.user.id;

    // Fetch core stats in parallel (RLS ensures only this student's data is retrieved)
    const [
        attendanceRes,
        gpaRes,
        feesRes,
    ] = await Promise.all([
        // 1. Attendance Rate 
        supabase.from('attendance_entries').select('status', { count: 'exact' }).eq('student_id', studentId),
        // 2. Latest GPA/CGPA
        supabase.from('student_gpa_history').select('cumulative_gpa').eq('student_id', studentId).order('calculated_at', { ascending: false }).limit(1),
        // 3. Pending Fees Sum
        supabase.from('fee_dues').select('amount').eq('student_id', studentId).eq('is_paid', false),
    ]);

    // Calculate metrics
    const totalEntries = attendanceRes.count || 0;
    const presentEntries = attendanceRes.data?.filter(e => e.status === 'present').length || 0;
    const attendancePercentage = totalEntries > 0 ? parseFloat(((presentEntries / totalEntries) * 100).toFixed(1)) : 0.0;

    const currentGpa = gpaRes.data?.[0]?.cumulative_gpa || 'N/A';
    const pendingFees = feesRes.data?.reduce((sum, d) => sum + d.amount, 0) || 0;
    
    // Mock Next Class and Assignment Count (Requires complex joins/scheduling logic)
    const pendingAssignmentsCount = 3; 

    res.json({
        attendancePercentage,
        currentGpa,
        feesDue: pendingFees,
        pendingAssignments: pendingAssignmentsCount,
        overallGrade: 'A',
        overallPercentage: 89.4,
        nextClass: { subject: 'Physics', time: '10:30 AM' }
    });
});

// ====================================================================
// 2. ATTENDANCE CONTROLLERS (src/pages/StudentAttendance.tsx)
// ====================================================================

// @route   GET /api/student/attendance
export const getStudentAttendance = asyncHandler(async (req, res) => {
    const studentId = req.user.id;

    const { data: entries, error } = await supabase
        .from('attendance_entries')
        .select(`
            status,
            record:attendance_records (record_date, class:classes(period_time, subject:subjects(name)))
        `)
        .eq('student_id', studentId)
        .order('record_date', { foreignTable: 'record', ascending: false });

    if (error) {
        console.error('Database fetch error (student attendance):', error);
        return res.status(500).json({ message: 'Failed to retrieve attendance records.' });
    }

    const formattedData = entries.map(e => ({
        date: e.record?.record_date || 'N/A',
        subject: e.record?.class?.subject?.name || 'N/A',
        period: e.record?.class?.period_time || 'N/A',
        status: e.status || 'absent'
    }));
    
    res.json(formattedData);
});


// ====================================================================
// 3. RESULTS CONTROLLERS (src/pages/StudentResults.tsx)
// ====================================================================

// @route   GET /api/student/results
export const getStudentResults = asyncHandler(async (req, res) => {
    const studentId = req.user.id;

    // Fetch all grades for this student
    const { data: results, error } = await supabase
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

    // Process data to group by exam (simulating frontend card structure)
    const examsMap = new Map();
    results.forEach(g => {
        const exam = g.exam;
        if (!examsMap.has(exam.id)) {
            examsMap.set(exam.id, {
                id: exam.id,
                name: exam.name,
                date: exam.exam_date,
                status: new Date(exam.exam_date) < new Date() ? 'completed' : 'upcoming',
                subjects: [],
                totalMarks: 0,
                obtainedMarks: 0,
            });
        }

        const currentExam = examsMap.get(exam.id);
        currentExam.subjects.push({
            name: exam.class.subject.name,
            maxMarks: exam.max_marks,
            obtainedMarks: g.marks_obtained,
            percentage: (g.marks_obtained / exam.max_marks) * 100,
            grade: (g.marks_obtained / exam.max_marks) >= 0.9 ? 'A+' : (g.marks_obtained / exam.max_marks) >= 0.8 ? 'A' : 'B'
        });

        currentExam.totalMarks += exam.max_marks;
        currentExam.obtainedMarks += g.marks_obtained;
    });

    const finalExams = Array.from(examsMap.values()).map(exam => {
        exam.percentage = exam.totalMarks > 0 ? parseFloat(((exam.obtainedMarks / exam.totalMarks) * 100).toFixed(1)) : 0;
        exam.grade = exam.percentage >= 90 ? 'A+' : exam.percentage >= 80 ? 'A' : 'B';
        exam.rank = 0; // Rank calculation is cross-student, mocked here
        return exam;
    });


    res.json({
        exams: finalExams,
        assignments: [] // For now, assignments are empty, could be expanded later
    });
});


// ====================================================================
// 4. FEES CONTROLLERS (src/pages/StudentFees.tsx)
// ====================================================================

// @route   GET /api/student/fees/current
export const getStudentFeesSummary = asyncHandler(async (req, res) => {
    const studentId = req.user.id;

    const { data: feesData, error } = await supabase
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
        const totalPaid = due.payments?.reduce((sum, p) => sum + p.amount_paid, 0) || 0;
        const pendingAmount = due.amount - totalPaid;

        let status = 'pending';
        if (due.is_paid || pendingAmount <= 0) {
            status = 'paid';
        } else if (due.due_date < new Date().toISOString().split('T')[0]) {
            status = 'overdue';
        }

        return {
            id: due.id,
            category: due.category?.name || 'N/A',
            amount: due.amount,
            dueDate: due.due_date,
            status: status,
            pendingAmount: pendingAmount,
            totalPaid: totalPaid
        };
    });

    res.json(formattedData);
});

// @route   GET /api/student/fees/history
export const getStudentPaymentHistory = asyncHandler(async (req, res) => {
    const studentId = req.user.id;
    
    // RLS on the payments table will ensure only this student's payments are returned
    const { data: payments, error } = await supabase
        .from('payments')
        .select(`
            id, amount_paid, payment_date, method, receipt_no,
            due:fee_dues(category:fee_categories(name))
        `)
        .order('payment_date', { ascending: false });

    if (error) {
        console.error('Database fetch error (student payment history):', error);
        return res.status(500).json({ message: 'Failed to retrieve payment history.' });
    }

    const formattedHistory = payments.map(p => ({
        id: p.id,
        date: p.payment_date.split('T')[0],
        amount: p.amount_paid,
        category: p.due?.category?.name || 'Payment',
        method: p.method || 'Online',
        status: 'completed',
        receiptNo: p.receipt_no
    }));

    res.json(formattedHistory);
});