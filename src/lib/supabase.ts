/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://evrmgfemvmrejtitijin.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2cm1nZmVtdm1yZWp0aXRpamluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NzAyOTIsImV4cCI6MjA4NzM0NjI5Mn0.zQVT877u1GzjNB7ous2SytuCMGpt8ImzSWLPcKaXLkM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
