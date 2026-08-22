
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof process !== 'undefined' && process.env.VITE_SUPABASE_URL) || (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (typeof process !== 'undefined' && process.env.VITE_SUPABASE_ANON_KEY) || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const checkSupabaseConnection = async () => {
  if (!supabase) return { success: false, message: 'Supabase credentials missing' };
  try {
    const { error } = await supabase.from('sim_timeline').select('id').limit(1);
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is fine
      if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') {
        return { success: false, message: 'Table sim_timeline not found. Using local storage fallback.' };
      }
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Connected to Supabase' };
  } catch (err) {
    return { success: false, message: 'Connection failed' };
  }
};

export const checkBackendConnection = async () => {
  try {
    const response = await fetch('/api/system/status');
    if (!response.ok) throw new Error('Backend unreachable');
    const data = await response.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, message: 'Backend disconnected' };
  }
};
