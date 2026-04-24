-- 029_quote_reconfirm.sql
-- Support the J-3 client re-engagement flow: clients whose move_date is 3
-- days away receive an email asking "Still looking for a mover?". A click
-- on "still looking" extends the lead's visibility by 7 days without
-- overwriting the original move_date (preserved for audit + analytics).
-- A click on "found one" marks the quote as completed, hiding it instantly.

ALTER TABLE quote_requests
  ADD COLUMN IF NOT EXISTS move_date_extended_to date,
  ADD COLUMN IF NOT EXISTS reconfirm_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconfirmed_at timestamptz;

-- The cron only scans leads whose move_date is strictly 3 days away AND
-- have not been emailed yet. A narrow index on (move_date, reconfirm_email_sent_at)
-- keeps the daily pass cheap even once quote_requests grows large.
CREATE INDEX IF NOT EXISTS idx_quote_requests_reconfirm_candidates
  ON quote_requests (move_date)
  WHERE reconfirm_email_sent_at IS NULL
    AND move_date IS NOT NULL;
