// Extension management API used by the settings window and the island.
// Owned by the extensions workstream; this stub defines the contract.
import type { View } from "../core/modules.js";

export interface InstalledExtension {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  /** data: URL of the extension icon, if any */
  iconUrl?: string;
  active: boolean;
  hasSettings: boolean;
  bundled: boolean;
  permissions: string[];
}

export async function listExtensions(): Promise<InstalledExtension[]> { return []; }
export async function setExtensionActive(_id: string, _active: boolean): Promise<void> {}
/** Renders the extension's settings.json as form controls; values persist via settings keys. */
export function renderExtensionSettings(_id: string): View { return { el: document.createElement("div") }; }
/** Notifies when the installed/active list changes. */
export function onExtensionsChanged(_fn: () => void): () => void { return () => {}; }
