/**
 * Runtime mode flags for ORBIT.
 * When deployed as a static Cloudflare Pages PWA (`NEXT_PUBLIC_STATIC_MODE=true`),
 * ORBIT runs 100% locally in Dexie (IndexedDB) without calling `/api/*` endpoints.
 */
export const isStaticPwaMode = (): boolean =>
  process.env.NEXT_PUBLIC_STATIC_MODE === "true";
