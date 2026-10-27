// In-app notification feed. Extensions (and any module) push here; the Notifications module renders it.
export interface FeedNotification {
  id: string;
  /** "extension" | "system" | other source tags */
  source: string;
  /** Extension id or app name that produced it */
  sourceId: string;
  title: string;
  body: string;
  /** SF-symbol name or image URL */
  icon?: string;
  timestamp: number;
}

type Listener = (n: FeedNotification) => void;
const items: FeedNotification[] = [];
const listeners = new Set<Listener>();

export const notifyBus = {
  push(n: Omit<FeedNotification, "id" | "timestamp"> & { id?: string; timestamp?: number }): FeedNotification {
    const full: FeedNotification = { id: n.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, timestamp: n.timestamp ?? Date.now(), ...n } as FeedNotification;
    full.id = n.id ?? full.id;
    items.unshift(full);
    listeners.forEach((l) => l(full));
    return full;
  },
  list: (): readonly FeedNotification[] => items,
  latest: (): FeedNotification | undefined => items[0],
  remove(id: string): void { const i = items.findIndex((x) => x.id === id); if (i >= 0) items.splice(i, 1); },
  clear(): void { items.length = 0; },
  subscribe(fn: Listener): () => void { listeners.add(fn); return () => listeners.delete(fn); },
};
