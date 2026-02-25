/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Hardcoded to ensure it uses the exact provided credentials, ignoring any stale environment variables
const supabaseUrl = 'https://evrmgfemvmrejtitijin.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2cm1nZmVtdm1yZWp0aXRpamluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NzAyOTIsImV4cCI6MjA4NzM0NjI5Mn0.zQVT877u1GzjNB7ous2SytuCMGpt8ImzSWLPcKaXLkM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
