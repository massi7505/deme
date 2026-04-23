-- 027_gdpr_anonymize_batch.sql
-- True single-transaction batch anonymizer. The singular variant shipped in
-- migration 026 runs one tx per id; if the API loops over it, a mid-batch
-- failure leaves the earlier ids committed and later ones rolled back — which
-- contradicts the GDPR spec's atomic-rollback guarantee.
-- This plural function iterates inside plpgsql, so the whole batch shares a
-- single implicit transaction.

CREATE OR REPLACE FUNCTION anonymize_quote_requests(p_quote_request_ids uuid[])
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
  v_id uuid;
  v_created_at timestamptz;
  v_step int;
BEGIN
  FOREACH v_id IN ARRAY p_quote_request_ids LOOP
    SELECT created_at INTO v_created_at
      FROM quote_requests
      WHERE id = v_id;

    -- Ghost id — skip silently, caller is responsible for surfacing mismatch.
    IF v_created_at IS NULL THEN
      CONTINUE;
    END IF;

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
    WHERE id = v_id;
    GET DIAGNOSTICS v_step = ROW_COUNT;
    v_qr_count := v_qr_count + v_step;

    UPDATE reviews
    SET reviewer_name = '[Anonyme]'
    WHERE quote_request_id = v_id;
    GET DIAGNOSTICS v_step = ROW_COUNT;
    v_rv_count := v_rv_count + v_step;

    DELETE FROM review_tokens
    WHERE quote_request_id = v_id;
    GET DIAGNOSTICS v_step = ROW_COUNT;
    v_rt_count := v_rt_count + v_step;

    IF to_regclass('public.rate_limit_events') IS NOT NULL THEN
      DELETE FROM rate_limit_events
      WHERE endpoint IN ('quotes', 'verify-email', 'verify-phone')
        AND created_at BETWEEN v_created_at - interval '2 hours'
                           AND v_created_at + interval '2 hours';
      GET DIAGNOSTICS v_step = ROW_COUNT;
      v_rl_count := v_rl_count + v_step;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_qr_count, v_rv_count, v_rt_count, v_rl_count;
END;
$$;
