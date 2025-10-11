import express from 'express';
import { protect, facultyOrAdmin } from '../middleware/authMiddleware.js';
import {
    getFacultyDashboardStats,
    getFacultyClasses,
    createAssignment,
    getFacultyAssignments,
    getStudentsForClass,
    getAttendanceForClass,
    saveAttendance,
    getExamsForClass,
    saveStudentGrades
} from '../controllers/facultyController.js';

const router = express.Router();

router.use(protect);
router.use(facultyOrAdmin);

// --- Core Data & Dashboard ---
// @route   GET /api/faculty/dashboard/stats
router.get('/dashboard/stats', getFacultyDashboardStats);

// @route   GET /api/faculty/classes
// Utility endpoint to get a list of classes taught by the current faculty user
router.get('/classes', getFacultyClasses);


// --- Assignment Management (src/pages/FacultyAssignments.tsx) ---
// @route   POST /api/faculty/assignments
router.post('/assignments', createAssignment);
// @route   GET /api/faculty/assignments
router.get('/assignments', getFacultyAssignments);


// --- Attendance Management (src/pages/FacultyAttendance.tsx) ---
// @route   GET /api/faculty/attendance/class/:classId
// Gets student list and current attendance status for a class/date
router.get('/attendance/class/:classId', getAttendanceForClass); 
// @route   POST /api/faculty/attendance/save
router.post('/attendance/save', saveAttendance);


// --- Grades Management (src/pages/FacultyGrades.tsx) ---
// @route   GET /api/faculty/grades/exams/:classId
// Gets exams and assignments for the selected class dropdown
router.get('/grades/exams/:classId', getExamsForClass);
// @route   GET /api/faculty/grades/students/:classId
// Gets students and their current marks for a specific class
router.get('/grades/students/:classId', getStudentsForClass);
// @route   POST /api/faculty/grades/save
router.post('/grades/save', saveStudentGrades);


export default router;