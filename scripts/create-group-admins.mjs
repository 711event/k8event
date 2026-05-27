// create-group-admins.mjs
// Creates admin accounts for all groups with password Admin@1234
// Run: node scripts/create-group-admins.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://xrlqqxqgumomyvelylrt.supabase.co";
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const PASSWORD     = "Admin@1234";
const SUFFIX       = "@k8event.local";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// group_id → accounts to create
const ACCOUNTS = [
  // FW
  { groupId: "a0000000-0000-0000-0000-000000000002", username: "fwadmin",  role: "admin" },
  { groupId: "a0000000-0000-0000-0000-000000000002", username: "fwadmin2", role: "admin" },
  // HF
  { groupId: "a0000000-0000-0000-0000-000000000004", username: "hfadmin",  role: "admin" },
  { groupId: "a0000000-0000-0000-0000-000000000004", username: "hfadmin2", role: "admin" },
  // EC (ecadmin already exists but wrong group — handled separately below)
  { groupId: "a0000000-0000-0000-0000-000000000003", username: "ecadmin2", role: "admin" },
  // KG
  { groupId: "a0000000-0000-0000-0000-000000000005", username: "kgadmin",  role: "admin" },
  { groupId: "a0000000-0000-0000-0000-000000000005", username: "kgadmin2", role: "admin" },
  // TM
  { groupId: "a0000000-0000-0000-0000-000000000007", username: "tmadmin",  role: "admin" },
  { groupId: "a0000000-0000-0000-0000-000000000007", username: "tmadmin2", role: "admin" },
  // VG
  { groupId: "a0000000-0000-0000-0000-000000000008", username: "vgadmin",  role: "admin" },
  { groupId: "a0000000-0000-0000-0000-000000000008", username: "vgadmin2", role: "admin" },
  // DG
  { groupId: "a0000000-0000-0000-0000-000000000006", username: "dgadmin",  role: "admin" },
  { groupId: "a0000000-0000-0000-0000-000000000006", username: "dgadmin2", role: "admin" },
  // BS
  { groupId: "a0000000-0000-0000-0000-000000000009", username: "bsadmin",  role: "admin" },
  { groupId: "a0000000-0000-0000-0000-000000000009", username: "bsadmin2", role: "admin" },
];

async function createAccount({ groupId, username, role }) {
  const email = `${username}${SUFFIX}`;

  // Create auth user
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { username, display_name: username },
  });

  if (authErr) {
    if (/already/.test(authErr.message)) {
      console.log(`  ⚠️  ${username} already exists in auth — skipping`);
      return;
    }
    console.error(`  ❌ ${username} auth error: ${authErr.message}`);
    return;
  }

  // Insert profile with group_id
  const { error: profErr } = await admin.from("profiles").insert({
    user_id: created.user.id,
    role,
    username,
    display_name: username,
    group_id: groupId,
  });

  if (profErr) {
    // Rollback auth user
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
    console.error(`  ❌ ${username} profile error: ${profErr.message}`);
    return;
  }

  console.log(`  ✅ ${username} created (group: ${groupId})`);
}

async function fixEcAdmin() {
  // ecadmin exists but is bound to Test group — move it to EC group
  const { data, error } = await admin.from("profiles")
    .update({ group_id: "a0000000-0000-0000-0000-000000000003" })
    .eq("username", "ecadmin")
    .eq("role", "admin")
    .select("username");

  if (error) {
    console.error(`  ❌ ecadmin fix error: ${error.message}`);
  } else if (data?.length) {
    console.log(`  🔧 ecadmin group_id fixed → EC group`);
  } else {
    // ecadmin doesn't exist at all — create it
    console.log(`  ecadmin not found, creating...`);
    await createAccount({
      groupId: "a0000000-0000-0000-0000-000000000003",
      username: "ecadmin",
      role: "admin",
    });
  }
}

async function main() {
  console.log("Creating group admin accounts...\n");

  // Fix ecadmin first
  console.log("EC group:");
  await fixEcAdmin();

  // Create all other accounts
  const groups = ["FW","HF","EC (ecadmin2 only)","KG","TM","VG","DG","BS"];
  let gi = 0;
  let prevGroup = "";
  for (const acc of ACCOUNTS) {
    const groupName = acc.username.replace(/admin2?$/, "").toUpperCase();
    if (groupName !== prevGroup) {
      console.log(`\n${groupName === "EC" ? "EC" : groupName} group:`);
      prevGroup = groupName;
    }
    await createAccount(acc);
  }

  console.log("\nDone! All accounts created with password: Admin@1234");
}

main().catch(console.error);
