import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = "https://xlfnbivjavdysywkooyx.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsZm5iaXZqYXZkeXN5d2tvb3l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTgyOTYsImV4cCI6MjA4MDE3NDI5Nn0.l-GR2Yyeigr_FtEVZZiKUZgn7skTNabKEpdoAMVa1KI"
const supabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsZm5iaXZqYXZkeXN5d2tvb3l4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU5ODI5NiwiZXhwIjoyMDgwMTc0Mjk2fQ.MkD4R7an92o2MCW8gsUNXIq5tMF7ufdDleguZA7Jfuw"

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be defined in .env file')
}

// Create regular Supabase client (for normal operations)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: false
    },
})

// Create admin Supabase client (for admin operations like deleting users)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    },
})

export { supabaseUrl, supabaseAnonKey, supabaseAdmin }
export default supabase
