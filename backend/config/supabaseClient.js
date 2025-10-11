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
    fetch: (url, options) => {
        return fetch(url, {
            ...options,
            signal: AbortSignal.timeout(5000) // 5 second timeout for low latency
        });
    }
});

console.log('Supabase Client Initialized and configured with 5s timeout.');