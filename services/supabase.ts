import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Vercel/Vite usually uses import.meta.env for env vars starting with VITE_
// We check both standard process.env (for some setups) and import.meta.env (for Vite)
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''; 
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// If keys are missing, we return null to signal Demo Mode
export const supabase: SupabaseClient | null = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export const isSupabaseConfigured = () => {
    return !!supabaseUrl && !!supabaseKey && supabaseUrl.length > 0 && supabaseKey.length > 0;
};