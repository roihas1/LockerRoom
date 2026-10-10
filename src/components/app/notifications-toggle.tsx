"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/form-controls";
import { he } from "@/config/strings";
import {
  currentSubscription,
  detectPlatform,
  disablePush,
  enablePush,
  isPushSupported,
  isStandalone,
  readTopics,
  updateTopics,
} from "@/lib/push/client";
import { PUSH_TOPICS, vapidPublicKey, type PushTopic } from "@/lib/push/topics";

type State = "loading" | "unsupported" | "needs-install" | "unavailable" | "blocked" | "off" | "on";

async function detectState(): Promise<State> {
  if (!vapidPublicKey()) return "unavailable";
  if (detectPlatform() === "ios" && !isStandalone()) return "needs-install";
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  return (await currentSubscription()) && Notification.permission === "granted" ? "on" : "off";
}

export function NotificationsToggle() {
  const [state, setState] = useState<State>("loading");
  const [topics, setTopics] = useState<PushTopic[]>([...PUSH_TOPICS]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    void detectState().then((next) => {
      if (!alive) return;
      setState(next);
      setTopics(readTopics());
    });
    return () => {
      alive = false;
    };
  }, []);

  const enable = () =>
    startTransition(async () => {
      const result = await enablePush(topics);
      if (result.ok) {
        setState("on");
        toast.success(he.app.notificationsOn);
        return;
      }
      if (result.reason === "denied") setState(Notification.permission === "denied" ? "blocked" : "off");
      else if (result.reason === "unsupported") setState("unsupported");
      else if (result.reason === "unavailable" || result.reason === "demo") setState("unavailable");
      toast.error(result.reason === "denied" ? he.app.notificationsBlocked : he.app.notificationsFailed);
    });

  const disable = () =>
    startTransition(async () => {
      await disablePush();
      setState("off");
    });

  const toggleTopic = (topic: PushTopic, checked: boolean) => {
    const next = checked ? [...new Set([...topics, topic])] : topics.filter((t) => t !== topic);
    setTopics(next);
    if (state === "on") {
      startTransition(async () => {
        if (next.length === 0) {
          await disablePush();
          setState("off");
          return;
        }
        if (await updateTopics(next)) toast.success(he.app.saved);
      });
    }
  };

  const message =
    state === "needs-install"
      ? he.app.iosNeedsInstall
      : state === "unsupported"
        ? he.app.notificationsUnsupported
        : state === "blocked"
          ? he.app.notificationsBlocked
          : state === "unavailable"
            ? he.app.notificationsUnavailable
            : null;

  return (
    <section className="card space-y-4 p-5" aria-busy={state === "loading"}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Bell className="size-5 text-team" aria-hidden />
          {he.app.notifications}
        </h2>
        {state === "on" ? (
          <Button variant="secondary" size="sm" onClick={disable} disabled={pending}>
            <BellOff aria-hidden />
            {he.app.disableNotifications}
          </Button>
        ) : state === "off" ? (
          <Button size="sm" onClick={enable} disabled={pending || topics.length === 0}>
            <Bell aria-hidden />
            {he.app.enableNotifications}
          </Button>
        ) : null}
      </div>

      {message ? <p className="text-sm text-muted">{message}</p> : null}

      {state === "on" || state === "off" ? (
        <fieldset className="space-y-2.5" disabled={pending}>
          {PUSH_TOPICS.map((topic) => (
            <label key={topic} className="flex items-center gap-3 text-sm">
              <Checkbox checked={topics.includes(topic)} onChange={(e) => toggleTopic(topic, e.currentTarget.checked)} />
              {he.app.topics[topic]}
            </label>
          ))}
        </fieldset>
      ) : null}
    </section>
  );
}
