# ▶️ [Watch the demo video on YouTube](YOUTUBE_LINK)

# Surge Desk: 26 calls about one fire, and the 4 that can't wait

> After an incident, 911 calls spike. Surge Desk merges duplicate calls into one incident, keeps the new life-safety facts, and puts hidden emergencies first. A human approves.

Built in 45 minutes at the **Plug and Play × PMAI Hackathon: Rapid Response (#AIWeekNY)**, Challenge 3: *"911 call management: after an incident, call volumes spike. Develop a way to identify duplicate reports and flag high-priority cases for immediate response."*

## In 60 seconds: what the app does, step by step
It's 7:42 PM. A fire breaks out at 410 W 47th St in Hell's Kitchen, and 26 calls hit NYC 911 in 2 minutes 18 seconds. Surge Desk takes the supervisor from *"40 people on hold"* to *"every real emergency dispatched"*:

1. **Ingest.** Calls arrive as live transcripts with the phone's location, in English, Spanish, Mandarin, Bengali and Russian. Texts to 911 and abandoned calls come in too.
2. **Judge (Jev).** For every call, **Jev** (TypeSafe's decision model) answers 6 typed questions with **calibrated probabilities**: Is this the same emergency as an open incident? What does it add? What type is it? How severe? Is a life in danger right now? Is it first-hand?
3. **Merge duplicates.** Calls about the same fire collapse into one incident with a call counter (17 calls → `INC-1`), whatever the language or vantage point.
4. **Keep the new facts.** A duplicate is never thrown away. *"My neighbor in 6C uses a wheelchair,"* a silent text saying *"smoke in 8F, me and my 6-year-old,"* and *"a woman waving from a 7th-floor window"* become **radio updates** for the crews already on scene.
5. **Split hidden emergencies.** A man not breathing on 52nd St, a cyclist hit by a cab whose driver was watching the fire, a 78-year-old with chest pain at the corner. They mention the fire, but they get their **own incident and their own ambulance**.
6. **Prioritize.** Code turns Jev's answers into P1–P4. P1 cases go to the top of the **Immediate response queue**, each with its reasons (*life threat 98%, severity 4.0/4*).
7. **Ask when unsure.** If Jev is less than 70% sure two calls are the same emergency, it asks the supervisor: **Merge** or **Separate**.
8. **Approve.** Nothing is dispatched or radioed until the supervisor clicks **Approve dispatch** or **Push to units**.
9. **Free the lines.** One click drafts a **known-incident message** in every caller language: *"We know about the fire at 410 W 47th. FDNY is on scene. Different emergency or trapped? Press 1."* Jev checks every claim against the facts before it plays.
10. **Call back the right people first.** Dropped calls are ranked by the background audio: coughing plus a crying child (92%) comes before street noise (9%). Questions and rumors go to 311.

**Result:** 26 calls became 6 real emergencies. 13 duplicates were absorbed (about 29 operator-minutes saved), 3 life-safety facts were rescued from duplicates, and every P1 was approved by a human.

- 🎬 **Demo video file (1:53):** [demo-video/surge-desk.mp4](https://github.com/valensangui8/surge-desk/blob/main/demo-video/surge-desk.mp4) · subtitles: [`.srt`](demo-video/surge-desk.srt) · [`.vtt`](demo-video/surge-desk.vtt) · [narration script](demo-video/script.md)
- 🌐 **Live app:** https://rapid-response-command.vercel.app/911
- ▶️ **Reproducible demo run:** https://rapid-response-command.vercel.app/911?demo=replay

## The problem
In fiscal 2026, NYC's response time to life-threatening emergencies rose to **9 min 13 s**, and call processing alone takes **over 2 minutes**. After a visible incident, call volume spikes and most callers report the same thing. The real danger is the call that's *different*: it waits in the queue behind 20 duplicates. Throwing duplicates away is also dangerous, because the 12th caller may be the one who knows someone is trapped in 6C.

## What Surge Desk does
| Feature | How it works |
|---|---|
| **Duplicate detection** | **Jev** `choice` over the open incidents (plus "new"), with the call transcript, its language and the phone location. Same place and same situation means the same emergency, even across languages. Below 70% confidence, a human decides. |
| **New intel from duplicates** | Jev `choice` "what does this call add?" (repeats known facts / new life-safety intel / separate emergency / not an emergency). Intel becomes a radio update for the crews on scene. |
| **Hidden emergencies** | A medical or traffic call that matches the fire is split into its own incident, because it needs its own ambulance (code policy). |
| **Priority** | Jev `score` severity (0–4) + `noul` life threat → code policy: P1 if life threat ≥ 60% or severity ≥ 3.4. Each queue item shows Jev's reasons. |
| **Known-incident message** | The LLM drafts the message in every caller language; Jev `noul` verifies each draft against the facts before the supervisor approves it. Press 1 → straight to an operator. |
| **Callback queue** | Abandoned calls are ranked by risk from the background audio description. |
| **Live call** | 🎙️ The Web Speech API transcribes a new call, or you type one, and it is judged live against the open incidents. |
| **Human in the loop** | The AI proposes; the supervisor approves every dispatch, radio push, merge and broadcast. |

## Architecture
```
call (transcript, ALI location, language) ─▶ Jev systemOne: 6 questions in ONE request (choice / noul / score, calibrated)
                                                 │
                                                 ├─▶ LLM: ≤9-word English dispatch line (only for new incidents / new intel)
                                                 ▼
                       code policy: merge · split · intel · P1–P4 · 311 ─▶ Immediate response queue ─▶ supervisor approves
```
- `src/lib/surge.ts`: demo calls, Jev option sets, priority policy
- `src/lib/surgeAi.ts`: Jev questions, LLM dispatch line, known-incident message + Jev verification
- `src/components/SurgeDesk.tsx`: UI (calls, Jev panel, queue, incidents, message, callbacks)
- `src/components/Pixel.tsx`: pixel-art Jev that reacts to each verdict
- `src/lib/gen.ts`: rotates free AI Gateway models (free tier is ~5 req/min per model)

## Run it
```bash
npm install
vercel env pull .env.local                  # AI Gateway auth (VERCEL_OIDC_TOKEN)
echo "TYPESAFE_API_KEY=..." >> .env.local   # optional
npm run dev                                 # http://localhost:3000/911
```
**No Jev key? Nothing stops.** Without `TYPESAFE_API_KEY`, every judgment falls back to keyword rules. Every model call has a timeout and a fallback (Jev 12 s, LLM 6 s per line, 28 s for the message).

Demo modes: `?demo=capture` runs live and records every response in `window.__fx`, and `POST /api/dev-fixture` saves them; `?demo=replay` replays the recorded real responses for repeatable takes.

## Regenerate the video
Recorded with [Argo](https://github.com/shreyaskarnik/argo) (Playwright + local Kokoro TTS, no API keys):
```bash
npm run build && npx next start -p 3222
cd video && npm install && npx playwright install chromium
npx argo pipeline surge-desk     # → video/videos/surge-desk.mp4 (+ .srt/.vtt)
```

## Simulated in the demo
The 26 calls are sample data written to look like a real surge, including the transcripts, phone locations and abandoned-call audio descriptions. Dispatching, radio pushes, callbacks and the phone-tree message are shown in the UI, not executed. The Jev judgments, LLM dispatch lines and translated messages in the video are real model outputs, recorded once and replayed. The two hand-picked LLM lines (6C, chest pain) came from an earlier live run of the same calls.

---
Other challenges from the same hackathon: **[Fallback Host](https://github.com/valensangui8/rapid-response-command)** (Resy offline) · **[Clear Path Home](https://github.com/valensangui8/clear-path-home)** (Knicks win, street closures).
