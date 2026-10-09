"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveGameHighlightsAction } from "@/app/admin/games/actions";
import { MediaGalleryField } from "@/components/admin/media-upload-field";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/form-controls";
import { he } from "@/config/strings";
import type { ActionResult } from "@/lib/utils/action-result";
import type { Game, Media, Player } from "@/types/domain";

export function GameHighlightsForm({
  game,
  potgCandidates,
  gallery,
  demo,
}: {
  game: Game;
  potgCandidates: Player[];
  gallery: Media[];
  demo: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveGameHighlightsAction, null as ActionResult | null);
  const [media, setMedia] = useState<Media[]>(gallery);
  const [playOfGameId, setPlayOfGameId] = useState(game.playOfGameMediaId ?? "");

  useEffect(() => {
    if (state?.ok && state.redirectTo) router.push(state.redirectTo);
  }, [state, router]);

  const disabled = demo || pending;

  function updateGallery(items: Media[]) {
    setMedia(items);
    if (playOfGameId && !items.some((m) => m.id === playOfGameId)) setPlayOfGameId("");
  }

  return (
    <form action={action} noValidate className="card space-y-4 p-5">
      <input type="hidden" name="gameId" value={game.id} />
      {state && !state.ok ? (
        <p role="alert" className="rounded-xl border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
          {state.message}
        </p>
      ) : null}
      <Field label={he.admin.gameForm.potg} htmlFor="playerOfGameId">
        <Select id="playerOfGameId" name="playerOfGameId" defaultValue={game.playerOfGameId ?? ""} disabled={disabled}>
          <option value="">{he.admin.gameForm.none}</option>
          {potgCandidates.map((p) => (
            <option key={p.id} value={p.id} data-user-content>
              {p.jerseyNumber != null ? `#${p.jerseyNumber} · ` : ""}
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={he.admin.gameForm.potgNote} htmlFor="potgNote">
        <Textarea id="potgNote" name="potgNote" defaultValue={game.potgNote ?? ""} disabled={disabled} data-user-content />
      </Field>
      <Field label={he.admin.gameForm.recap} htmlFor="recap">
        <Textarea id="recap" name="recap" defaultValue={game.recap ?? ""} disabled={disabled} className="min-h-40" data-user-content />
      </Field>
      <MediaGalleryField
        label={he.admin.gameForm.gallery}
        scope="games"
        gameId={game.id}
        items={media}
        onItemsChange={updateGallery}
        disabled={demo}
      />
      <Field label={he.admin.gameForm.playOfGame} htmlFor="playOfGameMediaId">
        <Select
          id="playOfGameMediaId"
          name="playOfGameMediaId"
          value={playOfGameId}
          onChange={(e) => setPlayOfGameId(e.target.value)}
          disabled={disabled || media.length === 0}
        >
          <option value="">{he.admin.gameForm.none}</option>
          {media.map((m, i) => (
            <option key={m.id} value={m.id}>
              {m.kind === "video" ? he.admin.mediaPage.videos : he.admin.mediaPage.images} {he.media.imageOf(i + 1, media.length)}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" disabled={disabled}>
        {he.actions.save}
      </Button>
    </form>
  );
}
