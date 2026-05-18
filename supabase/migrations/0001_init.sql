-- ============================================================
-- k8event MVP — initial schema
-- World Cup token-guessing + LiveChat
-- All "daily" date logic is interpreted in Asia/Kuala_Lumpur (GMT+8).
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ============================================================
-- 1. Profiles and roles
-- ============================================================

create type user_role as enum ('player', 'agent', 'admin');

create table profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  role         user_role not null default 'player',
  username     citext unique,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz not null default now()
);
create index profiles_role_idx on profiles(role);

create or replace function auth_role() returns user_role
language sql stable as $$
  select role from profiles where user_id = auth.uid()
$$;

-- ============================================================
-- 2. Daily recharge
-- ============================================================

create table daily_recharge (
  player_id     uuid not null references profiles(user_id) on delete cascade,
  recharge_date date not null,           -- GMT+8 date
  amount        numeric(12,2) not null check (amount >= 0),
  source        text,                    -- 'csv' | 'manual'
  imported_by   uuid references profiles(user_id),
  imported_at   timestamptz not null default now(),
  primary key (player_id, recharge_date)
);
create index daily_recharge_date_idx on daily_recharge(recharge_date);

create or replace function is_eligible(p_player uuid, p_date date) returns boolean
language sql stable as $$
  select exists(
    select 1 from daily_recharge
     where player_id = p_player
       and recharge_date = p_date
       and amount >= 500
  )
$$;

-- ============================================================
-- 3. Teams and matches
-- ============================================================

create table teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  short_code text,
  logo_url   text,
  created_at timestamptz not null default now()
);

create type match_status as enum ('scheduled', 'locked', 'finished', 'cancelled');
create type match_winner as enum ('home', 'away', 'draw');

create table matches (
  id            uuid primary key default gen_random_uuid(),
  home_team_id  uuid not null references teams(id),
  away_team_id  uuid not null references teams(id),
  kickoff_at    timestamptz not null,
  token_reward  integer not null check (token_reward > 0),
  status        match_status not null default 'scheduled',
  result        match_winner,
  settled_at    timestamptz,
  created_by    uuid references profiles(user_id),
  created_at    timestamptz not null default now(),
  constraint matches_distinct_teams check (home_team_id <> away_team_id)
);
create index matches_kickoff_idx on matches(kickoff_at);
create index matches_status_idx on matches(status);

-- ============================================================
-- 4. Predictions
-- ============================================================

create type prediction_pick as enum ('home', 'away');

create table predictions (
  match_id     uuid not null references matches(id) on delete cascade,
  player_id    uuid not null references profiles(user_id) on delete cascade,
  pick         prediction_pick not null,
  is_correct   boolean,
  awarded      integer default 0,
  submitted_at timestamptz not null default now(),
  primary key (match_id, player_id)
);
create index predictions_player_idx on predictions(player_id);

-- Enforce: match scheduled, before kickoff, player eligible for that GMT+8 date
create or replace function check_prediction_insert() returns trigger
language plpgsql as $$
declare
  v_status     match_status;
  v_kickoff    timestamptz;
  v_match_date date;
begin
  select status, kickoff_at
    into v_status, v_kickoff
    from matches
   where id = new.match_id;

  if v_status is null then
    raise exception 'Match not found';
  end if;
  if v_status <> 'scheduled' then
    raise exception 'Match is not open for predictions';
  end if;
  if now() >= v_kickoff then
    raise exception 'Match has already started';
  end if;

  v_match_date := (v_kickoff at time zone 'Asia/Kuala_Lumpur')::date;
  if not is_eligible(new.player_id, v_match_date) then
    raise exception 'Player not eligible: daily recharge < 500 on %', v_match_date;
  end if;

  return new;
end $$;

create trigger trg_predictions_before_insert
  before insert on predictions
  for each row execute function check_prediction_insert();

-- ============================================================
-- 5. Tokens
-- ============================================================

create type token_reason as enum ('match_win', 'redeem', 'admin_adjust');

create table token_transactions (
  id            bigserial primary key,
  player_id     uuid not null references profiles(user_id) on delete cascade,
  delta         integer not null,
  reason        token_reason not null,
  match_id      uuid references matches(id),
  redemption_id uuid,
  note          text,
  created_at    timestamptz not null default now()
);
create index token_tx_player_idx on token_transactions(player_id, created_at desc);

-- Current spendable balance
create view token_balances as
  select player_id, coalesce(sum(delta), 0)::int as balance
    from token_transactions
   group by player_id;

-- All-time earned (for leaderboard) — positive contributions only
create view token_earned as
  select player_id, coalesce(sum(delta), 0)::int as earned
    from token_transactions
   where delta > 0
     and reason in ('match_win', 'admin_adjust')
   group by player_id;

-- ============================================================
-- 6. Reward shop and redemptions
-- ============================================================

create table reward_items (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  image_url   text,
  cost        integer not null check (cost > 0),
  stock       integer not null default 0,    -- -1 = unlimited
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create type redemption_status as enum ('pending', 'approved', 'fulfilled', 'rejected');

create table redemption_requests (
  id              uuid primary key default gen_random_uuid(),
  player_id       uuid not null references profiles(user_id),
  item_id         uuid not null references reward_items(id),
  cost_at_request integer not null,
  status          redemption_status not null default 'pending',
  note            text,
  created_at      timestamptz not null default now(),
  decided_by      uuid references profiles(user_id),
  decided_at      timestamptz
);
create index redemption_status_idx on redemption_requests(status, created_at desc);

alter table token_transactions
  add constraint token_tx_redemption_fk
  foreign key (redemption_id) references redemption_requests(id);

-- ============================================================
-- 7. LiveChat
-- ============================================================

create type chat_thread_status as enum ('open', 'claimed', 'closed');

create table chat_threads (
  id              uuid primary key default gen_random_uuid(),
  guest_session   text not null unique,           -- HttpOnly cookie value
  guest_name      text,
  status          chat_thread_status not null default 'open',
  claimed_by      uuid references profiles(user_id),
  last_message_at timestamptz,
  created_at      timestamptz not null default now()
);
create index chat_threads_status_idx on chat_threads(status, last_message_at desc);

create type chat_sender as enum ('guest', 'agent', 'system');
create type chat_kind   as enum ('text', 'image');

create table chat_messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references chat_threads(id) on delete cascade,
  sender     chat_sender not null,
  agent_id   uuid references profiles(user_id),
  kind       chat_kind not null,
  body       text,
  image_url  text,
  width      int,
  height     int,
  client_id  text,
  created_at timestamptz not null default now()
);
create index chat_messages_thread_idx on chat_messages(thread_id, created_at);

-- Touch chat_threads.last_message_at on new message
create or replace function touch_thread_last_message() returns trigger
language plpgsql as $$
begin
  update chat_threads
     set last_message_at = new.created_at
   where id = new.thread_id;
  return new;
end $$;

create trigger trg_chat_messages_touch
  after insert on chat_messages
  for each row execute function touch_thread_last_message();

create table quick_replies (
  id         uuid primary key default gen_random_uuid(),
  title      text not null unique check (title ~ '^\+\+[A-Z0-9_]+$'),
  body       text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 8. Core RPCs (security definer)
-- ============================================================

-- 8.1 settle_match: enter result, mark predictions, award tokens, mark finished.
create or replace function settle_match(p_match_id uuid, p_result match_winner)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward int;
  v_status match_status;
begin
  select token_reward, status
    into v_reward, v_status
    from matches
   where id = p_match_id
   for update;

  if v_status is null then
    raise exception 'Match not found';
  end if;
  if v_status = 'finished' then
    raise exception 'Match already settled';
  end if;

  if p_result not in ('home', 'away') then
    update matches
       set status = 'finished',
           result = p_result,
           settled_at = now()
     where id = p_match_id;
    return;
  end if;

  update predictions
     set is_correct = (pick::text = p_result::text),
         awarded    = case when pick::text = p_result::text then v_reward else 0 end
   where match_id = p_match_id;

  insert into token_transactions (player_id, delta, reason, match_id, note)
  select player_id, v_reward, 'match_win', p_match_id, 'Correct prediction'
    from predictions
   where match_id = p_match_id
     and is_correct;

  update matches
     set status = 'finished',
         result = p_result,
         settled_at = now()
   where id = p_match_id;
end $$;

revoke all on function settle_match(uuid, match_winner) from public;
grant execute on function settle_match(uuid, match_winner) to authenticated;

-- 8.2 request_redemption: atomic stock + token check, create pending request.
create or replace function request_redemption(p_item uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player uuid := auth.uid();
  v_cost   int;
  v_stock  int;
  v_active boolean;
  v_balance int;
  v_redemption_id uuid;
begin
  if v_player is null then
    raise exception 'Not authenticated';
  end if;

  select cost, stock, is_active
    into v_cost, v_stock, v_active
    from reward_items
   where id = p_item
   for update;

  if v_cost is null then
    raise exception 'Item not found';
  end if;
  if not v_active then
    raise exception 'Item is not available';
  end if;
  if v_stock = 0 then
    raise exception 'Item out of stock';
  end if;

  select balance into v_balance from token_balances where player_id = v_player;
  if coalesce(v_balance, 0) < v_cost then
    raise exception 'Insufficient tokens';
  end if;

  -- decrement stock unless unlimited
  if v_stock > 0 then
    update reward_items set stock = stock - 1 where id = p_item;
  end if;

  v_redemption_id := gen_random_uuid();
  insert into redemption_requests (id, player_id, item_id, cost_at_request, status)
  values (v_redemption_id, v_player, p_item, v_cost, 'pending');

  insert into token_transactions (player_id, delta, reason, redemption_id, note)
  values (v_player, -v_cost, 'redeem', v_redemption_id, 'Redemption requested');

  return v_redemption_id;
end $$;

revoke all on function request_redemption(uuid) from public;
grant execute on function request_redemption(uuid) to authenticated;

-- 8.3 decide_redemption: admin transitions status; rejected refunds tokens.
create or replace function decide_redemption(p_id uuid, p_status redemption_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current redemption_status;
  v_player uuid;
  v_cost int;
  v_item uuid;
begin
  if auth_role() <> 'admin' then
    raise exception 'Forbidden';
  end if;
  if p_status not in ('approved', 'fulfilled', 'rejected') then
    raise exception 'Invalid status';
  end if;

  select status, player_id, cost_at_request, item_id
    into v_current, v_player, v_cost, v_item
    from redemption_requests
   where id = p_id
   for update;

  if v_current is null then
    raise exception 'Redemption not found';
  end if;
  if v_current = p_status then
    return;
  end if;
  if v_current in ('fulfilled', 'rejected') then
    raise exception 'Redemption already finalized';
  end if;

  if p_status = 'rejected' then
    -- refund tokens
    insert into token_transactions (player_id, delta, reason, redemption_id, note)
    values (v_player, v_cost, 'redeem', p_id, 'Redemption rejected — refund');
    -- restore stock if not unlimited
    update reward_items
       set stock = stock + 1
     where id = v_item and stock >= 0;
  end if;

  update redemption_requests
     set status = p_status,
         decided_by = auth.uid(),
         decided_at = now()
   where id = p_id;
end $$;

revoke all on function decide_redemption(uuid, redemption_status) from public;
grant execute on function decide_redemption(uuid, redemption_status) to authenticated;

-- ============================================================
-- 9. RLS policies
-- ============================================================

alter table profiles enable row level security;
create policy "profiles self read"  on profiles for select using (user_id = auth.uid());
create policy "profiles admin all"  on profiles for all    using (auth_role() = 'admin') with check (auth_role() = 'admin');

alter table daily_recharge enable row level security;
create policy "recharge self read"   on daily_recharge for select using (player_id = auth.uid());
create policy "recharge admin all"   on daily_recharge for all    using (auth_role() = 'admin') with check (auth_role() = 'admin');

alter table teams enable row level security;
create policy "teams read all"  on teams for select using (true);
create policy "teams admin write" on teams for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

alter table matches enable row level security;
create policy "matches read all"    on matches for select using (true);
create policy "matches admin write" on matches for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

alter table predictions enable row level security;
create policy "predictions self read"   on predictions for select using (player_id = auth.uid());
create policy "predictions self insert" on predictions for insert with check (player_id = auth.uid());
create policy "predictions admin read"  on predictions for select using (auth_role() = 'admin');

alter table token_transactions enable row level security;
create policy "tx self read"  on token_transactions for select using (player_id = auth.uid());
create policy "tx admin read" on token_transactions for select using (auth_role() = 'admin');
-- inserts only via security-definer RPCs (settle_match, request_redemption, decide_redemption)

alter table reward_items enable row level security;
create policy "items read active"  on reward_items for select using (is_active or auth_role() = 'admin');
create policy "items admin write"  on reward_items for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

alter table redemption_requests enable row level security;
create policy "red self read"  on redemption_requests for select using (player_id = auth.uid());
create policy "red admin all"  on redemption_requests for all using (auth_role() = 'admin') with check (auth_role() = 'admin');
-- inserts via request_redemption RPC; status transitions via decide_redemption

alter table chat_threads enable row level security;
create policy "threads agent read"  on chat_threads for select using (auth_role() in ('agent','admin'));
create policy "threads agent write" on chat_threads for all using (auth_role() in ('agent','admin')) with check (auth_role() in ('agent','admin'));
create policy "threads guest read"  on chat_threads for select
  using (
    guest_session = (current_setting('request.headers', true)::json ->> 'x-guest-token')
  );

alter table chat_messages enable row level security;
create policy "msgs agent read"   on chat_messages for select using (auth_role() in ('agent','admin'));
create policy "msgs agent insert" on chat_messages for insert with check (
  auth_role() in ('agent','admin') and sender in ('agent','system')
);
create policy "msgs guest read"   on chat_messages for select
  using (
    thread_id in (
      select id from chat_threads
       where guest_session = (current_setting('request.headers', true)::json ->> 'x-guest-token')
    )
  );
-- guest inserts go through service-role API route only (no direct anon insert)

alter table quick_replies enable row level security;
create policy "qr agent read"   on quick_replies for select using (auth_role() in ('agent','admin'));
create policy "qr admin write"  on quick_replies for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ============================================================
-- 10. Realtime publication
-- ============================================================
-- Run separately in Supabase Studio if alter publication is not allowed in migration:
-- alter publication supabase_realtime add table chat_messages, chat_threads, matches, redemption_requests;
