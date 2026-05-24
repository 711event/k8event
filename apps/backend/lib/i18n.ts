export type BoLocale = "zh" | "en";

export const BO_LOCALE_COOKIE = "bo_locale";

export const boTranslations = {
  zh: {
    // Sidebar nav
    nav_overview: "总览",
    nav_players: "玩家管理",
    nav_recharge: "充值导入",
    nav_activities: "活动管理",
    nav_rewards: "奖品",
    nav_redemptions: "兑换审核",
    nav_checkins: "签到记录",
    nav_chat: "客服会话",
    nav_quickReplies: "快速回复",
    nav_roles: "角色权限",
    nav_staff: "后台账号",
    // Header
    header_title: "BO 管理后台",
    header_signOut: "退出",
    // Chat inbox tabs
    tab_open: "未处理",
    tab_pending: "跟进中",
    tab_closed: "已关闭",
    tab_all: "全部",
    // Chat inbox page
    inbox_title: "客服会话",
    inbox_subtitle: "新消息实时到达 · 点会话进入对话页 · 问题解决后请点「结束会话」",
    inbox_retentionLink: "保留策略设置 →",
    inbox_legend_viewing: "有客服正在查看",
    inbox_legend_warn: "等待超过 5 分钟",
    inbox_legend_critical: "等待超过 8 分钟",
    inbox_empty: "暂无会话",
    // Thread status labels
    status_open: "未处理",
    status_claimed: "未处理",
    status_pending: "跟进中",
    status_closed: "已关闭",
    // Thread actions
    action_markPending: "转跟进",
    action_markPending_hint: "需要时间跟进·转至跟进中列表",
    action_resolve: "✓ 已解决",
    action_resolve_hint: "问题已处理完毕·关闭此会话",
    action_close: "结束会话",
    action_close_hint: "问题已解决·结束此会话并归档",
    // Confirmations
    confirm_markPending_title: "确认转为「跟进中」?",
    confirm_markPending_body: "此会话将移至跟进中列表，等待进一步处理。",
    confirm_resolve_title: "确认标记为「已解决」?",
    confirm_resolve_body: "此会话将进入已关闭列表。",
    confirm_close_title: "确认结束此会话?",
    confirm_close_body: "结束后此会话进入「已关闭」列表，不再可回复。",
    // Players page
    players_title: "玩家管理",
    players_subtitle_count: "共 {count} 位玩家",
    players_create: "创建新玩家",
    players_col_username: "用户名",
    players_col_displayName: "显示名称",
    players_col_createdAt: "创建时间 (GMT+8)",
    players_empty: "暂无玩家",
  },
  en: {
    nav_overview: "Overview",
    nav_players: "Players",
    nav_recharge: "Recharge",
    nav_activities: "Activities",
    nav_rewards: "Rewards",
    nav_redemptions: "Redemptions",
    nav_checkins: "Check-ins",
    nav_chat: "Chat Support",
    nav_quickReplies: "Quick Replies",
    nav_roles: "Roles & Permissions",
    nav_staff: "Staff Accounts",
    header_title: "Admin Panel",
    header_signOut: "Sign out",
    tab_open: "Open",
    tab_pending: "Pending",
    tab_closed: "Closed",
    tab_all: "All",
    inbox_title: "Chat Support",
    inbox_subtitle: "New messages arrive in real time · Click a thread to open it · Close threads when resolved",
    inbox_retentionLink: "Retention settings →",
    inbox_legend_viewing: "Agent currently viewing",
    inbox_legend_warn: "Waiting over 5 minutes",
    inbox_legend_critical: "Waiting over 8 minutes",
    inbox_empty: "No threads",
    status_open: "Open",
    status_claimed: "Open",
    status_pending: "Pending",
    status_closed: "Closed",
    action_markPending: "Mark Pending",
    action_markPending_hint: "Needs follow-up · Move to pending list",
    action_resolve: "✓ Resolved",
    action_resolve_hint: "Issue handled · Close this thread",
    action_close: "Close Thread",
    action_close_hint: "Issue resolved · End and archive this thread",
    confirm_markPending_title: "Mark as Pending?",
    confirm_markPending_body: "This thread will move to the pending list for follow-up.",
    confirm_resolve_title: "Mark as Resolved?",
    confirm_resolve_body: "This thread will be moved to the closed list.",
    confirm_close_title: "Close this thread?",
    confirm_close_body: "This thread will be archived and no longer accepting replies.",
    players_title: "Players",
    players_subtitle_count: "{count} players total",
    players_create: "Create Player",
    players_col_username: "Username",
    players_col_displayName: "Display Name",
    players_col_createdAt: "Created (GMT+8)",
    players_empty: "No players found",
  },
} as const satisfies Record<BoLocale, Record<string, string>>;

export type BoKey = keyof (typeof boTranslations)["zh"];

/** Look up a translation key, with optional {count} interpolation */
export function tBo(locale: BoLocale, key: BoKey, vars?: Record<string, string | number>): string {
  const str = (boTranslations[locale] as Record<string, string>)[key] ?? key;
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}
