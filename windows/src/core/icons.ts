// SF-Symbol-name -> inline SVG. Extensions and built-in modules use SF Symbol names
// ("bolt.fill", "speaker.wave.2.fill"); this file maps them to 24x24 vector glyphs.
// Add new glyphs to ICONS (path data only, drawn on a 24x24 grid, filled with currentColor
// unless the entry is prefixed with "stroke:" in which case it is stroked).

import { svg } from "./dom.js";

export const ICONS: Record<string, string> = {
  "play.fill": "M8 5v14l11-7z",
  "pause.fill": "M6 5h4v14H6zM14 5h4v14h-4z",
  "backward.fill": "M11 12l9-7v14zM3 5h2v14H3zM5 12l8-7v14z",
  "forward.fill": "M13 12L4 5v14zM19 5h2v14h-2zM19 12l-8-7v14z",
  "music.note": "M9 17V5l11-2v12a3 3 0 11-2-2.8V7.2L11 8.3V17a3 3 0 11-2-2.8z",
  "bolt.fill": "M13 2L4 14h6l-1 8 9-12h-6z",
  "bell.fill": "M12 22a2.4 2.4 0 002.4-2.4h-4.8A2.4 2.4 0 0012 22zm7-6V11a7 7 0 10-14 0v5l-2 2v1h18v-1z",
  "calendar": "stroke:M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM4 10h16M8 3v4M16 3v4",
  "cloud.sun.fill": "M7 18a4 4 0 010-8 5.5 5.5 0 0110.6 1.3A3.4 3.4 0 0117 18z",
  "wifi": "stroke:M2 9a15 15 0 0120 0M5 12.5a10.5 10.5 0 0114 0M8.5 16a5.5 5.5 0 017 0M12 19.5h.01",
  "speaker.wave.2.fill": "M3 9v6h4l5 4V5L7 9zM15.5 8.5a5 5 0 010 7M18 6a8.5 8.5 0 010 12",
  "battery.100": "stroke:M3 8h15a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V9a1 1 0 011-1zM21 10.5v3",
  "tray.full.fill": "M4 5h16l2 8v6H2v-6zM6 13h4l1 2h2l1-2h4",
  "scroll": "stroke:M7 4h11a2 2 0 012 2v1H9v11a2 2 0 01-4 0V6a2 2 0 012-2zM9 18h10",
  "gearshape.fill": "M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM10.8 2h2.4l.5 2.6 1.6.7 2.2-1.5 1.7 1.7-1.5 2.2.7 1.6 2.6.5v2.4l-2.6.5-.7 1.6 1.5 2.2-1.7 1.7-2.2-1.5-1.6.7-.5 2.6h-2.4l-.5-2.6-1.6-.7-2.2 1.5-1.7-1.7 1.5-2.2-.7-1.6L2 13.2v-2.4l2.6-.5.7-1.6-1.5-2.2 1.7-1.7 2.2 1.5 1.6-.7z",
  "chevron.left": "stroke:M15 5l-7 7 7 7",
  "chevron.right": "stroke:M9 5l7 7-7 7",
  "xmark": "stroke:M6 6l12 12M18 6L6 18",
  "house.fill": "M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z",
  "pin.fill": "M14 3l7 7-3 1-3 3 1 5-2 2-4-4-5 5-1-1 5-5-4-4 2-2 5 1 3-3z",
  "minus": "stroke:M5 12h14",
  "puzzlepiece.extension": "stroke:M10 4a2 2 0 114 0v2h4v4h-2a2 2 0 100 4h2v4h-4v-2a2 2 0 10-4 0v2H6v-4H4a2 2 0 110-4h2V6h4z",
};

export function registerIcons(extra: Record<string, string>): void {
  Object.assign(ICONS, extra);
}

const NAMED_COLORS: Record<string, string> = {
  white: "#fff", gray: "#8e8e93", red: "#ff453a", green: "#30d158", blue: "#0a84ff",
  yellow: "#ffd60a", orange: "#ff9f0a", purple: "#bf5af2", pink: "#ff375f", teal: "#40c8e0", cyan: "#64d2ff",
};
export function cssColor(c: string | undefined | null): string {
  if (!c) return "#fff";
  return NAMED_COLORS[c] ?? c;
}

export function icon(name: string, size = 14, color = "white"): HTMLElement {
  const def = ICONS[name] ?? "M12 6a6 6 0 100 12 6 6 0 000-12z";
  const stroked = def.startsWith("stroke:");
  const d = stroked ? def.slice(7) : def;
  const col = cssColor(color);
  const el = svg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" ` +
      (stroked
        ? `fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`
        : `fill="${col}"`) +
      `><path d="${d}"/></svg>`
  );
  const span = document.createElement("span");
  span.className = "ico";
  span.style.cssText = `display:inline-flex;width:${size}px;height:${size}px;flex:none`;
  span.appendChild(el);
  return span;
}
