"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { he } from "@/config/strings";
import { registerServiceWorker } from "@/lib/push/client";

type PushMessage = { type: "push"; title: string; body: string; url: string };

export function ServiceWorkerRegistrar() {
  const router = useRouter();

  useEffect(() => {
    void registerServiceWorker();
    if (!("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent<PushMessage>) => {
      if (event.data?.type !== "push") return;
      const { title, body, url } = event.data;
      toast(title, {
        description: body || undefined,
        duration: 8000,
        action: url.startsWith("/") ? { label: he.app.openNotification, onClick: () => router.push(url) } : undefined,
      });
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [router]);

  return null;
}
