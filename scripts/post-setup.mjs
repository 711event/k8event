// Post-migration setup:
//   1) Verify tables exist
//   2) Enable Realtime publication on chat_messages, chat_threads, matches, redemption_requests
//   3) Create Storage buckets (chat-images, reward-images, team-logos, avatars)
//   4) Apply storage RLS policies
//
// Idempotent — safe to re-run.
// Usage: node --env-file=.env.local scripts/post-setup.mjs

import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { env } from "./_env.mjs";

const ref = env("SUPABASE_PROJECT_REF");
const password = env("SUPABASE_DB_PASSWORD");
const poolerHost = env("SUPABASE_POOLER_HOST");
const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");

const connStr = `postgresql://postgres.${ref}:${password}@${poolerHost}:5432/postgres`;
const sql = postgres(connStr, { prepare: false, max: 1 });

async function step(title, fn) {
  process.stdout.write(`• ${title} ... `);
  try {
    const r = await fn();
    console.log(r ?? "ok");
  } catch (e) {
    console.log("FAILED");
    console.error("  ", e.message);
    process.exitCode = 1;
  }
}

await step("Verify core tables present", async () => {
  const rows = await sql`
    select tablename from pg_tables
     where schemaname = 'public'
       and tablename in ('profiles','daily_recharge','teams','matches','predictions',
                         'token_transactions','reward_items','redemption_requests',
                         'chat_threads','chat_messages','quick_replies')
     order by tablename
  `;
  return `${rows.length}/11 tables: ${rows.map((r) => r.tablename).join(", ")}`;
});

await step("Add tables to supabase_realtime publication", async () => {
  await sql.unsafe(`
    do $$
    declare tbl text;
    begin
      for tbl in select unnest(array['chat_messages','chat_threads','matches','redemption_requests'])
      loop
        begin
          execute format('alter publication supabase_realtime add table public.%I', tbl);
        exception when duplicate_object then
          null;
        end;
      end loop;
    end $$;
  `);
  const rows = await sql`
    select tablename from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
     order by tablename
  `;
  return `realtime tables: ${rows.map((r) => r.tablename).join(", ")}`;
});

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const buckets = [
  { id: "chat-images", public: true },
  { id: "reward-images", public: true },
  { id: "team-logos", public: true },
  { id: "avatars", public: true },
];

for (const b of buckets) {
  await step(`Bucket ${b.id}`, async () => {
    const { error } = await admin.storage.createBucket(b.id, { public: b.public });
    if (error && !/already exists/i.test(error.message)) throw error;
    return error ? "exists" : "created";
  });
}

await step("Apply storage RLS policies", async () => {
  await sql.unsafe(`
    drop policy if exists "chat anon insert"   on storage.objects;
    drop policy if exists "chat agent insert"  on storage.objects;
    drop policy if exists "chat public read"   on storage.objects;
    drop policy if exists "reward admin write" on storage.objects;
    drop policy if exists "reward public read" on storage.objects;
    drop policy if exists "team admin write"   on storage.objects;
    drop policy if exists "team public read"   on storage.objects;
    drop policy if exists "avatars self write" on storage.objects;
    drop policy if exists "avatars public read" on storage.objects;

    create policy "chat anon insert"
      on storage.objects for insert to anon
      with check (bucket_id = 'chat-images' and name like 'guest/%');

    create policy "chat agent insert"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'chat-images'
        and (name like 'agent/%' or name like 'guest/%')
      );

    create policy "chat public read"
      on storage.objects for select to anon, authenticated
      using (bucket_id = 'chat-images');

    create policy "reward public read"
      on storage.objects for select to anon, authenticated
      using (bucket_id = 'reward-images');

    create policy "reward admin write"
      on storage.objects for all to authenticated
      using (bucket_id = 'reward-images' and public.auth_role() = 'admin')
      with check (bucket_id = 'reward-images' and public.auth_role() = 'admin');

    create policy "team public read"
      on storage.objects for select to anon, authenticated
      using (bucket_id = 'team-logos');

    create policy "team admin write"
      on storage.objects for all to authenticated
      using (bucket_id = 'team-logos' and public.auth_role() = 'admin')
      with check (bucket_id = 'team-logos' and public.auth_role() = 'admin');

    create policy "avatars public read"
      on storage.objects for select to anon, authenticated
      using (bucket_id = 'avatars');

    create policy "avatars self write"
      on storage.objects for all to authenticated
      using (
        bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
      )
      with check (
        bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  `);
  return "policies applied";
});

await sql.end();
console.log("\nDone.");
