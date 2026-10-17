import "server-only";
import { revalidateTag } from "next/cache";
import { PUBLIC_CACHE_TAG } from "./public";

/** Bust the public data cache immediately (call from admin Server Actions). */
export function revalidatePublic() {
  revalidateTag(PUBLIC_CACHE_TAG, { expire: 0 });
}
