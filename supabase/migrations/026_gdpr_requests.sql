-- 026_gdpr_requests.sql
-- GDPR audit log + one-shot anonymizer for a client's quote_request.

-- pgcrypto already enabled in 001_initial_schema.sql; digest() available.

CREATE TABLE IF NOT EXISTS gdpr_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action        text NOT NULL CHECK (action IN ('export', 'anonymize')),
  email_hash    text NOT NULL,
  admin_email   text NOT NULL,
  affected_rows int  NOT NULL DEFAULT 0,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gdpr_requests_email_hash
  ON gdpr_requests (email_hash);

CREATE INDEX IF NOT EXISTS idx_gdpr_requests_created_at
  ON gdpr_requests (created_at DESC);

-- Anonymize one quote_request end-to-end in a single transaction.
-- Returns counts for the audit log. The function runs with the caller's
-- privileges; the service-role key we use on the API side has full access.
CREATE OR REPLACE FUNCTION anonymize_quote_request(p_quote_request_id uuid)
RETURNS TABLE (
  quote_requests_updated int,
  reviews_updated        int,
  review_tokens_deleted  int,
  rate_limit_deleted     int
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_qr_count int := 0;
  v_rv_count int := 0;
  v_rt_count int := 0;
  v_rl_count int := 0;
  v_created_at timestamptz;
BEGIN
  -- Capture the creation timestamp for the rate-limit heuristic.
  SELECT created_at INTO v_created_at
    FROM quote_requests
    WHERE id = p_quote_request_id;

  IF v_created_at IS NULL THEN
    -- Row doesn't exist — caller is responsible for surfacing this.
    RETURN QUERY SELECT 0, 0, 0, 0;
    RETURN;
  END IF;

  -- 1. Redact PII on quote_requests
  UPDATE quote_requests
  SET
    client_name            = '[supprimé]',
    client_first_name      = '[supprimé]',
    client_last_name       = '[supprimé]',
    client_email           = 'deleted-' || id::text || '@anonymized.local',
    client_email_normalized= 'deleted-' || id::text || '@anonymized.local',
    client_phone           = '+00000000000',
    client_phone_normalized= '+00000000000',
    from_address           = '[supprimé]',
    to_address             = '[supprimé]',
    notes                  = NULL,
    updated_at             = now()
  WHERE id = p_quote_request_id;
  GET DIAGNOSTICS v_qr_count = ROW_COUNT;

  -- 2. Anonymize any reviews tied to this quote
  UPDATE reviews
  SET reviewer_name = '[Anonyme]'
  WHERE quote_request_id = p_quote_request_id;
  GET DIAGNOSTICS v_rv_count = ROW_COUNT;

  -- 3. Hard-delete review_tokens for this quote (the token itself is PII)
  DELETE FROM review_tokens
  WHERE quote_request_id = p_quote_request_id;
  GET DIAGNOSTICS v_rt_count = ROW_COUNT;

  -- 4. Delete rate_limit_events within ±2h of the quote creation, for the
  -- public form endpoints. Over-deletion is acceptable; under-deletion
  -- leaks an IP. Guarded with a to_regclass check so the function stays
  -- safe in environments where the table was never created.
  IF to_regclass('public.rate_limit_events') IS NOT NULL THEN
    DELETE FROM rate_limit_events
    WHERE endpoint IN ('quotes', 'verify-email', 'verify-phone')
      AND created_at BETWEEN v_created_at - interval '2 hours'
                         AND v_created_at + interval '2 hours';
    GET DIAGNOSTICS v_rl_count = ROW_COUNT;
  END IF;

  RETURN QUERY SELECT v_qr_count, v_rv_count, v_rt_count, v_rl_count;
END;
$$;
