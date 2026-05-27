-- Add phone/contact field to player profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;
