"use client";

import { useId, useRef, useState } from "react";
import { deleteMediaAction, registerMediaAction, requestUploadAction } from "@/app/admin/media/actions";
import { MediaImage } from "@/components/common/media-image";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/form-controls";
import { he } from "@/config/strings";
import { MB, uploadLimits, type UploadScope } from "@/config/uploads";
import { getMediaUrl } from "@/lib/storage/urls";
import { supabaseAnonKey } from "@/lib/supabase/env";
import type { Media, MediaKind } from "@/types/domain";

type Accept = MediaKind | "any";

function acceptAttr(accept: Accept): string {
  if (accept === "any") return [...uploadLimits.image.mimeTypes, ...uploadLimits.video.mimeTypes].join(",");
  return uploadLimits[accept].mimeTypes.join(",");
}

function hintFor(accept: Accept): string {
  if (accept === "image") return `${he.upload.supportedImages} · ${he.upload.maxSize(uploadLimits.image.maxBytes / MB)}`;
  if (accept === "video") return `${he.upload.supportedVideos} · ${he.upload.maxSize(uploadLimits.video.maxBytes / MB)}`;
  return `${he.upload.supportedImages} · ${he.upload.supportedVideos}`;
}

async function readDimensions(file: File): Promise<{ width: number | null; height: number | null; durationSeconds: number | null }> {
  const empty = { width: null, height: null, durationSeconds: null };
  try {
    if (file.type.startsWith("image/")) {
      const bitmap = await createImageBitmap(file);
      const dims = { width: bitmap.width, height: bitmap.height, durationSeconds: null };
      bitmap.close();
      return dims;
    }
    const url = URL.createObjectURL(file);
    try {
      return await new Promise((resolve) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () =>
          resolve({
            width: video.videoWidth || null,
            height: video.videoHeight || null,
            durationSeconds: Number.isFinite(video.duration) ? Math.round(video.duration * 100) / 100 : null,
          });
        video.onerror = () => resolve(empty);
        video.src = url;
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return empty;
  }
}

function putWithProgress(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", file.type);
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    xhr.setRequestHeader("x-upsert", "false");
    const key = supabaseAnonKey();
    if (key) xhr.setRequestHeader("apikey", key);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status))));
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(file);
  });
}

type Target = { scope: UploadScope; gameId?: number; postId?: number };

/** Signs, uploads and registers one file. Returns the stored media or throws a Hebrew message. */
function useUploader(target: Target) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File): Promise<Media | null> {
    setError(null);
    setProgress(0);
    try {
      const ticket = await requestUploadAction({ mimeType: file.type, sizeBytes: file.size, scope: target.scope });
      if (!ticket.ok) throw new Error(ticket.message);
      const meta = await readDimensions(file);
      await putWithProgress(ticket.signedUrl, file, setProgress).catch(() => {
        throw new Error(file.type.startsWith("video/") ? he.errors.videoUploadFailed : he.errors.uploadFailed);
      });
      const registered = await registerMediaAction({
        storageKey: ticket.storageKey,
        mimeType: file.type,
        sizeBytes: file.size,
        ...meta,
        gameId: target.gameId ?? null,
        postId: target.postId ?? null,
      });
      if (!registered.ok) throw new Error(registered.message);
      return registered.media;
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : he.upload.failed);
      return null;
    } finally {
      setProgress(null);
    }
  }

  return { upload, progress, error };
}

function MediaPreview({ media, alt }: { media: Media; alt: string }) {
  if (media.kind === "video") {
    const src = getMediaUrl(media);
    return src ? (
      <video src={src} controls preload="metadata" className="aspect-video w-full rounded-xl bg-black" />
    ) : null;
  }
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-surface-3">
      <MediaImage media={media} alt={alt} sizes="(max-width: 640px) 100vw, 320px" />
    </div>
  );
}

function FilePicker({
  accept,
  disabled,
  label,
  onFile,
}: {
  accept: Accept;
  disabled?: boolean;
  label: string;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr(accept)}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onFile(file);
        }}
      />
      <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={() => inputRef.current?.click()}>
        {label}
      </Button>
    </>
  );
}

function Status({ progress, error }: { progress: number | null; error: string | null }) {
  if (progress !== null) return <p className="text-xs text-muted">{he.upload.uploading(progress)}</p>;
  if (error) {
    return (
      <p role="alert" className="text-xs text-loss">
        {error}
      </p>
    );
  }
  return null;
}

/**
 * Single media slot (logo, player photo, thumbnail...). Submits the chosen media id through a hidden
 * input named `name`; an empty value clears the slot.
 */
export function MediaUploadField({
  name,
  label,
  scope,
  accept = "image",
  defaultMedia,
  disabled,
}: {
  name: string;
  label: string;
  scope: UploadScope;
  accept?: Accept;
  defaultMedia?: Media | null;
  disabled?: boolean;
}) {
  const id = useId();
  const [media, setMedia] = useState<Media | null>(defaultMedia ?? null);
  const { upload, progress, error } = useUploader({ scope });
  const busy = progress !== null;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <input id={id} type="hidden" name={name} value={media?.id ?? ""} />
      <div className="space-y-3 rounded-xl border border-dashed border-border bg-surface-2 p-3">
        {media ? <MediaPreview media={media} alt={label} /> : null}
        <div className="flex flex-wrap items-center gap-2">
          <FilePicker
            accept={accept}
            disabled={disabled || busy}
            label={media ? he.upload.replace : he.upload.chooseFile}
            onFile={async (file) => {
              const uploaded = await upload(file);
              if (uploaded) setMedia(uploaded);
            }}
          />
          {media ? (
            <Button type="button" variant="ghost" size="sm" disabled={disabled || busy} onClick={() => setMedia(null)}>
              {he.upload.remove}
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted">{hintFor(accept)}</p>
        <Status progress={progress} error={error} />
      </div>
    </div>
  );
}

/** Gallery attached to a game or post. Uploads and deletions are saved immediately. */
export function MediaGalleryField({
  label,
  scope,
  gameId,
  postId,
  items,
  onItemsChange,
  disabled,
}: {
  label: string;
  scope: UploadScope;
  gameId?: number;
  postId?: number;
  items: Media[];
  onItemsChange: (items: Media[]) => void;
  disabled?: boolean;
}) {
  const { upload, progress, error } = useUploader({ scope, gameId, postId });
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const busy = progress !== null || removing !== null;

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="space-y-3 rounded-xl border border-dashed border-border bg-surface-2 p-3">
        {items.length === 0 ? <p className="text-sm text-muted">{he.upload.empty}</p> : null}
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((m, i) => (
            <li key={m.id} className="space-y-2">
              <MediaPreview media={m} alt={`${label} ${he.media.imageOf(i + 1, items.length)}`} />
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={disabled || busy}
                onClick={async () => {
                  setRemoveError(null);
                  setRemoving(m.id);
                  const result = await deleteMediaAction(m.id);
                  setRemoving(null);
                  if (result.ok) onItemsChange(items.filter((x) => x.id !== m.id));
                  else setRemoveError(result.message);
                }}
              >
                {he.upload.remove}
              </Button>
            </li>
          ))}
        </ul>
        <FilePicker
          accept="any"
          disabled={disabled || busy}
          label={he.upload.addMedia}
          onFile={async (file) => {
            const uploaded = await upload(file);
            if (uploaded) onItemsChange([...items, uploaded]);
          }}
        />
        <p className="text-xs text-muted">{hintFor("any")}</p>
        <Status progress={progress} error={error ?? removeError} />
      </div>
    </div>
  );
}
