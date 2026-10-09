"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveLiveStatsSnapshot } from "@/app/admin/games/live-actions";
import { he } from "@/config/strings";
import { buildLiveStatsFormData, cloneLiveStatsState, type LiveStatsClientState } from "@/lib/live-stats/form-data";
import type { LiveSaveStatus } from "@/lib/live-stats/types";

const DEBOUNCE_MS = 400;
const MAX_UNDO = 80;

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

  const flushSave = useCallback(async () => {
    if (demo || !autosaveEnabled) return;
    const gen = ++saveGenRef.current;
    pendingSaveRef.current = false;
    setHasPendingSave(false);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (!navigator.onLine) {
      setSaveStatus("offline");
      return;
    }

    setSaveStatus("saving");
    const fd = buildLiveStatsFormData(gameId, stateRef.current);
    const result = await saveLiveStatsSnapshot(null, fd);
    if (gen !== saveGenRef.current) return;

    if (result.ok) {
      setSaveStatus("saved");
    } else if (result.code === "demo") {
      setSaveStatus("idle");
    } else {
      setSaveStatus("error");
    }
  }, [autosaveEnabled, demo, gameId]);

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
    saveGenRef.current += 1;
    setSaveStatus("idle");
    setHasPendingSave(false);
    setStateRaw(initial);
    stateRef.current = initial;
  }, []);

  const undoLast = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    setUndoDepth(undoStack.current.length);
    replaceState(prev, { skipUndo: true });
  }, [replaceState]);

  const canUndo = undoDepth > 0;

  useEffect(() => {
    const onOnline = () => {
      if (saveStatus === "offline" && autosaveEnabled && !demo) scheduleSave();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [autosaveEnabled, demo, saveStatus, scheduleSave]);

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

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
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
