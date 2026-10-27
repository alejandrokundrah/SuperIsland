// Mascot ("Otto") view. Owned by the productivity workstream; stub until ported.
import { h } from "./dom.js";
import type { View } from "./modules.js";

export function mascotView(size: number, _expression?: string | null): View {
  return { el: h("div", { style: `width:${size}px;height:${size}px;border-radius:50%;background:rgba(255,255,255,.15)` }) };
}
