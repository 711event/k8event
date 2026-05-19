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
          guest_name: string | null;
          status: ChatThreadStatus;
          claimed_by: string | null;
          last_message_at: Timestamp | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          guest_session: string;
          guest_name?: string | null;
          status?: ChatThreadStatus;
          claimed_by?: string | null;
          last_message_at?: Timestamp | null;
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
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["chat_messages"]["Insert"]>;
        Relationships: [];
      };
      quick_replies: {
        Row: {
          id: string;
          title: string;
          body: string;
          sort_order: number;
          is_active: boolean;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          title: string;
          body: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["quick_replies"]["Insert"]>;
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
    };
    Enums: {
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
