// Схема сериализуемого состояния (v2) — формат общий со старым
// formulas-audio-lab: те же ключи в URL-хэше и localStorage, чтобы
// старые share-ссылки и сохранённые пресеты продолжали работать.
import type { Params } from '../dsp/generator';

export type FilterType = 'lowpass' | 'highpass' | 'bandpass';
export type ChorusMode = 'chorus' | 'flanger';

export interface FxState {
  filterOn: boolean; filterType: FilterType; filterFreq: number; filterQ: number;
  chorusOn: boolean; chorusMode: ChorusMode; chorusRate: number; chorusDepth: number;
  chorusMix: number; chorusFb: number;
  reverbOn: boolean; reverbDecay: number; reverbMix: number;
  limiterOn: boolean; limiterThr: number; limiterRel: number;
  delayOn: boolean; delayTime: number; delayFb: number; delayMix: number;
  phaserOn: boolean; phaserRate: number; phaserDepth: number; phaserStages: number;
  phaserFb: number; phaserMix: number;
}

export interface FormulaSnapshot {
  enabled: boolean;
  params: Params;
}

export interface AppState {
  v: 2;
  presetName?: string;
  masterGain: number;
  fx: FxState;
  formulas: Record<string, FormulaSnapshot>;
}

// Частичное состояние — результат разбора URL/пресета: применяется
// поверх дефолтов, неизвестные/битые поля молча отбрасываются.
export interface PartialFormulaSnapshot {
  enabled?: boolean;
  params?: Params;
}

export interface PartialAppState {
  presetName?: string;
  masterGain?: number;
  fx?: Partial<FxState>;
  formulas?: Record<string, PartialFormulaSnapshot>;
}

export const DEFAULT_MASTER_GAIN = 0.25;

export const DEFAULT_FX: Readonly<FxState> = {
  filterOn: false, filterType: 'lowpass', filterFreq: 1000, filterQ: 0.7,
  chorusOn: false, chorusMode: 'chorus', chorusRate: 0.35, chorusDepth: 6,
  chorusMix: 0.35, chorusFb: 0.15,
  reverbOn: false, reverbDecay: 2.8, reverbMix: 0.25,
  limiterOn: false, limiterThr: -12, limiterRel: 0.15,
  delayOn: false, delayTime: 0.35, delayFb: 0.4, delayMix: 0.3,
  phaserOn: false, phaserRate: 0.5, phaserDepth: 0.7, phaserStages: 4,
  phaserFb: 0.3, phaserMix: 0.5,
};

function isRecord(u: unknown): u is Record<string, unknown> {
  return typeof u === 'object' && u !== null;
}

function toParams(u: unknown): Params | undefined {
  if (!isRecord(u)) return undefined;
  const out: Params = {};
  for (const [k, v] of Object.entries(u)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

function isFilterType(v: unknown): v is FilterType {
  return v === 'lowpass' || v === 'highpass' || v === 'bandpass';
}

function isChorusMode(v: unknown): v is ChorusMode {
  return v === 'chorus' || v === 'flanger';
}

function sanitizeFx(u: unknown): Partial<FxState> | undefined {
  if (!isRecord(u)) return undefined;
  const fx: Partial<FxState> = {};
  const boolKeys = ['filterOn', 'chorusOn', 'reverbOn', 'limiterOn', 'delayOn', 'phaserOn'] as const;
  for (const k of boolKeys) {
    if (typeof u[k] === 'boolean') fx[k] = u[k] === true;
  }
  const numKeys = [
    'filterFreq', 'filterQ', 'chorusRate', 'chorusDepth', 'chorusMix', 'chorusFb',
    'reverbDecay', 'reverbMix', 'limiterThr', 'limiterRel',
    'delayTime', 'delayFb', 'delayMix',
    'phaserRate', 'phaserDepth', 'phaserStages', 'phaserFb', 'phaserMix',
  ] as const;
  for (const k of numKeys) {
    const v = u[k];
    if (typeof v === 'number' && Number.isFinite(v)) fx[k] = v;
  }
  if (isFilterType(u.filterType)) fx.filterType = u.filterType;
  if (isChorusMode(u.chorusMode)) fx.chorusMode = u.chorusMode;
  return fx;
}

/** Терпимый разбор состояния из JSON (URL, localStorage, пресеты). */
export function sanitizeState(u: unknown): PartialAppState | null {
  if (!isRecord(u)) return null;
  const out: PartialAppState = {};
  if (typeof u.presetName === 'string') out.presetName = u.presetName;
  if (typeof u.masterGain === 'number' && Number.isFinite(u.masterGain)) {
    out.masterGain = u.masterGain;
  }
  const fx = sanitizeFx(u.fx);
  if (fx) out.fx = fx;
  if (isRecord(u.formulas)) {
    const formulas: Record<string, PartialFormulaSnapshot> = {};
    for (const [id, st] of Object.entries(u.formulas)) {
      if (!isRecord(st)) continue;
      const snap: PartialFormulaSnapshot = {};
      if (typeof st.enabled === 'boolean') snap.enabled = st.enabled === true;
      const params = toParams(st.params);
      if (params) snap.params = params;
      formulas[id] = snap;
    }
    out.formulas = formulas;
  }
  return out;
}
