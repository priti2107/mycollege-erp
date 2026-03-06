import { supabaseAdmin } from '../config/supabaseAdmin.js';

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ====================================================================
// LIBRARY SETTINGS
// ====================================================================

// @desc    Get all library settings
// @route   GET /api/library/settings
// @access  Private (All can view, only admin can modify)
export const getLibrarySettings = asyncHandler(async (req, res) => {
    const { data: settings, error } = await supabaseAdmin
        .from('library_settings')
        .select('*')
        .order('setting_key', { ascending: true });

    if (error) {
        console.error('Database fetch error (library settings):', error);
        return res.status(500).json({ message: 'Failed to retrieve library settings' });
    }

    // Convert to object format for easier access
    const settingsObject = {};
    settings.forEach(setting => {
        let value = setting.setting_value;
        
        // Convert based on type
        if (setting.setting_type === 'number') {
            value = parseFloat(value);
        } else if (setting.setting_type === 'boolean') {
            value = value === 'true';
        } else if (setting.setting_type === 'json') {
            try {
                value = JSON.parse(value);
            } catch (e) {
                console.error('JSON parse error for setting:', setting.setting_key);
            }
        }
        
        settingsObject[setting.setting_key] = value;
    });

    res.json({
        settings: settingsObject,
        raw: settings
    });
});

// @desc    Update library setting
// @route   PATCH /api/library/settings/:settingKey
// @access  Private (Admin only)
export const updateLibrarySetting = asyncHandler(async (req, res) => {
    const { settingKey } = req.params;
    const { value } = req.body;
    const adminId = req.user.id;

    if (value === undefined || value === null) {
        return res.status(400).json({ message: 'Setting value is required' });
    }

    // Get existing setting to validate type
    const { data: existing, error: fetchError } = await supabaseAdmin
        .from('library_settings')
        .select('*')
        .eq('setting_key', settingKey)
        .single();

    if (fetchError || !existing) {
        return res.status(404).json({ message: 'Setting not found' });
    }

    // Validate and convert value based on type
    let convertedValue = value.toString();
    
    if (existing.setting_type === 'number') {
        const num = parseFloat(value);
        if (isNaN(num)) {
            return res.status(400).json({ message: 'Value must be a number' });
        }
        convertedValue = num.toString();
    } else if (existing.setting_type === 'boolean') {
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
            return res.status(400).json({ message: 'Value must be a boolean' });
        }
        convertedValue = value.toString();
    } else if (existing.setting_type === 'json') {
        convertedValue = JSON.stringify(value);
    }

    // Update setting
    const { data: updated, error } = await supabaseAdmin
        .from('library_settings')
        .update({
            setting_value: convertedValue,
            updated_by: adminId,
            updated_at: new Date().toISOString()
        })
        .eq('setting_key', settingKey)
        .select()
        .single();

    if (error) {
        console.error('Database update error (library setting):', error);
        return res.status(500).json({ message: 'Failed to update setting' });
    }

    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
        actor_id: adminId,
        action_type: 'UPDATE_LIBRARY_SETTING',
        table_affected: 'library_settings',
        record_id_affected: updated.id,
        details: { 
            setting_key: settingKey, 
            old_value: existing.setting_value, 
            new_value: convertedValue 
        }
    });

    res.json({
        message: 'Library setting updated successfully',
        setting: updated
    });
});

// @desc    Get library statistics
// @route   GET /api/library/statistics
// @access  Private (Admin only)
export const getLibraryStatistics = asyncHandler(async (req, res) => {
    // Get total books
    const { data: booksData } = await supabaseAdmin
        .from('books')
        .select('total_copies, available_copies');

    const totalBooks = booksData?.reduce((sum, book) => sum + (book.total_copies || 0), 0) || 0;
    const availableBooks = booksData?.reduce((sum, book) => sum + (book.available_copies || 0), 0) || 0;

    // Get active issues
    const { count: activeIssues } = await supabaseAdmin
        .from('book_issues')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Active');

    // Get overdue books
    const { count: overdueCount } = await supabaseAdmin
        .from('book_issues')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Active')
        .lt('due_date', new Date().toISOString());

    // Get pending requests
    const { count: pendingRequests } = await supabaseAdmin
        .from('book_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

    // Get total fines collected
    const { data: finesData } = await supabaseAdmin
        .from('book_issues')
        .select('fine_amount')
        .eq('status', 'Returned')
        .gt('fine_amount', 0);

    const totalFines = finesData?.reduce((sum, issue) => sum + (parseFloat(issue.fine_amount) || 0), 0) || 0;

    res.json({
        total_books: totalBooks,
        available_books: availableBooks,
        issued_books: activeIssues || 0,
        overdue_books: overdueCount || 0,
        pending_requests: pendingRequests || 0,
        total_fines_collected: totalFines,
        utilization_rate: totalBooks > 0 ? ((totalBooks - availableBooks) / totalBooks * 100).toFixed(2) : 0
    });
});

export default {
    getLibrarySettings,
    updateLibrarySetting,
    getLibraryStatistics
};
