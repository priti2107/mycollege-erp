import express from 'express';
import { protect, student } from '../middleware/authMiddleware.js';
import {
    getStudentDashboardStats,
    getStudentAttendance,
    getStudentResults,
    getStudentFeesSummary,
    getStudentPaymentHistory,
} from '../controllers/studentController.js';

const router = express.Router();

// Middleware: All routes below require the user to be logged in AND be a Student
router.use(protect);
router.use(student);

// --- Dashboard (src/pages/StudentDashboard.tsx) ---
// @route   GET /api/student/dashboard/stats
router.get('/dashboard/stats', getStudentDashboardStats);

// --- Attendance (src/pages/StudentAttendance.tsx) ---
// @route   GET /api/student/attendance
router.get('/attendance', getStudentAttendance);

// --- Results (src/pages/StudentResults.tsx) ---
// @route   GET /api/student/results
router.get('/results', getStudentResults);

// --- Fees (src/pages/StudentFees.tsx) ---
// @route   GET /api/student/fees/current
router.get('/fees/current', getStudentFeesSummary);
// @route   GET /api/student/fees/history
router.get('/fees/history', getStudentPaymentHistory);

export default router;