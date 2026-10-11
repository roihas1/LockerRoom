/** Shared IBBA HTTP client for Next.js (Amplify can reach ibasketball; Supabase Edge often gets 403). */

export const IBBA_API = "https://ibasketball.co.il/wp-json/sportspress/v2";

export const ibbaRequestHeaders: HeadersInit = {
  Accept: "application/json",
  Referer: "https://ibasketball.co.il/",
  Origin: "https://ibasketball.co.il",
  "User-Agent":
    "Mozilla/5.0 (compatible; LockerRoom/1.0; +https://ibasketball.co.il) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

export function isAllowedIbbaUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === "ibasketball.co.il" && u.pathname.startsWith("/wp-json/sportspress/");
  } catch {
    return false;
  }
}

export async function fetchIbbaJson<T>(url: string, timeoutMs = 120_000): Promise<T> {
  const res = await fetch(url, {
    headers: ibbaRequestHeaders,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`IBBA ${res.status}: ${url}`);
  return (await res.json()) as T;
}
