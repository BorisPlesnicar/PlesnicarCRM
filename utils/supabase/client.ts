import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __plesnicar_supabase_browser_client__: ReturnType<typeof createBrowserClient> | undefined;
}

// In-memory mutex per tab. @supabase/ssr persists the session in cookies, so
// cross-tab coordination is handled by the cookie store; we only need to
// serialize concurrent auth calls inside a single tab to avoid the
// "Lock was stolen by another request" rejection from navigator.locks.
let processLockChain: Promise<unknown> = Promise.resolve();
async function processLock<R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  const previous = processLockChain;
  let release!: () => void;
  processLockChain = new Promise<void>((r) => {
    release = r;
  });
  try {
    await previous.catch(() => {});
    return await fn();
  } finally {
    release();
  }
}

function buildClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    auth: {
      lock: processLock,
    },
  });
}

export const createClient = () => {
  if (typeof window === "undefined") {
    return buildClient();
  }

  if (!globalThis.__plesnicar_supabase_browser_client__) {
    globalThis.__plesnicar_supabase_browser_client__ = buildClient();
  }
  return globalThis.__plesnicar_supabase_browser_client__;
};
