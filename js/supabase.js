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

  if (SUPABASE_URL.includes('YOUR_PROJECT_ID') || SUPABASE_ANON.includes('YOUR_ANON_KEY')) {
    console.error('[AniMaker] ⚠️ Supabase credentials NOT configured in js/supabase.js');
    console.error('[AniMaker] Replace YOUR_PROJECT_ID and YOUR_ANON_KEY with your actual values from Supabase Dashboard → Project Settings → API');
    return;
  }

  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    console.log('[AniMaker] ✅ Supabase client initialized successfully');
  } catch (e) {
    console.error('[AniMaker] ❌ Failed to initialize Supabase:', e.message);
  }
})();
