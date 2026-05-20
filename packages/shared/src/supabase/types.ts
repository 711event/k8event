// Placeholder until we run `supabase gen types typescript`.
// After Supabase is connected, regenerate this file via:
//   npx supabase gen types typescript --project-id <id> --schema public > lib/supabase/types.ts

export type UserRole = "player" | "agent" | "admin";
export type MatchStatus = "scheduled" | "locked" | "finished" | "cancelled";
export type MatchWinner = "home" | "away" | "draw";
export type PredictionPick = "home" | "away";
export type TokenReason = "match_win" | "redeem" | "admin_adjust" | "daily_checkin";
export type RedemptionStatus = "pending" | "approved" | "fulfilled" | "rejected";
export type ChatThreadStatus = "open" | "claimed" | "pending" | "closed";
export type ChatSender = "guest" | "agent" | "system";
export type ChatKind = "text" | "image";
