import { he } from "@/config/strings";
import type { ActionResult } from "@/lib/utils/action-result";
import { actionFail } from "@/lib/utils/action-result";

type PgError = { code?: string; message?: string; details?: string };

function asPgError(err: unknown): PgError | null {
  if (!err || typeof err !== "object") return null;
  const e = err as PgError & { error?: PgError };
  return e.code ? e : e.error?.code ? e.error : null;
}

/** Maps Supabase / Postgres errors to Hebrew action results. */
export function mapDbError(err: unknown, fallback = he.errors.database): ActionResult {
  const pg = asPgError(err);
  if (!pg?.code) return actionFail(fallback, "database");

  switch (pg.code) {
    case "23505":
      if (pg.message?.includes("players_active_jersey") || pg.details?.includes("jersey")) {
        return actionFail(he.errors.duplicateJersey, "duplicate", { jerseyNumber: [he.errors.duplicateJersey] });
      }
      if (pg.message?.includes("games_round_unique") || pg.details?.includes("round")) {
        return actionFail(he.errors.duplicateRound, "duplicate", { roundNumber: [he.errors.duplicateRound] });
      }
      return actionFail(he.errors.duplicate, "duplicate");
    case "23503":
      return actionFail(he.errors.inUse, "in_use");
    case "23514":
      if (pg.message?.includes("games_final_scores") || pg.details?.includes("games_final_scores")) {
        return actionFail(he.admin.liveStats.finishTied, "validation");
      }
      return actionFail(he.errors.validation, "validation");
    case "42501":
      return actionFail(he.errors.unauthorized, "unauthorized");
    case "P0001": {
      const msg = pg.message ?? "";
      if (msg.includes("self_demote")) return actionFail(he.errors.selfDemote, "self_demote");
      if (msg.includes("last_admin")) return actionFail(he.errors.lastAdmin, "last_admin");
      return actionFail(fallback, "database");
    }
    case "P0002":
      if (pg.message?.includes("user_not_found")) {
        return actionFail(he.errors.notFound, "not_found");
      }
      return actionFail(he.errors.notFound, "not_found");
    default: {
      const msg = pg.message ?? "";
      if (msg.includes("self_demote")) return actionFail(he.errors.selfDemote, "self_demote");
      if (msg.includes("last_admin")) return actionFail(he.errors.lastAdmin, "last_admin");
      if (msg.includes("user_not_found")) return actionFail(he.errors.notFound, "not_found");
      if (msg.includes("not_authorized")) return actionFail(he.errors.unauthorized, "unauthorized");
      return actionFail(fallback, "database");
    }
  }
}

export function mapErrorToAction(err: unknown, fallback = he.errors.database): ActionResult {
  return mapDbError(err, fallback);
}

export function mapAuthError(message?: string): ActionResult {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return actionFail(he.errors.invalidCredentials, "auth");
  }
  if (m.includes("rate limit")) return actionFail(he.errors.rateLimited, "rate_limit");
  return actionFail(he.errors.generic, "auth");
}

/** Maps Supabase Auth or database errors for login and mutations. */
export function mapError(err: unknown): ActionResult {
  if (err && typeof err === "object" && "message" in err && !("code" in err)) {
    return mapAuthError(String((err as { message: string }).message));
  }
  return mapDbError(err);
}
