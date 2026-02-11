import { supabase } from '../config/supabaseClient.js';
import { supabaseAdmin } from '../config/supabaseAdmin.js';

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ====================================================================
// EXAM TYPES
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

    // Log audit
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
// EXAM MANAGEMENT
// ====================================================================

// @desc    Create new exam
// @route   POST /api/faculty/exams
// @access  Private (Faculty & Admin)
export const createExam = asyncHandler(async (req, res) => {
    const { name, class_id, exam_type_id, max_marks, exam_date } = req.body;
    const userId = req.user.id;

    // Validate required fields
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
            class:classes(name, subject:subjects(name))
        `)
        .single();

    if (error) {
        console.error('Database insert error (exam):', error);
        return res.status(500).json({ message: 'Failed to create exam' });
    }

    // Log audit
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

// @desc    Get exams for a class with type information
// @route   GET /api/faculty/grades/exams/:classId
// @access  Private (Faculty)
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
        return res.status(500).json({ message: 'Failed to retrieve exams for class' });
    }
    
    res.json(exams.map(e => ({
        id: e.id,
        name: e.name,
        maxMarks: e.max_marks,
        date: e.exam_date,
        examType: e.exam_type,
        created_by: e.created_by
    })));
});

// @desc    Update exam
// @route   PUT /api/faculty/exams/:examId
// @access  Private (Faculty & Admin)
export const updateExam = asyncHandler(async (req, res) => {
    const { examId } = req.params;
    const { name, exam_type_id, max_marks, exam_date } = req.body;
    const userId = req.user.id;

    // Get existing exam
    const { data: existingExam } = await supabaseAdmin
        .from('exams')
        .select('*, class:classes(faculty_id)')
        .eq('id', examId)
        .single();

    if (!existingExam) {
        return res.status(404).json({ message: 'Exam not found' });
    }

    // Verify permission (faculty can only edit their own class exams)
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

    // Log audit
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

    // Get existing exam
    const { data: existingExam } = await supabaseAdmin
        .from('exams')
        .select('*, class:classes(faculty_id)')
        .eq('id', examId)
        .single();

    if (!existingExam) {
        return res.status(404).json({ message: 'Exam not found' });
    }

    // Verify permission
    if (req.user.role_id === 2 && existingExam.class.faculty_id !== userId) {
        return res.status(403).json({ message: 'You can only delete exams for your own classes' });
    }

    // Delete exam (this will cascade delete grades due to foreign key)
    const { error } = await supabaseAdmin
        .from('exams')
        .delete()
        .eq('id', examId);

    if (error) {
        console.error('Database delete error (exam):', error);
        return res.status(500).json({ message: 'Failed to delete exam' });
    }

    // Log audit
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
// ASSIGNMENT MANAGEMENT (with Edit/Delete)
// ====================================================================

// @desc    Create assignment
// @route   POST /api/faculty/assignments
// @access  Private (Faculty)
export const createAssignment = asyncHandler(async (req, res) => {
    const { title, description, classId, dueDate, totalMarks } = req.body;
    const facultyId = req.user.id;
    
    const { data, error } = await supabaseAdmin.from('assignments').insert({
        faculty_id: facultyId,
        class_id: classId,
        title,
        description,
        due_date: dueDate,
        max_marks: totalMarks,
        is_active: true
    }).select().single();

    if (error) {
        console.error('Database insert error (assignment):', error);
        return res.status(500).json({ message: 'Failed to create assignment' });
    }

    await supabaseAdmin.from('audit_logs').insert({
        actor_id: facultyId,
        action_type: 'CREATE_ASSIGNMENT',
        table_affected: 'assignments',
        record_id_affected: data.id
    });

    res.status(201).json({ 
        message: 'Assignment created successfully',
        assignment: data
    });
});

// @desc    Get faculty assignments
// @route   GET /api/faculty/assignments
// @access  Private (Faculty)
export const getFacultyAssignments = asyncHandler(async (req, res) => {
    const facultyId = req.user.id;

    const { data: assignments, error } = await supabase
        .from('assignments')
        .select(`
            id,
            title,
            description,
            due_date,
            max_marks,
            is_active,
            created_at,
            class:classes(id, name, student_classes(count)),
            submissions:assignment_submissions(count)
        `)
        .eq('faculty_id', facultyId)
        .eq('is_active', true)
        .order('due_date', { ascending: false });
    
    if (error) {
        console.error('Database fetch error (assignments):', error);
        return res.status(500).json({ message: 'Failed to retrieve assignments' });
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

// @desc    Update assignment
// @route   PUT /api/faculty/assignments/:assignmentId
// @access  Private (Faculty)
export const updateAssignment = asyncHandler(async (req, res) => {
    const { assignmentId } = req.params;
    const { title, description, dueDate, totalMarks } = req.body;
    const facultyId = req.user.id;

    // Verify ownership
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

    // Log audit
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

    // Verify ownership
    const { data: existing } = await supabaseAdmin
        .from('assignments')
        .select('faculty_id, title')
        .eq('id', assignmentId)
        .single();

    if (!existing || existing.faculty_id !== facultyId) {
        return res.status(403).json({ message: 'You can only delete your own assignments' });
    }

    // Soft delete by setting is_active to false
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

    // Log audit
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
// GRADES MANAGEMENT (with Edit/Delete)
// ====================================================================

// @desc    Get students with grades for a class
// @route   GET /api/faculty/grades/students/:classId
// @access  Private (Faculty)
export const getStudentsForClass = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { examId } = req.query;
    
    const { data: students, error } = await supabase
        .from('student_classes')
        .select(`
            student_id,
            student:student_profiles (
                roll_number,
                user:users(first_name, last_name, email)
            )
        `)
        .eq('class_id', classId);

    if (error) {
        console.error('Database fetch error (students for class):', error);
        return res.status(500).json({ message: 'Failed to retrieve students' });
    }

    // If examId is provided, fetch grades for that exam
    let gradesMap = {};
    if (examId) {
        const { data: grades } = await supabase
            .from('grades')
            .select('student_id, marks_obtained, exam_id')
            .eq('exam_id', examId);

        if (grades) {
            gradesMap = grades.reduce((acc, grade) => {
                if (!acc[grade.student_id]) acc[grade.student_id] = {};
                acc[grade.student_id][grade.exam_id] = grade.marks_obtained;
                return acc;
            }, {});
        }
    }

    const formattedStudents = students.map(s => ({
        id: s.student_id,
        name: `${s.student.user.first_name} ${s.student.user.last_name}`,
        rollNo: s.student.roll_number,
        email: s.student.user.email,
        grades: gradesMap[s.student_id] || {}
    }));

    res.json(formattedStudents);
});

// @desc    Save/Update grades for multiple students
// @route   POST /api/faculty/grades/save
// @access  Private (Faculty)
export const saveStudentGrades = asyncHandler(async (req, res) => {
    const { examId, grades } = req.body; // grades is { studentId: marks, ... }
    const facultyId = req.user.id;
    
    // Prepare batch upsert payload
    const entries = Object.entries(grades).map(([studentId, marks]) => ({
        exam_id: examId,
        student_id: studentId,
        marks_obtained: parseFloat(marks),
        updated_by: facultyId
    }));

    // Batch upsert grades
    const { error: batchError } = await supabaseAdmin.from('grades').upsert(entries, {
        onConflict: 'exam_id, student_id'
    });
    
    if (batchError) {
        console.error('Database batch upsert error (grades):', batchError);
        return res.status(500).json({ message: 'Failed to save student grades' });
    }
    
    // Log the action
    await supabaseAdmin.from('audit_logs').insert({
        actor_id: facultyId,
        action_type: 'GRADES_BATCH_SAVE',
        table_affected: 'grades',
        record_id_affected: examId,
        details: { count: entries.length }
    });

    res.status(200).json({ message: 'Grades saved successfully' });
});

// @desc    Delete individual grade
// @route   DELETE /api/faculty/grades/:examId/:studentId
// @access  Private (Faculty)
export const deleteGrade = asyncHandler(async (req, res) => {
    const { examId, studentId } = req.params;
    const facultyId = req.user.id;

    // Verify faculty owns the class for this exam
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

    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
        actor_id: facultyId,
        action_type: 'DELETE_GRADE',
        table_affected: 'grades',
        details: { exam_id: examId, student_id: studentId }
    });

    res.json({ message: 'Grade deleted successfully' });
});

// ====================================================================
// DASHBOARD & UTILITIES (Export existing functions)
// ====================================================================

export { getFacultyClasses, getFacultyDashboardStats, getAttendanceForClass, saveAttendance } from './facultyController.js';
