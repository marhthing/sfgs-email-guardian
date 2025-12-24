-- Migration: Add subject, message, attachments, queued_at to email_queue
ALTER TABLE email_queue
ADD COLUMN subject text,
ADD COLUMN message text,
ADD COLUMN attachments jsonb,
ADD COLUMN queued_at timestamptz DEFAULT now();
