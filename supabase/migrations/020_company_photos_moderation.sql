-- 020_company_photos_moderation.sql
-- Add moderation workflow for company photos:
--   - Movers upload → photos start as 'pending'
--   - Admin approves or rejects → only 'approved' photos appear publicly
--   - Max 4 photos per company (approved + pending count toward the cap)
-- Existing photos are auto-approved to avoid breaking the current prod UI.

ALTER TABLE company_photos
  ADD COLUMN status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN rejected_reason TEXT,
  ADD COLUMN reviewed_at     TIMESTAMPTZ,
  ADD COLUMN reviewed_by     TEXT;

-- Backfill: any photo present before this migration is considered approved.
UPDATE company_photos
   SET status       = 'approved',
       reviewed_at  = COALESCE(reviewed_at, created_at),
       reviewed_by  = 'migration:020'
 WHERE status = 'pending';

-- Fast lookups for admin pending queue and public gallery.
CREATE INDEX idx_company_photos_status        ON company_photos (status);
CREATE INDEX idx_company_photos_company_status ON company_photos (company_id, status);
