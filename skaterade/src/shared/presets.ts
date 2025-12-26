import type { EffectParams } from "./params";

export type OutMode = "youtube" | "vertical" | "both";

export type UIPreset = {
  name: string;
  createdAt: number;
  params: EffectParams;
  style: string;
  outMode: OutMode;
};

const KEY = "skateraded.presets.v1";
const LAST = "skateraded.lastPreset";

function readAll(): Record<string, UIPreset> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw) as Record<string, UIPreset>;
    return obj ?? {};
  } catch { return {}; }
}
function writeAll(map: Record<string, UIPreset>) {
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function listPresets(): UIPreset[] {
  const m = readAll();
  return Object.values(m).sort((a,b)=> b.createdAt - a.createdAt);
}
export function savePreset(p: UIPreset) {
  const m = readAll();
  m[p.name] = p;
  writeAll(m);
  localStorage.setItem(LAST, p.name);
}
export function loadPreset(name: string): UIPreset | null {
  const m = readAll();
  const p = m[name];
  if (p) localStorage.setItem(LAST, name);
  return p ?? null;
}
export function deletePreset(name: string) {
  const m = readAll();
  delete m[name];
  writeAll(m);
  const last = localStorage.getItem(LAST);
  if (last === name) localStorage.removeItem(LAST);
}
export function exportAll(): string {
  const m = readAll();
  return JSON.stringify({ __skateraded: 1, presets: m }, null, 2);
}
export function importMany(json: string): { count: number } {
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== "object" || !parsed.presets) throw new Error("Invalid presets file");
  const cur = readAll();
  const incoming = parsed.presets as Record<string, UIPreset>;
  let n = 0;
  for (const [k, v] of Object.entries(incoming)) {
    if (v && v.params && v.style && v.outMode) {
      cur[k] = v; n++;
    }
  }
  writeAll(cur);
  return { count: n };
}
export function getLastPresetName(): string | null {
  return localStorage.getItem(LAST);
}
