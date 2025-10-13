import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY; 

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set in the .env file.");
}

// Initialize the Supabase Client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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

console.log('Supabase Client Initialized with 15s timeout.');