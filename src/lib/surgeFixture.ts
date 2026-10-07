import fx from "./surgeFixture.json";
import { demoMode } from "./demoFixture";

/** Same capture/replay trick as demoFixture.ts, with its own fixture file for /911. */
export async function cachedSurge<T>(key: string, live: () => Promise<T>, delayMs = 350): Promise<T> {
  const store = fx as Record<string, unknown>;
  if (demoMode() === "replay" && key in store) {
    await new Promise((r) => setTimeout(r, delayMs));
    return structuredClone(store[key]) as T;
  }
  const v = await live();
  if (demoMode() === "capture") {
    const w = window as unknown as { __fx?: Record<string, unknown> };
    (w.__fx ??= {})[key] = v;
  }
  return v;
}
