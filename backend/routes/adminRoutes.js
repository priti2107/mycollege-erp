import express from 'express';

import { protect, admin } from '../middleware/authMiddleware.js';
import { 
    getAdminDashboardStats, 
    getAllStudents, 
    createStudent,
    updateStudent,       
    updateFaculty,       
    deleteUser,
    getAllFaculty,
    createFaculty,
    recordPayment,       
    addFeeDue,           
    addLibraryBook,      
    issueBook,           
    returnBook,
    getAttendanceSummary,    
    getFeeStatus,             
    getLibraryCatalog,       
    getStudentResults,
    getStudentDetailedResults,
    getCourses,
    getDepartments,
    getFeeCategories,
    getSubjects,
    getClasses,
    getStudentDues,
    assignClasses,
    createClass,
    assignFaculty,
    createSubject
} from '../controllers/adminController.js'; 

const router = express.Router();

router.use(protect);
router.use(admin);

// @route   GET /api/admin/dashboard/stats
router.get('/dashboard/stats', getAdminDashboardStats);

// @route   GET /api/admin/students
router.get('/students', getAllStudents);
router.post('/students', createStudent);
router.put('/students/:id', updateStudent);     
router.delete('/students/:id', deleteUser);
router.get('/students/:id/dues', getStudentDues);
router.get('/students/:id/results', getStudentDetailedResults);  

// @route   GET /api/admin/faculty
router.get('/faculty', getAllFaculty);
router.post('/faculty', createFaculty);
router.put('/faculty/:id', updateFaculty);      
router.delete('/faculty/:id', deleteUser);   

// @route   GET /api/admin/attendance
router.get('/attendance', getAttendanceSummary); 

// @route   GET /api/admin/fees
router.get('/fees', getFeeStatus);

// @route   GET /api/admin/library/catalog
router.get('/library/catalog', getLibraryCatalog);

// @route   GET /api/admin/results
router.get('/results', getStudentResults);

// Reference data routes
router.get('/courses', getCourses);
router.get('/departments', getDepartments);
router.get('/fee-categories', getFeeCategories);
router.get('/subjects', getSubjects);
router.get('/classes', getClasses);

router.post('/payments', recordPayment);
router.post('/fees/dues', addFeeDue);  
router.post('/library/books', addLibraryBook);  
router.post('/library/issue', issueBook);       
router.post('/library/return', returnBook);
router.post('/assign-classes', assignClasses);
router.post('/classes', createClass);
router.post('/assign-faculty', assignFaculty);
router.post('/subjects', createSubject);


export default router;