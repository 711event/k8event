// Create a Supabase auth user + profile row (admin / agent / player).
// Usage:
//   node --env-file=.env.local scripts/create-user.mjs <username> <password> <role> [display-name]
// role: admin | agent | player
//
// Username is mapped to synthetic email <username>@k8event.local for Supabase Auth.
// If user already exists, this script promotes their role to the one specified.

import { createClient } from "@supabase/supabase-js";
import { env } from "./_env.mjs";

const [, , username, password, role, displayNameArg] = process.argv;
if (!username || !password || !role) {
  console.error("usage: node --env-file=.env.local scripts/create-user.mjs <username> <password> <role> [display-name]");
  process.exit(2);
}
if (!/^[a-zA-Z0-9_]+$/.test(username)) {
  console.error("username must match /^[a-zA-Z0-9_]+$/");
  process.exit(2);
}
if (!["admin", "agent", "player"].includes(role)) {
  console.error("role must be admin | agent | player");
  process.exit(2);
}

const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_ROLE = env("SUPABASE_SERVICE_ROLE_KEY");
const email = `${username}@k8event.local`;
const displayName = displayNameArg ?? username;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: listed, error: listErr } = await admin.auth.admin.listUsers();
if (listErr) {
  console.error("listUsers failed:", listErr.message);
  process.exit(1);
}
let userId = listed.users.find((u) => u.email === email)?.id;

if (!userId) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, display_name: displayName },
  });
  if (error) {
    console.error("createUser failed:", error.message);
    process.exit(1);
  }
  userId = data.user.id;
  console.log(`✓ auth user created: ${email} (id=${userId})`);
} else {
  console.log(`• auth user exists: ${email} (id=${userId})`);
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) console.warn("  (could not reset password:", error.message + ")");
  else console.log("  password reset to provided value");
}

const { error: profErr } = await admin.from("profiles").upsert(
  {
    user_id: userId,
    role,
    username,
    display_name: displayName,
  },
  { onConflict: "user_id" },
);
if (profErr) {
  console.error("profile upsert failed:", profErr.message);
  process.exit(1);
}
console.log(`✓ profile upserted: role=${role}, username=${username}, display_name=${displayName}`);

console.log("\nLogin with:");
console.log(`  username: ${username}`);
console.log(`  password: ${password}`);
