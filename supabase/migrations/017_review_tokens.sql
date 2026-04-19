-- 017_review_tokens.sql
-- Unique one-time tokens for clients to leave a verified review 7 days after
-- their move_date. One token per (quote_request, company) pair — a client
-- gets one opportunity per mover they actually hired.

CREATE TABLE review_tokens (
  token             TEXT PRIMARY KEY,
  quote_request_id  UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at           TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ NOT NULL,
  UNIQUE(quote_request_id, company_id)
);

CREATE INDEX review_tokens_quote_idx ON review_tokens(quote_request_id);
CREATE INDEX review_tokens_expires_idx ON review_tokens(expires_at)
  WHERE used_at IS NULL;

ALTER TABLE quote_requests
  ADD COLUMN review_email_sent_at TIMESTAMPTZ;
