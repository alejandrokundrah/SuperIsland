// Tiny hyperscript helper so UI code stays framework-free.

type Child = Node | string | number | null | undefined | false;
export type Props = Record<string, unknown> | null | undefined;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === "class" || key === "className") el.className = String(value);
      else if (key === "style") {
        if (typeof value === "string") el.setAttribute("style", value);
        else Object.assign(el.style, value as Record<string, string>);
      } else if (key === "dataset") Object.assign(el.dataset, value as Record<string, string>);
      else if (key.startsWith("on") && typeof value === "function") {
        el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
      } else if (key in el && key !== "list") (el as unknown as Record<string, unknown>)[key] = value;
      else el.setAttribute(key, value === true ? "" : String(value));
    }
  }
  append(el, children);
  return el;
}

export function append(parent: Node, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    parent.appendChild(typeof c === "object" ? c : document.createTextNode(String(c)));
  }
}

export function clear(el: Node): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function svg(markup: string): SVGElement {
  const t = document.createElement("template");
  t.innerHTML = markup.trim();
  return t.content.firstChild as SVGElement;
}

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
