-- Link referral_requests to a chat_thread so the applicant can chat
-- with the admin directly from the join page (no WhatsApp needed).
-- Column was already applied to production; this migration file ensures
-- it is tracked for future fresh installs.
ALTER TABLE referral_requests
  ADD COLUMN IF NOT EXISTS chat_thread_id UUID REFERENCES chat_threads(id);
