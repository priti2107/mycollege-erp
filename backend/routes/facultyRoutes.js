import express from 'express';
import { protect, facultyOrAdmin, adminOnly } from '../middleware/authMiddleware.js';
import {
    getFacultyDashboardStats,
    getFacultyClasses,
    createAssignment,
    getFacultyAssignments,
    updateAssignment,
    deleteAssignment,
    getStudentsForClass,
    getAttendanceForClass,
    saveAttendance,
    getExamsForClass,
    saveStudentGrades,
    deleteGrade,
    getExamTypes,
    createExamType,
    createExam,
    updateExam,
    deleteExam
} from '../controllers/facultyController.js';

const router = express.Router();

router.use(protect);
router.use(facultyOrAdmin);

// --- Core Data & Dashboard ---
// @route   GET /api/faculty/dashboard/stats
router.get('/dashboard/stats', getFacultyDashboardStats);

// @route   GET /api/faculty/classes
router.get('/classes', getFacultyClasses);

// --- Exam Types ---
// @route   GET /api/faculty/exam-types
router.get('/exam-types', getExamTypes);

// @route   POST /api/faculty/exam-types (Admin only)
router.post('/exam-types', adminOnly, createExamType);

// --- Exam Management ---
// @route   POST /api/faculty/exams
router.post('/exams', createExam);

// @route   PUT /api/faculty/exams/:examId
router.put('/exams/:examId', updateExam);

// @route   DELETE /api/faculty/exams/:examId
router.delete('/exams/:examId', deleteExam);

// --- Assignment Management ---
// @route   POST /api/faculty/assignments
router.post('/assignments', createAssignment);

// @route   GET /api/faculty/assignments
router.get('/assignments', getFacultyAssignments);

// @route   PUT /api/faculty/assignments/:assignmentId
router.put('/assignments/:assignmentId', updateAssignment);

// @route   DELETE /api/faculty/assignments/:assignmentId
router.delete('/assignments/:assignmentId', deleteAssignment);

// --- Attendance Management ---
// @route   GET /api/faculty/attendance/class/:classId
router.get('/attendance/class/:classId', getAttendanceForClass);

// @route   POST /api/faculty/attendance/save
router.post('/attendance/save', saveAttendance);

// --- Grades Management ---
// @route   GET /api/faculty/grades/exams/:classId
router.get('/grades/exams/:classId', getExamsForClass);

// @route   GET /api/faculty/grades/students/:classId
router.get('/grades/students/:classId', getStudentsForClass);

// @route   POST /api/faculty/grades/save
router.post('/grades/save', saveStudentGrades);

// @route   DELETE /api/faculty/grades/:examId/:studentId
router.delete('/grades/:examId/:studentId', deleteGrade);

export default router;