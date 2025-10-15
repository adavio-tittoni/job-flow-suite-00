import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use environment variables with fallback to default values
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://uuorwhhvjxafrqdyrrzt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1b3J3aGh2anhhZnJxZHlycnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNjA4OTgsImV4cCI6MjA3NTYzNjg5OH0.UxNm138Qzyu6kC7fKj6e3_FSzQO4X4CsipdPGsLfupA";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});