// Thin typed wrapper around the Tauri global (withGlobalTauri = true). No npm runtime deps.

interface TauriGlobal {
  core: { invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T> };
  event: {
    listen<T>(name: string, cb: (e: { payload: T }) => void): Promise<() => void>;
    emit(name: string, payload?: unknown): Promise<void>;
  };
}

declare global {
  interface Window {
    __TAURI__?: TauriGlobal;
  }
}

function tauri(): TauriGlobal {
  if (!window.__TAURI__) throw new Error("Tauri runtime not available");
  return window.__TAURI__;
}

export const inTauri = (): boolean => typeof window !== "undefined" && !!window.__TAURI__;

/** Call a Rust command. Argument keys are camelCase; Tauri maps them to snake_case params. */
export function invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  return tauri().core.invoke<T>(cmd, args);
}

/** Subscribe to a Rust-emitted event. Returns an unsubscribe function (async because of IPC). */
export function listen<T = unknown>(name: string, cb: (payload: T) => void): Promise<() => void> {
  if (!inTauri()) return Promise.resolve(() => {});
  return tauri().event.listen<T>(name, (e) => cb(e.payload));
}

export function emit(name: string, payload?: unknown): Promise<void> {
  return inTauri() ? tauri().event.emit(name, payload) : Promise.resolve();
}

/** Invoke that never throws: logs and resolves to `fallback` (used for optional native features). */
export async function safeInvoke<T>(cmd: string, args: Record<string, unknown> | undefined, fallback: T): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (err) {
    console.warn(`[ipc] ${cmd} failed:`, err);
    return fallback;
  }
}

export interface HttpRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}
export interface HttpResponse {
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  body: string;
  bodyBase64: string;
}
export const httpFetch = (req: HttpRequest): Promise<HttpResponse> => invoke<HttpResponse>("http_fetch", { req });
