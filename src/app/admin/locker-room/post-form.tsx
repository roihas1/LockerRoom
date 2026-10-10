"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MediaGalleryField } from "@/components/admin/media-upload-field";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { postTypeLabels } from "@/config/labels";
import { he } from "@/config/strings";
import type { ActionResult } from "@/lib/utils/action-result";
import type { Award, Game, Media, Player, Post, PostType } from "@/types/domain";
import { deletePostAction, publishPostAction, savePostAction } from "./actions";

const postTypes = (Object.keys(postTypeLabels) as PostType[]).filter((t) => t !== "play" && t !== "milestone");

function fieldError(state: ActionResult | null, key: string) {
  if (!state || state.ok) return undefined;
  const snake = key.replace(/([A-Z])/g, "_$1").toLowerCase();
  return state.fieldErrors?.[key] ?? state.fieldErrors?.[snake];
}

export function PostForm({
  post,
  players,
  games,
  awards,
  demo,
}: {
  post?: Post;
  players: Player[];
  games: Game[];
  awards: Award[];
  demo: boolean;
}) {
  const router = useRouter();
  const [type, setType] = useState<PostType>(post?.type ?? "announcement");
  const [media, setMedia] = useState<Media[]>(post?.media ?? []);
  const [saveState, saveAction, savePending] = useActionState(savePostAction, null as ActionResult | null);
  const [pubState, pubAction, pubPending] = useActionState(publishPostAction, null as ActionResult | null);
  const [delState, delAction, delPending] = useActionState(deletePostAction, null as ActionResult | null);

  useEffect(() => {
    if (saveState?.ok && saveState.redirectTo) router.push(saveState.redirectTo);
    if (delState?.ok && delState.redirectTo) router.push(delState.redirectTo);
  }, [saveState, delState, router]);

  const disabled = demo || savePending;
  const alert = [saveState, pubState, delState].find((s) => s && !s.ok);
  const success = [saveState, pubState].find((s) => s?.ok);

  const showQuote = type === "quote";
  const showAward = type === "award";
  const showMedia = type === "photo" || type === "video" || type === "funny_moment" || type === "highlight";

  const gameOptions = useMemo(
    () =>
      games.map((g) => ({
        id: g.id,
        label: `${he.result.vs} ${g.opponent}`,
      })),
    [games],
  );

  return (
    <div className="space-y-6">
      {alert ? (
        <p role="alert" className="rounded-xl border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
          {alert.message}
        </p>
      ) : null}
      {success ? (
        <p role="status" className="rounded-xl border border-win/40 bg-win/10 px-3 py-2 text-sm text-win">
          {success.message}
        </p>
      ) : null}

      <form action={saveAction} noValidate className="card space-y-4 p-5">
        {post ? <input type="hidden" name="postId" value={post.id} /> : null}
        <Field label={he.admin.postForm.type} htmlFor="type">
          <Select
            id="type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as PostType)}
            disabled={disabled}
            required
          >
            {postTypes.map((key) => (
              <option key={key} value={key}>
                {postTypeLabels[key]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={he.admin.postForm.title} htmlFor="title" error={fieldError(saveState, "title")}>
          <Input id="title" name="title" defaultValue={post?.title ?? ""} disabled={disabled} data-user-content />
        </Field>
        <Field label={he.admin.postForm.body} htmlFor="body">
          <Textarea id="body" name="body" defaultValue={post?.body ?? ""} disabled={disabled} data-user-content />
        </Field>
        {showQuote ? (
          <Field label={he.admin.postForm.quotePlayer} htmlFor="quotePlayerId" error={fieldError(saveState, "quotePlayerId")}>
            <Select id="quotePlayerId" name="quotePlayerId" defaultValue={post?.quotePlayerId ?? ""} disabled={disabled}>
              <option value="">{he.admin.gameForm.none}</option>
              {players.map((p) => (
                <option key={p.id} value={p.id} data-user-content>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        {showAward ? (
          <Field label={he.admin.awards} htmlFor="awardId" error={fieldError(saveState, "awardId")}>
            <Select id="awardId" name="awardId" defaultValue={post?.awardId ?? ""} disabled={disabled}>
              <option value="">{he.admin.gameForm.none}</option>
              {awards.map((a) => (
                <option key={a.id} value={a.id} data-user-content>
                  {a.title}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field label={he.admin.postForm.game} htmlFor="gameId">
          <Select id="gameId" name="gameId" defaultValue={post?.gameId ?? ""} disabled={disabled}>
            <option value="">{he.admin.gameForm.none}</option>
            {gameOptions.map((g) => (
              <option key={g.id} value={g.id} data-user-content>
                {g.label}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="isPinned" defaultChecked={post?.isPinned ?? false} disabled={disabled} />
          {he.admin.postForm.pinned}
        </label>
        {showMedia ? (
          post ? (
            <MediaGalleryField
              label={he.admin.postForm.media}
              scope="locker-room"
              postId={post.id}
              items={media}
              onItemsChange={setMedia}
              disabled={demo}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-border bg-surface-2 px-4 py-3 text-sm text-muted">{he.upload.saveFirst}</p>
          )
        ) : null}
        <Button type="submit" disabled={disabled}>
          {he.actions.save}
        </Button>
      </form>

      {post ? (
        <div className="flex flex-wrap gap-2">
          <form action={pubAction}>
            <input type="hidden" name="postId" value={post.id} />
            <input type="hidden" name="publish" value={post.isPublished ? "false" : "true"} />
            <Button type="submit" variant="secondary" disabled={demo || pubPending}>
              {post.isPublished ? he.actions.unpublish : he.actions.publish}
            </Button>
          </form>
          <form action={delAction}>
            <input type="hidden" name="postId" value={post.id} />
            <Button type="submit" variant="danger" disabled={demo || delPending}>
              {he.actions.delete}
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
