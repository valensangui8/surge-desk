"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { PixelJev, type Mood } from "./Pixel";
import { cachedSurge } from "@/lib/surgeFixture";
import { demoMode } from "@/lib/demoFixture";
import { ADDS, AVG_CALL_MIN, CALLS, priorityOf, scene, UNITS, type Call, type CallJudgment, type IncType, type OpenInc } from "@/lib/surge";

type Intel = { callId: string; text: string; priority: number };
type Inc = { id: string; type: IncType; summary: string; location: string; priority: number; calls: string[]; intel: Intel[]; langs: string[]; status: "proposed" | "dispatched"; splitFrom?: string; firstCall: string };
type Action = { key: string; kind: "dispatch" | "intel" | "review"; incId: string; callId: string; priority: number; title: string; why: string; done?: "approved" | "merged" | "split" };
type Judged = { call: Call; j: CallJudgment; route: string; priority: number };
type Ann = { messages: { language: string; text: string }[]; radio: string; unsupported: (number | null)[]; mock?: boolean };

const ICON: Record<IncType, string> = { fire: "🔥", medical: "🚑", traffic: "🚲", utility: "⚡", other: "💬" };
const LANG: Record<string, string> = { EN: "English", ES: "Spanish", ZH: "Chinese (Mandarin)", BN: "Bengali", RU: "Russian" };
const ADD_LABEL: Record<string, string> = { nothing_new: "Repeats known facts", life_intel: "New life-safety intel", separate_need: "Separate emergency", non_emergency: "Not an emergency" };
const P_COLOR = ["", "bg-red-600 text-white", "bg-amber-500 text-black", "bg-sky-600 text-white", "bg-slate-600 text-white"];
const clock = (t: number) => {
  const s = 42 * 60 + 5 + t;
  return `7:${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")} PM`;
};
const pct = (x: number) => `${Math.round(x * 100)}%`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function SurgeDesk() {
  const [arrived, setArrived] = useState<Call[]>([]);
  const [judged, setJudged] = useState<Record<string, Judged>>({});
  const [incs, setIncs] = useState<Inc[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [callbacks, setCallbacks] = useState<{ call: Call; j: CallJudgment }[]>([]);
  const [current, setCurrent] = useState<Judged | null>(null);
  const [thinking, setThinking] = useState(false);
  const [running, setRunning] = useState(false);
  const [ann, setAnn] = useState<Ann | null>(null);
  const [annState, setAnnState] = useState<"idle" | "drafting" | "draft" | "live">("idle");
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const incsRef = useRef<Inc[]>([]);
  const seq = useRef(0);

  const commitIncs = (next: Inc[]) => {
    incsRef.current = next;
    setIncs(next);
  };

  async function process(call: Call) {
    setArrived((a) => [call, ...a]);
    setThinking(true);
    const t0 = Date.now();
    const open: OpenInc[] = incsRef.current.map((i) => ({ id: i.id, summary: i.summary, location: i.location, facts: [`First report: ${CALLS.find((c) => c.id === i.firstCall)?.text ?? i.summary}`, ...i.intel.map((x) => x.text)] }));
    const j = await cachedSurge<CallJudgment>(`judge:${call.id}:${call.text}`, () =>
      fetch("/api/surge/judge", { method: "POST", body: JSON.stringify({ call, open }) }).then((r) => r.json()),
    );
    await sleep(Math.max(0, 550 - (Date.now() - t0)));
    const priority = priorityOf(j);
    let list = [...incsRef.current];
    let route = "";
    const newActions: Action[] = [];
    const matchP = j.matchId ? (j.matchProbs[j.matchId] ?? 0) : 0;
    const target = j.matchId ? list.find((i) => i.id === j.matchId) : undefined;

    if (call.channel === "abandoned") {
      setCallbacks((c) => [...c, { call, j }].sort((a, b) => b.j.lifeThreat - a.j.lifeThreat));
      route = "Callback queue";
    } else if (target && j.adds !== "separate_need" && !(target.type !== j.type && (j.type === "medical" || j.type === "traffic"))) {
      // ↑ a sick or injured person near the fire needs their own ambulance: split instead of merging
      const intel = j.adds === "life_intel";
      list = list.map((i) =>
        i.id === target.id
          ? { ...i, calls: [...i.calls, call.id], langs: i.langs.includes(call.lang) ? i.langs : [...i.langs, call.lang], intel: intel ? [...i.intel, { callId: call.id, text: j.summary, priority }] : i.intel }
          : i,
      );
      route = j.adds === "non_emergency" ? `Duplicate of ${target.id} · info only` : intel ? `${target.id} + NEW INTEL` : `Duplicate of ${target.id}`;
      if (intel) newActions.push({ key: `intel-${call.id}`, kind: "intel", incId: target.id, callId: call.id, priority, title: `Radio units at ${target.id}: ${j.summary}`, why: `Life threat ${pct(j.lifeThreat)} · severity ${j.severity.toFixed(1)}/4` });
      if (matchP < 0.7) newActions.push({ key: `review-${call.id}`, kind: "review", incId: target.id, callId: call.id, priority: 2, title: `Same emergency as ${target.id}? Jev is only ${pct(matchP)} sure`, why: call.text });
    } else if (j.adds === "non_emergency" && priority === 4) {
      route = "→ 311 / info line";
    } else {
      const id = `INC-${list.length + 1}`;
      list = [...list, { id, type: j.type, summary: j.summary, location: call.loc, priority, calls: [call.id], intel: [], langs: [call.lang], status: "proposed", splitFrom: target?.id, firstCall: call.id }];
      route = target ? `Split from ${target.id} → ${id}` : `New incident ${id}`;
      if (priority <= 3) newActions.push({ key: `dispatch-${id}`, kind: "dispatch", incId: id, callId: call.id, priority, title: `Dispatch ${UNITS[j.type]} → ${call.loc}`, why: `${j.summary} · life threat ${pct(j.lifeThreat)} · severity ${j.severity.toFixed(1)}/4` });
    }
    commitIncs(list);
    if (newActions.length) setActions((a) => [...a, ...newActions]);
    const jd = { call, j, route, priority };
    setJudged((m) => ({ ...m, [call.id]: jd }));
    setCurrent(jd);
    setThinking(false);
  }

  async function start() {
    if (running) return;
    setRunning(true);
    for (const c of CALLS) {
      if (arrived.some((a) => a.id === c.id)) continue;
      await process(c);
      await sleep(demoMode() === "replay" ? 380 : 150);
    }
    setRunning(false);
  }

  async function liveCall(text: string) {
    if (!text.trim()) return;
    seq.current++;
    await process({ id: `live${seq.current}`, t: 145 + seq.current * 5, caller: "Live call (mic)", lang: "EN", channel: "voice", loc: "ALI: caller location", text });
    setDraft("");
  }

  function listen() {
    const W = window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any };
    const SR = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!SR) return alert("Speech recognition isn't available in this browser. Type the call instead.");
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = true;
    r.onresult = (e: any) => setDraft(Array.from(e.results).map((x: any) => x[0].transcript).join(" "));
    r.onend = () => setListening(false);
    setListening(true);
    r.start();
  }

  function act(a: Action, how: "approved" | "merged" | "split") {
    setActions((l) => l.map((x) => (x.key === a.key ? { ...x, done: how } : x)));
    if (a.kind === "dispatch" && how === "approved") commitIncs(incsRef.current.map((i) => (i.id === a.incId ? { ...i, status: "dispatched" } : i)));
    if (a.kind === "review" && how === "split") {
      const jd = judged[a.callId];
      const list = incsRef.current.map((i) => (i.id === a.incId ? { ...i, calls: i.calls.filter((c) => c !== a.callId) } : i));
      const id = `INC-${list.length + 1}`;
      commitIncs([...list, { id, type: jd.j.type, summary: jd.j.summary, location: jd.call.loc, priority: jd.priority, calls: [a.callId], intel: [], langs: [jd.call.lang], status: "proposed", splitFrom: a.incId, firstCall: a.callId }]);
      setActions((l) => [...l, { key: `dispatch-${id}`, kind: "dispatch", incId: id, callId: a.callId, priority: jd.priority, title: `Dispatch ${UNITS[jd.j.type]} → ${jd.call.loc}`, why: jd.j.summary }]);
    }
  }

  const big = useMemo(() => [...incs].sort((a, b) => b.calls.length - a.calls.length)[0], [incs]);
  async function draftAnn() {
    if (!big) return;
    setAnnState("drafting");
    const languages = big.langs.filter((l) => LANG[l]).map((l) => LANG[l]);
    const incident = { summary: big.summary, location: big.location, facts: [CALLS.find((c) => c.id === big.firstCall)?.text ?? big.summary, ...big.intel.map((x) => x.text)] };
    const r = await cachedSurge<Ann>("announce", () => fetch("/api/surge/announce", { method: "POST", body: JSON.stringify({ incident, languages }) }).then((x) => x.json()), 900);
    setAnn(r);
    setAnnState("draft");
  }

  // KPIs
  const all = Object.values(judged);
  const dups = all.filter((x) => x.route.startsWith("Duplicate")).length;
  const intelN = all.filter((x) => x.route.includes("NEW INTEL")).length;
  const pending = actions.filter((a) => !a.done && a.priority === 1).length;
  const openActions = actions.filter((a) => !a.done).sort((a, b) => a.priority - b.priority || (a.kind === "review" ? 1 : 0) - (b.kind === "review" ? 1 : 0));
  const doneActions = actions.filter((a) => a.done);

  // Surge curve: calls vs distinct emergencies over time
  const curve = useMemo(() => {
    const order = [...arrived].reverse();
    let n = 0;
    const seen = new Set<string>();
    return order.map((c, i) => {
      const r = judged[c.id]?.route ?? "";
      if (r.startsWith("New") || r.startsWith("Split")) seen.add(c.id);
      n = seen.size;
      return [i + 1, n] as const;
    });
  }, [arrived, judged]);

  const mood: Mood = !current ? "calm" : current.j.adds === "non_emergency" || current.j.credible < 0.4 ? "skeptical" : current.priority === 1 ? "alarm" : current.priority === 2 ? "concerned" : "calm";
  const matchBars = current ? Object.entries(current.j.matchProbs).sort((a, b) => b[1] - a[1]).slice(0, 3) : [];
  const addBars = current ? Object.keys(ADDS).map((k) => [k, current.j.addsProbs[k] ?? 0] as const) : [];

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-slate-800 bg-slate-900/80 px-4 py-2">
        <div>
          <div className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="rounded bg-red-600 px-1.5 text-sm">911</span> Surge Desk
          </div>
          <div className="text-[11px] text-slate-400">
            NYC PSAP · {scene.title} · AI proposes, the supervisor approves
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2" id="kpis">
          <Kpi label="Calls" value={arrived.length} />
          <Kpi label="Distinct emergencies" value={incs.length} tone="text-sky-300" />
          <Kpi label="Duplicates absorbed" value={dups} tone="text-emerald-300" />
          <Kpi label="New intel from dups" value={intelN} tone="text-amber-300" />
          <Kpi label="Operator min saved" value={Math.round(dups * AVG_CALL_MIN)} tone="text-emerald-300" />
          <Kpi label="P1 awaiting OK" value={pending} tone={pending ? "text-red-400 animate-pulse" : "text-slate-300"} />
          <Spark data={curve} />
          <button onClick={start} disabled={running} className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-500 disabled:opacity-50">
            {running ? "Surge in progress…" : arrived.length ? "Resume surge" : "▶ Start call surge"}
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[30%_34%_36%] gap-3 p-3">
        {/* Incoming calls */}
        <section className="flex min-h-0 flex-col rounded-lg border border-slate-800 bg-slate-900/50" id="calls">
          <h2 className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Incoming calls <span className="font-normal normal-case">{arrived.length} / {CALLS.length} in 2 min 18 s</span>
          </h2>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
            {!arrived.length && <p className="p-4 text-sm text-slate-500">Press <b>Start call surge</b>: 26 calls in 138 seconds after the fire at 410 W 47th St.</p>}
            {arrived.map((c) => {
              const jd = judged[c.id];
              return (
                <div key={c.id} className={`jev-pop rounded-md border p-2 text-xs ${jd ? (jd.priority === 1 && !jd.route.startsWith("Duplicate of") ? "border-red-700 bg-red-950/40" : jd.route.startsWith("Duplicate") ? "border-slate-800 bg-slate-900/40 opacity-70" : "border-slate-700 bg-slate-900") : "border-sky-700 bg-sky-950/40"}`}>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span>{c.channel === "text" ? "💬" : c.channel === "abandoned" ? "📵" : "📞"}</span>
                    <span>{clock(c.t)}</span>·<span>{c.caller}</span>
                    {c.lang !== "EN" && c.lang !== "—" && <span className="rounded bg-violet-800 px-1 text-violet-100">{c.lang}</span>}
                    <span className="ml-auto truncate">{c.loc}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-slate-200">{c.text}</p>
                  {jd ? (
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                      {jd.route.startsWith("Duplicate of") ? <span className="rounded bg-slate-700 px-1 font-bold">DUP</span> : c.channel === "abandoned" ? <span className={`rounded px-1 font-bold ${jd.j.lifeThreat > 0.5 ? "bg-red-600" : "bg-slate-600"}`}>RISK {pct(jd.j.lifeThreat)}</span> : <span className={`rounded px-1 font-bold ${P_COLOR[jd.priority]}`}>P{jd.priority}</span>}
                      <span className={`rounded px-1 ${jd.route.includes("INTEL") ? "bg-amber-500 text-black" : jd.route.startsWith("Split") ? "bg-fuchsia-600" : jd.route.startsWith("New") ? "bg-sky-700" : "bg-slate-700"}`}>{jd.route}</span>
                      {jd.j.matchId && <span className="text-slate-400">match {pct(jd.j.matchProbs[jd.j.matchId] ?? 0)}</span>}
                    </div>
                  ) : (
                    <div className="mt-1 text-[10px] text-sky-300">Jev is judging…</div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex gap-1.5 border-t border-slate-800 p-2">
            <button onClick={listen} title="Take a live call (microphone)" className={`rounded px-2 text-sm ${listening ? "animate-pulse bg-red-600" : "bg-slate-800 hover:bg-slate-700"}`}>🎙️</button>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && liveCall(draft)} placeholder="Take a live call: speak or type what the caller says…" className="min-w-0 flex-1 rounded bg-slate-800 px-2 py-1.5 text-xs outline-none placeholder:text-slate-500" />
            <button onClick={() => liveCall(draft)} className="rounded bg-sky-700 px-2 text-xs font-semibold hover:bg-sky-600">Judge</button>
          </div>
        </section>

        {/* Jev + immediate response */}
        <section className="flex min-h-0 flex-col gap-3">
          <div id="jev" className="rounded-lg border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-3">
            <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400">
              <span>Jev · TypeSafe System One · 6 typed questions per call</span>
              <span className="normal-case">{current ? (current.j.mock ? "simulated" : `calibrated · ${current.j.ms ?? "–"} ms`) : "idle"}</span>
            </div>
            <div className="flex gap-3">
              <div className="flex w-[104px] shrink-0 flex-col items-center">
                <PixelJev mood={mood} thinking={thinking} size={96} />
                {current && !thinking && (
                  <div key={current.call.id} className={`jev-stamp mt-2 rounded px-2 py-0.5 text-center text-xs font-black ${P_COLOR[current.priority]}`}>
                    P{current.priority} {current.priority === 1 ? "IMMEDIATE" : current.priority === 2 ? "URGENT" : current.priority === 3 ? "ROUTINE" : "311"}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 text-xs">
                {current ? (
                  <>
                    <p className="line-clamp-2 italic text-slate-300">“{current.call.text}”</p>
                    <div className="mt-2 text-[10px] font-semibold uppercase text-slate-500">Same emergency as…</div>
                    {matchBars.map(([k, p]) => (
                      <Bar key={k} label={k === "new" ? "Nothing open: NEW" : `${k} · ${incs.find((i) => i.id === k)?.summary ?? ""}`} p={p} color={k === "new" ? "bg-sky-500" : "bg-emerald-500"} />
                    ))}
                    <div className="mt-1.5 text-[10px] font-semibold uppercase text-slate-500">What does this call add?</div>
                    {addBars.map(([k, p]) => (
                      <Bar key={k} label={ADD_LABEL[k]} p={p} color={k === "life_intel" ? "bg-amber-500" : k === "separate_need" ? "bg-fuchsia-500" : k === "non_emergency" ? "bg-slate-500" : "bg-emerald-600"} />
                    ))}
                    <div className="mt-1.5 grid grid-cols-3 gap-1 text-center text-[10px]">
                      <Stat label="Life threat" v={pct(current.j.lifeThreat)} hot={current.j.lifeThreat > 0.6} />
                      <Stat label="Severity" v={`${current.j.severity.toFixed(1)} / 4`} hot={current.j.severity >= 3.4} />
                      <Stat label="First-hand" v={pct(current.j.credible)} hot={false} />
                    </div>
                  </>
                ) : (
                  <p className="pt-6 text-slate-500">Each call gets 6 calibrated answers: which open incident it matches, what it adds, type, severity, life threat, first-hand. Code turns them into a priority; a human approves every dispatch.</p>
                )}
              </div>
            </div>
          </div>

          <div id="immediate" className="flex min-h-0 flex-1 flex-col rounded-lg border border-red-900/60 bg-slate-900/50">
            <h2 className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-red-300">
              Immediate response queue <span className="font-normal normal-case text-slate-400">AI proposes · you approve</span>
            </h2>
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
              {!actions.length && <p className="p-3 text-xs text-slate-500">High-priority cases appear here, ranked, with Jev's reasons.</p>}
              {openActions.map((a) => (
                <div key={a.key} className={`jev-pop rounded-md border p-2 text-xs ${a.kind === "review" ? "border-violet-700 bg-violet-950/30" : a.priority === 1 ? "border-red-700 bg-red-950/40" : "border-amber-700/60 bg-amber-950/20"}`}>
                  <div className="flex items-start gap-2">
                    <span className={`rounded px-1 text-[10px] font-bold ${a.kind === "review" ? "bg-violet-600" : P_COLOR[a.priority]}`}>{a.kind === "review" ? "CHECK" : `P${a.priority}`}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{a.kind === "intel" ? "📻 " : a.kind === "dispatch" ? "🚨 " : "🔍 "}{a.title}</div>
                      <div className="line-clamp-1 text-[10px] text-slate-400">{a.why}</div>
                    </div>
                    {a.kind === "review" ? (
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => act(a, "merged")} className="rounded bg-slate-700 px-2 py-1 text-[10px] hover:bg-slate-600">Merge</button>
                        <button onClick={() => act(a, "split")} className="rounded bg-violet-600 px-2 py-1 text-[10px] hover:bg-violet-500">Separate</button>
                      </div>
                    ) : (
                      <button onClick={() => act(a, "approved")} className={`shrink-0 rounded px-2 py-1 text-[10px] font-semibold ${a.kind === "intel" ? "bg-amber-500 text-black hover:bg-amber-400" : "bg-red-600 hover:bg-red-500"}`}>
                        {a.kind === "intel" ? "Push to units" : "Approve dispatch"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {doneActions.map((a) => (
                <div key={a.key} className="rounded-md border border-emerald-900 bg-emerald-950/20 px-2 py-1 text-[10px] text-emerald-300">
                  ✓ {a.done === "approved" ? (a.kind === "intel" ? "Pushed" : "Dispatched") : a.done === "merged" ? "Merged" : "Separated"}: {a.title}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Incidents + announcement + callbacks */}
        <section className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1" id="right">
          <div id="incidents" className="rounded-lg border border-slate-800 bg-slate-900/50">
            <h2 className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Incidents <span className="font-normal normal-case">{arrived.length} calls → {incs.length} emergencies</span>
            </h2>
            <div className="space-y-1.5 p-2">
              {!incs.length && <p className="p-2 text-xs text-slate-500">Calls collapse into incidents here.</p>}
              {[...incs].sort((a, b) => a.priority - b.priority || b.calls.length - a.calls.length).map((i) => (
                <div key={i.id} className="jev-pop rounded-md border border-slate-700 bg-slate-900 p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{ICON[i.type]}</span>
                    <span className={`rounded px-1 text-[10px] font-bold ${P_COLOR[i.priority]}`}>P{i.priority}</span>
                    <span className="font-mono text-[10px] text-slate-400">{i.id}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{i.summary}</span>
                    <span className={`rounded px-1.5 text-[10px] ${i.status === "dispatched" ? "bg-emerald-700" : "bg-slate-700"}`}>{i.status === "dispatched" ? "Units en route" : "Awaiting OK"}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                    <span>📍 {i.location}</span>
                    {i.splitFrom && <span className="text-fuchsia-300">split from {i.splitFrom}</span>}
                    <span className="ml-auto flex items-center gap-1">
                      <span className="flex flex-wrap gap-[2px]" style={{ maxWidth: 120 }}>
                        {i.calls.map((c) => <span key={c} className="h-1.5 w-1.5 rounded-full bg-sky-400" />)}
                      </span>
                      <b className="text-slate-200">{i.calls.length}</b> call{i.calls.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  {i.intel.length > 0 && (
                    <ul className="mt-1 space-y-0.5 border-t border-slate-800 pt-1 text-[10px] text-amber-200">
                      {i.intel.map((x) => <li key={x.callId}>⚠ {x.text}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div id="ivr" className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Known-incident message</h2>
              {annState === "idle" && (
                <button onClick={draftAnn} disabled={!big || big.calls.length < 5} className="rounded bg-sky-700 px-2 py-1 text-[11px] font-semibold hover:bg-sky-600 disabled:opacity-40">
                  Draft for {big?.id ?? "top incident"}
                </button>
              )}
              {annState === "draft" && (
                <button onClick={() => setAnnState("live")} className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold hover:bg-emerald-500">Approve & play to callers</button>
              )}
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              Callers about {big ? `${big.id} (${big.calls.length} calls)` : "the main incident"} hear this <b>before</b> queueing, in their language. Different emergency or trapped → press 1 for an operator.
            </p>
            {annState === "drafting" && <p className="mt-2 animate-pulse text-sky-300">LLM drafting in {big?.langs.filter((l) => LANG[l]).length} languages · Jev checking every claim…</p>}
            {ann && (
              <div className="mt-2 space-y-1">
                {ann.messages.map((m, k) => (
                  <div key={m.language} className="rounded border border-slate-800 bg-slate-950/60 p-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-semibold text-violet-300">{m.language}</span>
                      {ann.unsupported[k] != null && <span className={ann.unsupported[k]! > 0.5 ? "text-red-400" : "text-emerald-400"}>Jev: {ann.unsupported[k]! > 0.5 ? "⚠ unsupported claim" : `✓ matches facts (${pct(1 - ann.unsupported[k]!)})`}</span>}
                    </div>
                    <p className="line-clamp-2 text-[11px] text-slate-200">{m.text}</p>
                  </div>
                ))}
                <div className="rounded border border-amber-800/60 bg-amber-950/20 p-1.5 text-[11px] text-amber-200">📻 Radio to units on scene: {ann.radio}</div>
                {annState === "live" && <div className="jev-pop rounded bg-emerald-900/50 p-1.5 text-[11px] font-semibold text-emerald-300">● Live: next callers about {big?.id} hear this first. Operators stay free for new emergencies.</div>}
              </div>
            )}
          </div>

          <div id="callbacks" className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-xs">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Callback queue · abandoned calls ranked by risk</h2>
            {!callbacks.length && <p className="mt-1 text-[10px] text-slate-500">Dropped calls land here, ranked by what Jev hears in the background audio.</p>}
            {callbacks.map(({ call, j }, k) => (
              <div key={call.id} className="jev-pop mt-1.5 flex items-center gap-2 rounded border border-slate-800 bg-slate-950/60 p-1.5">
                <span className="font-bold text-slate-400">#{k + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-slate-400">{call.caller} · {call.loc}</div>
                  <div className="line-clamp-1 text-[11px]">{call.text}</div>
                </div>
                <span className={`rounded px-1 text-[10px] font-bold ${j.lifeThreat > 0.5 ? "bg-red-600" : "bg-slate-600"}`}>risk {pct(j.lifeThreat)}</span>
                <button className="rounded bg-slate-700 px-2 py-1 text-[10px] hover:bg-slate-600">Call back</button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Kpi({ label, value, tone = "text-white" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 text-center">
      <div className={`text-lg font-bold leading-tight tabular-nums ${tone}`}>{value}</div>
      <div className="text-[9px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function Bar({ label, p, color }: { label: string; p: number; color: string }) {
  return (
    <div className="mt-0.5 flex items-center gap-2 text-[10px]">
      <span className="w-40 truncate text-slate-300">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded bg-slate-800">
        <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${Math.round(p * 100)}%` }} />
      </div>
      <span className="w-8 text-right tabular-nums text-slate-400">{pct(p)}</span>
    </div>
  );
}

function Stat({ label, v, hot }: { label: string; v: string; hot: boolean }) {
  return (
    <div className={`rounded border px-1 py-0.5 ${hot ? "border-red-700 bg-red-950/50 text-red-200" : "border-slate-800 bg-slate-950 text-slate-300"}`}>
      <div className="font-bold">{v}</div>
      <div className="text-[9px] uppercase text-slate-500">{label}</div>
    </div>
  );
}

/** Calls (gray) vs distinct emergencies (sky): the gap is the duplicate load we absorbed. */
function Spark({ data }: { data: readonly (readonly [number, number])[] }) {
  const W = 110, H = 38, max = Math.max(CALLS.length, 1);
  const x = (i: number) => (i / max) * W;
  const y = (v: number) => H - 2 - (v / max) * (H - 4);
  const calls = data.map(([i], k) => `${k ? "L" : "M"}${x(i)},${y(i)}`).join(" ");
  const inc = data.map(([i, n], k) => `${k ? "L" : "M"}${x(i)},${y(n)}`).join(" ");
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950 px-1.5 py-0.5" title="Calls vs distinct emergencies">
      <svg width={W} height={H}>
        <path d={calls} stroke="#94a3b8" strokeWidth="2" fill="none" />
        <path d={inc} stroke="#38bdf8" strokeWidth="2" fill="none" />
      </svg>
      <div className="text-center text-[8px] uppercase text-slate-500">calls vs emergencies</div>
    </div>
  );
}
