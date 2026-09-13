-- =========================================================
-- AniMaker — SHARE EVENTS MIGRATION
-- Adds the share_events table for share counting/analytics.
-- Safe to re-run (idempotent). Run once in Supabase SQL Editor.
-- =========================================================

-- 1. TABLE
CREATE TABLE IF NOT EXISTS public.share_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creation_id UUID NOT NULL,                    -- references creations(id) logically; no FK so default/sample creations also count
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  platform TEXT NOT NULL DEFAULT 'unknown',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ROW LEVEL SECURITY
ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;

-- Anyone (even logged-out) can read counts
DROP POLICY IF EXISTS "Anyone can read share events" ON public.share_events;
CREATE POLICY "Anyone can read share events"
  ON public.share_events FOR SELECT
  USING (true);

-- Only authenticated users can record shares, and only their own rows
DROP POLICY IF EXISTS "Authenticated users can record own shares" ON public.share_events;
CREATE POLICY "Authenticated users can record own shares"
  ON public.share_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 3. GRANTS (this project requires explicit table privileges)
GRANT SELECT, INSERT ON public.share_events TO authenticated;
GRANT SELECT ON public.share_events TO anon;

-- 4. INDEXES (analytics-ready: per-creation totals, per-platform, time series)
CREATE INDEX IF NOT EXISTS idx_share_events_creation ON public.share_events(creation_id);
CREATE INDEX IF NOT EXISTS idx_share_events_platform ON public.share_events(platform);
CREATE INDEX IF NOT EXISTS idx_share_events_created_at ON public.share_events(created_at);

-- 5. REALTIME (optional — live share counters)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE share_events;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =========================================================
-- FUTURE ANALYTICS QUERIES (reference only — no need to run)
--
-- Total shares per creation:
--   SELECT creation_id, count(*) FROM share_events GROUP BY creation_id;
--
-- Shares by platform:
--   SELECT platform, count(*) FROM share_events GROUP BY platform ORDER BY 2 DESC;
--
-- Most shared creations (last 30 days):
--   SELECT creation_id, count(*) AS shares
--   FROM share_events
--   WHERE created_at > now() - interval '30 days'
--   GROUP BY creation_id ORDER BY shares DESC LIMIT 10;
--
-- Shares over time (per day):
--   SELECT created_at::date AS day, count(*) FROM share_events GROUP BY day ORDER BY day;
-- =========================================================
