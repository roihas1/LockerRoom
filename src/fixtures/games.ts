import { pickPotgPlayerId } from "@/lib/stats/pir";
import type { Game, HomeAway, Media, StatLine } from "@/types/domain";
import { placeholderMedia } from "./media";
import { fixturePlayers } from "./players";

/** Deterministic PRNG so fixtures and the generated seed are identical on every run. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Profile {
  /** Average shots: two-point attempts, three-point attempts, free-throw attempts. */
  twoA: number;
  threeA: number;
  ftA: number;
  twoPct: number;
  threePct: number;
  ftPct: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
}

const profiles: Record<number, Profile> = {
  1: { twoA: 9, threeA: 5, ftA: 4, twoPct: 0.5, threePct: 0.36, ftPct: 0.82, reb: 4, ast: 5, stl: 2, blk: 0, tov: 3 },
  2: { twoA: 6, threeA: 3, ftA: 2, twoPct: 0.47, threePct: 0.33, ftPct: 0.6, reb: 3, ast: 7, stl: 1.5, blk: 0, tov: 2.5 },
  3: { twoA: 9, threeA: 0, ftA: 4, twoPct: 0.58, threePct: 0, ftPct: 0.55, reb: 10, ast: 1.5, stl: 0.5, blk: 1.5, tov: 2 },
  4: { twoA: 3, threeA: 7, ftA: 1.5, twoPct: 0.45, threePct: 0.42, ftPct: 0.85, reb: 3, ast: 1.5, stl: 0.7, blk: 0.2, tov: 1 },
  5: { twoA: 8, threeA: 1, ftA: 4, twoPct: 0.52, threePct: 0.25, ftPct: 0.65, reb: 6, ast: 2, stl: 0.8, blk: 0.7, tov: 2 },
  6: { twoA: 5, threeA: 2, ftA: 2, twoPct: 0.48, threePct: 0.3, ftPct: 0.75, reb: 2.5, ast: 3, stl: 2, blk: 0, tov: 2 },
  7: { twoA: 4, threeA: 0, ftA: 2, twoPct: 0.55, threePct: 0, ftPct: 0.5, reb: 6, ast: 0.7, stl: 0.3, blk: 2, tov: 1 },
  8: { twoA: 4, threeA: 2, ftA: 1.5, twoPct: 0.45, threePct: 0.3, ftPct: 0.7, reb: 4.5, ast: 1.5, stl: 1.8, blk: 0.5, tov: 1 },
  9: { twoA: 3, threeA: 3, ftA: 1, twoPct: 0.45, threePct: 0.35, ftPct: 0.8, reb: 2, ast: 3, stl: 1, blk: 0, tov: 1 },
  10: { twoA: 3, threeA: 1, ftA: 1.5, twoPct: 0.42, threePct: 0.28, ftPct: 0.55, reb: 3, ast: 1, stl: 0.5, blk: 0.3, tov: 1.2 },
};

interface GameSeed {
  id: number;
  round: number;
  opponent: string;
  tipoffAt: string;
  location: string;
  homeAway: HomeAway;
  opponentScoreDelta?: number;
  /** Players who did not play. */
  dnp?: number[];
  /** Whether full shooting splits and optional stats were recorded. */
  fullStats?: boolean;
  scheduled?: boolean;
  recap?: string;
  potgNote?: string;
}

const gameSeeds: GameSeed[] = [
  {
    id: 1,
    round: 1,
    opponent: "מכבי השרון",
    tipoffAt: "2026-09-03T17:30:00.000Z",
    location: "אולם הספורט העירוני",
    homeAway: "home",
    opponentScoreDelta: -9,
    fullStats: true,
    dnp: [10],
    recap: "פתיחת עונה מצוינת. ההגנה הלוחצת ברבע השני יצרה פער שלא נסגר עד הסוף.\nעומר שלט בצבע ודניאל ניהל את המשחק בביטחון.",
    potgNote: "שליטה מוחלטת בריבאונד ונוכחות מפחידה בצבע.",
  },
  {
    id: 2,
    round: 2,
    opponent: "הפועל גבעת הזיתים",
    tipoffAt: "2026-09-10T17:30:00.000Z",
    location: "אולם גבעת הזיתים",
    homeAway: "away",
    opponentScoreDelta: -4,
    fullStats: true,
    dnp: [7],
    recap: "משחק צמוד עד הדקות האחרונות. שתי שלשות רצופות של איתי הכריעו.",
    potgNote: "שלשות בדיוק כשהיה צריך.",
  },
  {
    id: 3,
    round: 3,
    opponent: "אליצור הדרים",
    tipoffAt: "2026-09-17T17:30:00.000Z",
    location: "אולם הדרים",
    homeAway: "away",
    opponentScoreDelta: 7,
    fullStats: true,
    dnp: [9],
    recap: "ערב קשה בחוץ. הקליעה לא הלכה, ואיבדנו יותר מדי כדורים ברבע השלישי.\nלומדים וממשיכים.",
    potgNote: "נלחם על כל כדור גם כשהקבוצה התקשתה.",
  },
  {
    id: 4,
    round: 4,
    opponent: "בני הגליל העליון",
    tipoffAt: "2026-09-24T17:30:00.000Z",
    location: "אולם הספורט העירוני",
    homeAway: "home",
    opponentScoreDelta: -12,
    fullStats: true,
    recap: "חזרה גדולה לניצחונות. כל הסגל שיחק, והספסל תרם 30 נקודות.",
    potgNote: "ניהול משחק מושלם ושיא עונתי באסיסטים.",
  },
  {
    id: 5,
    round: 5,
    opponent: "עירוני נמל הצפון",
    tipoffAt: "2026-10-01T17:30:00.000Z",
    location: "היכל נמל הצפון",
    homeAway: "away",
    opponentScoreDelta: -6,
    dnp: [6],
    recap: "ניצחון חוץ חשוב. הזנו רק נקודות, ריבאונדים ואסיסטים – מי שכח את דף הסטטיסטיקה? 😅",
    potgNote: "קלע מכל מקום במגרש.",
  },
  {
    id: 6,
    round: 6,
    opponent: "הכח צפון",
    tipoffAt: "2026-10-08T17:30:00.000Z",
    location: "אולם הספורט העירוני",
    homeAway: "home",
    opponentScoreDelta: -3,
    dnp: [3],
    recap: "בלי עומר בצבע, אלון נכנס לנעליים וחסם את הזריקה האחרונה של היריבה.",
    potgNote: "החסימה שניצחה את המשחק.",
  },
  {
    id: 7,
    round: 7,
    opponent: "מכבי עמק חפר",
    tipoffAt: "2026-10-15T17:30:00.000Z",
    location: "אולם הספורט העירוני",
    homeAway: "home",
    scheduled: true,
  },
  {
    id: 8,
    round: 8,
    opponent: "הפועל מרכז הכרמל",
    tipoffAt: "2026-10-22T17:30:00.000Z",
    location: "אולם מרכז הכרמל",
    homeAway: "away",
    scheduled: true,
  },
];

function poisson(rand: () => number, mean: number): number {
  const l = Math.exp(-mean);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > l);
  return k - 1;
}

function binomial(rand: () => number, n: number, p: number): number {
  let made = 0;
  for (let i = 0; i < n; i++) if (rand() < p) made++;
  return made;
}

function buildLines(seed: GameSeed): StatLine[] {
  const rand = mulberry32(seed.id * 7919);
  const lines: StatLine[] = [];
  for (const player of fixturePlayers) {
    if (seed.dnp?.includes(player.id)) continue;
    const pr = profiles[player.id]!;
    const twoA = poisson(rand, pr.twoA);
    const threeA = poisson(rand, pr.threeA);
    const ftA = poisson(rand, pr.ftA);
    const twoM = binomial(rand, twoA, pr.twoPct);
    const threeM = binomial(rand, threeA, pr.threePct);
    const ftM = binomial(rand, ftA, pr.ftPct);
    const points = twoM * 2 + threeM * 3 + ftM;
    const full = seed.fullStats === true;
    lines.push({
      gameId: seed.id,
      playerId: player.id,
      points,
      rebounds: poisson(rand, pr.reb),
      assists: poisson(rand, pr.ast),
      steals: full ? poisson(rand, pr.stl) : null,
      blocks: full ? poisson(rand, pr.blk) : null,
      turnovers: full ? poisson(rand, pr.tov) : null,
      fouls: full ? Math.min(5, poisson(rand, 2)) : null,
      fgMade: full ? twoM + threeM : null,
      fgAttempted: full ? twoA + threeA : null,
      threeMade: full ? threeM : null,
      threeAttempted: full ? threeA : null,
      ftMade: full ? ftM : null,
      ftAttempted: full ? ftA : null,
    });
  }
  return lines;
}

function potgFor(lines: StatLine[]): number | null {
  return pickPotgPlayerId(lines);
}

export const fixtureStatLines: StatLine[] = gameSeeds.filter((s) => !s.scheduled).flatMap(buildLines);

const actionCaptions = [
  "חדירה לסל ברבע הראשון",
  "שלשה מהפינה",
  "החסימה של הערב",
  "כולם על הספסל קמו",
  "הגנה לוחצת על כל המגרש",
  "שמחה בחדר ההלבשה",
];

export const fixtureGameMedia: Media[] = gameSeeds
  .filter((s) => !s.scheduled)
  .flatMap((s) => {
    const lines = fixtureStatLines.filter((l) => l.gameId === s.id);
    const tagged = [...lines].sort((a, b) => b.points - a.points).slice(0, 2).map((l) => l.playerId);
    const images = [0, 1, 2, 3].map((i) =>
      placeholderMedia(`action-${((s.id + i) % 6) + 1}`, "image", {
        gameId: s.id,
        caption: actionCaptions[(s.id + i) % actionCaptions.length]!,
        playerIds: i === 0 ? tagged : i === 1 ? tagged.slice(0, 1) : [],
        sortOrder: i,
      }),
    );
    const video = placeholderMedia("highlight", "video", {
      gameId: s.id,
      caption: "היילייטס מהמשחק",
      playerIds: tagged.slice(0, 1),
      sortOrder: 10,
    });
    return [...images, video];
  });

export const fixtureGames: Game[] = gameSeeds.map((s) => {
  if (s.scheduled) {
    return {
      id: s.id,
      seasonId: 1,
      roundNumber: s.round,
      opponent: s.opponent,
      tipoffAt: s.tipoffAt,
      location: s.location,
      homeAway: s.homeAway,
      status: "scheduled",
      teamScore: null,
      opponentScore: null,
      recap: null,
      playerOfGameId: null,
      potgNote: null,
      playOfGameMediaId: null,
      isPublished: true,
      isPractice: false,
    };
  }
  const lines = fixtureStatLines.filter((l) => l.gameId === s.id);
  const teamScore = lines.reduce((sum, l) => sum + l.points, 0);
  const video = fixtureGameMedia.find((m) => m.gameId === s.id && m.kind === "video");
  return {
    id: s.id,
    seasonId: 1,
    roundNumber: s.round,
    opponent: s.opponent,
    tipoffAt: s.tipoffAt,
    location: s.location,
    homeAway: s.homeAway,
    status: "final",
    teamScore,
    opponentScore: teamScore + (s.opponentScoreDelta ?? -5),
    recap: s.recap ?? null,
    playerOfGameId: potgFor(lines),
    potgNote: s.potgNote ?? null,
    playOfGameMediaId: video?.id ?? null,
    isPublished: true,
    isPractice: false,
  };
});
