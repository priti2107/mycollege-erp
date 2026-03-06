import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
    getLibrarySettings,
    updateLibrarySetting,
    getLibraryStatistics
} from '../controllers/librarySettingsController.js';

const router = express.Router();

router.use(protect);

// @route   GET /api/library-settings
// All users can view settings
router.get('/', getLibrarySettings);

// @route   PATCH /api/library-settings/:settingKey
// Only admin can update settings
router.patch('/:settingKey', adminOnly, updateLibrarySetting);

// @route   GET /api/library-settings/statistics
// Only admin can view statistics
router.get('/statistics', adminOnly, getLibraryStatistics);

export default router;
