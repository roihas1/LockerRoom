"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { he } from "@/config/strings";
import {
  announcePushChange,
  detectPushState,
  enablePush,
  readTopics,
  updateTopics,
  type PushState,
} from "@/lib/push/client";
import { ADMIN_PUSH_TOPIC, FAN_PUSH_TOPICS } from "@/lib/push/topics";

const t = he.admin.clicheModeration;

export function AdminClichePushToggle() {
  const [state, setState] = useState<PushState>("loading");
  const [adminOn, setAdminOn] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const frame = requestAnimationFrame(async () => {
      setState(await detectPushState());
      setAdminOn(readTopics().includes(ADMIN_PUSH_TOPIC));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const turnOn = () =>
    startTransition(async () => {
      const current = readTopics();
      const fans = current.filter((topic) => topic !== ADMIN_PUSH_TOPIC);
      const base = fans.length ? fans : [...FAN_PUSH_TOPICS];
      const next = [...new Set([...base, ADMIN_PUSH_TOPIC])];
      if (state !== "on") {
        const result = await enablePush(next);
        if (!result.ok) {
          toast.error(he.app.notificationsFailed);
          return;
        }
        setState("on");
      } else if (!(await updateTopics(next))) {
        toast.error(he.app.notificationsFailed);
        return;
      }
      setAdminOn(true);
      announcePushChange();
      toast.success(he.app.saved);
    });

  const turnOff = () =>
    startTransition(async () => {
      const next = readTopics().filter((topic) => topic !== ADMIN_PUSH_TOPIC);
      if (!(await updateTopics(next.length ? next : [...FAN_PUSH_TOPICS]))) {
        toast.error(he.app.notificationsFailed);
        return;
      }
      setAdminOn(false);
      announcePushChange();
      toast.success(he.app.saved);
    });

  if (state === "loading" || state === "unsupported" || state === "unavailable" || state === "needs-install" || state === "blocked") {
    return null;
  }

  return (
    <section className="card space-y-3 p-5">
      <div>
        <h2 className="font-display text-lg font-bold">{t.adminPushTitle}</h2>
        <p className="mt-1 text-sm text-muted">{t.adminPushHint}</p>
      </div>
      {adminOn ? (
        <Button variant="secondary" size="sm" onClick={turnOff} disabled={pending}>
          {t.adminPushOff}
        </Button>
      ) : (
        <Button size="sm" onClick={turnOn} disabled={pending}>
          {t.adminPushOn}
        </Button>
      )}
    </section>
  );
}
