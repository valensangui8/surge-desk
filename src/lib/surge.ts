/**
 * Surge Desk: 911 call surge after a Hell's Kitchen building fire.
 * Calls arrive as transcripts (speech-to-text) with the phone's ALI location, like a real PSAP feed.
 */

export type Channel = "voice" | "text" | "abandoned";
export type Call = { id: string; t: number; caller: string; lang: string; channel: Channel; loc: string; text: string };

export const scene = {
  time: "7:42 PM",
  title: "Building fire, 410 W 47th St (Hell's Kitchen)",
  briefing:
    "NYC 911, Tuesday 7:42 PM. A fire broke out in a 12-story residential building at 410 West 47th Street (Hell's Kitchen, Manhattan). FDNY units are arriving. Call volume is spiking: most callers report the same fire, but other emergencies keep happening nearby.",
};

export const CALLS: Call[] = [
  { id: "c01", t: 0, caller: "Cell ·· 4471", lang: "EN", channel: "voice", loc: "410 W 47th St (across street)", text: "There's a big fire in the building at 410 West 47th, flames are coming out of the windows on the fourth floor, lots of smoke!" },
  { id: "c02", t: 9, caller: "Cell ·· 0193", lang: "EN", channel: "voice", loc: "9th Ave & W 46th St", text: "I can see black smoke over Hell's Kitchen, around 47th street. Is that a fire?" },
  { id: "c03", t: 14, caller: "Cell ·· 7720", lang: "ES", channel: "voice", loc: "W 47th St", text: "¡Hay un incendio en la 47 entre la 9 y la 10, sale humo negro del edificio!" },
  { id: "c04", t: 21, caller: "Cell ·· 3348", lang: "EN", channel: "voice", loc: "W 47th St & 10th Ave", text: "Building on fire at 410 West 47th, fourth floor. I live right across the street." },
  { id: "c05", t: 27, caller: "Cell ·· 5502", lang: "EN", channel: "voice", loc: "W 47th St", text: "My neighbor in 6C uses a wheelchair and she's still inside 410 West 47th, she can't do the stairs!" },
  { id: "c06", t: 33, caller: "Cell ·· 8810", lang: "ZH", channel: "voice", loc: "10th Ave & W 47th St", text: "47街有大火，很多烟，那栋楼在烧！" },
  { id: "c07", t: 38, caller: "Landline 212-·· 6630", lang: "EN", channel: "voice", loc: "305 W 52nd St, Apt 2B", text: "My husband just collapsed in the kitchen, he's not breathing! 305 West 52nd, apartment 2B, please hurry!" },
  { id: "c08", t: 44, caller: "Cell ·· 2087", lang: "EN", channel: "voice", loc: "W 47th St", text: "Fire on 47th street, there's smoke everywhere." },
  { id: "c09", t: 49, caller: "Text-to-911 ·· 9915", lang: "EN", channel: "text", loc: "410 W 47th St", text: "cant talk. smoke coming in my apt 8F door is hot. me and my son 6yo" },
  { id: "c10", t: 55, caller: "Cell ·· 6142", lang: "EN", channel: "voice", loc: "Times Square", text: "I heard on TikTok it's a bomb in Hell's Kitchen?? Is that true?" },
  { id: "c11", t: 61, caller: "Cell ·· 3071", lang: "EN", channel: "voice", loc: "9th Ave & W 47th St", text: "The smoke from the fire is so thick here and my dad is having chest pains, he's 78. We're on the corner of 9th and 47th." },
  { id: "c12", t: 66, caller: "Cell ·· 4419", lang: "EN", channel: "voice", loc: "412 W 47th St", text: "Strong gas smell in the lobby of 412 West 47th, the building right next to the fire." },
  { id: "c13", t: 70, caller: "Cell ·· 1188", lang: "—", channel: "abandoned", loc: "W 47th St", text: "[Call abandoned after 4 seconds. Background audio: heavy coughing, a child crying.]" },
  { id: "c14", t: 76, caller: "Cell ·· 6604", lang: "EN", channel: "voice", loc: "W 47th St & 10th Ave", text: "Huge fire on 47th, the fire trucks are here now." },
  { id: "c15", t: 81, caller: "Cell ·· 2290", lang: "BN", channel: "voice", loc: "10th Ave & W 46th St", text: "৪৭ নম্বর রাস্তায় একটা বিল্ডিংয়ে আগুন লেগেছে, অনেক ধোঁয়া!" },
  { id: "c16", t: 87, caller: "Cell ·· 7356", lang: "EN", channel: "voice", loc: "10th Ave & W 48th St", text: "A cab just hit a cyclist at 10th and 48th, he's bleeding from the head and not moving. Everyone was looking at the fire." },
  { id: "c17", t: 92, caller: "Cell ·· 0451", lang: "EN", channel: "voice", loc: "W 47th St", text: "Fire at 410 West 47th." },
  { id: "c18", t: 98, caller: "Cell ·· 8873", lang: "EN", channel: "voice", loc: "W 48th St", text: "Power just went out on our whole block of West 48th. Is that because of the fire?" },
  { id: "c19", t: 103, caller: "Cell ·· 3920", lang: "EN", channel: "voice", loc: "W 48th St & 9th Ave", text: "No power on West 48th between 9th and 10th, and the traffic lights are out too." },
  { id: "c20", t: 108, caller: "Cell ·· 5127", lang: "EN", channel: "voice", loc: "W 48th St (rear of 410 W 47th)", text: "There's a woman waving a towel from a 7th floor window at the back of the fire building!" },
  { id: "c21", t: 113, caller: "Cell ·· 6683", lang: "ES", channel: "voice", loc: "W 47th St", text: "Es el fuego de la calle 47, ya llegaron los bomberos, hay mucha gente mirando." },
  { id: "c22", t: 118, caller: "Landline 212-·· 4471", lang: "—", channel: "abandoned", loc: "W 47th St", text: "[Call abandoned after 2 seconds. Background audio: street noise, sirens.]" },
  { id: "c23", t: 123, caller: "Cell ·· 9034", lang: "EN", channel: "voice", loc: "W 50th St", text: "Is the C train still running? They closed my street because of the fire." },
  { id: "c24", t: 128, caller: "Cell ·· 1736", lang: "EN", channel: "voice", loc: "W 47th St", text: "Smoke coming from 410 West 47, the fourth floor." },
  { id: "c25", t: 133, caller: "Cell ·· 4058", lang: "RU", channel: "voice", loc: "W 46th St", text: "Пожар на 47-й улице, очень много дыма." },
  { id: "c26", t: 138, caller: "Cell ·· 2259", lang: "EN", channel: "voice", loc: "10th Ave & W 47th St", text: "There's a fire on 47th, a lot of smoke." },
];

export const TYPES = {
  fire: "Fire, smoke, explosion or gas leak in a building",
  medical: "A medical emergency: someone collapsed, not breathing, chest pain, injured or ill",
  traffic: "A traffic collision or a person hit by a vehicle",
  utility: "Power outage, traffic lights out, water main or other utility problem",
  other: "Anything else: a question, rumor, crime or non-emergency",
} as const;
export type IncType = keyof typeof TYPES;

export const ADDS = {
  nothing_new: "Only repeats what responders already know about the matched incident",
  life_intel: "New life-safety information AT the matched incident: a specific trapped or vulnerable person, a floor or apartment, a new hazard like gas",
  separate_need: "A different person needing help somewhere else (another emergency nearby, even if caused by the incident) that needs its own responders",
  non_emergency: "A question, rumor, or request that is not an emergency (should go to 311 or be ignored)",
} as const;
export type Adds = keyof typeof ADDS;

export const SEVERITY = [
  "Not an emergency: a question, rumor or information request",
  "Minor: inconvenience or property issue, nobody hurt",
  "Moderate: people need help soon but no danger to life right now",
  "Serious: injury or risk that could become life-threatening within the hour",
  "Critical: immediate threat to life right now (not breathing, trapped by fire, heavy bleeding)",
] as const;

export type OpenInc = { id: string; summary: string; location: string; facts: string[] };

export type CallJudgment = {
  matchId: string | null; // existing incident id, or null = new
  matchProbs: Record<string, number>;
  adds: Adds;
  addsProbs: Record<string, number>;
  type: IncType;
  severity: number; // 0..4
  lifeThreat: number;
  credible: number;
  summary: string;
  mock: boolean;
  ms?: number;
};

export const UNITS: Record<IncType, string> = {
  fire: "FDNY Engine 54 + Ladder 4 + EMS",
  medical: "EMS ALS ambulance",
  traffic: "EMS ALS + NYPD Midtown North",
  utility: "Con Ed emergency crew + NYPD traffic",
  other: "None (311 / info)",
};

/** Code owns the policy: Jev's calibrated answers → priority. */
export function priorityOf(j: Pick<CallJudgment, "severity" | "lifeThreat" | "adds">): 1 | 2 | 3 | 4 {
  if (j.adds === "non_emergency") return 4;
  if (j.lifeThreat >= 0.6 || j.severity >= 3.4) return 1;
  if (j.severity >= 2.4) return 2;
  return 3;
}

export const AVG_CALL_MIN = 2.2; // NYC call processing takes over 2 minutes per call
