"use client";

import { useMemo, useState, useTransition } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  importRechargeAction,
  previewRechargeAction,
  type PreviewRow,
} from "./actions";

type ParsedRow = { date: string; username: string; amount: number };

// ─── CSV parser ───────────────────────────────────────────────────────────────
function parseCsv(text: string): { rows: ParsedRow[]; errors: string[] } {
  const errors: string[] = [];
  const out: ParsedRow[] = [];
  const parsed = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });

  for (let i = 0; i < parsed.data.length; i++) {
    const cols = parsed.data[i];
    if (!cols || !cols.length) continue;
    const [c0, c1, c2] = cols.map((c) => (c ?? "").toString().trim());
    // skip header row
    if (i === 0 && /^date$/i.test(c0) && /^username$/i.test(c1)) continue;

    if (!c0 || !c1 || !c2) {
      errors.push(`Row ${i + 1}: missing fields`);
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c0)) {
      errors.push(`Row ${i + 1}: bad date "${c0}" (need YYYY-MM-DD)`);
      continue;
    }
    const amt = Number(c2);
    if (!Number.isFinite(amt) || amt < 0) {
      errors.push(`Row ${i + 1}: bad amount "${c2}"`);
      continue;
    }
    out.push({ date: c0, username: c1, amount: amt });
  }
  return { rows: out, errors };
}

// ─── Excel date → YYYY-MM-DD ──────────────────────────────────────────────────
function excelDateToString(val: unknown): string | null {
  if (val === null || val === undefined || val === "") return null;
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === "number") {
    // Excel serial: days since Dec 30, 1899 (Lotus 1-2-3 epoch)
    const d = new Date(Date.UTC(1899, 11, 30) + val * 86400000);
    return d.toISOString().slice(0, 10);
  }
  if (typeof val === "string") {
    const s = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // DD/MM/YYYY
    const dmY = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmY) return `${dmY[3]}-${dmY[2].padStart(2, "0")}-${dmY[1].padStart(2, "0")}`;
    // YYYY/MM/DD
    const Ymd = s.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (Ymd) return `${Ymd[1]}-${Ymd[2]}-${Ymd[3]}`;
  }
  return null;
}

// ─── Excel parser (SheetJS) ───────────────────────────────────────────────────
// Expected columns: Date, Superid, In  (Max In / Out / P/L are ignored)
// Header detection is case-insensitive, so column order doesn't matter.
async function parseExcel(buffer: ArrayBuffer): Promise<{ rows: ParsedRow[]; errors: string[] }> {
  const { read, utils } = await import("xlsx");
  const workbook = read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return { rows: [], errors: ["Excel 文件没有工作表"] };

  const raw: unknown[][] = utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (raw.length < 2) return { rows: [], errors: ["Excel 没有数据行"] };

  const headers = (raw[0] as unknown[]).map((h) => String(h ?? "").trim().toLowerCase());
  const dateIdx    = headers.findIndex((h) => h === "date");
  const superidIdx = headers.findIndex((h) => h === "superid");
  const inIdx      = headers.findIndex((h) => h === "in");

  const missing: string[] = [];
  if (dateIdx    === -1) missing.push("Date");
  if (superidIdx === -1) missing.push("Superid");
  if (inIdx      === -1) missing.push("In");
  if (missing.length) {
    return { rows: [], errors: [`Excel 缺少列: ${missing.join(", ")}（需要 Date、Superid、In 三列）`] };
  }

  const errors: string[] = [];
  const rows: ParsedRow[] = [];

  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as unknown[];
    const rawDate   = row[dateIdx];
    const rawUser   = row[superidIdx];
    const rawAmount = row[inIdx];

    // Skip blank rows
    if (!rawDate && !rawUser && !rawAmount) continue;

    const date = excelDateToString(rawDate);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push(`第 ${i + 1} 行: 日期无法识别 "${rawDate}"`);
      continue;
    }

    const username = String(rawUser ?? "").trim();
    if (!username) {
      errors.push(`第 ${i + 1} 行: Superid 为空`);
      continue;
    }

    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      errors.push(`第 ${i + 1} 行: In 金额无效 "${rawAmount}"`);
      continue;
    }
    if (amount === 0) continue; // skip zero-recharge rows

    rows.push({ date, username, amount });
  }

  return { rows, errors };
}

export function RechargeImporter() {
  const [text, setText] = useState("");
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const isExcel =
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls") ||
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.type === "application/vnd.ms-excel";

    if (isExcel) {
      // Parse Excel directly — bypass the CSV textarea
      const reader = new FileReader();
      reader.onload = async () => {
        const buffer = reader.result as ArrayBuffer;
        const { rows, errors } = await parseExcel(buffer);
        setParseErrors(errors);
        if (!rows.length && !errors.length) {
          toast.error("Excel 没有找到有效数据");
          return;
        }
        if (!rows.length) {
          setPreview([]);
          setSummary(null);
          return;
        }
        startTransition(async () => {
          const r = await previewRechargeAction(rows);
          if (r.error) { toast.error(r.error); return; }
          setPreview(r.rows);
          setSummary(r.summary);
        });
      };
      reader.readAsArrayBuffer(file);
    } else {
      // CSV / plain text
      const reader = new FileReader();
      reader.onload = () => setText(String(reader.result ?? ""));
      reader.readAsText(file);
    }
  }

  function runPreview() {
    const { rows, errors } = parseCsv(text);
    setParseErrors(errors);
    if (!rows.length) {
      setPreview([]);
      setSummary(null);
      return;
    }
    startTransition(async () => {
      const r = await previewRechargeAction(rows);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      setPreview(r.rows);
      setSummary(r.summary);
    });
  }

  function runImport() {
    if (!preview) return;
    const toSend = preview
      .filter((r) => (r.status === "ok" || r.status === "overwrite") && r.playerId)
      .map((r) => ({ date: r.date, amount: r.amount, playerId: r.playerId as string }));
    if (!toSend.length) {
      toast.error("Nothing to import");
      return;
    }
    startTransition(async () => {
      const r = await importRechargeAction(toSend);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(`Imported ${r.inserted} rows`);
      setText("");
      setPreview(null);
      setSummary(null);
      setParseErrors([]);
    });
  }

  const grouped = useMemo(() => {
    if (!preview) return null;
    return {
      ok: preview.filter((r) => r.status === "ok"),
      overwrite: preview.filter((r) => r.status === "overwrite"),
      unchanged: preview.filter((r) => r.status === "unchanged"),
      unknown_user: preview.filter((r) => r.status === "unknown_user"),
    };
  }, [preview]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"date,username,amount\n2026-05-18,player_test_1,600\n2026-05-18,player_test_2,250"}
          rows={6}
          className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent font-mono text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
        />
        <div className="flex flex-col gap-2">
          <label className="text-sm">
            <span className="block mb-1">Or upload .xlsx / .csv:</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFile}
              className="text-sm"
            />
          </label>
          <button
            type="button"
            onClick={runPreview}
            disabled={pending || !text.trim()}
            className="h-10 px-4 rounded-md border border-foreground/20 text-sm font-medium disabled:opacity-60"
          >
            {pending ? "Working…" : "Preview"}
          </button>
        </div>
      </div>

      {parseErrors.length > 0 && (
        <div className="text-sm text-amber-600 dark:text-amber-400">
          {parseErrors.length} parse warning{parseErrors.length === 1 ? "" : "s"}:
          <ul className="list-disc list-inside mt-1">
            {parseErrors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
            {parseErrors.length > 5 && <li>… and {parseErrors.length - 5} more</li>}
          </ul>
        </div>
      )}

      {grouped && summary && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3 text-sm">
            <Chip color="green" label={`${summary.ok} new`} />
            <Chip color="amber" label={`${summary.overwrite} overwrite`} />
            <Chip color="zinc" label={`${summary.unchanged} unchanged`} />
            <Chip color="red" label={`${summary.unknown_user} unknown user`} />
          </div>

          <PreviewTable group="new" rows={grouped.ok} />
          <PreviewTable group="overwrite" rows={grouped.overwrite} />
          <PreviewTable group="unchanged" rows={grouped.unchanged} />
          <PreviewTable group="unknown_user" rows={grouped.unknown_user} />

          <button
            type="button"
            onClick={runImport}
            disabled={pending || (summary.ok + summary.overwrite === 0)}
            className="h-10 px-5 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 font-medium disabled:opacity-60"
          >
            {pending ? "Importing…" : `Import ${summary.ok + summary.overwrite} rows`}
          </button>
        </div>
      )}
    </div>
  );
}

function Chip({ color, label }: { color: "green" | "amber" | "zinc" | "red"; label: string }) {
  const map = {
    green: "bg-green-500/15 text-green-600",
    amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    zinc: "bg-zinc-500/15 text-zinc-500",
    red: "bg-red-500/15 text-red-600",
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[color]}`}>{label}</span>;
}

function PreviewTable({ group, rows }: { group: string; rows: PreviewRow[] }) {
  if (!rows.length) return null;
  return (
    <details className="rounded-md border border-zinc-200">
      <summary className="px-3 py-2 cursor-pointer text-sm font-medium capitalize">
        {group.replace("_", " ")} ({rows.length})
      </summary>
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left">
          <tr>
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Username</th>
            <th className="px-3 py-2 font-medium text-right">Amount</th>
            <th className="px-3 py-2 font-medium text-right">Existing</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {rows.slice(0, 50).map((r, i) => (
            <tr key={i}>
              <td className="px-3 py-1.5 text-zinc-500">{r.date}</td>
              <td className="px-3 py-1.5 font-mono">{r.username}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{r.amount.toFixed(2)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums text-zinc-500">
                {r.existingAmount === null ? "—" : r.existingAmount.toFixed(2)}
              </td>
            </tr>
          ))}
          {rows.length > 50 && (
            <tr><td colSpan={4} className="px-3 py-2 text-zinc-500">… and {rows.length - 50} more</td></tr>
          )}
        </tbody>
      </table>
    </details>
  );
}
