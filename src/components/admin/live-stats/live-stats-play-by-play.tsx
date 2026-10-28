"use client";

import { useEffect, useState } from "react";
import { ListOrdered } from "lucide-react";
import { getLiveGameEventsAction } from "@/app/admin/games/live-actions";
import { PlayByPlay } from "@/components/games/play-by-play";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { he } from "@/config/strings";
import type { LiveSaveStatus } from "@/lib/live-stats/types";
import type { GameEvent, Player } from "@/types/domain";

/**
 * The scorer's view of the play-by-play fans see. It is read from the server (the events are written by the
 * save diff), so it also shows whether a tap really landed. Loaded when opened and refreshed after each save.
 */
export function LiveStatsPlayByPlay({
  gameId,
  players,
  saveStatus,
}: {
  gameId: number;
  players: Player[];
  saveStatus: LiveSaveStatus;
}) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<GameEvent[] | null>(null);
  const [failed, setFailed] = useState(false);

  // Re-read whenever a save lands while the sheet is open, so new taps appear without closing it.
  const justSaved = saveStatus === "saved";
  useEffect(() => {
    if (!open) return;
    // A newer run (or closing the sheet) cancels this one, so only the latest response lands.
    let cancelled = false;
    void getLiveGameEventsAction(gameId)
      .catch(() => null)
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setEvents(result);
          setFailed(false);
        } else {
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, gameId, justSaved]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" aria-label={he.admin.liveStats.playByPlayButton}>
          <ListOrdered aria-hidden />
          {he.admin.liveStats.playByPlayButton}
        </Button>
      </DialogTrigger>
      <DialogContent variant="sheet" title={he.live.playByPlay} description={he.admin.liveStats.playByPlayHint}>
        {events ? (
          <PlayByPlay events={events} players={players} />
        ) : failed ? (
          <p className="text-sm text-loss">{he.admin.liveStats.playByPlayError}</p>
        ) : (
          <p className="text-sm text-muted">{he.admin.liveStats.playByPlayLoading}</p>
        )}
        {events && failed ? <p className="mt-2 text-xs text-loss">{he.admin.liveStats.playByPlayError}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
