"use client";

import { he } from "@/config/strings";
import { Input } from "@/components/ui/form-controls";
import type { Player } from "@/types/domain";
import type { StatRowState } from "./types";

type OptionalKey = "steals" | "blocks" | "turnovers" | "fouls" | "fgMade" | "fgAttempted" | "threeMade" | "threeAttempted" | "ftMade" | "ftAttempted";

function optionalValue(v: number | null): string {
  return v === null ? "" : String(v);
}

function parseOptional(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

export function StatsDesktopTable({
  players,
  rows,
  showMore,
  onChange,
  fieldErrors,
}: {
  players: Player[];
  rows: StatRowState[];
  showMore: boolean;
  onChange: (playerId: number, patch: Partial<StatRowState>) => void;
  fieldErrors?: Record<string, string[]>;
}) {
  const byId = new Map(rows.map((r) => [r.playerId, r]));
  const playedRows = players.filter((p) => byId.get(p.id)?.played);

  const err = (playerId: number, key: string) => fieldErrors?.[`lines.${playerId}.${key}`]?.[0] ?? fieldErrors?.[`lines.${key}`]?.[0];

  const coreCell = (playerId: number, key: "points" | "rebounds" | "assists", label: string) => {
    const row = byId.get(playerId)!;
    return (
      <td className="p-1">
        <Input
          inputMode="numeric"
          aria-label={`${label} ${players.find((p) => p.id === playerId)?.name ?? ""}`}
          className="num h-9 min-w-14 px-2 text-center"
          value={row[key]}
          onChange={(e) => onChange(playerId, { [key]: Number.parseInt(e.target.value || "0", 10) || 0 })}
          aria-invalid={!!err(playerId, key)}
        />
      </td>
    );
  };

  const optionalCell = (playerId: number, key: OptionalKey, label: string) => {
    const row = byId.get(playerId)!;
    return (
      <td className="p-1">
        <Input
          inputMode="numeric"
          aria-label={`${label} ${players.find((p) => p.id === playerId)?.name ?? ""}`}
          className="num h-9 min-w-14 px-2 text-center"
          value={optionalValue(row[key])}
          onChange={(e) => onChange(playerId, { [key]: parseOptional(e.target.value) })}
          aria-invalid={!!err(playerId, key)}
        />
      </td>
    );
  };

  if (playedRows.length === 0) {
    return <p className="hidden text-sm text-muted md:block">{he.admin.statsEntry.whoPlayedHint}</p>;
  }

  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-muted">
            <th className="sticky start-0 z-10 bg-surface px-2 py-2 text-start font-semibold">{he.games.player}</th>
            <th className="px-1 py-2 font-semibold">{he.stats.points}</th>
            <th className="px-1 py-2 font-semibold">{he.stats.rebounds}</th>
            <th className="px-1 py-2 font-semibold">{he.stats.assists}</th>
            {showMore ? (
              <>
                <th className="px-1 py-2 font-semibold">{he.stats.steals}</th>
                <th className="px-1 py-2 font-semibold">{he.stats.blocks}</th>
                <th className="px-1 py-2 font-semibold">{he.stats.turnovers}</th>
                <th className="px-1 py-2 font-semibold">{he.stats.fouls}</th>
                <th className="px-1 py-2 font-semibold" colSpan={2}>
                  {he.stats.fg}
                </th>
                <th className="px-1 py-2 font-semibold" colSpan={2}>
                  {he.stats.three}
                </th>
                <th className="px-1 py-2 font-semibold" colSpan={2}>
                  {he.stats.ft}
                </th>
              </>
            ) : null}
          </tr>
          {showMore ? (
            <tr className="text-xs text-muted">
              <th className="sticky start-0 bg-surface" />
              <th colSpan={3} />
              <th colSpan={4} />
              <th>{he.admin.statsEntry.made}</th>
              <th>{he.admin.statsEntry.attempted}</th>
              <th>{he.admin.statsEntry.made}</th>
              <th>{he.admin.statsEntry.attempted}</th>
              <th>{he.admin.statsEntry.made}</th>
              <th>{he.admin.statsEntry.attempted}</th>
            </tr>
          ) : null}
        </thead>
        <tbody>
          {playedRows.map((p) => (
            <tr key={p.id} className="border-t border-border">
              <td className="sticky start-0 z-10 bg-surface px-2 py-1.5 font-medium">{p.name}</td>
              {coreCell(p.id, "points", he.stats.pointsLong)}
              {coreCell(p.id, "rebounds", he.stats.reboundsLong)}
              {coreCell(p.id, "assists", he.stats.assistsLong)}
              {showMore ? (
                <>
                  {optionalCell(p.id, "steals", he.stats.stealsLong)}
                  {optionalCell(p.id, "blocks", he.stats.blocksLong)}
                  {optionalCell(p.id, "turnovers", he.stats.turnoversLong)}
                  {optionalCell(p.id, "fouls", he.stats.fouls)}
                  {optionalCell(p.id, "fgMade", he.stats.fg)}
                  {optionalCell(p.id, "fgAttempted", he.stats.fg)}
                  {optionalCell(p.id, "threeMade", he.stats.three)}
                  {optionalCell(p.id, "threeAttempted", he.stats.three)}
                  {optionalCell(p.id, "ftMade", he.stats.ft)}
                  {optionalCell(p.id, "ftAttempted", he.stats.ft)}
                </>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
