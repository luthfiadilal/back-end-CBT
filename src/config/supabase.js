import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = "https://xlfnbivjavdysywkooyx.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsZm5iaXZqYXZkeXN5d2tvb3l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTgyOTYsImV4cCI6MjA4MDE3NDI5Nn0.l-GR2Yyeigr_FtEVZZiKUZgn7skTNabKEpdoAMVa1KI"

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be defined in .env file')
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: false
    },
})

export { supabaseUrl, supabaseAnonKey }
export default supabase
