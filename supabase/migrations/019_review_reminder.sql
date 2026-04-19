-- 019_review_reminder.sql
-- Tracks when a reminder email was sent for un-answered review invitations.
-- Reminder fires 14 days after the initial review email if the client never
-- clicked through on any of the tokens for this lead.

ALTER TABLE quote_requests
  ADD COLUMN review_reminder_sent_at TIMESTAMPTZ;
