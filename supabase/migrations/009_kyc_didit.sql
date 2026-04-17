-- 009_kyc_didit.sql
-- Replace SumSub with didit.me as the single KYC provider.
-- The sumsub_applicant_id column has no production data (SumSub was never
-- fully wired — frontend CTA never launched the SDK).

ALTER TABLE companies DROP COLUMN IF EXISTS sumsub_applicant_id;
ALTER TABLE companies ADD COLUMN didit_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_companies_didit_session_id
  ON companies(didit_session_id);
