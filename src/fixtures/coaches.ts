import type { Coach } from "@/types/domain";
import { placeholderMedia } from "./media";

export const fixtureCoaches: Coach[] = [
  {
    id: 1,
    name: "משה גולן",
    role: "מאמן ראשי",
    photo: placeholderMedia("player-coach-1", "image", { width: 800, height: 1000 }),
    nickname: "הגנרל",
    description: "מאמן את הקבוצה מהיום הראשון. מאמין בהגנה, בריבאונד ובפסק זמן בדקה הנכונה.",
    strength: "📋 פסקי זמן שמשנים משחק",
    weakness: "📢 הקול נגמר עד הרבע השלישי",
    quote: "״הגנה! הגנה! הגנה!״",
    intro: "הוא צועק, הוא מצייר על הלוח, הוא מאמין בנו יותר מאיתנו... הגנרל!",
    hashtag: "פסק_זמן",
    isActive: true,
    sortOrder: 0,
  },
  {
    id: 2,
    name: "אבי שרון",
    role: "עוזר מאמן",
    photo: placeholderMedia("player-coach-2", "image", { width: 800, height: 1000 }),
    nickname: "המחברת",
    description: "רושם כל מהלך, סופר כל איבוד וזוכר מי לא חזר להגנה.",
    strength: "🧠 ניתוח יריבות",
    weakness: "🏀 לא נגע בכדור מאז 2009",
    quote: "״רשמתי.״",
    intro: "יש לו מחברת, ואתם כבר בתוכה... המחברת!",
    hashtag: "רשמתי",
    isActive: true,
    sortOrder: 1,
  },
];
