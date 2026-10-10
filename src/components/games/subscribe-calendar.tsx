import { getSiteUrl } from "@/config/site";
import { he } from "@/config/strings";
import { SubscribeButton } from "./subscribe-button";

export function SubscribeCalendar() {
  const feed = `${new URL(getSiteUrl()).host}/games/calendar.ics`;
  const webcal = `webcal://${feed}`;
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
  return (
    <section aria-label={he.games.subscribeCalendar} className="card mt-3 space-y-3 p-4 text-center">
      <p className="text-sm text-muted">{he.games.subscribeHint}</p>
      <div className="flex justify-center">
        <SubscribeButton webcal={webcal} google={google} />
      </div>
    </section>
  );
}
