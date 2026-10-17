import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";
import { he } from "@/config/strings";
import type { Database } from "@/types/database";
import {
  detectLiveMoment,
  LIVE_EXTRA_PUSH_MAX,
  type LiveMomentKind,
  type LiveMomentScores,
} from "./live-moments";
import { sendPush } from "./send";
import type { PushMessage, PushTopic } from "./topics";

type Client = SupabaseClient<Database>;

/** Schedules a push after the response is sent, so a slow push service never delays an admin action. */
export function queuePush(topic: PushTopic, message: PushMessage) {
  after(async () => {
    await sendPush(topic, message);
  });
}

async function teamName(client: Client): Promise<string> {
  const { data } = await client.from("team").select("name").eq("id", 1).maybeSingle();
  return data?.name ?? "";
}

export function notifyNewPlay(exerciseId: number, title: string) {
  queuePush("plays", { title: he.push.newPlay, body: title, url: `/plays/${exerciseId}`, tag: `play-${exerciseId}` });
}

export function notifyFeedPost(postId: number, title: string | null, opts: { kind?: "award" | "milestone" } = {}) {
  queuePush("feed", {
    title: opts.kind === "award" ? he.push.newAward : opts.kind === "milestone" ? he.push.newMilestone : he.push.newPost,
    body: title ?? "",
    url: `/locker-room/${postId}`,
    tag: `post-${postId}`,
  });
}

/** "Game started" push, only for games fans can actually open. */
export function notifyGameLive(game: { id: number; opponent: string; is_published: boolean }) {
  if (!game.is_published) return;
  queuePush("live", {
    title: he.push.livePlayTitle(game.opponent),
    body: he.push.liveBody,
    url: `/games/${game.id}`,
    tag: `live-${game.id}`,
  });
}

function liveMomentMessage(kind: LiveMomentKind, gameId: number, teamScore: number, opponentScore: number): PushMessage {
  const score = `${teamScore}:${opponentScore}`;
  if (kind === "comeback") {
    return {
      title: he.push.liveComebackTitle,
      body: he.push.liveComebackBody(score),
      url: `/games/${gameId}`,
      tag: `live-comeback-${gameId}`,
    };
  }
  return {
    title: he.push.liveLeadTitle,
    body: he.push.liveLeadBody,
    url: `/games/${gameId}`,
    tag: `live-lead-${gameId}`,
  };
}

/**
 * Mid-game live moment push (comeback / lead invite). Claim columns + extra-push count make each
 * moment fire at most once and keep the per-game budget at LIVE_EXTRA_PUSH_MAX.
 */
export async function notifyLiveMomentOnce(
  client: Client,
  gameId: number,
  input: {
    isPublished: boolean;
    liveMaxDeficit: number;
    liveExtraPushCount: number;
    comebackSentAt: string | null;
    leadSentAt: string | null;
    scores: LiveMomentScores;
  },
): Promise<void> {
  try {
    if (!input.isPublished) return;
    const decision = detectLiveMoment(
      {
        liveMaxDeficit: input.liveMaxDeficit,
        liveExtraPushCount: input.liveExtraPushCount,
        comebackSent: input.comebackSentAt != null,
        leadSent: input.leadSentAt != null,
      },
      input.scores,
    );
    if (!decision.moment) return;

    const now = new Date().toISOString();
    const claim =
      decision.moment === "comeback"
        ? {
            live_comeback_push_sent_at: now,
            live_extra_push_count: input.liveExtraPushCount + 1,
          }
        : {
            live_lead_push_sent_at: now,
            live_extra_push_count: input.liveExtraPushCount + 1,
          };

    let query = client
      .from("games")
      .update(claim)
      .eq("id", gameId)
      .eq("is_published", true)
      .lt("live_extra_push_count", LIVE_EXTRA_PUSH_MAX)
      .eq("live_extra_push_count", input.liveExtraPushCount);

    if (decision.moment === "comeback") query = query.is("live_comeback_push_sent_at", null);
    else query = query.is("live_lead_push_sent_at", null);

    const { data: claimed } = await query.select("id").maybeSingle();
    if (!claimed) return;

    queuePush(
      "live",
      liveMomentMessage(decision.moment, gameId, input.scores.nextTeam, input.scores.nextOpponent),
    );
  } catch (err) {
    console.error("notifyLiveMomentOnce failed", err);
  }
}

/**
 * Final-score push. Safe to call from every path that can finalize or publish a game: the
 * `final_push_sent_at` claim makes sure each game notifies at most once.
 */
export async function notifyGameFinalOnce(client: Client, gameId: number): Promise<void> {
  try {
    const { data: claimed } = await client
      .from("games")
      .update({ final_push_sent_at: new Date().toISOString() })
      .eq("id", gameId)
      .eq("status", "final")
      .eq("is_published", true)
      .is("final_push_sent_at", null)
      .select("id, opponent, team_score, opponent_score")
      .maybeSingle();
    if (!claimed || claimed.team_score == null || claimed.opponent_score == null) return;
    const won = claimed.team_score > claimed.opponent_score;
    const team = await teamName(client);
    queuePush("games", {
      title: he.push.finalTitle(won ? he.result.win : he.result.loss, `${claimed.team_score}:${claimed.opponent_score}`),
      body: he.push.finalBody(team, claimed.opponent),
      url: `/games/${gameId}`,
      tag: `final-${gameId}`,
    });
  } catch (err) {
    console.error("notifyGameFinalOnce failed", err);
  }
}
