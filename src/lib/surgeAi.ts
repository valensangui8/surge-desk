import "server-only";
import { choice, noul, score, TypeSafeClient } from "@typesafe-ai/sdk";
import { Output } from "ai";
import { z } from "zod";
import { gen } from "./gen";
import { llmAvailable } from "./llm";
import { ADDS, scene, SEVERITY, TYPES, type Call, type CallJudgment, type IncType, type OpenInc } from "./surge";

let client: TypeSafeClient | null = null;
const getClient = () => {
  if (!process.env.TYPESAFE_API_KEY) return null;
  client ??= new TypeSafeClient();
  return client;
};

/** Jev answers every question about a call in ONE request (parallel, calibrated). Code decides what to do with it. */
export async function judgeCall(call: Call, open: OpenInc[]): Promise<CallJudgment> {
  const c = getClient();
  if (!c) return mockCall(call, open);
  try {
    const matchOpts: Record<string, string> = { new: "A different emergency than every open incident (different place or different situation)" };
    for (const i of open.slice(-12)) matchOpts[i.id] = `The same emergency as ${i.id}: ${i.summary} at ${i.location}`;
    const res = await c.systemOne({
      state: {
        situation: scene.briefing,
        call: { transcript: call.text, channel: call.channel, phone_location: call.loc, language: call.lang },
        open_incidents: open.slice(-12),
      },
      questions: {
        ...(open.length
          ? { match: choice("Is `call` about the same real-world emergency as one of `open_incidents`? Same emergency = same place and same situation, even in another language or from a different vantage point. A different sick or injured person in another spot is a different emergency.", matchOpts) }
          : {}),
        adds: choice("Compared with what `open_incidents` already know, what does `call.transcript` add?", ADDS),
        type: choice("What kind of emergency does `call.transcript` describe? It may be in any language.", TYPES),
        severity: score("How severe is the situation the caller describes for the people involved?", [...SEVERITY]),
        life_threat: noul("Is a person's life in immediate danger according to `call.transcript`?", {
          true: "Someone could die or be gravely injured in the next minutes without help",
          false: "No immediate danger to life",
        }),
        credible: noul("Is `call.transcript` a first-hand, specific observation (as opposed to hearsay or rumor)?"),
      },
    });
    const a = res.answers as Record<string, any>;
    const m = a.match;
    const matchId = m && m.choice !== "new" ? m.choice : null;
    return {
      matchId,
      matchProbs: m ? m.probabilities : { new: 1 },
      adds: a.adds.choice,
      addsProbs: a.adds.probabilities,
      type: a.type.choice,
      severity: a.severity.score,
      lifeThreat: a.life_threat.noul,
      credible: a.credible.noul,
      summary: await summarize(call, matchId === null || a.adds.choice !== "nothing_new"),
      mock: false,
    };
  } catch (e) {
    console.error("Jev failed, keyword fallback:", (e as Error).message);
    return mockCall(call, open);
  }
}

const sumSchema = z.object({ summary: z.string().describe("<=9 word English dispatch line with the key fact and place, e.g. 'Wheelchair user trapped, apt 6C, 410 W 47th'") });

/** LLM: short English dispatch line (translation included). Only for new incidents / new intel. */
async function summarize(call: Call, needed: boolean): Promise<string> {
  const fb = call.text.length > 70 ? call.text.slice(0, 67) + "…" : call.text;
  if (!needed || !llmAvailable()) return fb;
  try {
    const p = gen({ output: Output.object({ schema: sumSchema }), prompt: `911 call transcript (may be in any language). Phone location: ${call.loc}.\n"""${call.text}"""\nWrite the dispatch line.` });
    const r = await Promise.race([p, new Promise<null>((ok) => setTimeout(() => ok(null), 6000))]);
    const out = r ? (r.output as z.infer<typeof sumSchema>).summary : "";
    // Some free models echo the prompt: keep only short, clean dispatch lines.
    return out && out.length <= 80 && !/transcript|dispatch line|"/i.test(out) ? out : fb;
  } catch {
    return fb;
  }
}

/** Keyword fallback so the demo still runs without a TypeSafe key. */
export function mockCall(call: Call, open: OpenInc[]): CallJudgment {
  const t = call.text.toLowerCase();
  const has = (...w: string[]) => w.some((x) => t.includes(x));
  const type: IncType = has("collapsed", "chest", "breathing", "coughing") ? "medical" : has("hit", "cab") ? "traffic" : has("power", "lights") ? "utility" : has("fire", "smoke", "incendio", "火", "пожар", "আগুন", "gas", "fuego") ? "fire" : "other";
  const same = open.find((i) => (type === "fire" && i.summary.toLowerCase().includes("fire")) || (type === "utility" && i.summary.toLowerCase().includes("power")));
  const adds = has("?", "heard", "train") ? "non_emergency" : same && has("6c", "8f", "7th floor", "gas") ? "life_intel" : same && has("dad", "chest") ? "separate_need" : "nothing_new";
  const lifeThreat = has("not breathing", "trapped", "6c", "8f", "waving", "bleeding", "chest") ? 0.9 : 0.2;
  const matchId = adds === "separate_need" ? null : (same?.id ?? null);
  return {
    matchId,
    matchProbs: matchId ? { [matchId]: 0.8, new: 0.2 } : { new: 0.8 },
    adds,
    addsProbs: { [adds]: 0.7 },
    type,
    severity: lifeThreat > 0.5 ? 3.7 : type === "other" ? 0.3 : 2,
    lifeThreat,
    credible: has("heard", "tiktok") ? 0.2 : 0.85,
    summary: call.text.slice(0, 70),
    mock: true,
  };
}

const annSchema = z.object({
  messages: z.array(z.object({ language: z.string(), text: z.string() })).describe("One message per requested language"),
  radio: z.string().describe("<=25 word radio update for units on scene listing every new life-safety fact"),
});

/** Known-incident announcement (callers hear it before queueing) + radio update. Jev verifies each draft against the facts. */
export async function draftAnnouncement(inc: { summary: string; location: string; facts: string[] }, languages: string[]) {
  const facts = `Incident: ${inc.summary} at ${inc.location}. FDNY is on scene. Known facts: ${inc.facts.join("; ")}`;
  const fallback = {
    messages: languages.map((language) => ({ language, text: `911: We know about the fire at ${inc.location}. FDNY is on scene. If you are calling about this fire and are safe, please stay clear of the area. If you have a different emergency, or are trapped, press 1 now.` })),
    radio: `All units 410 W 47th: ${inc.facts.slice(0, 4).join("; ")}.`,
    mock: true,
  };
  let out: { messages: { language: string; text: string }[]; radio: string; mock?: boolean } = fallback;
  if (llmAvailable()) {
    try {
      const p = gen({
        output: Output.object({ schema: annSchema }),
        prompt: `You write the recorded message 911 callers hear BEFORE waiting for an operator during a call surge, so people calling about an incident that is already handled free the line. Max 40 words each, calm, plain words. Must say: we know about it, FDNY is on scene, stay clear, and "if you have a DIFFERENT emergency or are trapped, press 1". Do not invent facts.\nLanguages: ${languages.join(", ")}\nFacts: ${facts}`,
      });
      const r = await Promise.race([p, new Promise<null>((ok) => setTimeout(() => ok(null), 28000))]);
      if (r) out = r.output as z.infer<typeof annSchema>;
    } catch (e) {
      console.error("announcement LLM failed:", (e as Error).message);
    }
  }
  const c = getClient();
  const unsupported = c
    ? await Promise.all(
        out.messages.map((m) =>
          c
            .systemOne({ state: { verified_facts: facts, message: m.text, language: m.language }, questions: { unsupported: noul("Does `message` state a place, floor, number or hazard that contradicts or is not supported by `verified_facts`? The message may be in another language. Standard safety instructions (stay clear, press 1 for a different emergency) count as supported.") } })
            .then((r) => r.answers.unsupported.noul as number)
            .catch(() => null),
        ),
      )
    : out.messages.map(() => null);
  return { ...out, unsupported };
}
