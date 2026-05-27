import type { AuthedUser, AdminPermissions } from "./get-user";

/** Permissions for the built-in "agent" role */
const AGENT_PERMISSIONS: AdminPermissions = {
  overview: false,
  players: false,
  recharge: false,
  activities: false,
  rewards: false,
  redemptions: false,
  checkins: false,
  referrals: false,
  chat: true,
  quick_replies: true,
  roles: false,
  staff: false,
};

/**
 * Returns true if the user has access to the given module.
 * - player → always false
 * - agent  → chat + quick_replies only (hardcoded)
 * - admin, no role assigned (permissions = null) → unrestricted
 * - admin, role assigned → check permissions JSONB
 */
export function hasPermission(user: AuthedUser, module: string): boolean {
  if (user.role === "player") return false;
  if (user.role === "agent") return AGENT_PERMISSIONS[module] ?? false;
  // admin
  if (user.permissions === null) return true; // unrestricted
  return user.permissions[module] ?? false;
}
