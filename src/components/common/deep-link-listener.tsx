"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { removeQueryParams, buildDeepLinkSignature } from "@/lib/utils/deep-links";

interface DeepLinkListenerProps {
  params: string[];
  onDeepLink: (params: Record<string, string>) => void | Promise<void>;
}

/**
 * Universal Deep Link Listener Component.
 * Monitors Next.js search parameters, detects target deep link keys, invokes the callback,
 * and seamlessly cleans consumed parameters from the URL using router.replace() without page reload.
 *
 * MUST be wrapped in <Suspense fallback={null}> to ensure static prerendering during build.
 */
export function DeepLinkListener({ params, onDeepLink }: DeepLinkListenerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const lastProcessedRef = useRef<string | null>(null);
  const onDeepLinkRef = useRef(onDeepLink);

  useEffect(() => {
    onDeepLinkRef.current = onDeepLink;
  }, [onDeepLink]);

  // Stable params representation to prevent re-running effect on every render if an inline array is passed
  const paramsKey = params.slice().sort().join(",");

  useEffect(() => {
    const extracted: Record<string, string> = {};
    let hasAny = false;

    for (const key of params) {
      const val = searchParams.get(key);
      if (val !== null && val.trim().length > 0) {
        extracted[key] = val.trim();
        hasAny = true;
      }
    }

    if (!hasAny) {
      // URL has none of the target parameters; reset processed signature so future navigations trigger
      lastProcessedRef.current = null;
      return;
    }

    const signature = buildDeepLinkSignature(extracted);
    if (lastProcessedRef.current === signature) {
      return;
    }

    lastProcessedRef.current = signature;

    // Run callback and remove consumed parameters from URL
    Promise.resolve(onDeepLinkRef.current(extracted)).finally(() => {
      const cleanUrl = removeQueryParams(pathname, searchParams, params);
      router.replace(cleanUrl, { scroll: false });
    });
  }, [searchParams, router, pathname, paramsKey, params]);

  return null;
}
