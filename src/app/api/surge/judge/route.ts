import { judgeCall, mockCall } from "@/lib/surgeAi";
import type { Call, OpenInc } from "@/lib/surge";

const timeout = <T,>(p: Promise<T>, ms: number, fb: () => T) => Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fb()), ms))]);

export async function POST(req: Request) {
  const { call, open } = (await req.json()) as { call: Call; open: OpenInc[] };
  const t0 = Date.now();
  const judgment = await timeout(judgeCall(call, open), 12000, () => mockCall(call, open));
  return Response.json({ ...judgment, ms: Date.now() - t0 });
}
