"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { PlayerRow } from "./PlayerRow";
import { useLang } from "@/components/admin/LangProvider";
import { tBo } from "@/lib/i18n";

interface Player {
  user_id: string;
  username: string | null;
  display_name: string;
  phone: string | null;
  createdAt: string;
}

export function PlayersClient({ players }: { players: Player[] }) {
  const { locale } = useLang();
  const t = (k: Parameters<typeof tBo>[1], v?: Parameters<typeof tBo>[2]) => tBo(locale, k, v);
  const [q, setQ] = useState("");

  const filtered = q.trim()
    ? players.filter((p) => {
        const s = q.toLowerCase();
        return (
          (p.username ?? "").toLowerCase().includes(s) ||
          p.display_name.toLowerCase().includes(s) ||
          (p.phone ?? "").toLowerCase().includes(s)
        );
      })
    : players;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("players_search_placeholder")}
          className="w-full h-9 pl-9 pr-3 rounded-lg border border-zinc-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">{t("players_col_username")}</th>
              <th className="px-4 py-3 font-medium">{t("players_col_displayName")}</th>
              <th className="px-4 py-3 font-medium">{t("players_col_contact")}</th>
              <th className="px-4 py-3 font-medium">{t("players_col_createdAt")}</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-zinc-500 text-center">
                  {q ? t("players_not_found", { q }) : t("players_empty")}
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <PlayerRow
                  key={p.user_id}
                  userId={p.user_id}
                  username={p.username ?? ""}
                  displayName={p.display_name}
                  phone={p.phone}
                  createdAt={p.createdAt}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
