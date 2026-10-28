"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { saveLiveStatsSnapshot } from "@/app/admin/games/live-actions";
import { he } from "@/config/strings";
import { buildLiveStatsFormData, cloneLiveStatsState, type LiveStatsClientState } from "@/lib/live-stats/form-data";
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

  const clearRetry = useCallback(() => {
    if (retryRef.current) {
      clearTimeout(retryRef.current);
      retryRef.current = null;
    }
  }, []);

  const flushSave = useCallback(async () => {
    if (demo || !autosaveEnabled) return;
    const gen = ++saveGenRef.current;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    clearRetry();

    // Unsaved changes stay "pending" until a save actually succeeds, so the unload warning and the
    // retry/online handlers keep covering them after a failed or offline attempt.
    pendingSaveRef.current = true;
    setHasPendingSave(true);

    if (!navigator.onLine) {
      setSaveStatus("offline");
      return;
    }

    setSaveStatus("saving");
    const fd = buildLiveStatsFormData(gameId, stateRef.current);
    let result: Awaited<ReturnType<typeof saveLiveStatsSnapshot>>;
    try {
      result = await saveLiveStatsSnapshot(null, fd);
    } catch {
      result = { ok: false, code: "network", message: "" };
    }
    if (gen !== saveGenRef.current) return;

    if (result.ok) {
      // A newer tap may already be waiting in the debounce: that change is still unsaved.
      if (!debounceRef.current) {
        pendingSaveRef.current = false;
        setHasPendingSave(false);
      }
      setSaveStatus("saved");
    } else if (result.code === "demo" || result.code === "not_live") {
      // Nothing to retry: the game is final (or demo). The server refused on purpose.
      pendingSaveRef.current = false;
      setHasPendingSave(false);
      if (result.code === "not_live") {
        setSaveStatus("error");
        toast.error(result.message);
      } else {
        setSaveStatus("idle");
      }
    } else {
      setSaveStatus("error");
      retryRef.current = setTimeout(() => {
        retryRef.current = null;
        void flushRef.current();
      }, RETRY_MS);
    }
  }, [autosaveEnabled, clearRetry, demo, gameId]);

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
  // pending when the hook unmounts, fire it once. `beforeunload` does not cover in-app navigation.
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (retryRef.current) clearTimeout(retryRef.current);
      if (pendingSaveRef.current && autosaveRef.current && !demoRef.current && navigator.onLine) {
        pendingSaveRef.current = false;
        void saveLiveStatsSnapshot(null, buildLiveStatsFormData(gameIdRef.current, stateRef.current)).catch(() => {});
      }
    },
    [],
  );

  const saveStatusLabel =
    saveStatus === "saving"
      ? he.admin.liveStats.saving
      : saveStatus === "saved"
        ? he.admin.liveStats.saved
        : saveStatus === "error"
          ? he.admin.liveStats.error
          : saveStatus === "offline"
            ? he.admin.liveStats.error
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
