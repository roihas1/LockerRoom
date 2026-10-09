/** Only relative `/admin` paths are allowed after login. */
export function safeAdminNext(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "/admin";
  if (!raw.startsWith("/admin") || raw.startsWith("//") || raw.includes("://")) return "/admin";
  return raw;
}
