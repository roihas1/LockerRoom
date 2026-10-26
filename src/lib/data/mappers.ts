import { parsePlayDiagram } from "@/lib/play-diagram/parse";
import type {
  AwardRow,
  CoachRow,
  ExerciseRow,
  GameEventRow,
  GameRow,
  MediaRow,
  PlayerGameStatRow,
  PlayerRow,
  PostRow,
  SeasonRow,
  TeamRow,
} from "@/types/database";
import type { Award, Coach, Exercise, Game, GameEvent, Media, Player, Post, Season, StatLine, Team } from "@/types/domain";

export type MediaLookup = (id: string | null) => Media | null;

export function toMedia(row: MediaRow, playerIds: number[] = []): Media {
  return {
    id: row.id,
    kind: row.kind,
    storageKey: row.storage_key,
    posterKey: row.poster_key,
    title: row.title,
    caption: row.caption,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    width: row.width,
    height: row.height,
    durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds),
    gameId: row.game_id,
    postId: row.post_id,
    sortOrder: row.sort_order,
    playerIds,
    createdAt: row.created_at,
  };
}

export function toTeam(row: TeamRow, media: MediaLookup): Team {
  return {
    name: row.name,
    shortName: row.short_name,
    description: row.description,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    logo: media(row.logo_media_id),
    cover: media(row.cover_media_id),
  };
}

export function toSeason(row: SeasonRow): Season {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active,
  };
}

export function toPlayer(row: PlayerRow, media: MediaLookup): Player {
  return {
    id: row.id,
    name: row.name,
    jerseyNumber: row.jersey_number,
    position: row.position,
    heightCm: row.height_cm,
    photo: media(row.photo_media_id),
    nickname: row.nickname,
    teamRole: row.team_role,
    description: row.description,
    strength: row.strength,
    weakness: row.weakness,
    quote: row.quote,
    intro: row.intro,
    hashtag: row.hashtag,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

export function toCoach(row: CoachRow, media: MediaLookup): Coach {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    photo: media(row.photo_media_id),
    nickname: row.nickname,
    description: row.description,
    strength: row.strength,
    weakness: row.weakness,
    quote: row.quote,
    intro: row.intro,
    hashtag: row.hashtag,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

export function toGame(row: GameRow): Game {
  return {
    id: row.id,
    seasonId: row.season_id,
    roundNumber: row.round_number,
    opponent: row.opponent,
    tipoffAt: row.tipoff_at,
    location: row.location,
    homeAway: row.home_away,
    status: row.status,
    teamScore: row.team_score,
    opponentScore: row.opponent_score,
    recap: row.recap,
    playerOfGameId: row.player_of_game_id,
    potgNote: row.potg_note,
    playOfGameMediaId: row.play_of_game_media_id,
    isPublished: row.is_published,
    isPractice: row.is_practice,
    isCup: row.is_cup,
  };
}

export function toStatLine(row: PlayerGameStatRow): StatLine {
  return {
    gameId: row.game_id,
    playerId: row.player_id,
    points: row.points,
    rebounds: row.rebounds,
    assists: row.assists,
    steals: row.steals,
    blocks: row.blocks,
    turnovers: row.turnovers,
    fouls: row.fouls,
    fgMade: row.fg_made,
    fgAttempted: row.fg_attempted,
    threeMade: row.three_made,
    threeAttempted: row.three_attempted,
    ftMade: row.ft_made,
    ftAttempted: row.ft_attempted,
  };
}

export function toGameEvent(row: GameEventRow): GameEvent {
  return {
    id: row.id,
    gameId: row.game_id,
    playerId: row.player_id,
    kind: row.kind,
    value: row.value,
    createdAt: row.created_at,
  };
}

export function toExercise(row: ExerciseRow, media: MediaLookup): Exercise {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description,
    instructions: row.instructions ?? [],
    coachingPoints: row.coaching_points ?? [],
    durationMinutes: row.duration_minutes,
    difficulty: row.difficulty,
    video: media(row.video_media_id),
    thumbnail: media(row.thumbnail_media_id),
    image: media(row.image_media_id),
    diagram: parsePlayDiagram(row.diagram),
    isPublished: row.is_published,
    sortOrder: row.sort_order,
  };
}

export function toAward(row: AwardRow, media: MediaLookup): Award {
  return {
    id: row.id,
    seasonId: row.season_id,
    title: row.title,
    emoji: row.emoji,
    category: row.category,
    description: row.description,
    playerId: row.player_id,
    gameId: row.game_id,
    image: media(row.image_media_id),
    awardedOn: row.awarded_on,
    isPublished: row.is_published,
  };
}

export function toPost(row: PostRow, media: Media[]): Post {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    quotePlayerId: row.quote_player_id,
    gameId: row.game_id,
    awardId: row.award_id,
    exerciseId: row.exercise_id,
    milestonePlayerId: row.milestone_player_id ?? null,
    isPinned: row.is_pinned,
    isPublished: row.is_published,
    publishedAt: row.published_at,
    media,
  };
}
