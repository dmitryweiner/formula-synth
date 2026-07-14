// Чистая сборка пейлоуда модуляции для одной ноды: фильтрует маршруты по
// приёмнику и достаёт диапазоны нужных параметров из UI-схемы. Вынесено из
// engine.ts, чтобы покрывать тестами без Web Audio.
import { effectiveParam, lfoValue } from '../dsp/mod';
import type { LfoDef, ModRoute, ModState, ParamRanges } from '../dsp/mod';
import type { FxState } from '../state/schema';
import { FX_PARAM_RANGES, isFxModParam } from '../state/schema';

export interface ModPayload {
  lfos: LfoDef[];
  routes: ModRoute[];
  ranges: ParamRanges;
}

// Минимальная форма UI-схемы формулы, нужная для поиска диапазонов.
export interface FormulaRanges {
  id: string;
  sliders: readonly { k: string; min: number; max: number }[];
}

export function buildModPayload(
  mod: ModState | null,
  formula: string,
  formulas: readonly FormulaRanges[],
): ModPayload {
  if (!mod) return { lfos: [], routes: [], ranges: {} };
  const routes = mod.routes.filter((r) => r.formula === formula);
  const ranges: ParamRanges = {};
  const def = formulas.find((f) => f.id === formula);
  if (def) {
    for (const r of routes) {
      const s = def.sliders.find((sl) => sl.k === r.param);
      if (s) ranges[r.param] = [s.min, s.max];
    }
  }
  return { lfos: mod.lfos, routes, ranges };
}

// Эффективный FxState на момент t: база, поверх которой наложены промодулированные
// FX-поля (маршруты с formula==='fx'). Чистая — переиспользует lfoValue/
// effectiveParam из ядра; движок зовёт её на control-rate (см. engine.tickFxMod).
// Меняются только allowlist-поля (isFxModParam); всё прочее — из базы.
export function modulateFx(
  base: FxState,
  routes: readonly ModRoute[],
  lfos: readonly LfoDef[],
  t: number,
): FxState {
  const eff: FxState = { ...base };
  for (const r of routes) {
    if (r.formula !== 'fx' || !isFxModParam(r.param)) continue;
    const lfo = lfos[r.src];
    if (!lfo) continue;
    eff[r.param] = effectiveParam(
      base[r.param], lfoValue(lfo, t), r.depth, FX_PARAM_RANGES[r.param], r.exp ?? false,
    );
  }
  return eff;
}
