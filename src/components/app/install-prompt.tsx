"use client";

import { Download, Share, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { he } from "@/config/strings";
import { detectPlatform, isStandalone, type Platform } from "@/lib/push/client";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "lr:install-dismissed";
const DISMISS_DAYS = 14;

/** Chrome fires `beforeinstallprompt` once, early; keep it at module level so any component can use it. */
let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function useInstallEvent() {
  return useSyncExternalStore(
    subscribe,
    () => deferred,
    () => null,
  );
}

interface Env {
  platform: Platform;
  standalone: boolean;
}

function useEnv(): Env | null {
  const [env, setEnv] = useState<Env | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEnv({ platform: detectPlatform(), standalone: isStandalone() }));
    return () => cancelAnimationFrame(frame);
  }, []);
  return env;
}

async function promptInstall() {
  if (!deferred) return;
  await deferred.prompt();
  await deferred.userChoice.catch(() => null);
  deferred = null;
  notify();
}

function Steps({ title, steps }: { title: string; steps: readonly string[] }) {
  return (
    <div className="space-y-2">
      <h3 className="font-bold">{title}</h3>
      <ol className="list-decimal space-y-1 ps-5 text-sm text-muted">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </div>
  );
}

/** Full install instructions for the join page: a one-tap button on Android, steps everywhere else. */
export function InstallGuide() {
  const env = useEnv();
  const event = useInstallEvent();

  if (env?.standalone) {
    return <p className="card p-5 text-sm font-semibold text-win">{he.app.installed}</p>;
  }

  return (
    <section className="card space-y-4 p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <Download className="size-5 text-team" aria-hidden />
        {he.app.install}
      </h2>
      <p className="text-sm text-muted">{he.app.installHint}</p>
      {event ? (
        <Button onClick={promptInstall} className="w-full">
          <Download aria-hidden />
          {he.app.installCta}
        </Button>
      ) : null}
      {env?.platform === "android" ? (
        <Steps title={he.app.androidTitle} steps={he.app.androidSteps} />
      ) : env?.platform === "ios" ? (
        <Steps title={he.app.iosTitle} steps={he.app.iosSteps} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Steps title={he.app.iosTitle} steps={he.app.iosSteps} />
          <Steps title={he.app.androidTitle} steps={he.app.androidSteps} />
        </div>
      )}
    </section>
  );
}

/** Small dismissible banner on phones that haven't installed the app yet. */
export function InstallBanner() {
  const env = useEnv();
  const event = useInstallEvent();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const until = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    const frame = requestAnimationFrame(() => setDismissed(Date.now() < until));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!env || env.standalone || dismissed || pathname === "/join") return null;
  const canPrompt = env.platform === "android" && event;
  if (env.platform !== "ios" && !canPrompt) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000));
    setDismissed(true);
  };

  return (
    <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 md:hidden" role="region" aria-label={he.app.install}>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-2xl">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{he.app.installCta}</p>
          <p className="truncate text-xs text-muted">{env.platform === "ios" ? he.app.iosNeedsInstall : he.app.installHint}</p>
        </div>
        {canPrompt ? (
          <Button size="sm" onClick={promptInstall}>
            <Download aria-hidden />
            {he.app.install}
          </Button>
        ) : (
          <Button size="sm" asChild>
            <Link href="/join">
              <Share aria-hidden />
              {he.app.install}
            </Link>
          </Button>
        )}
        <button type="button" onClick={dismiss} className="rounded-lg p-1.5 text-muted hover:text-text" aria-label={he.app.dismiss}>
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
