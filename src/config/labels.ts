import type {
  AwardCategory,
  Difficulty,
  ExerciseCategory,
  GameStatus,
  HomeAway,
  PlayerPosition,
  PostType,
} from "@/types/domain";

export const positionLabels: Record<PlayerPosition, string> = {
  guard: "גארד",
  forward: "פורוורד",
  center: "סנטר",
};

export const gameStatusLabels: Record<GameStatus, string> = {
  scheduled: "מתוכנן",
  live: "בשידור חי",
  final: "הסתיים",
  postponed: "נדחה",
  cancelled: "בוטל",
};

export const homeAwayLabels: Record<HomeAway, string> = {
  home: "בית",
  away: "חוץ",
  neutral: "מגרש ניטרלי",
};

export const exerciseCategoryLabels: Record<ExerciseCategory, string> = {
  pick_and_roll: "פיק אנד רול",
  set_play: "מערכים",
  motion: "מושן",
  inbound: "הכנסות",
  fast_break: "מתפרצות",
  zone_offense: "מול אזורית",
  late_game: "סוף משחק",
};

export const exerciseCategoryOrder: ExerciseCategory[] = [
  "pick_and_roll",
  "set_play",
  "motion",
  "inbound",
  "fast_break",
  "zone_offense",
  "late_game",
];

export const difficultyLabels: Record<Difficulty, string> = {
  easy: "בסיסי",
  medium: "בינוני",
  hard: "מתקדם",
};

export const postTypeLabels: Record<PostType, string> = {
  announcement: "הודעה",
  photo: "תמונות",
  video: "וידאו",
  funny_moment: "רגע מצחיק",
  quote: "ציטוט",
  highlight: "היילייט",
  award: "פרס",
  play: "מהלך חדש",
  milestone: "שיאים ואבני דרך",
};

export const awardCategoryLabels: Record<AwardCategory, string> = {
  official: "פרס רשמי",
  fun: "פרס הומוריסטי",
};
