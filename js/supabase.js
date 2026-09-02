/* =========================================================
   AniMaker — Supabase Client Initialization
   
   REPLACE THE TWO VALUES BELOW with your Supabase credentials.
   Get them from: https://supabase.com/dashboard → Project Settings → API
   ========================================================= */

var supabaseClient = null;

(function initSupabase() {
  // ================= ============================================
  // REPLACE THESE with your actual Supabase credentials
  // ================= ============================================
  var SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
  var SUPABASE_ANON = 'YOUR_ANON_KEY_HERE';
  // ================= ============================================

  if (!SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    } catch (e) {
      console.error('Failed to initialize Supabase:', e);
    }
  }
})();
