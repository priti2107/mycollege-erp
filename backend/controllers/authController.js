import { supabase } from '../config/supabaseClient.js';
import { supabaseAdmin } from '../config/supabaseAdmin.js'; // <-- NEW IMPORT

// @desc    Authenticate user and get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide both email and password.' });
    }

    try {
        // Authenticate the user (Use standard client, returns session/JWT)
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError) {
            return res.status(401).json({ message: 'Invalid email or password.', details: authError.message });
        }
        
        const user = authData.user;
        if (!user) {
             return res.status(401).json({ message: 'Authentication failed: User data not found.' });
        }
        
        // SFetch the user's ERP role and name from the database (FIXED)
        const { data: profileData, error: profileError } = await supabaseAdmin 
            .from('users') 
            .select(`
                first_name, 
                last_name,
                role:roles (name)
            `) 
            .eq('id', user.id)
            .single();

        if (profileError) {
             // Log the entire database error object for debugging
             console.error('Profile fetch failed (Database Error):', JSON.stringify(profileError, null, 2));
             return res.status(500).json({ 
                 message: 'Database query failed to retrieve user role.',
                 details: profileError.message 
             });
        }
        
        if (!profileData || !profileData.role || !profileData.role.name) {
            console.error('Profile fetch failed (Missing Data): ProfileData:', profileData);
            return res.status(500).json({ message: 'Login successful but user role data is missing or corrupted.' });
        }

        const role = profileData.role.name; 

        // Send back required data 
        res.json({
            message: 'Login Successful',
            token: authData.session.access_token, 
            user: {
                id: user.id,
                name: `${profileData.first_name} ${profileData.last_name}`,
                email: user.email,
                role: role,
            }
        });

    } catch (error) {
        console.error('Login server error:', error);
        res.status(500).json({ message: 'A unexpected server error occurred during login.' });
    }
};