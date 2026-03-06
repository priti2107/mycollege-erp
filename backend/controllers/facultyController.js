import { supabase } from '../config/supabaseClient.js';
import { supabaseAdmin } from '../config/supabaseAdmin.js'; // Needed for Audit Logging and cross-table inserts

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ====================================================================
// CORE UTILITIES
// ====================================================================

// @desc    Get all classes taught by the current faculty member
// @route   GET /api/faculty/classes
export const getFacultyClasses = asyncHandler(async (req, res) => {
    const facultyId = req.user.id; 
    
    // RLS is typically set up to allow the faculty member to only see their own classes, 
    // but we add the WHERE clause for explicit security and performance.
    const { data: classes, error } = await supabase
        .from('classes')
        .select(`
            id,
            name,
            subject:subjects(name),
            student_count:student_classes(count)
        `)
        .eq('faculty_id', facultyId);
    
    if (error) {
        console.error('Database fetch error (faculty classes):', error);
        return res.status(500).json({ message: 'Failed to retrieve faculty classes.' });
    }

    res.json(classes.map(c => ({
        id: c.id,
        name: c.name,
        subjectName: c.subject.name,
        students: c.student_count[0]?.count || 0
    })));
});

// @desc    Get all students enrolled in a specific class
// @route   GET /api/faculty/grades/students/:classId
export const getStudentsForClass = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { examId } = req.query;
    
    // Fetch all student profiles who are linked to this class
    const { data: students, error } = await supabaseAdmin
        .from('student_classes')
        .select(`
            student_id,
            student:student_profiles!student_id (
                user_id,
                roll_number,
                user:users!user_id(first_name, last_name, email)
            )
        `)
        .eq('class_id', classId);

    if (error) {
        console.error('Database fetch error (students for class):', error);
        return res.status(500).json({ message: 'Failed to retrieve students for class.' });
    }

    // Get all student IDs
    const studentIds = students.map(s => s.student_id);

    // Fetch grades for these students (optionally filtered by examId)
    let gradesQuery = supabaseAdmin
        .from('grades')
        .select('student_id, marks_obtained, exam_id')
        .in('student_id', studentIds);

    if (examId) {
        gradesQuery = gradesQuery.eq('exam_id', examId);
    }

    const { data: grades } = await gradesQuery;

    // Create a map of student_id -> {examId: marks}
    const gradesMap = {};
    if (grades) {
        grades.forEach(grade => {
            if (!gradesMap[grade.student_id]) {
                gradesMap[grade.student_id] = {};
            }
            gradesMap[grade.student_id][grade.exam_id] = grade.marks_obtained;
        });
    }

    // Map data to match the structure needed for grade entry
    const formattedStudents = students.map(sc => ({
        id: sc.student_id,
        name: `${sc.student.user.first_name} ${sc.student.user.last_name}`,
        rollNo: sc.student.roll_number,
        email: sc.student.user.email,
        // Grades formatted as {examId: marks}
        grades: gradesMap[sc.student_id] || {}
    }));

    res.json(formattedStudents);
});


// ====================================================================
// 1. DASHBOARD & OVERVIEW (src/pages/Dashboard.tsx)
// ====================================================================

// @route   GET /api/faculty/dashboard/stats
export const getFacultyDashboardStats = asyncHandler(async (req, res) => {
    const facultyId = req.user.id;

    // Fetch classes taught by this faculty member
    const { data: classesRes, error: classesError } = await supabase
        .from('classes')
        .select('id, student_classes(count)')
        .eq('faculty_id', facultyId);

    if (classesError) {
        console.error('Database fetch error (dashboard stats):', classesError);
        return res.status(500).json({ message: 'Failed to load faculty stats.' });
    }
    
    const classesTodayCount = classesRes.length;
    const totalStudentsTaught = classesRes.reduce((sum, c) => sum + (c.student_classes[0]?.count || 0), 0);

    // Mock calculations that require complex, scheduled data
    res.json({
        classesToday: classesTodayCount,
        classesRemaining: Math.max(0, classesTodayCount - 2), // Mock: Assuming 2 classes finished
        assignmentsPending: 23, // Mock: Requires assignments table aggregation
        studentsTaught: totalStudentsTaught,
        attendanceRate: 92.8 // Mock: Requires attendance entries aggregation
    });
});


// ====================================================================
// 2. ASSIGNMENT MANAGEMENT (src/pages/FacultyAssignments.tsx)
// ====================================================================

// NOTE: We need to create an `assignments` table similar to `exams` but dedicated to assignments.
// For now, we'll use a mocked table structure.

// @route   POST /api/faculty/assignments
export const createAssignment = asyncHandler(async (req, res) => {
    const { title, description, classId, dueDate, totalMarks } = req.body;
    const facultyId = req.user.id;
    
    // In a real system, you would verify facultyId matches the classId's faculty_id.
    
    // 1. Insert new assignment (Assuming a new 'assignments' table exists)
    const { data, error } = await supabaseAdmin.from('assignments').insert({
        faculty_id: facultyId,
        class_id: classId,
        title,
        description,
        due_date: dueDate,
        max_marks: totalMarks
    }).select().single();

    if (error) {
        console.error('Database insert error (assignment):', error);
        return res.status(500).json({ message: 'Failed to create assignment.' });
    }

    // 2. Log the action
    await supabaseAdmin.from('audit_logs').insert({
        actor_id: facultyId,
        action_type: 'CREATE',
        table_affected: 'assignments',
        record_id_affected: data.id
    });

    res.status(201).json({ 
        message: 'Assignment created successfully!',
        assignment: data
    });
});

// @route   GET /api/faculty/assignments
export const getFacultyAssignments = asyncHandler(async (req, res) => {
    const facultyId = req.user.id;

    // Fetch assignments created by this faculty, joining submission counts (mocked)
    const { data: assignments, error } = await supabase
        .from('assignments')
        .select(`
            id,
            title,
            description,
            due_date:due_date,
            max_marks,
            class:classes(id, name, student_classes(count)),
            submissions:assignment_submissions(count)
        `)
        .eq('faculty_id', facultyId);
    
    if (error) {
        console.error('Database fetch error (assignments):', error);
        return res.status(500).json({ message: 'Failed to retrieve assignments.' });
    }
    
    const formattedAssignments = assignments.map(a => {
        const totalStudents = a.class.student_classes[0]?.count || 0;
        const submissionCount = a.submissions[0]?.count || 0;
        
        const now = new Date();
        const dueDate = new Date(a.due_date);
        const status = dueDate < now ? 'Completed' : 'Active';

        return {
            id: a.id,
            title: a.title,
            description: a.description,
            class: a.class.id,
            className: a.class.name,
            dueDate: a.due_date,
            totalMarks: a.max_marks,
            submissions: submissionCount,
            totalStudents: totalStudents,
            status: status
        };
    });

    res.json(formattedAssignments);
});


// ====================================================================
// 3. ATTENDANCE MANAGEMENT (src/pages/FacultyAttendance.tsx)
// ====================================================================

// controllers/facultyController.js

// ... (existing code up to getAttendanceForClass)

// @route   GET /api/faculty/attendance/class/:classId
export const getAttendanceForClass = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { date } = req.query; 
    
    console.log(`Fetching attendance for classId=${classId}, date=${date}`);
    
    // 1. Fetch existing attendance record header (use supabaseAdmin to bypass RLS)
    const { data: record, error: recordError } = await supabaseAdmin
        .from('attendance_records')
        .select('id, is_submitted')
        .eq('class_id', classId)
        .eq('record_date', date)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no record case
    
    let recordId = record?.id;
    console.log(`Found record:`, record);
    
    // 2. Fetch all students for the class
    const { data: studentsData, error: studentsError } = await supabaseAdmin
        .from('student_classes')
        .select(`
            student_id,
            student:student_profiles (
                roll_number, 
                user:users(first_name, last_name)
            )
        `)
        .eq('class_id', classId);
    
    if (studentsError) {
        console.error('Database fetch error (attendance students):', studentsError);
        return res.status(500).json({ message: 'Failed to retrieve class list.' });
    }
    
    // 3. Fetch existing attendance entries if record exists
    let existingEntries = {};
    if (recordId) {
        const { data: entries, error: entriesError } = await supabaseAdmin
            .from('attendance_entries')
            .select('student_id, status')
            .eq('record_id', recordId);
            
        if (entriesError) {
             console.error('Database fetch error (attendance entries):', entriesError);
             return res.status(500).json({ message: 'Failed to retrieve existing attendance entries.' });
        }

        existingEntries = entries.reduce((acc, entry) => {
            acc[entry.student_id] = entry.status === 'present'; 
            return acc;
        }, {});
    }

    // 4. Fetch historical attendance stats for each student in this class
    // Get all attendance records for this class
    const { data: allRecords, error: allRecordsError } = await supabaseAdmin
        .from('attendance_records')
        .select('id')
        .eq('class_id', classId);
    
    if (allRecordsError) {
        console.error('Database fetch error (all attendance records):', allRecordsError);
        return res.status(500).json({ message: 'Failed to retrieve attendance history.' });
    }
    
    const recordIds = allRecords.map(r => r.id);
    const totalClasses = recordIds.length;
    
    // Get all attendance entries for these records
    let attendanceStats = {};
    if (recordIds.length > 0) {
        const { data: allEntries, error: allEntriesError } = await supabaseAdmin
            .from('attendance_entries')
            .select('student_id, status')
            .in('record_id', recordIds);
        
        if (allEntriesError) {
            console.error('Database fetch error (all attendance entries):', allEntriesError);
        } else {
            // Calculate attended classes per student
            attendanceStats = allEntries.reduce((acc, entry) => {
                if (!acc[entry.student_id]) {
                    acc[entry.student_id] = 0;
                }
                if (entry.status === 'present') {
                    acc[entry.student_id]++;
                }
                return acc;
            }, {});
        }
    }
    
    // 5. Format student data with attendance status and historical stats
    const formattedData = studentsData.map(sc => {
        // Check for missing student_profiles record or users record
        if (!sc.student || !sc.student.user) {
             console.warn(`Missing profile/user data for enrollment ID: ${sc.student_id}.`);
             return {
                id: sc.student_id,
                name: "UNKNOWN USER (Missing Profile)",
                rollNo: "N/A",
                classes: totalClasses,
                attended: 0,
                percentage: 0,
                present: false // Default to absent for safety
             };
        }
        
        const hasAttendanceRecord = existingEntries.hasOwnProperty(sc.student_id);
        const attended = attendanceStats[sc.student_id] || 0;
        const percentage = totalClasses > 0 ? (attended / totalClasses) * 100 : 0;
        const present = hasAttendanceRecord ? existingEntries[sc.student_id] : false;
        
        console.log(`Student ${sc.student_id}: hasRecord=${hasAttendanceRecord}, present=${present}, existingEntries=`, existingEntries[sc.student_id]);
        
        return {
            id: sc.student_id,
            name: `${sc.student.user.first_name} ${sc.student.user.last_name}`,
            rollNo: sc.student.roll_number,
            classes: totalClasses,
            attended: attended,
            percentage: percentage,
            present: present // Today's attendance status
        };
    });

    console.log('Returning attendance data:', JSON.stringify(formattedData, null, 2));
    
    res.json({
        students: formattedData,
        isSubmitted: record?.is_submitted || false
    });
});

// @route   POST /api/faculty/attendance/save
export const saveAttendance = asyncHandler(async (req, res) => {
    const { classId, date, attendance } = req.body; // attendance is an array of { studentId, isPresent }
    const facultyId = req.user.id;
    
    console.log('Saving attendance:', { classId, date, attendanceCount: attendance.length });
    console.log('Attendance records:', JSON.stringify(attendance, null, 2));
    
    // 1. Create or get attendance_records header
    const { data: record, error: upsertError } = await supabaseAdmin.from('attendance_records').upsert({
        class_id: classId,
        record_date: date,
        is_submitted: true // Mark as submitted immediately on save
    }, { onConflict: 'class_id, record_date' }).select('id').single();

    if (upsertError) {
        console.error('Database upsert error (attendance records):', upsertError);
        return res.status(500).json({ message: 'Failed to save attendance record header.' });
    }
    
    const recordId = record.id;
    console.log('Created/fetched record ID:', recordId);
    
    // 2. Prepare attendance entries for batch upsert
    const entries = attendance.map(entry => ({
        record_id: recordId,
        student_id: entry.studentId,
        status: entry.isPresent ? 'present' : 'absent'
    }));
    
    console.log('Entries to upsert:', JSON.stringify(entries, null, 2));

    // 3. Batch upsert attendance_entries
    const { error: batchError } = await supabaseAdmin.from('attendance_entries').upsert(entries, {
        onConflict: 'record_id, student_id'
    });

    if (batchError) {
        // Log the batch error but still return success for robustness if header saved
        console.error('Database batch upsert error (attendance entries):', batchError);
        return res.status(500).json({ message: 'Attendance saved, but some student entries may have failed.' });
    }
    
    // 4. Log the action (Grouping multiple actions into one audit log)
    await supabaseAdmin.from('audit_logs').insert({
        actor_id: facultyId,
        action_type: 'ATTENDANCE_BATCH_SAVE',
        table_affected: 'attendance_records',
        record_id_affected: recordId,
        details: { count: entries.length, date: date }
    });

    res.status(200).json({ message: 'Attendance saved successfully!' });
});


// ====================================================================
// 4. GRADES MANAGEMENT (src/pages/FacultyGrades.tsx)
// ====================================================================

// @route   GET /api/faculty/grades/exams/:classId
export const getExamsForClass = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    
    const { data: exams, error } = await supabase
        .from('exams')
        .select(`
            *,
            exam_type:exam_types(id, name, default_weightage)
        `)
        .eq('class_id', classId)
        .order('exam_date');
        
    if (error) {
        console.error('Database fetch error (exams for class):', error);
        return res.status(500).json({ message: 'Failed to retrieve exams for class.' });
    }
    
    // Map to structure with exam type information
    res.json(exams.map(e => ({
        id: e.id,
        name: e.name,
        maxMarks: e.max_marks,
        date: e.exam_date,
        examType: e.exam_type
    })));
});

// @route   POST /api/faculty/grades/save
export const saveStudentGrades = asyncHandler(async (req, res) => {
    const { examId, grades } = req.body; // grades is { studentId: marks, ... }
    const facultyId = req.user.id;
    
    // 1. Prepare batch upsert payload
    const entries = Object.entries(grades).map(([studentId, marks]) => ({
        exam_id: examId,
        student_id: studentId,
        marks_obtained: marks // Marks validation should ideally happen here or on client
    }));

    // 2. Batch upsert grades
    const { error: batchError } = await supabaseAdmin.from('grades').upsert(entries, {
        onConflict: 'exam_id, student_id'
    });
    
    if (batchError) {
        console.error('Database batch upsert error (grades):', batchError);
        return res.status(500).json({ message: 'Failed to save student grades.' });
    }
    
    // 3. Log the action
    await supabaseAdmin.from('audit_logs').insert({
        actor_id: facultyId,
        action_type: 'GRADES_BATCH_SAVE',
        table_affected: 'grades',
        record_id_affected: examId,
        details: { count: entries.length }
    });

    res.status(200).json({ message: 'Grades saved successfully!' });
});

// ====================================================================
// EXAM TYPES MANAGEMENT
// ====================================================================

// @desc    Get all exam types
// @route   GET /api/faculty/exam-types
// @access  Private (Faculty & Admin)
export const getExamTypes = asyncHandler(async (req, res) => {
    const { data: examTypes, error } = await supabase
        .from('exam_types')
        .select('*')
        .order('name');

    if (error) {
        console.error('Database fetch error (exam types):', error);
        return res.status(500).json({ message: 'Failed to retrieve exam types' });
    }

    res.json(examTypes || []);
});

// @desc    Create exam type (Admin only)
// @route   POST /api/faculty/exam-types
// @access  Private (Admin only)
export const createExamType = asyncHandler(async (req, res) => {
    const { name, description, default_weightage } = req.body;
    const userId = req.user.id;

    if (!name) {
        return res.status(400).json({ message: 'Exam type name is required' });
    }

    const { data, error } = await supabaseAdmin
        .from('exam_types')
        .insert({ name, description, default_weightage: default_weightage || 10 })
        .select()
        .single();

    if (error) {
        console.error('Database insert error (exam type):', error);
        return res.status(500).json({ message: 'Failed to create exam type' });
    }

    await supabaseAdmin.from('audit_logs').insert({
        actor_id: userId,
        action_type: 'CREATE_EXAM_TYPE',
        table_affected: 'exam_types',
        record_id_affected: data.id
    });

    res.status(201).json({
        message: 'Exam type created successfully',
        examType: data
    });
});

// ====================================================================
// EXAM MANAGEMENT (Create, Edit, Delete)
// ====================================================================

// @desc    Create new exam
// @route   POST /api/faculty/exams
// @access  Private (Faculty & Admin)
export const createExam = asyncHandler(async (req, res) => {
    const { name, class_id, exam_type_id, max_marks, exam_date } = req.body;
    const userId = req.user.id;

    if (!name || !class_id || !exam_type_id || !max_marks || !exam_date) {
        return res.status(400).json({ 
            message: 'All fields are required: name, class_id, exam_type_id, max_marks, exam_date' 
        });
    }

    // Verify faculty owns this class (if not admin)
    if (req.user.role_id === 2) {
        const { data: classData } = await supabase
            .from('classes')
            .select('faculty_id')
            .eq('id', class_id)
            .single();

        if (!classData || classData.faculty_id !== userId) {
            return res.status(403).json({ message: 'You can only create exams for your own classes' });
        }
    }

    const { data, error } = await supabaseAdmin
        .from('exams')
        .insert({
            name,
            class_id,
            exam_type_id,
            max_marks,
            exam_date,
            created_by: userId
        })
        .select(`
            *,
            exam_type:exam_types(name, default_weightage),
            class:classes(name)
        `)
        .single();

    if (error) {
        console.error('Database insert error (exam):', error);
        return res.status(500).json({ message: 'Failed to create exam' });
    }

    await supabaseAdmin.from('audit_logs').insert({
        actor_id: userId,
        action_type: 'CREATE_EXAM',
        table_affected: 'exams',
        record_id_affected: data.id,
        details: { exam_name: name, class_id }
    });

    res.status(201).json({
        message: 'Exam created successfully',
        exam: data
    });
});

// @desc    Update exam
// @route   PUT /api/faculty/exams/:examId
// @access  Private (Faculty & Admin)
export const updateExam = asyncHandler(async (req, res) => {
    const { examId } = req.params;
    const { name, exam_type_id, max_marks, exam_date } = req.body;
    const userId = req.user.id;

    const { data: existingExam } = await supabaseAdmin
        .from('exams')
        .select('*, class:classes(faculty_id)')
        .eq('id', examId)
        .single();

    if (!existingExam) {
        return res.status(404).json({ message: 'Exam not found' });
    }

    if (req.user.role_id === 2 && existingExam.class.faculty_id !== userId) {
        return res.status(403).json({ message: 'You can only edit exams for your own classes' });
    }

    const { data, error } = await supabaseAdmin
        .from('exams')
        .update({
            name,
            exam_type_id,
            max_marks,
            exam_date,
            updated_at: new Date().toISOString()
        })
        .eq('id', examId)
        .select()
        .single();

    if (error) {
        console.error('Database update error (exam):', error);
        return res.status(500).json({ message: 'Failed to update exam' });
    }

    await supabaseAdmin.from('audit_logs').insert({
        actor_id: userId,
        action_type: 'UPDATE_EXAM',
        table_affected: 'exams',
        record_id_affected: examId
    });

    res.json({
        message: 'Exam updated successfully',
        exam: data
    });
});

// @desc    Delete exam
// @route   DELETE /api/faculty/exams/:examId
// @access  Private (Faculty & Admin)
export const deleteExam = asyncHandler(async (req, res) => {
    const { examId } = req.params;
    const userId = req.user.id;

    const { data: existingExam } = await supabaseAdmin
        .from('exams')
        .select('name, class:classes(faculty_id)')
        .eq('id', examId)
        .single();

    if (!existingExam) {
        return res.status(404).json({ message: 'Exam not found' });
    }

    if (req.user.role_id === 2 && existingExam.class.faculty_id !== userId) {
        return res.status(403).json({ message: 'You can only delete exams for your own classes' });
    }

    const { error } = await supabaseAdmin
        .from('exams')
        .delete()
        .eq('id', examId);

    if (error) {
        console.error('Database delete error (exam):', error);
        return res.status(500).json({ message: 'Failed to delete exam' });
    }

    await supabaseAdmin.from('audit_logs').insert({
        actor_id: userId,
        action_type: 'DELETE_EXAM',
        table_affected: 'exams',
        record_id_affected: examId,
        details: { exam_name: existingExam.name }
    });

    res.json({ message: 'Exam deleted successfully' });
});

// ====================================================================
// ASSIGNMENT EDIT/DELETE
// ====================================================================

// @desc    Update assignment
// @route   PUT /api/faculty/assignments/:assignmentId
// @access  Private (Faculty)
export const updateAssignment = asyncHandler(async (req, res) => {
    const { assignmentId } = req.params;
    const { title, description, dueDate, totalMarks } = req.body;
    const facultyId = req.user.id;

    const { data: existing } = await supabaseAdmin
        .from('assignments')
        .select('faculty_id')
        .eq('id', assignmentId)
        .single();

    if (!existing || existing.faculty_id !== facultyId) {
        return res.status(403).json({ message: 'You can only edit your own assignments' });
    }

    const { data, error } = await supabaseAdmin
        .from('assignments')
        .update({
            title,
            description,
            due_date: dueDate,
            max_marks: totalMarks,
            updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
        .select()
        .single();

    if (error) {
        console.error('Database update error (assignment):', error);
        return res.status(500).json({ message: 'Failed to update assignment' });
    }

    await supabaseAdmin.from('audit_logs').insert({
        actor_id: facultyId,
        action_type: 'UPDATE_ASSIGNMENT',
        table_affected: 'assignments',
        record_id_affected: assignmentId
    });

    res.json({
        message: 'Assignment updated successfully',
        assignment: data
    });
});

// @desc    Delete (soft delete) assignment
// @route   DELETE /api/faculty/assignments/:assignmentId
// @access  Private (Faculty)
export const deleteAssignment = asyncHandler(async (req, res) => {
    const { assignmentId } = req.params;
    const facultyId = req.user.id;

    const { data: existing } = await supabaseAdmin
        .from('assignments')
        .select('faculty_id, title')
        .eq('id', assignmentId)
        .single();

    if (!existing || existing.faculty_id !== facultyId) {
        return res.status(403).json({ message: 'You can only delete your own assignments' });
    }

    const { error } = await supabaseAdmin
        .from('assignments')
        .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

    if (error) {
        console.error('Database update error (soft delete assignment):', error);
        return res.status(500).json({ message: 'Failed to delete assignment' });
    }

    await supabaseAdmin.from('audit_logs').insert({
        actor_id: facultyId,
        action_type: 'DELETE_ASSIGNMENT',
        table_affected: 'assignments',
        record_id_affected: assignmentId,
        details: { title: existing.title }
    });

    res.json({ message: 'Assignment deleted successfully' });
});

// ====================================================================
// GRADES DELETE
// ====================================================================

// @desc    Delete individual grade
// @route   DELETE /api/faculty/grades/:examId/:studentId
// @access  Private (Faculty)
export const deleteGrade = asyncHandler(async (req, res) => {
    const { examId, studentId } = req.params;
    const facultyId = req.user.id;

    const { data: exam } = await supabaseAdmin
        .from('exams')
        .select('class:classes(faculty_id)')
        .eq('id', examId)
        .single();

    if (!exam || exam.class.faculty_id !== facultyId) {
        return res.status(403).json({ message: 'You can only delete grades for your own classes' });
    }

    const { error } = await supabaseAdmin
        .from('grades')
        .delete()
        .eq('exam_id', examId)
        .eq('student_id', studentId);

    if (error) {
        console.error('Database delete error (grade):', error);
        return res.status(500).json({ message: 'Failed to delete grade' });
    }

    await supabaseAdmin.from('audit_logs').insert({
        actor_id: facultyId,
        action_type: 'DELETE_GRADE',
        table_affected: 'grades',
        details: { exam_id: examId, student_id: studentId }
    });

    res.json({ message: 'Grade deleted successfully' });
});