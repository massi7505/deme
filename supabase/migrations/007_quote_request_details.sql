-- 007_quote_request_details.sql
-- Persist the quote form fields that were collected but never stored:
-- heavy_items, services, notes (Step 3 of /devis) plus date_mode and
-- move_date_end (Step 1 flexible-date toggle).
-- Without this migration, movers unlock a lead but can't see which
-- heavy objects, which services, or any client notes — forcing them
-- to call the client just to scope a quote.

ALTER TABLE quote_requests
  ADD COLUMN heavy_items TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN services TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN notes TEXT,
  ADD COLUMN move_date_end DATE,
  ADD COLUMN date_mode TEXT CHECK (date_mode IS NULL OR date_mode IN ('precise', 'flexible'));
