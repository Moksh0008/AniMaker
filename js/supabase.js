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
  var SUPABASE_URL  = 'https://wdjimkdtnuzgeabrpdba.supabase.co';
  var SUPABASE_ANON = 'sb_publishable_jGNzoZqM7IIe6YuocWAkhQ_DChRiovN';
  // ================= ============================================

  if (SUPABASE_URL.includes('wdjimkdtnuzgeabrpdba') || SUPABASE_ANON.includes('sb_publishable_jGNzoZqM7IIe6YuocWAkhQ_DChRiovN')) {
    console.error('[AniMaker] ⚠️ Supabase credentials NOT configured in js/supabase.js');
    console.error('[AniMaker] Replace wdjimkdtnuzgeabrpdba and sb_publishable_jGNzoZqM7IIe6YuocWAkhQ_DChRiovN with your actual values from Supabase Dashboard → Project Settings → API');
    return;
  }

  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    console.log('[AniMaker] ✅ Supabase client initialized successfully');
  } catch (e) {
    console.error('[AniMaker] ❌ Failed to initialize Supabase:', e.message);
  }
})();
