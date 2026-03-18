import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    if (import.meta.env.PROD) {
        throw new Error('CRITICAL: Missing Production Supabase Credentials. Deployment halted.');
    }
    console.warn('Supabase: Running with missing credentials. Auth/Data features will fallback to mocks.');
}

// Singleton pattern for the primary client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    }
});

/**
 * PRODUCTION UTILITY: Helper to verify connection health
 */
export async function checkConnectivity() {
    try {
        const { error } = await supabase.from('utility_organizations').select('count', { count: 'exact', head: true });
        return !error;
    } catch {
        return false;
    }
}
