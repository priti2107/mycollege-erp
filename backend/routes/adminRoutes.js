import express from 'express';

import { protect, admin } from '../middleware/authMiddleware.js';
import { 
    getAdminDashboardStats, 
    getAllStudents, 
    createStudent,
    getAllFaculty,
    createFaculty,
    getAttendanceSummary,    
    getFeeStatus,             
    getLibraryCatalog,       
    getStudentResults  
} from '../controllers/adminController.js'; 

const router = express.Router();

router.use(protect);
router.use(admin);

// @route   GET /api/admin/dashboard/stats
router.get('/dashboard/stats', getAdminDashboardStats);

// @route   GET /api/admin/students
router.get('/students', getAllStudents);
// @route   POST /api/admin/students
router.post('/students', createStudent);

// @route   GET /api/admin/faculty
router.get('/faculty', getAllFaculty);
// @route   POST /api/admin/faculty
router.post('/faculty', createFaculty);

// @route   GET /api/admin/attendance
router.get('/attendance', getAttendanceSummary); 

// @route   GET /api/admin/fees
router.get('/fees', getFeeStatus);

// @route   GET /api/admin/library/catalog
router.get('/library/catalog', getLibraryCatalog);

// @route   GET /api/admin/results
router.get('/results', getStudentResults);


export default router;