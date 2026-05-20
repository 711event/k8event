// Hand-maintained Database type matching supabase/migrations/0001_init.sql.
// Replace with `supabase gen types typescript ...` output once a PAT is available.

import type {
  ChatKind,
  ChatSender,
  ChatThreadStatus,
  MatchStatus,
  MatchWinner,
  PredictionPick,
  RedemptionStatus,
  TokenReason,
  UserRole,
} from "./types";

type ActivityType =
  | "worldcup_prediction"
  | "daily_checkin"
  | "lucky_draw"
  | "spin_wheel"
  | "deposit_mission"
  | "referral_mission";

type Timestamp = string;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          role: UserRole;
          username: string | null;
          display_name: string;
          avatar_url: string | null;
          created_at: Timestamp;
        };
        Insert: {
          user_id: string;
          role?: UserRole;
          username?: string | null;
          display_name: string;
          avatar_url?: string | null;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      daily_recharge: {
        Row: {
          player_id: string;
          recharge_date: string;
          amount: number;
          source: string | null;
          imported_by: string | null;
          imported_at: Timestamp;
        };
        Insert: {
          player_id: string;
          recharge_date: string;
          amount: number;
          source?: string | null;
          imported_by?: string | null;
          imported_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["daily_recharge"]["Insert"]>;
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          short_code: string | null;
          logo_url: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          name: string;
          short_code?: string | null;
          logo_url?: string | null;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["teams"]["Insert"]>;
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          home_team_id: string;
          away_team_id: string;
          kickoff_at: Timestamp;
          token_reward: number;
          status: MatchStatus;
          result: MatchWinner | null;
          stage: string | null;
          settled_at: Timestamp | null;
          created_by: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          home_team_id: string;
          away_team_id: string;
          kickoff_at: Timestamp;
          token_reward: number;
          status?: MatchStatus;
          result?: MatchWinner | null;
          stage?: string | null;
          settled_at?: Timestamp | null;
          created_by?: string | null;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["matches"]["Insert"]>;
        Relationships: [];
      };
      predictions: {
        Row: {
          match_id: string;
          player_id: string;
          pick: PredictionPick;
          is_correct: boolean | null;
          awarded: number | null;
          submitted_at: Timestamp;
        };
        Insert: {
          match_id: string;
          player_id: string;
          pick: PredictionPick;
          is_correct?: boolean | null;
          awarded?: number | null;
          submitted_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["predictions"]["Insert"]>;
        Relationships: [];
      };
      token_transactions: {
        Row: {
          id: number;
          player_id: string;
          delta: number;
          reason: TokenReason;
          match_id: string | null;
          redemption_id: string | null;
          note: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: number;
          player_id: string;
          delta: number;
          reason: TokenReason;
          match_id?: string | null;
          redemption_id?: string | null;
          note?: string | null;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["token_transactions"]["Insert"]>;
        Relationships: [];
      };
      reward_items: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          image_url: string | null;
          cost: number;
          stock: number;
          is_active: boolean;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          cost: number;
          stock?: number;
          is_active?: boolean;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["reward_items"]["Insert"]>;
        Relationships: [];
      };
      redemption_requests: {
        Row: {
          id: string;
          player_id: string;
          item_id: string;
          cost_at_request: number;
          status: RedemptionStatus;
          note: string | null;
          created_at: Timestamp;
          decided_by: string | null;
          decided_at: Timestamp | null;
        };
        Insert: {
          id?: string;
          player_id: string;
          item_id: string;
          cost_at_request: number;
          status?: RedemptionStatus;
          note?: string | null;
          created_at?: Timestamp;
          decided_by?: string | null;
          decided_at?: Timestamp | null;
        };
        Update: Partial<Database["public"]["Tables"]["redemption_requests"]["Insert"]>;
        Relationships: [];
      };
      chat_threads: {
        Row: {
          id: string;
          guest_session: string;
          player_id: string | null;
          guest_name: string | null;
          status: ChatThreadStatus;
          claimed_by: string | null;
          last_message_at: Timestamp | null;
          last_message_body: string | null;
          last_message_kind: ChatKind | null;
          last_message_sender: ChatSender | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          guest_session: string;
          player_id?: string | null;
          guest_name?: string | null;
          status?: ChatThreadStatus;
          claimed_by?: string | null;
          last_message_at?: Timestamp | null;
          last_message_body?: string | null;
          last_message_kind?: ChatKind | null;
          last_message_sender?: ChatSender | null;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["chat_threads"]["Insert"]>;
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          thread_id: string;
          sender: ChatSender;
          agent_id: string | null;
          kind: ChatKind;
          body: string | null;
          image_url: string | null;
          width: number | null;
          height: number | null;
          client_id: string | null;
          read_at: Timestamp | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          thread_id: string;
          sender: ChatSender;
          agent_id?: string | null;
          kind: ChatKind;
          body?: string | null;
          image_url?: string | null;
          width?: number | null;
          height?: number | null;
          client_id?: string | null;
          read_at?: Timestamp | null;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["chat_messages"]["Insert"]>;
        Relationships: [];
      };
      chat_retention_settings: {
        Row: {
          id: string;
          message_retention_days: number;
          media_retention_days: number;
          archive_closed_threads_after_days: number;
          warn_after_minutes: number;
          critical_after_minutes: number;
          updated_by: string | null;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          message_retention_days?: number;
          media_retention_days?: number;
          archive_closed_threads_after_days?: number;
          warn_after_minutes?: number;
          critical_after_minutes?: number;
          updated_by?: string | null;
          updated_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["chat_retention_settings"]["Insert"]>;
        Relationships: [];
      };
      quick_replies: {
        Row: {
          id: string;
          title: string;
          body: string;
          sort_order: number;
          is_active: boolean;
          image_url: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          title: string;
          body: string;
          sort_order?: number;
          is_active?: boolean;
          image_url?: string | null;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["quick_replies"]["Insert"]>;
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          type: ActivityType;
          name: string;
          slug: string | null;
          description: string | null;
          banner_url: string | null;
          rules: string | null;
          start_at: Timestamp | null;
          end_at: Timestamp | null;
          is_active: boolean;
          is_visible: boolean;
          sort_order: number;
          settings: Record<string, unknown>;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          type: ActivityType;
          name: string;
          slug?: string | null;
          description?: string | null;
          banner_url?: string | null;
          rules?: string | null;
          start_at?: Timestamp | null;
          end_at?: Timestamp | null;
          is_active?: boolean;
          is_visible?: boolean;
          sort_order?: number;
          settings?: Record<string, unknown>;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["activities"]["Insert"]>;
        Relationships: [];
      };
      player_checkins: {
        Row: {
          id: string;
          player_id: string;
          activity_id: string;
          checkin_date: string;
          streak_day: number;
          tokens_awarded: number;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          player_id: string;
          activity_id: string;
          checkin_date: string;
          streak_day?: number;
          tokens_awarded?: number;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["player_checkins"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      token_balances: {
        Row: { player_id: string; balance: number };
        Relationships: [];
      };
      token_earned: {
        Row: { player_id: string; earned: number };
        Relationships: [];
      };
    };
    Functions: {
      auth_role: { Args: Record<string, never>; Returns: UserRole };
      is_eligible: { Args: { p_player: string; p_date: string }; Returns: boolean };
      settle_match: {
        Args: { p_match_id: string; p_result: MatchWinner };
        Returns: undefined;
      };
      request_redemption: { Args: { p_item: string }; Returns: string };
      decide_redemption: {
        Args: { p_id: string; p_status: RedemptionStatus };
        Returns: undefined;
      };
      perform_checkin: {
        Args: { p_activity_id: string };
        Returns: { streak_day: number; tokens_awarded: number };
      };
    };
    Enums: {
      activity_type: ActivityType;
      user_role: UserRole;
      match_status: MatchStatus;
      match_winner: MatchWinner;
      prediction_pick: PredictionPick;
      token_reason: TokenReason;
      redemption_status: RedemptionStatus;
      chat_thread_status: ChatThreadStatus;
      chat_sender: ChatSender;
      chat_kind: ChatKind;
    };
    CompositeTypes: Record<string, never>;
  };
};
