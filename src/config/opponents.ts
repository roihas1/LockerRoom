/** League team logos in public/teams, keyed by the opponent name as entered on games. */
const opponentLogos: Record<string, string> = {
  "אליצור פתח תקווה": "/teams/elitzur-petah-tikva.webp",
  "אליצור רעננה עירוני": "/teams/elitzur-raanana.webp",
  "הפועל אריאל": "/teams/hapoel-ariel.webp",
  "הפועל כפר קאסם": "/teams/hapoel-kfar-qasem.webp",
  'מ.ס. הד"ג פ"ת אורון': "/teams/hadag-petah-tikva-oron.webp",
  "מכבי הוד השרון ירוק": "/teams/maccabi-hod-hasharon.webp",
  'מכבי פ"ת סירקין': "/teams/maccabi-petah-tikva-sirkin.png",
  "מכבי ראש העין": "/teams/maccabi-rosh-haayin.webp",
  "מכבי רעננה יאיר": "/teams/maccabi-raanana-yair.webp",
  "מכבי רעננה נועם": "/teams/maccabi-raanana-noam.webp",
};

/** Ignores quote style (" vs ״) and spacing so admin-typed names still match. */
export function normalizeOpponentName(name: string): string {
  return name.replace(/["'״׳]/g, "").replace(/\s+/g, " ").trim();
}

const byNormalizedName = new Map(Object.entries(opponentLogos).map(([name, src]) => [normalizeOpponentName(name), src]));

export function opponentLogo(name: string): string | null {
  return byNormalizedName.get(normalizeOpponentName(name)) ?? null;
}
