// Temporary scaffolding used until each module is ported. Replace per module.
import { h } from "../core/dom.js";
import { icon } from "../core/icons.js";
import { registerModule } from "../core/modules.js";

export function placeholder(name: string, title: string, iconName: string, enabledKey?: string): void {
  const make = () => ({ el: h("div", { class: "row dim caption" }, icon(iconName, 14), title) });
  registerModule({ id: `builtIn.${name}`, title, icon: iconName, enabledKey, compact: make, expanded: make });
}
