const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
// Support both new naming (SECRET_KEY) and legacy naming (SERVICE_KEY)
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;

// Check if Supabase is configured with real values (not placeholders)
const isConfigured =
  supabaseUrl &&
  supabaseSecretKey &&
  supabaseUrl !== 'your-supabase-project-url' &&
  !supabaseSecretKey.startsWith('your-supabase-') &&
  supabaseUrl.startsWith('http');

// Validate required environment variables
if (!isConfigured) {
  console.warn('⚠️  Supabase credentials not configured. Real-time features will be disabled.');
  console.warn('   Add SUPABASE_URL and SUPABASE_SECRET_KEY to .env to enable real-time.');
  console.warn('   Get credentials from: https://app.supabase.com/project/_/settings/api');
}

// Create Supabase client
// Using secret key for server-side operations (allows bypassing RLS)
const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

module.exports = supabase;
