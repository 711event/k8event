-- ============================================================
-- 0037_referral_system.sql
-- Referral / invite system
-- ============================================================

-- 1. Add referral token_reason
ALTER TYPE token_reason ADD VALUE IF NOT EXISTS 'referral';

-- 2. Add referred_by to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(user_id);

-- 3. Per-group referral settings
CREATE TABLE IF NOT EXISTS referral_settings (
  group_id              UUID    PRIMARY KEY REFERENCES groups(id) ON DELETE CASCADE,
  enabled               BOOLEAN NOT NULL DEFAULT true,
  -- 'on_register' | 'on_first_recharge' | 'on_min_recharge'
  trigger_type          TEXT    NOT NULL DEFAULT 'on_first_recharge',
  min_recharge_amount   INTEGER NOT NULL DEFAULT 0,
  referrer_token_reward INTEGER NOT NULL DEFAULT 50,
  -- 'link_only' | 'link_and_card'
  share_mode            TEXT    NOT NULL DEFAULT 'link_and_card',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE referral_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage referral_settings" ON referral_settings
  FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "public read referral_settings" ON referral_settings
  FOR SELECT USING (true);

-- Seed one row per existing group (defaults apply)
INSERT INTO referral_settings (group_id)
SELECT id FROM groups
ON CONFLICT (group_id) DO NOTHING;

-- 4. Referral requests (join form submissions)
CREATE TABLE IF NOT EXISTS referral_requests (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id          UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  phone             TEXT        NOT NULL,
  ref_username      TEXT        NOT NULL,  -- referrer's username (from URL param)
  referrer_id       UUID        REFERENCES profiles(user_id),  -- resolved at submit
  status            TEXT        NOT NULL DEFAULT 'pending',  -- pending|approved|rejected
  player_id         UUID        REFERENCES profiles(user_id), -- set when approved
  referrer_rewarded BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE referral_requests ENABLE ROW LEVEL SECURITY;
-- Admins can manage all
CREATE POLICY "admins manage referral_requests" ON referral_requests
  FOR ALL USING (auth_role() = 'admin');
-- Public (unauthenticated) can submit a join request
CREATE POLICY "public insert referral_request" ON referral_requests
  FOR INSERT WITH CHECK (true);

-- 5. RPC: process referral rewards after recharge import
--    Called with a list of player IDs that just had recharges imported.
CREATE OR REPLACE FUNCTION process_referral_rewards(p_player_ids uuid[])
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r         RECORD;
  v_trigger TEXT;
  v_min_amt INTEGER;
  v_reward  INTEGER;
  v_should  BOOLEAN;
BEGIN
  FOR r IN
    SELECT
      rr.id           AS req_id,
      rr.referrer_id,
      rr.player_id,
      rr.group_id
    FROM referral_requests rr
    WHERE rr.player_id = ANY(p_player_ids)
      AND rr.status = 'approved'
      AND rr.referrer_rewarded = false
      AND rr.referrer_id IS NOT NULL
  LOOP
    -- Read group settings
    SELECT trigger_type, min_recharge_amount, referrer_token_reward
      INTO v_trigger, v_min_amt, v_reward
      FROM referral_settings
     WHERE group_id = r.group_id AND enabled = true;

    IF NOT FOUND THEN CONTINUE; END IF;
    -- on_register is handled at account creation time, skip here
    IF v_trigger = 'on_register' THEN CONTINUE; END IF;

    v_should := false;

    IF v_trigger = 'on_first_recharge' THEN
      v_should := EXISTS (
        SELECT 1 FROM daily_recharge WHERE player_id = r.player_id LIMIT 1
      );
    ELSIF v_trigger = 'on_min_recharge' THEN
      v_should := EXISTS (
        SELECT 1 FROM daily_recharge
         WHERE player_id = r.player_id AND amount >= v_min_amt LIMIT 1
      );
    END IF;

    IF v_should THEN
      INSERT INTO token_transactions (player_id, delta, reason, note)
      VALUES (r.referrer_id, v_reward, 'referral',
              'Referral reward — friend ' || r.player_id::text || ' first recharge');

      UPDATE referral_requests SET referrer_rewarded = true WHERE id = r.req_id;
    END IF;
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION process_referral_rewards(uuid[]) TO service_role;
