"use client";
import { useEffect, useState } from "react";

export type Mood = "calm" | "concerned" | "alarm" | "skeptical";

/* ───────────── Pixel Jev: 16×16 sprite drawn cell by cell ───────────── */
export function PixelJev({ mood, thinking, size = 112 }: { mood: Mood; thinking: boolean; size?: number }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFrame((f) => f + 1), thinking ? 180 : 400);
    return () => clearInterval(t);
  }, [thinking]);

  const cells: [number, number, string][] = []; // x, y, color
  const ink = { calm: "#38bdf8", concerned: "#f59e0b", alarm: "#ef4444", skeptical: "#a78bfa" }[mood];
  const px = (x: number, y: number, c = ink) => cells.push([x, y, c]);
  // antenna (tip blinks while thinking)
  px(7, 2); px(8, 2); px(7, 1); px(8, 1);
  if (!thinking || frame % 2) { px(6, 0); px(7, 0); px(8, 0); px(9, 0); }
  // head outline with rounded corners
  for (let x = 4; x <= 11; x++) { px(x, 3); px(x, 12); }
  px(3, 4); px(12, 4); px(3, 11); px(12, 11);
  for (let y = 5; y <= 10; y++) { px(2, y); px(13, y); }
  // ears
  px(1, 7); px(1, 8); px(14, 7); px(14, 8);
  // eyes
  const blink = !thinking && frame % 9 === 0;
  const dx = thinking ? [0, 1, 0, -1][frame % 4] : 0;
  const eye = (cx: number) => {
    if (blink) { px(cx + dx, 7); px(cx + 1 + dx, 7); return; }
    if (mood === "alarm") { for (let y = 5; y <= 7; y++) for (let x = cx - 1; x <= cx + 1; x++) px(x + dx, y); return; }
    px(cx + dx, 6); px(cx + 1 + dx, 6);
    if (!(mood === "skeptical" && cx > 8)) { px(cx + dx, 7); px(cx + 1 + dx, 7); }
  };
  eye(5); eye(9);
  if (mood === "skeptical") { px(9, 4); px(10, 4); px(11, 5); }
  if (mood === "concerned") { px(4, 5); px(5, 4); px(10, 4); px(11, 5); }
  // mouth
  if (thinking) { for (let x = 6; x <= 9; x++) if ((x + frame) % 2) px(x, 10); }
  else if (mood === "calm") { px(5, 9); px(10, 9); for (let x = 6; x <= 9; x++) px(x, 10); }
  else if (mood === "concerned") { for (let x = 6; x <= 9; x++) px(x, 10); }
  else if (mood === "alarm") { for (let x = 6; x <= 9; x++) { px(x, 9); px(x, 11); } px(6, 10); px(9, 10); }
  else { px(6, 10); px(7, 10); px(8, 9); px(9, 9); }
  // body + feet (bob when idle)
  for (let x = 5; x <= 10; x++) px(x, 13);
  px(5, 14); px(10, 14); px(4, 15); px(5, 15); px(10, 15); px(11, 15);

  const bob = !thinking && frame % 2 ? 0.5 : 0;
  return (
    <svg viewBox="0 -1 16 17" width={size} height={size} shapeRendering="crispEdges" className={mood === "alarm" && !thinking ? "jev-shake" : ""}>
      <g transform={`translate(0 ${bob})`}>
        {cells.map(([x, y, c], i) => (
          <rect key={i} x={x} y={y} width={1} height={1} fill={c} />
        ))}
      </g>
    </svg>
  );
}
