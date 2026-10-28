import { describe, expect, it } from "vitest";
import { createSaveQueue } from "./save-queue";

/** A task whose completion the test controls, so overlap can be provoked on purpose. */
function controllable() {
  const runs: { release: (ok: boolean) => void }[] = [];
  let active = 0;
  let maxActive = 0;
  const task = () => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    return new Promise<boolean>((resolve) => {
      runs.push({
        release: (ok) => {
          active -= 1;
          resolve(ok);
        },
      });
    });
  };
  return { task, runs, maxActive: () => maxActive };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("createSaveQueue", () => {
  it("never runs two saves at once", async () => {
    const t = controllable();
    const queue = createSaveQueue(t.task);

    const first = queue.request();
    queue.request();
    queue.request();
    await tick();
    expect(t.runs).toHaveLength(1);

    t.runs[0]!.release(true);
    await tick();
    expect(t.runs).toHaveLength(2);
    t.runs[1]!.release(true);
    await first;

    expect(t.maxActive()).toBe(1);
  });

  it("coalesces any number of waiting requests into a single rerun", async () => {
    const t = controllable();
    const queue = createSaveQueue(t.task);

    const done = queue.request();
    for (let i = 0; i < 5; i++) queue.request();
    t.runs[0]!.release(true);
    await tick();
    t.runs[1]!.release(true);
    await done;

    expect(t.runs).toHaveLength(2);
  });

  it("resolves a late caller only after the rerun that carries the newest state", async () => {
    const t = controllable();
    const queue = createSaveQueue(t.task);
    let lateResolved = false;

    queue.request();
    const late = queue.request().then(() => {
      lateResolved = true;
    });
    t.runs[0]!.release(true);
    await tick();
    expect(lateResolved).toBe(false);

    t.runs[1]!.release(true);
    await late;
    expect(lateResolved).toBe(true);
  });

  it("reports a queued request while a save is running", async () => {
    const t = controllable();
    const queue = createSaveQueue(t.task);

    queue.request();
    expect(queue.hasQueued()).toBe(false);
    queue.request();
    expect(queue.hasQueued()).toBe(true);

    t.runs[0]!.release(true);
    await tick();
    expect(queue.hasQueued()).toBe(false);
    t.runs[1]!.release(true);
    await tick();
    expect(queue.isRunning()).toBe(false);
  });

  it("drops the queued rerun when a save fails and leaves retrying to the caller", async () => {
    const t = controllable();
    const queue = createSaveQueue(t.task);

    const done = queue.request();
    queue.request();
    t.runs[0]!.release(false);
    await done;

    expect(t.runs).toHaveLength(1);
    expect(queue.hasQueued()).toBe(false);
    expect(queue.isRunning()).toBe(false);
  });

  it("starts a fresh run for a request made after the queue has drained", async () => {
    const t = controllable();
    const queue = createSaveQueue(t.task);

    const a = queue.request();
    t.runs[0]!.release(true);
    await a;
    const b = queue.request();
    t.runs[1]!.release(true);
    await b;

    expect(t.runs).toHaveLength(2);
  });

  it("recovers when the task throws", async () => {
    let calls = 0;
    const queue = createSaveQueue(async () => {
      calls += 1;
      if (calls === 1) throw new Error("boom");
      return true;
    });

    await expect(queue.request()).rejects.toThrow("boom");
    expect(queue.isRunning()).toBe(false);
    await queue.request();
    expect(calls).toBe(2);
  });
});
