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


// ====================================================================
// 1. DASHBOARD CONTROLLERS (READ)
// ====================================================================

// @route   GET /api/admin/dashboard/stats 
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
    
    const feesCollectedTotal = feesRes.data?.reduce((sum, p) => sum + p.amount_paid, 0) || 0;
    
    const totalAttendanceEntries = attendanceStatsRes.count || 0;
    const totalPresentEntries = attendanceStatsRes.data?.filter(e => e.status === 'present').length || 0;
    
    const overallAttendanceRate = totalAttendanceEntries > 0 
        ? ((totalPresentEntries / totalAttendanceEntries) * 100).toFixed(1) 
        : '0.0';

    // Fetch recent audit logs
    const { data: auditLogs, error: auditError } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

    if (auditError) {
        console.error('Database fetch error (audit_logs):', auditError);
    } else {
        console.log('Fetched audit logs:', auditLogs?.length || 0, 'records');
    }

    // Get actor names for audit logs
    const actorIds = auditLogs?.map(log => log.actor_id).filter(Boolean) || [];
    const { data: actors, error: actorsError } = actorIds.length > 0 ? await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name')
        .in('id', actorIds) : { data: [], error: null };

    if (actorsError) {
        console.error('Database fetch error (actors):', actorsError);
    }

    // Format recent activities from audit logs
    const recentActivities = auditLogs?.map(log => {
        const actor = actors?.find(a => a.id === log.actor_id);
        const actorName = actor ? `${actor.first_name} ${actor.last_name}` : 'System';
        
        // Format activity message based on action type
        let activity = '';
        let type = 'general';
        
        switch (log.action_type) {
            case 'CREATE_STUDENT':
                activity = `${actorName} added a new student`;
                type = 'enrollment';
                break;
            case 'CREATE_FACULTY':
                activity = `${actorName} added a new faculty member`;
                type = 'enrollment';
                break;
            case 'CREATE_PAYMENT':
                const amount = log.details?.amount_paid || 'amount';
                activity = `Payment received - ₹${amount}`;
                type = 'payment';
                break;
            case 'MARK_ATTENDANCE':
                activity = `${actorName} marked attendance for ${log.table_affected}`;
                type = 'attendance';
                break;
            case 'CREATE_CLASS':
                activity = `${actorName} created a new class`;
                type = 'class';
                break;
            case 'ASSIGN_CLASSES':
                const studentCount = log.details?.studentCount || 0;
                const classCount = log.details?.classCount || 0;
                activity = `${actorName} assigned ${studentCount} student(s) to ${classCount} class(es)`;
                type = 'assignment';
                break;
            case 'ASSIGN_FACULTY':
                activity = `${actorName} assigned faculty to a class`;
                type = 'assignment';
                break;
            case 'CREATE_SUBJECT':
                activity = `${actorName} created a new subject`;
                type = 'academic';
                break;
            case 'ISSUE_BOOK':
                activity = `Library book issued`;
                type = 'library';
                break;
            case 'RETURN_BOOK':
                activity = `Library book returned`;
                type = 'library';
                break;
            case 'RECORD_PAYMENT':
                activity = `${actorName} recorded a payment`;
                type = 'payment';
                break;
            case 'ADD_FEE_DUE':
                activity = `${actorName} added a fee due`;
                type = 'payment';
                break;
            case 'UPDATE_STUDENT':
                activity = `${actorName} updated a student profile`;
                type = 'update';
                break;
            case 'UPDATE_FACULTY':
                activity = `${actorName} updated a faculty profile`;
                type = 'update';
                break;
            case 'DELETE_STUDENT':
                activity = `${actorName} removed a student`;
                type = 'delete';
                break;
            case 'DELETE_FACULTY':
                activity = `${actorName} removed a faculty member`;
                type = 'delete';
                break;
            case 'CREATE_BOOK':
                activity = `${actorName} added a new book to library`;
                type = 'library';
                break;
            default:
                activity = `${actorName} performed ${log.action_type.toLowerCase().replace(/_/g, ' ')}`;
                type = log.table_affected || 'general';
        }

        // Calculate time ago
        const createdAt = new Date(log.timestamp || log.created_at);
        const now = new Date();
        const diffMs = now.getTime() - createdAt.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        let time = '';
        if (diffMins < 1) {
            time = 'Just now';
        } else if (diffMins < 60) {
            time = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            time = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else {
            time = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        }

        return { activity, time, type };
    }) || [];

    res.json({
        totalStudents: totalStudents.toLocaleString(),
        facultyMembers: totalFaculty.toLocaleString(),
        feesCollected: `₹${(feesCollectedTotal / 1000).toFixed(1)}K`, 
        attendanceRate: `${overallAttendanceRate}%`,
        recentActivities
    });
});


// ====================================================================
// 2. STUDENT MANAGEMENT CONTROLLERS (CRUD)
// ====================================================================

// @route   GET /api/admin/students
export const getAllStudents = asyncHandler(async (req, res) => {
    
    const { data: students, error } = await supabaseAdmin
        .from('student_profiles')
        .select(`
            roll_number,
            academic_year,
            course_id,
            user:users (
                id,
                email,
                first_name,
                last_name,
                is_active
            ),
            course:courses (id, name),
            latest_gpa:student_gpa_history(cumulative_gpa, calculated_at)
        `)
        .order('calculated_at', { referencedTable: 'student_gpa_history', ascending: false }) 
        .order('roll_number');

    if (error) {
        console.error('Database fetch error (students):', error);
        return res.status(500).json({ message: 'Failed to retrieve student list.' });
    }

    const formattedStudents = students.map(s => {
        const latestGpaEntry = s.latest_gpa && s.latest_gpa.length > 0 ? s.latest_gpa[0] : null;

        return {
            id: s.user.id,
            name: `${s.user.first_name} ${s.user.last_name}`,
            email: s.user.email,
            rollNo: s.roll_number,
            courseId: s.course_id, // Add courseId for filtering
            course: s.course?.name || 'N/A',
            year: `${s.academic_year} Year`,
            status: s.user.is_active ? 'Active' : 'Inactive',
            gpa: latestGpaEntry?.cumulative_gpa || '0.0'
        };
    });

    res.json(formattedStudents);
});

// @route   POST /api/admin/students 
export const createStudent = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, password, courseId, academicYear, rollNumber } = req.body;
    
    // 🛑 FIXED: Added validation for FKs (courseId, academicYear)
    if (!email || !password || !rollNumber || !courseId || !academicYear) {
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
        const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
            actor_id: req.user.id,
            action_type: 'CREATE_STUDENT',
            table_affected: 'students',
            record_id_affected: userId
        });
        
        if (auditError) {
            console.error('Failed to create audit log:', auditError);
        } else {
            console.log('Audit log created: CREATE_STUDENT');
        }

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

// @route   PUT /api/admin/students/:id
export const updateStudent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, rollNumber, courseId, academicYear, isActive } = req.body;
    
    // 🛑 FIXED: Add validation for required fields
    if (!firstName || !lastName || !rollNumber || !courseId || !academicYear) {
        return res.status(400).json({ message: 'Missing required fields for student update.' });
    }

    // 1. Update base user data (name and status)
    await supabaseAdmin.from('users').update({ 
        first_name: firstName, 
        last_name: lastName,
        is_active: isActive 
    }).eq('id', id);

    // 2. Update student specific profile data
    const { error } = await supabaseAdmin.from('student_profiles').update({
        roll_number: rollNumber,
        course_id: courseId,
        academic_year: academicYear
    }).eq('user_id', id);

    if (error) {
        console.error('Database update error (student profile):', error);
        return res.status(500).json({ message: 'Failed to update student profile.' });
    }

    // 3. Audit Log
    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
        actor_id: req.user.id,
        action_type: 'UPDATE_STUDENT',
        table_affected: 'students',
        record_id_affected: id
    });
    
    if (auditError) {
        console.error('Failed to create audit log:', auditError);
    }

    res.status(200).json({ message: 'Student profile updated successfully.' });
});


// ====================================================================
// 3. FACULTY MANAGEMENT CONTROLLERS (CRUD)
// ====================================================================

// @route   GET /api/admin/faculty
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
            department_id,
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
        firstName: f.user.first_name,
        lastName: f.user.last_name,
        name: `${f.user.first_name} ${f.user.last_name}`,
        email: f.user.email,
        departmentId: f.department_id,
        department: f.department?.name || 'N/A',
        specialization: f.specialization,
        experienceYears: f.experience_years,
        experience: `${f.experience_years} years`,
        status: f.user.is_active ? 'Active' : 'On Leave',
        subjects: f.subjects.map(s => s.subject.name)
    }));

    res.json(formattedFaculty);
});

// @route   POST /api/admin/faculty 
export const createFaculty = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, password, departmentId, specialization, experienceYears, subjectIds } = req.body;
    
    // 🛑 FIXED: Added validation for required profile fields including firstName and lastName
    if (!firstName || !lastName || !email || !password || !departmentId || !specialization || !experienceYears) {
        return res.status(400).json({ message: 'Missing required fields: firstName, lastName, email, password, departmentId, specialization, and experienceYears are required.' });
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
            specialization: specialization,
            experience_years: experienceYears
        });
        
        if (subjectIds && subjectIds.length > 0) {
            const subjectLinks = subjectIds.map(subject_id => ({ faculty_id: userId, subject_id }));
            await supabaseAdmin.from('faculty_subjects').insert(subjectLinks);
        }

        // 3. Log the action
        const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
            actor_id: req.user.id,
            action_type: 'CREATE_FACULTY',
            table_affected: 'faculty',
            record_id_affected: userId
        });
        
        if (auditError) {
            console.error('Failed to create audit log:', auditError);
        } else {
            console.log('Audit log created: CREATE_FACULTY');
        }

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

// @route   PUT /api/admin/faculty/:id
export const updateFaculty = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, departmentId, specialization, experienceYears, subjectIds, isActive } = req.body;

    // 🛑 FIXED: Add validation for required fields
    if (!firstName || !lastName || !departmentId || !specialization || experienceYears === undefined) {
        return res.status(400).json({ message: 'Missing required fields for faculty update.' });
    }
    
    // 1. Update base user data (name and status)
    const { error: userError } = await supabaseAdmin.from('users').update({ 
        first_name: firstName, 
        last_name: lastName,
        is_active: isActive !== undefined ? isActive : true
    }).eq('id', id);

    if (userError) {
        console.error('Database update error (users):', userError);
        return res.status(500).json({ message: 'Failed to update user data.' });
    }

    // 2. Update faculty specific profile data
    const { error: profileError } = await supabaseAdmin.from('faculty_profiles').update({
        department_id: departmentId,
        specialization: specialization,
        experience_years: parseInt(experienceYears)
    }).eq('user_id', id);

    if (profileError) {
        console.error('Database update error (faculty_profiles):', profileError);
        return res.status(500).json({ message: 'Failed to update faculty profile.' });
    }

    // 3. Update subjects (complex: clear old links, insert new ones)
    if (subjectIds && Array.isArray(subjectIds)) {
        await supabaseAdmin.from('faculty_subjects').delete().eq('faculty_id', id);
        if (subjectIds.length > 0) {
            const subjectLinks = subjectIds.map(subject_id => ({ faculty_id: id, subject_id }));
            const { error: subjectsError } = await supabaseAdmin.from('faculty_subjects').insert(subjectLinks);
            if (subjectsError) {
                console.error('Database insert error (faculty_subjects):', subjectsError);
            }
        }
    }

    // 4. Audit Log
    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
        actor_id: req.user.id,
        action_type: 'UPDATE_FACULTY',
        table_affected: 'faculty',
        record_id_affected: id
    });
    
    if (auditError) {
        console.error('Failed to create audit log:', auditError);
    }

    res.status(200).json({ message: 'Faculty profile updated successfully.' });
});


// @route   DELETE /api/admin/students/:id | /api/admin/faculty/:id
export const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { data: userRecord, error: fetchError } = await supabaseAdmin.from('users').select('role_id').eq('id', id).single();
    if (fetchError || !userRecord) {
        return res.status(404).json({ message: 'User not found in database.' });
    }
    
    // 1. Delete user from Supabase Auth. (This cascades to all profile tables)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (deleteAuthError) {
        console.error('Supabase Auth Deletion Error:', deleteAuthError);
        return res.status(500).json({ message: 'Failed to delete user from authentication system.' });
    }

    // 2. Audit Log 
    const roleName = userRecord.role_id === ROLE_IDS.STUDENT ? 'student' : 'faculty';
    const actionType = userRecord.role_id === ROLE_IDS.STUDENT ? 'DELETE_STUDENT' : 'DELETE_FACULTY';
    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
        actor_id: req.user.id,
        action_type: actionType,
        table_affected: roleName,
        record_id_affected: id
    });
    
    if (auditError) {
        console.error('Failed to create audit log:', auditError);
    }

    res.status(200).json({ message: `${roleName} deleted successfully.` });
});


// ====================================================================
// 4. ADMIN OVERSIGHT CONTROLLERS (READ-ONLY)
// ====================================================================

// @route   GET /api/admin/attendance?classId=xxx&date=YYYY-MM-DD
export const getAttendanceSummary = asyncHandler(async (req, res) => {
    const { classId, date } = req.query;
    
    if (!classId || !date) {
        return res.status(400).json({ message: 'Missing required query parameters: classId and date' });
    }
    
    console.log(`[ADMIN] Fetching attendance for classId=${classId}, date=${date}`);
    
    // 1. Fetch existing attendance record header
    const { data: record, error: recordError } = await supabaseAdmin
        .from('attendance_records')
        .select('id, is_submitted')
        .eq('class_id', classId)
        .eq('record_date', date)
        .maybeSingle();
    
    let recordId = record?.id;
    console.log(`[ADMIN] Found record:`, record);
    
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
    
    let attendanceStats = {};
    if (recordIds.length > 0) {
        const { data: allEntries, error: allEntriesError } = await supabaseAdmin
            .from('attendance_entries')
            .select('student_id, status')
            .in('record_id', recordIds);
        
        if (allEntriesError) {
            console.error('Database fetch error (all attendance entries):', allEntriesError);
        } else {
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
        if (!sc.student || !sc.student.user) {
             console.warn(`Missing profile/user data for enrollment ID: ${sc.student_id}.`);
             return {
                id: sc.student_id,
                name: "UNKNOWN USER (Missing Profile)",
                rollNo: "N/A",
                classes: totalClasses,
                attended: 0,
                percentage: 0,
                present: false
             };
        }
        
        const hasAttendanceRecord = existingEntries.hasOwnProperty(sc.student_id);
        const attended = attendanceStats[sc.student_id] || 0;
        const percentage = totalClasses > 0 ? (attended / totalClasses) * 100 : 0;
        const present = hasAttendanceRecord ? existingEntries[sc.student_id] : false;
        
        console.log(`[ADMIN] Student ${sc.student_id}: hasRecord=${hasAttendanceRecord}, present=${present}`);
        
        return {
            id: sc.student_id,
            name: `${sc.student.user.first_name} ${sc.student.user.last_name}`,
            rollNo: sc.student.roll_number,
            classes: totalClasses,
            attended: attended,
            percentage: percentage,
            present: present
        };
    });

    console.log(`[ADMIN] Returning ${formattedData.length} students`);
    
    res.json({
        students: formattedData,
        isSubmitted: record?.is_submitted || false
    });
});


// @route   GET /api/admin/fees
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


// @route   GET /api/admin/library/catalog
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

// @route   GET /api/admin/results
export const getStudentResults = asyncHandler(async (req, res) => {
    const { courseId, semester } = req.query;
    
    console.log('Fetching student results with filters:', { courseId, semester });

    // Get student profiles
    let studentQuery = supabaseAdmin
        .from('student_profiles')
        .select('user_id, roll_number, course_id');
    
    if (courseId) {
        studentQuery = studentQuery.eq('course_id', courseId);
    }

    const { data: studentProfiles, error: studentError } = await studentQuery;

    if (studentError) {
        console.error('Database fetch error (student_profiles):', studentError);
        return res.status(500).json({ message: 'Failed to retrieve student profiles.' });
    }

    console.log(`Fetched ${studentProfiles?.length || 0} student profiles`);

    if (!studentProfiles || studentProfiles.length === 0) {
        return res.json([]);
    }

    // Get user details
    const userIds = studentProfiles.map(sp => sp.user_id);
    const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

    if (usersError) {
        console.error('Database fetch error (users):', usersError);
    }

    // Get courses
    const { data: courses, error: coursesError } = await supabaseAdmin
        .from('courses')
        .select('id, name');

    if (coursesError) {
        console.error('Database fetch error (courses):', coursesError);
    }

    // Get grades for all students
    const { data: grades, error: gradesError } = await supabaseAdmin
        .from('grades')
        .select('student_id, marks_obtained, exam_id')
        .in('student_id', userIds);

    if (gradesError) {
        console.error('Database fetch error (grades):', gradesError);
    }

    // Get exam details (using class_id instead of subject_id)
    const examIds = grades?.map(g => g.exam_id).filter(Boolean) || [];
    const { data: exams, error: examsError } = examIds.length > 0 ? await supabaseAdmin
        .from('exams')
        .select('id, max_marks, class_id, exam_type')
        .in('id', examIds) : { data: [], error: null };

    if (examsError) {
        console.error('Database fetch error (exams):', examsError);
    }

    // Get GPA history (using session_id instead of academic_session_id)
    const { data: gpaHistory, error: gpaError } = await supabaseAdmin
        .from('student_gpa_history')
        .select('student_id, cumulative_gpa, session_id')
        .in('student_id', userIds)
        .order('session_id', { ascending: false });

    if (gpaError) {
        console.error('Database fetch error (gpa_history):', gpaError);
    }

    // Get academic sessions
    const { data: sessions, error: sessionsError } = await supabaseAdmin
        .from('academic_sessions')
        .select('id, name');

    if (sessionsError) {
        console.error('Database fetch error (academic_sessions):', sessionsError);
    }

    // Build student results
    const studentsWithMetrics = studentProfiles.map(profile => {
        const user = users?.find(u => u.id === profile.user_id);
        const course = courses?.find(c => c.id === profile.course_id);
        const studentGrades = grades?.filter(g => g.student_id === profile.user_id) || [];
        
        // Calculate total marks
        let totalMarksObtained = 0;
        let maxMarksPossible = 0;
        
        studentGrades.forEach(grade => {
            const exam = exams?.find(e => e.id === grade.exam_id);
            if (exam) {
                totalMarksObtained += grade.marks_obtained || 0;
                maxMarksPossible += exam.max_marks || 0;
            }
        });

        const percentage = maxMarksPossible > 0 
            ? parseFloat(((totalMarksObtained / maxMarksPossible) * 100).toFixed(2)) 
            : 0.0;

        // Get latest GPA
        const studentGpa = gpaHistory?.find(gpa => gpa.student_id === profile.user_id);
        const session = sessions?.find(s => s.id === studentGpa?.session_id);

        return {
            id: profile.user_id,
            name: user ? `${user.first_name} ${user.last_name}` : 'Unknown',
            rollNo: profile.roll_number || 'N/A',
            course: course?.name || 'N/A',
            semester: session?.name || 'N/A', 
            totalMarks: totalMarksObtained, 
            maxMarks: maxMarksPossible,
            percentage: percentage,
            cgpa: studentGpa?.cumulative_gpa || 0.0,
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

    console.log(`Returning ${studentsWithMetrics.length} student results`);
    res.json(studentsWithMetrics);
});

// @route   GET /api/admin/students/:id/results
export const getStudentDetailedResults = asyncHandler(async (req, res) => {
    const { id: studentId } = req.params;
    
    console.log(`Fetching detailed results for student: ${studentId}`);

    // Get student profile
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('student_profiles')
        .select('user_id, roll_number, course_id')
        .eq('user_id', studentId)
        .single();

    if (profileError || !profile) {
        console.error('Database fetch error (student profile):', profileError);
        return res.status(404).json({ message: 'Student not found.' });
    }

    // Get user details
    const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('id', studentId)
        .single();

    if (userError) {
        console.error('Database fetch error (user):', userError);
    }

    // Get grades with exam details
    const { data: grades, error: gradesError } = await supabaseAdmin
        .from('grades')
        .select('id, marks_obtained, exam_id, grade_letter')
        .eq('student_id', studentId);

    if (gradesError) {
        console.error('Database fetch error (grades):', gradesError);
    }

    // Get exam details (using class_id)
    const examIds = grades?.map(g => g.exam_id).filter(Boolean) || [];
    const { data: exams, error: examsError } = examIds.length > 0 ? await supabaseAdmin
        .from('exams')
        .select('id, max_marks, class_id, exam_type')
        .in('id', examIds) : { data: [], error: null };

    if (examsError) {
        console.error('Database fetch error (exams):', examsError);
    }

    // Get classes to find subject_id
    const classIds = exams?.map(e => e.class_id).filter(Boolean) || [];
    const { data: classes, error: classesError } = classIds.length > 0 ? await supabaseAdmin
        .from('classes')
        .select('id, subject_id, name')
        .in('id', classIds) : { data: [], error: null };

    if (classesError) {
        console.error('Database fetch error (classes):', classesError);
    }

    // Get subjects
    const subjectIds = classes?.map(c => c.subject_id).filter(Boolean) || [];
    const { data: subjects, error: subjectsError } = subjectIds.length > 0 ? await supabaseAdmin
        .from('subjects')
        .select('id, name')
        .in('id', subjectIds) : { data: [], error: null };

    if (subjectsError) {
        console.error('Database fetch error (subjects):', subjectsError);
    }

    // Build subject-wise results
    const subjectResults = grades?.map(grade => {
        const exam = exams?.find(e => e.id === grade.exam_id);
        const classInfo = classes?.find(c => c.id === exam?.class_id);
        const subject = subjects?.find(s => s.id === classInfo?.subject_id);
        
        const percentage = exam?.max_marks > 0 
            ? ((grade.marks_obtained / exam.max_marks) * 100).toFixed(2)
            : 0;

        return {
            subjectName: subject?.name || classInfo?.name || 'Unknown',
            examType: exam?.exam_type || 'Regular',
            obtainedMarks: grade.marks_obtained || 0,
            maxMarks: exam?.max_marks || 0,
            percentage: parseFloat(percentage),
            grade: grade.grade_letter || 'N/A'
        };
    }) || [];

    // Calculate overall stats
    const totalObtained = subjectResults.reduce((sum, s) => sum + s.obtainedMarks, 0);
    const totalMax = subjectResults.reduce((sum, s) => sum + s.maxMarks, 0);
    const overallPercentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : 0;

    res.json({
        student: {
            id: studentId,
            name: user ? `${user.first_name} ${user.last_name}` : 'Unknown',
            rollNo: profile.roll_number || 'N/A',
            email: user?.email || 'N/A'
        },
        subjects: subjectResults,
        summary: {
            totalObtained,
            totalMax,
            percentage: parseFloat(overallPercentage),
            totalSubjects: subjectResults.length
        }
    });
});


// ====================================================================
// 5. MEDIUM PRIORITY: FINANCIAL MANAGEMENT
// ====================================================================

// @route   POST /api/admin/payments
export const recordPayment = asyncHandler(async (req, res) => {
    const { dueId, amountPaid, paymentMethod, receiptNo } = req.body;

    if (!dueId || !amountPaid) {
        return res.status(400).json({ message: 'Missing required fields: dueId and amountPaid.' });
    }
    
    // 1. Get the due to check total amount
    const { data: due, error: dueError } = await supabaseAdmin
        .from('fee_dues')
        .select('id, amount, payments(amount_paid)')
        .eq('id', dueId)
        .single();

    if (dueError) {
        console.error('Database fetch error (due):', dueError);
        return res.status(500).json({ message: 'Failed to retrieve due information.' });
    }

    // Calculate total paid including this payment
    const previouslyPaid = due.payments?.reduce((sum, p) => sum + p.amount_paid, 0) || 0;
    const totalPaid = previouslyPaid + parseFloat(amountPaid);

    // 2. Insert the payment record
    const { data: paymentData, error: paymentError } = await supabaseAdmin.from('payments').insert({
        due_id: dueId,
        amount_paid: amountPaid,
        receipt_no: receiptNo,
        payment_date: new Date().toISOString()
    }).select('id').single();

    if (paymentError) {
        console.error('Database insert error (payment):', paymentError);
        return res.status(500).json({ message: 'Failed to record payment.' });
    }

    // 3. Update is_paid status only if full amount is paid
    const isPaid = totalPaid >= due.amount;
    await supabaseAdmin.from('fee_dues').update({ is_paid: isPaid }).eq('id', dueId);

    // 4. Audit Log
    await supabaseAdmin.from('audit_logs').insert({
        actor_id: req.user.id,
        action_type: 'RECORD_PAYMENT',
        table_affected: 'payments',
        record_id_affected: paymentData.id
    });
    
    if (auditError) {
        console.error('Failed to create audit log:', auditError);
    } else {
        console.log('Audit log created: RECORD_PAYMENT');
    }

    res.status(201).json({ 
        message: 'Payment recorded successfully.',
        isPaid,
        remainingAmount: due.amount - totalPaid
    });
});


// @route   POST /api/admin/fees/dues
export const addFeeDue = asyncHandler(async (req, res) => {
    const { studentId, categoryId, amount, dueDate } = req.body;

    if (!studentId || !categoryId || !amount || !dueDate) {
        return res.status(400).json({ message: 'Missing required fields for adding fee due.' });
    }

    const { data, error } = await supabaseAdmin.from('fee_dues').insert({
        student_id: studentId,
        category_id: categoryId,
        amount: amount,
        due_date: dueDate,
        is_paid: false
    }).select('id').single();

    if (error) {
        console.error('Database insert error (fee dues):', error);
        return res.status(500).json({ message: 'Failed to add fee due item.' });
    }

    // Audit Log
    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
        actor_id: req.user.id,
        action_type: 'ADD_FEE_DUE',
        table_affected: 'fee_dues',
        record_id_affected: data.id
    });
    
    if (auditError) {
        console.error('Failed to create audit log:', auditError);
    }

    res.status(201).json({ message: 'New fee due item added successfully.' });
});


// ====================================================================
// 7. LOW PRIORITY: LIBRARY MANAGEMENT (INVENTORY LOGIC INCLUDED)
// ====================================================================

// @route   POST /api/admin/library/books
export const addLibraryBook = asyncHandler(async (req, res) => {
    const { title, author, isbn, category, totalCopies } = req.body;

    if (!title || !totalCopies) {
        return res.status(400).json({ message: 'Missing required fields: title and totalCopies.' });
    }

    const { data, error } = await supabaseAdmin.from('books').insert({
        title,
        author,
        isbn,
        category,
        total_copies: totalCopies,
        available_copies: totalCopies 
    }).select('id').single();

    if (error) {
        console.error('Database insert error (add book):', error);
        return res.status(500).json({ message: 'Failed to add book to catalog.' });
    }

    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
        actor_id: req.user.id,
        action_type: 'CREATE_BOOK',
        table_affected: 'books',
        record_id_affected: data.id
    });
    
    if (auditError) {
        console.error('Failed to create audit log:', auditError);
    }

    res.status(201).json({ message: 'Book added successfully.' });
});

// @route   POST /api/admin/library/issue
export const issueBook = asyncHandler(async (req, res) => {
    const { bookId, studentId, dueDate } = req.body;

    if (!bookId || !studentId || !dueDate) {
        return res.status(400).json({ message: 'Missing required fields: bookId, studentId, dueDate.' });
    }
    
    // 1. CRITICAL: Decrement available_copies count (Atomic Update)
    const { error: updateError } = await supabaseAdmin
        .from('books')
        .update({ available_copies: supabaseAdmin.rpc('decrement', { column: 'available_copies', amount: 1 }) })
        .eq('id', bookId)
        .gte('available_copies', 1);

    if (updateError) {
        console.error('Inventory update error (issue book):', updateError);
        return res.status(400).json({ message: 'Failed to issue book. Inventory count is zero or update failed.' });
    }

    // 2. Insert the book issue record
    const { data, error: insertError } = await supabaseAdmin.from('book_issues').insert({
        book_id: bookId,
        student_id: studentId,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: dueDate,
        status: 'Active'
    }).select('id').single();

    if (insertError) {
        console.error('Database insert error (issue book):', insertError);
        return res.status(500).json({ message: 'Book inventory deducted, but failed to create issue record.' });
    }
    
    // 3. Audit Log
    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
        actor_id: req.user.id,
        action_type: 'ISSUE_BOOK',
        table_affected: 'book_issues',
        record_id_affected: data.id
    });
    
    if (auditError) {
        console.error('Failed to create audit log:', auditError);
    } else {
        console.log('Audit log created: ISSUE_BOOK');
    }

    res.status(201).json({ message: 'Book issued successfully.' });
});

// @route   POST /api/admin/library/return
export const returnBook = asyncHandler(async (req, res) => {
    const { issueId, bookId } = req.body; 

    if (!issueId || !bookId) {
        return res.status(400).json({ message: 'Missing required field: issueId and bookId.' });
    }

    // 1. Update the book issue record to 'Returned'
    const { error: updateIssueError } = await supabaseAdmin.from('book_issues').update({
        return_date: new Date().toISOString().split('T')[0],
        status: 'Returned',
        fine_amount: 0 
    }).eq('id', issueId);

    if (updateIssueError) {
        console.error('Database update error (return book issue):', updateIssueError);
        return res.status(500).json({ message: 'Failed to record book return status.' });
    }

    // 2. CRITICAL: Increment available_copies count
    const { error: updateInventoryError } = await supabaseAdmin
        .from('books')
        .update({ available_copies: supabaseAdmin.rpc('increment', { column: 'available_copies', amount: 1 }) })
        .eq('id', bookId);

    if (updateInventoryError) {
        console.error('Inventory update error (return book):', updateInventoryError);
        return res.status(500).json({ message: 'Issue record updated, but failed to restore inventory count.' });
    }

    // 3. Audit Log
    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
        actor_id: req.user.id,
        action_type: 'RETURN_BOOK',
        table_affected: 'book_issues',
        record_id_affected: issueId
    });
    
    if (auditError) {
        console.error('Failed to create audit log:', auditError);
    } else {
        console.log('Audit log created: RETURN_BOOK');
    }

    res.status(200).json({ message: 'Book return recorded and inventory restored successfully.' });
});

// ====================================================================
// 7. DROPDOWN UTILITIES (Schema Compliance Check)
// ====================================================================

// @route   GET /api/admin/courses
export const getCourses = asyncHandler(async (req, res) => {
    // FIX: Removed non-existent columns (code, duration_years)
    const { data: courses, error } = await supabaseAdmin
        .from('courses')
        .select('id, name, department_id')
        .order('name');

    if (error) {
        console.error('Database fetch error (courses):', error);
        return res.status(500).json({ message: 'Failed to retrieve courses.' });
    }

    res.status(200).json({ courses });
});

// @route   GET /api/admin/departments
export const getDepartments = asyncHandler(async (req, res) => {
    // FIX: Removed non-existent columns (code, head_faculty_id)
    const { data: departments, error } = await supabaseAdmin
        .from('departments')
        .select('id, name')
        .order('name');

    if (error) {
        console.error('Database fetch error (departments):', error);
        return res.status(500).json({ message: 'Failed to retrieve departments.' });
    }

    res.status(200).json({ departments });
});

// @route   GET /api/admin/fee-categories
export const getFeeCategories = asyncHandler(async (req, res) => {
    // FIX: Removed non-existent columns (description, amount)
    const { data: categories, error } = await supabaseAdmin
        .from('fee_categories')
        .select('id, name')
        .order('name');

    if (error) {
        console.error('Database fetch error (fee categories):', error);
        return res.status(500).json({ message: 'Failed to retrieve fee categories.' });
    }

    res.status(200).json({ categories });
});

// @route   GET /api/admin/subjects
export const getSubjects = asyncHandler(async (req, res) => {
    const { data: subjects, error } = await supabaseAdmin
        .from('subjects')
        .select('id, name, course_id')
        .order('name');

    if (error) {
        console.error('Database fetch error (subjects):', error);
        return res.status(500).json({ message: 'Failed to retrieve subjects.' });
    }

    res.status(200).json({ subjects });
});

// @route   GET /api/admin/classes
export const getClasses = asyncHandler(async (req, res) => {
    // First, get all classes
    const { data: classes, error: classesError } = await supabaseAdmin
        .from('classes')
        .select('*')
        .order('name');

    if (classesError) {
        console.error('Database fetch error (classes):', classesError);
        return res.status(500).json({ message: 'Failed to retrieve classes.' });
    }

    console.log(`Fetched ${classes?.length || 0} classes from database`);

    // Get subjects with course info
    const { data: subjects, error: subjectsError } = await supabaseAdmin
        .from('subjects')
        .select('id, name, course_id');

    if (subjectsError) {
        console.error('Database fetch error (subjects):', subjectsError);
    }

    // Get courses
    const { data: courses, error: coursesError } = await supabaseAdmin
        .from('courses')
        .select('id, name');

    if (coursesError) {
        console.error('Database fetch error (courses):', coursesError);
    }

    // Get faculty with user info
    const { data: facultyProfiles, error: facultyError } = await supabaseAdmin
        .from('faculty_profiles')
        .select('user_id, department_id');

    if (facultyError) {
        console.error('Database fetch error (faculty_profiles):', facultyError);
    }

    const facultyIds = facultyProfiles?.map(f => f.user_id).filter(Boolean) || [];
    const { data: users, error: usersError } = facultyIds.length > 0 ? await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name')
        .in('id', facultyIds) : { data: [], error: null };

    if (usersError) {
        console.error('Database fetch error (users):', usersError);
    }

    // Get student counts
    const { data: studentClasses, error: studentClassesError } = await supabaseAdmin
        .from('student_classes')
        .select('class_id, student_id');

    if (studentClassesError) {
        console.error('Database fetch error (student_classes):', studentClassesError);
    }

    // Count students per class
    const studentCounts = {};
    studentClasses?.forEach(sc => {
        studentCounts[sc.class_id] = (studentCounts[sc.class_id] || 0) + 1;
    });

    // Format classes with descriptive names
    const formattedClasses = classes.map(cls => {
        const subject = subjects?.find(s => s.id === cls.subject_id);
        const course = courses?.find(c => c.id === subject?.course_id);
        // faculty_id in classes table is actually the user_id (not faculty_profile.id)
        const user = users?.find(u => u.id === cls.faculty_id);
        
        return {
            id: cls.id,
            name: cls.name,
            subject_id: cls.subject_id,
            faculty_id: cls.faculty_id,
            schedule: cls.schedule || null,
            subjectName: subject?.name || 'Unknown',
            courseName: course?.name || 'Unknown',
            facultyName: user ? `${user.first_name} ${user.last_name}` : null,
            studentCount: studentCounts[cls.id] || 0
        };
    });

    console.log(`Formatted ${formattedClasses.length} classes`);
    res.status(200).json({ classes: formattedClasses });
});

// @route   GET /api/admin/students/:id/dues
export const getStudentDues = asyncHandler(async (req, res) => {
    const { id: studentId } = req.params;
    
    const { data: dues, error } = await supabaseAdmin
        .from('fee_dues')
        .select(`
            id,
            amount,
            is_paid,
            due_date,
            fee_category:fee_categories(name),
            payments(amount_paid)
        `)
        .eq('student_id', studentId)
        .eq('is_paid', false)
        .order('due_date', { ascending: true });

    if (error) {
        console.error('Database fetch error (student dues):', error);
        return res.status(500).json({ message: 'Failed to retrieve student dues.' });
    }

    // Calculate remaining amount for each due
    const formattedDues = dues.map(due => {
        const totalPaid = due.payments?.reduce((sum, payment) => sum + payment.amount_paid, 0) || 0;
        const remainingAmount = due.amount - totalPaid;
        
        return {
            id: due.id,
            amount: due.amount,
            totalPaid,
            remainingAmount,
            dueDate: due.due_date,
            categoryName: due.fee_category?.name || 'General'
        };
    });

    res.status(200).json({ dues: formattedDues });
});

// ====================================================================
// 8. CLASS ASSIGNMENT
// ====================================================================

// @route   POST /api/admin/assign-classes
export const assignClasses = asyncHandler(async (req, res) => {
    const { studentIds, classIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ message: 'Missing required field: studentIds (must be a non-empty array).' });
    }

    if (!classIds || !Array.isArray(classIds) || classIds.length === 0) {
        return res.status(400).json({ message: 'Missing required field: classIds (must be a non-empty array).' });
    }

    console.log(`Assigning ${studentIds.length} student(s) to ${classIds.length} class(es)`);

    // Create all combinations of student-class assignments
    const assignments = [];
    for (const studentId of studentIds) {
        for (const classId of classIds) {
            assignments.push({
                student_id: studentId,
                class_id: classId
            });
        }
    }

    console.log(`Total assignments to create: ${assignments.length}`);

    // Batch insert with upsert to avoid duplicates
    const { data, error } = await supabaseAdmin
        .from('student_classes')
        .upsert(assignments, {
            onConflict: 'student_id,class_id',
            ignoreDuplicates: true
        })
        .select('student_id, class_id');

    if (error) {
        console.error('Database insert error (assign classes):', error);
        return res.status(500).json({ message: 'Failed to assign classes to students.' });
    }

    // Audit Log
    await supabaseAdmin.from('audit_logs').insert({
        actor_id: req.user.id,
        action_type: 'ASSIGN_CLASSES',
        table_affected: 'student_classes',
        details: { 
            studentCount: studentIds.length, 
            classCount: classIds.length,
            totalAssignments: assignments.length 
        }
    });
    
    if (auditError) {
        console.error('Failed to create audit log:', auditError);
    } else {
        console.log('Audit log created: ASSIGN_CLASSES');
    }

    res.status(201).json({ 
        message: `Successfully assigned ${studentIds.length} student(s) to ${classIds.length} class(es).`,
        assignmentsCreated: data?.length || assignments.length
    });
});

// @route   POST /api/admin/classes
// @route   POST /api/admin/subjects
export const createSubject = asyncHandler(async (req, res) => {
    const { name, courseId } = req.body;

    if (!name || !courseId) {
        return res.status(400).json({ message: 'Missing required fields: name and courseId.' });
    }

    console.log(`Creating subject: ${name}, course: ${courseId}`);

    const { data, error } = await supabaseAdmin
        .from('subjects')
        .insert({
            name: name,
            course_id: courseId
        })
        .select('id')
        .single();

    if (error) {
        console.error('Database insert error (create subject):', error);
        return res.status(500).json({ message: 'Failed to create subject.' });
    }

    // Audit Log
    await supabaseAdmin.from('audit_logs').insert({
        actor_id: req.user.id,
        action_type: 'CREATE_SUBJECT',
        table_affected: 'subjects',
        record_id_affected: data.id
    });
    
    if (auditError) {
        console.error('Failed to create audit log:', auditError);
    } else {
        console.log('Audit log created: CREATE_SUBJECT');
    }

    res.status(201).json({ 
        message: `Subject "${name}" created successfully.`,
        subjectId: data.id
    });
});

// @route   POST /api/admin/classes
export const createClass = asyncHandler(async (req, res) => {
    const { name, subjectId, facultyId } = req.body;

    if (!name || !subjectId) {
        return res.status(400).json({ message: 'Missing required fields: name and subjectId.' });
    }

    console.log(`Creating class: ${name}, subject: ${subjectId}, faculty: ${facultyId}`);

    const { data, error } = await supabaseAdmin
        .from('classes')
        .insert({
            name: name,
            subject_id: subjectId,
            faculty_id: facultyId || null
        })
        .select('id')
        .single();

    if (error) {
        console.error('Database insert error (create class):', error);
        return res.status(500).json({ message: 'Failed to create class.' });
    }

    // Audit Log
    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
        actor_id: req.user.id,
        action_type: 'CREATE_CLASS',
        table_affected: 'classes',
        record_id_affected: data.id
    });
    
    if (auditError) {
        console.error('Failed to create audit log:', auditError);
    } else {
        console.log('Audit log created: CREATE_CLASS');
    }

    res.status(201).json({ 
        message: `Class "${name}" created successfully.`,
        classId: data.id
    });
});

// @route   POST /api/admin/assign-faculty
export const assignFaculty = asyncHandler(async (req, res) => {
    const { classId, facultyId } = req.body;

    if (!classId || !facultyId) {
        return res.status(400).json({ message: 'Missing required fields: classId and facultyId.' });
    }

    console.log(`Assigning faculty ${facultyId} to class ${classId}`);

    const { error } = await supabaseAdmin
        .from('classes')
        .update({ faculty_id: facultyId })
        .eq('id', classId);

    if (error) {
        console.error('Database update error (assign faculty):', error);
        return res.status(500).json({ message: 'Failed to assign faculty to class.' });
    }

    // Audit Log
    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
        actor_id: req.user.id,
        action_type: 'ASSIGN_FACULTY',
        table_affected: 'classes',
        record_id_affected: classId,
        details: { faculty_id: facultyId }
    });
    
    if (auditError) {
        console.error('Failed to create audit log:', auditError);
    } else {
        console.log('Audit log created: ASSIGN_FACULTY');
    }

    res.status(200).json({ 
        message: 'Faculty assigned to class successfully.'
    });
});