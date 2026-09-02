const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const isPlaceholder = (val) => !val || val.includes('YOUR_SUPABASE') || val.includes('xxxx');

const supabaseUrl =
  (!isPlaceholder(process.env.SUPABASE_URL) ? process.env.SUPABASE_URL : null) ||
  (!isPlaceholder(process.env.NEXT_PUBLIC_SUPABASE_URL) ? process.env.NEXT_PUBLIC_SUPABASE_URL : null) ||
  'https://avwdbgiiadsagoftapfa.supabase.co';

const supabaseKey =
  (!isPlaceholder(process.env.SUPABASE_SERVICE_ROLE_KEY) ? process.env.SUPABASE_SERVICE_ROLE_KEY : null) ||
  (!isPlaceholder(process.env.SUPABASE_SECRET_KEY) ? process.env.SUPABASE_SECRET_KEY : null) ||
  (!isPlaceholder(process.env.SUPABASE_KEY) ? process.env.SUPABASE_KEY : null) ||
  (!isPlaceholder(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY : null) ||
  (!isPlaceholder(process.env.SUPABASE_ANON_KEY) ? process.env.SUPABASE_ANON_KEY : null) ||
  'sb_publishable_5VAnkGE3lp5OoxhJqFybZA_bUOHjO05';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

module.exports = {
  supabase,
  supabaseUrl,
};
