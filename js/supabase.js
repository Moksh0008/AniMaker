/* =========================================================
   AniMaker — Supabase Client Initialization
   
   Credentials are configured below.
   Get them from: https://supabase.com/dashboard → Project Settings → API
   ========================================================= */

var supabaseClient = null;

(function initSupabase() {
  var SUPABASE_URL  = 'https://wdjimkdtnuzgeabrpdba.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indkamlta2R0bnV6Z2VhYnJwZGJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNDg5MTAsImV4cCI6MjEwMzkyNDkxMH0.TUgdAOmmwhYs02Zqb0IpvA3f3WDboACjibswoT_91JY';

  // Validate that credentials look real (not empty or obviously placeholder)
  if (!SUPABASE_URL || !SUPABASE_URL.startsWith('https://') || !SUPABASE_URL.includes('.supabase.co')) {
    console.error('[AniMaker] ⚠️ Invalid Supabase URL. Check js/supabase.js');
    return;
  }

  if (!SUPABASE_ANON || SUPABASE_ANON.length < 20) {
    console.error('[AniMaker] ⚠️ Invalid Supabase anon key. Check js/supabase.js');
    return;
  }

  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    console.log('[AniMaker] ✅ Supabase client initialized successfully');
  } catch (e) {
    console.error('[AniMaker] ❌ Failed to initialize Supabase:', e.message);
  }
})();
