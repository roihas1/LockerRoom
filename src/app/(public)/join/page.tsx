import type { Metadata } from "next";
import QRCode from "qrcode";
import { InstallGuide } from "@/components/app/install-prompt";
import { NotificationsToggle } from "@/components/app/notifications-toggle";
import { ShareButton } from "@/components/common/share-button";
import { he } from "@/config/strings";
import { getSiteUrl } from "@/config/site";
import { getData } from "@/lib/data";
import { shareMessage } from "@/lib/meta";

export async function generateMetadata(): Promise<Metadata> {
  const team = await getData().getTeam();
  const title = `${he.app.join.title} · ${team.name}`;
  return { title: { absolute: title }, description: he.app.join.subtitle, openGraph: { title, description: he.app.join.subtitle } };
}

export default async function JoinPage() {
  const team = await getData().getTeam();
  const joinUrl = new URL("/join", getSiteUrl()).toString();
  const qrSvg = await QRCode.toString(joinUrl, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0a0b0d", light: "#ffffff" },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="card court-bg space-y-3 p-6 text-center">
        <h1 className="font-display text-3xl font-black">{he.app.join.title}</h1>
        <p data-user-content className="font-display text-xl font-bold text-team">
          {team.name}
        </p>
        <p className="text-muted">{he.app.join.subtitle}</p>
        <div className="flex justify-center pt-1">
          <ShareButton path="/join" text={shareMessage.join(team)} label={he.share.invite} variant="primary" size="md" />
        </div>
      </header>

      <section className="card space-y-3 p-5">
        <h2 className="font-display text-lg font-bold">{he.app.join.what}</h2>
        <ul className="space-y-2 text-sm">
          {he.app.join.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>

      <InstallGuide />
      <NotificationsToggle />

      <section className="card flex flex-col items-center gap-3 p-5 text-center">
        <h2 className="font-display text-lg font-bold">{he.app.join.qrTitle}</h2>
        <div
          className="size-56 overflow-hidden rounded-2xl bg-white p-2 [&_svg]:size-full"
          role="img"
          aria-label={he.app.join.qrTitle}
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <p className="num text-xs text-muted" dir="ltr">
          {joinUrl.replace(/^https?:\/\//, "")}
        </p>
        <p className="max-w-sm text-sm text-muted">{he.app.join.qrHint}</p>
      </section>
    </div>
  );
}
