// config/supabaseAdmin.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for Admin functionality.");
}

// Initialize the Supabase Client with the Service Role Key
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        persistSession: false,
        detectSessionInUrl: false
    },
    global: {
        fetch: (url, options) => {
            return fetch(url, {
                ...options,
                signal: AbortSignal.timeout(15000) // 15 second timeout
            });
        }
    }
});

console.log('Supabase Admin Client (Service Role Key) Initialized with 15s timeout.');