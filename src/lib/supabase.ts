import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
    throw new Error('Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before running the app.');
}

// Singleton pattern for the primary client
export const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    }
});

/**
 * PRODUCTION UTILITY: Helper to verify connection health
 */
export async function checkConnectivity() {
    if (!isSupabaseConfigured) {
        return false;
    }

    try {
        const { error } = await supabase.from('utility_organizations').select('count', { count: 'exact', head: true });
        return !error;
    } catch {
        return false;
    }
}
