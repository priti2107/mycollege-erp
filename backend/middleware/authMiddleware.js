import { supabase } from '../config/supabaseClient.js';

// Use this to wrap middleware functions and catch async errors
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// @desc    Protect routes: Verify JWT token
export const protect = asyncHandler(async (req, res, next) => {
    let token;

    // Check for token in the Authorization header: Bearer <token>
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token provided.' });
    }

    try {
        // Verify the token using Supabase's built-in JWT verification
        const { data: userData, error: authError } = await supabase.auth.getUser(token);

        if (authError || !userData?.user) {
            return res.status(401).json({ message: 'Not authorized, token failed verification or expired.' });
        }

        const user = userData.user;
        
        // Fetch User Role from the Database
        const { data: profileData, error: profileError } = await supabase
            .from('users') // Your custom 'users' table (linked to auth.users)
            .select('role:roles(name)')
            .eq('id', user.id)
            .single();

        if (profileError || !profileData || !profileData.role) {
            console.error('Failed to retrieve role for authenticated user:', profileError);
            return res.status(500).json({ message: 'Authentication successful but user profile/role is unavailable.' });
        }
        
        // Attach user info (including role) to the request object
        req.user = {
            id: user.id,
            role: profileData.role.name,
            email: user.email,
        };

        next(); 

    } catch (error) {
        console.error('Authorization process failed:', error);
        res.status(500).json({ message: 'Internal server error during authorization.' });
    }
});

// @desc    Admin access only
export const admin = (req, res, next) => {
    // Check the role attached by the 'protect' middleware
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Admin access required.' });
    }
};

// @desc    Faculty access or Admin (Faculty role requires Admin to manage things like grades)
export const facultyOrAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'faculty' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Faculty or Admin access required.' });
    }
};

// @desc    Student access only
export const student = (req, res, next) => {
    if (req.user && req.user.role === 'student') {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Student access required.' });
    }
};