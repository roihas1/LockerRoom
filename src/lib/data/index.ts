import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { createSessionClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/env";
import { createCachedPublicSource } from "./cached-public-source";
import { createFixtureSource } from "./fixture-source";
import { createSupabaseSource } from "./supabase-source";
import type { DataSource } from "./types";

export type { DataSource } from "./types";

/** Public, published-only reads (cross-request cached ~60s when not in demo mode). */
export const getData = cache((): DataSource => {
  if (isDemoMode()) return createFixtureSource();
  return createCachedPublicSource(createSupabaseSource(createPublicClient()));
});

/**
 * Public, published-only reads that skip the cross-request cache. Used around game time so a finished
 * (or just-started) game is never shown with a stale status or score.
 */
export const getFreshData = cache((): DataSource => {
  if (isDemoMode()) return createFixtureSource();
  return createSupabaseSource(createPublicClient());
});

/** Admin reads including drafts. Callers must have passed requireAdmin(). */
export const getAdminData = cache(async (): Promise<DataSource> => {
  if (isDemoMode()) return createFixtureSource({ includeDrafts: true });
  return createSupabaseSource(await createSessionClient(), { includeDrafts: true });
});
