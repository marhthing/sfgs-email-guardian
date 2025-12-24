-- Migration: Add prioritized_at to email_queue for prioritization
ALTER TABLE email_queue
ADD COLUMN prioritized_at timestamptz;
