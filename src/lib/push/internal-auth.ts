import { timingSafeEqual } from "node:crypto";

/** Validates x-push-secret for internal routes (push dispatch, revalidate, IBBA sync triggers). */
export function isInternalPushAuthorized(request: Request): boolean {
  const expected = process.env.PUSH_DISPATCH_SECRET;
  const given = request.headers.get("x-push-secret");
  if (!expected || !given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}
