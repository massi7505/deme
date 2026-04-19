-- 018_review_reply.sql
-- Adds optional mover reply to a review. One reply per review (no thread).

ALTER TABLE reviews
  ADD COLUMN mover_reply      TEXT,
  ADD COLUMN mover_reply_at   TIMESTAMPTZ;
