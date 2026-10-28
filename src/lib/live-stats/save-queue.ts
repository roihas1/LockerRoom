/**
 * Runs `task` one at a time. A request that arrives while the task is running does not start a second one:
 * it is remembered, and the task runs once more right after the current run ends, so the newest state is
 * always the last thing sent. Every caller's promise resolves only when the queue has fully drained.
 *
 * Live saves need this because the server diffs each save against what it read when the request started.
 * Two overlapping saves would diff against the same baseline and write the same play-by-play events twice.
 *
 * `task` resolves `true` when it succeeded. On `false` (failed, offline, refused) a queued rerun is dropped:
 * the caller owns the retry policy and will request again.
 */
export function createSaveQueue(task: () => Promise<boolean>) {
  let inFlight: Promise<void> | null = null;
  let rerun = false;

  return {
    request(): Promise<void> {
      if (inFlight) {
        rerun = true;
        return inFlight;
      }
      inFlight = (async () => {
        try {
          do {
            rerun = false;
            const ok = await task();
            if (!ok) break;
          } while (rerun);
        } finally {
          rerun = false;
          inFlight = null;
        }
      })();
      return inFlight;
    },
    /** A newer request is waiting behind the run that is in flight. */
    hasQueued(): boolean {
      return rerun;
    },
    isRunning(): boolean {
      return inFlight !== null;
    },
  };
}
