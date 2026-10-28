"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { saveLiveStatsSnapshot } from "@/app/admin/games/live-actions";
import { he } from "@/config/strings";
import { buildLiveStatsFormData, cloneLiveStatsState, type LiveStatsClientState } from "@/lib/live-stats/form-data";
import { createSaveQueue } from "@/lib/live-stats/save-queue";
import type { LiveSaveStatus } from "@/lib/live-stats/types";

const DEBOUNCE_MS = 400;
const MAX_UNDO = 80;
const RETRY_MS = 4000;

export function useLiveStatsAutosave({
  gameId,
  demo,
  autosaveEnabled,
}: {
  gameId: number;
  demo: boolean;
  autosaveEnabled: boolean;
}) {
  const [state, setStateRaw] = useState<LiveStatsClientState>(() => emptyPending());
  const [saveStatus, setSaveStatus] = useState<LiveSaveStatus>("idle");
  const [hasPendingSave, setHasPendingSave] = useState(false);
  const undoStack = useRef<LiveStatsClientState[]>([]);
  const [undoDepth, setUndoDepth] = useState(0);
  const stateRef = useRef(state);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveGenRef = useRef(0);
  const pendingSaveRef = useRef(false);
  const unmountedRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const autosaveRef = useRef(autosaveEnabled);
  const demoRef = useRef(demo);
  const gameIdRef = useRef(gameId);
  useEffect(() => {
    autosaveRef.current = autosaveEnabled;
    demoRef.current = demo;
    gameIdRef.current = gameId;
  }, [autosaveEnabled, demo, gameId]);

  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef<() => Promise<void>>(async () => {});
  const queueRef = useRef<ReturnType<typeof createSaveQueue> | null>(null);

  const clearRetry = useCallback(() => {
    if (retryRef.current) {
      clearTimeout(retryRef.current);
      retryRef.current = null;
    }
  }, []);

  /**
   * One save attempt of the newest state. Resolves true when it landed. Only ever called through the save
   * queue, so attempts never overlap (the server diffs each save against what it read when it started).
   */
  const saveOnce = useCallback(async (): Promise<boolean> => {
    const gen = saveGenRef.current;

    if (!navigator.onLine) {
      setSaveStatus("offline");
      return false;
    }

    setSaveStatus("saving");
    const fd = buildLiveStatsFormData(gameIdRef.current, stateRef.current);
    let result: Awaited<ReturnType<typeof saveLiveStatsSnapshot>>;
    try {
      result = await saveLiveStatsSnapshot(null, fd);
    } catch {
      result = { ok: false, code: "network", message: "" };
    }
    // The screen was re-initialised while this save was in flight: its outcome no longer describes this state.
    if (gen !== saveGenRef.current) return false;

    if (result.ok) {
      // Unsaved changes stay "pending" until a save actually succeeds. A newer tap may already be waiting
      // (in the debounce or queued behind this save): that change is still unsaved.
      if (!debounceRef.current && !queueRef.current?.hasQueued()) {
        pendingSaveRef.current = false;
        setHasPendingSave(false);
      }
      setSaveStatus("saved");
      return true;
    }

    if (result.code === "demo" || result.code === "not_live") {
      // Nothing to retry: the game is final (or demo). The server refused on purpose.
      pendingSaveRef.current = false;
      setHasPendingSave(false);
      if (result.code === "not_live") {
        setSaveStatus("error");
        toast.error(result.message);
      } else {
        setSaveStatus("idle");
      }
      return false;
    }

    setSaveStatus("error");
    // After the screen is gone nothing may keep posting from a dead component.
    if (!unmountedRef.current) {
      retryRef.current = setTimeout(() => {
        retryRef.current = null;
        void flushRef.current();
      }, RETRY_MS);
    }
    return false;
  }, []);

  const flushSave = useCallback(async () => {
    if (demo || !autosaveEnabled) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    clearRetry();

    // Unsaved changes stay "pending" until a save actually succeeds, so the unload warning and the
    // retry/online handlers keep covering them after a failed or offline attempt.
    pendingSaveRef.current = true;
    setHasPendingSave(true);

    // One queue per screen, created on first use (a ref, not memo state: React may drop memoised values, and a
    // second queue would allow overlapping saves). `saveOnce` only touches refs and setters, so the first
    // instance stays valid for the whole life of the hook.
    const queue = (queueRef.current ??= createSaveQueue(saveOnce));
    // Resolves once the queue has drained, i.e. after the save carrying the newest state has finished.
    await queue.request();
  }, [autosaveEnabled, clearRetry, demo, saveOnce]);

  useEffect(() => {
    flushRef.current = flushSave;
  }, [flushSave]);

  const scheduleSave = useCallback(() => {
    if (demo || !autosaveEnabled) return;
    pendingSaveRef.current = true;
    setHasPendingSave(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void flushSave();
    }, DEBOUNCE_MS);
  }, [autosaveEnabled, demo, flushSave]);

  const replaceState = useCallback(
    (next: LiveStatsClientState, options?: { skipUndo?: boolean; skipSave?: boolean }) => {
      if (!options?.skipUndo) {
        undoStack.current.push(cloneLiveStatsState(stateRef.current));
        if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
        setUndoDepth(undoStack.current.length);
      }
      setStateRaw(next);
      stateRef.current = next;
      if (!options?.skipSave) scheduleSave();
    },
    [scheduleSave],
  );

  const initState = useCallback((initial: LiveStatsClientState) => {
    undoStack.current = [];
    setUndoDepth(0);
    pendingSaveRef.current = false;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    clearRetry();
    saveGenRef.current += 1;
    setSaveStatus("idle");
    setHasPendingSave(false);
    setStateRaw(initial);
    stateRef.current = initial;
  }, [clearRetry]);

  const undoLast = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    setUndoDepth(undoStack.current.length);
    replaceState(prev, { skipUndo: true });
  }, [replaceState]);

  const canUndo = undoDepth > 0;

  useEffect(() => {
    const onOnline = () => {
      if (pendingSaveRef.current && autosaveEnabled && !demo) void flushRef.current();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [autosaveEnabled, demo]);

  useEffect(() => {
    const dirty = hasPendingSave || saveStatus === "saving";
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasPendingSave, saveStatus]);

  // Leaving the page (soft navigation, tab close) must not drop the last taps: if a save is still
  // pending when the hook unmounts, send it once (through the queue, so it cannot overlap a save that is
  // still in flight). `beforeunload` does not cover in-app navigation.
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (retryRef.current) clearTimeout(retryRef.current);
      if (pendingSaveRef.current && autosaveRef.current && !demoRef.current && navigator.onLine) {
        void flushRef.current().catch(() => {});
      }
    };
  }, []);

  const saveStatusLabel =
    saveStatus === "saving"
      ? he.admin.liveStats.saving
      : saveStatus === "saved"
        ? he.admin.liveStats.saved
        : saveStatus === "error"
          ? he.admin.liveStats.error
          : saveStatus === "offline"
            ? he.admin.liveStats.offline
            : null;

  return {
    state,
    setState: replaceState,
    initState,
    undoLast,
    canUndo,
    saveStatus,
    saveStatusLabel,
    flushSave,
    pendingSave: pendingSaveRef,
  };
}

function emptyPending(): LiveStatsClientState {
  return { playedPlayerIds: [], lines: {}, teamScore: 0, opponentScore: 0 };
}
