-- 023_lead_normalized_contact.sql
-- Store lowercased/canonicalized versions of client_email and client_phone
-- so the fraud-detection duplicate-phone/email detectors work reliably
-- regardless of surface format ("06 12 34 56 78" vs "+33612345678" etc).
-- Populated by /api/quotes on insert in Layer 2; existing rows are
-- backfilled here for historical coverage.

ALTER TABLE quote_requests
  ADD COLUMN client_email_normalized TEXT,
  ADD COLUMN client_phone_normalized TEXT;

-- Backfill. Lower-cased trim for email; strip non-digits + fold leading
-- 0 or +33/0033 to canonical 33XXXXXXXXX for phone.
UPDATE quote_requests
   SET client_email_normalized = lower(trim(client_email))
 WHERE client_email IS NOT NULL;

UPDATE quote_requests
   SET client_phone_normalized =
     CASE
       WHEN regexp_replace(client_phone, '\D', '', 'g') ~ '^0033'
         THEN '33' || substring(regexp_replace(client_phone, '\D', '', 'g') from 5)
       WHEN regexp_replace(client_phone, '\D', '', 'g') ~ '^33' AND length(regexp_replace(client_phone, '\D', '', 'g')) = 11
         THEN regexp_replace(client_phone, '\D', '', 'g')
       WHEN regexp_replace(client_phone, '\D', '', 'g') ~ '^0' AND length(regexp_replace(client_phone, '\D', '', 'g')) = 10
         THEN '33' || substring(regexp_replace(client_phone, '\D', '', 'g') from 2)
       ELSE regexp_replace(client_phone, '\D', '', 'g')
     END
 WHERE client_phone IS NOT NULL;

-- Indexes for the fraud-detection lookup.
CREATE INDEX idx_quote_requests_client_email_normalized
  ON quote_requests (client_email_normalized)
  WHERE client_email_normalized IS NOT NULL;
CREATE INDEX idx_quote_requests_client_phone_normalized
  ON quote_requests (client_phone_normalized)
  WHERE client_phone_normalized IS NOT NULL;
