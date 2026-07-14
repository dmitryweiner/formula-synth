// Матрица модуляции: чистое ядро. LFO — чистая функция абсолютного времени,
// поэтому все ноды, стартовавшие от одного sample-clock, остаются синхронны
// без обмена сообщениями между потоками. Модуль не знает про Web Audio —
// его импортируют и воркалет, и vitest (в стиле generator.ts).
import type { FormulaId } from './generator';

export type LfoShape = 'sine' | 'triangle' | 'saw' | 'square' | 'random'; // random = S&H

export interface LfoDef {
  shape: LfoShape;
  rate: number;   // Гц (медленные: ~0.02–8)
  phase: number;  // 0–1 (доля цикла)
}

export interface ModRoute {
  src: number;               // индекс LFO в пуле
  formula: FormulaId | 'fx'; // приёмник: генератор ИЛИ 'fx' (модуль эффектов)
  param: string;             // ключ слайдера генератора ИЛИ поля FxState
  depth: number;             // биполярно, доля диапазона [-1, 1]
  exp?: boolean;             // экспоненциальный маппинг (для частот)
}

export interface ModState {
  lfos: LfoDef[];
  routes: ModRoute[];
}

// param → [min, max]; диапазоны живут в UI-схеме, ядру передаются маленькой мапой.
export type ParamRanges = Record<string, readonly [number, number]>;

const TWO_PI = 2 * Math.PI;

function clamp(x: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, x));
}

// Детерминированный хэш целого → [0,1) (один шаг mulberry32). Для S&H:
// значение — чистая функция номера цикла, синхронное между нодами.
function hash01(n: number): number {
  let a = (n | 0) >>> 0;
  a = (a + 0x6d2b79f5) >>> 0;
  let t = Math.imul(a ^ (a >>> 15), a | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Значение LFO как чистая функция абсолютного времени t (сек) → [-1, 1]. */
export function lfoValue(lfo: LfoDef, t: number): number {
  const ph = lfo.rate * t + lfo.phase;
  const frac = ph - Math.floor(ph); // [0, 1)
  switch (lfo.shape) {
    case 'sine': return Math.sin(TWO_PI * ph);
    case 'triangle': return frac < 0.5 ? 4 * frac - 1 : 3 - 4 * frac;
    case 'saw': return 2 * frac - 1;
    case 'square': return frac < 0.5 ? 1 : -1;
    case 'random': return 2 * hash01(Math.floor(ph)) - 1;
  }
}

/**
 * Эффективное значение параметра: база плюс биполярная доля диапазона · LFO,
 * с клампом в [min, max]. Для частотных параметров — экспоненциальный маппинг
 * (модуляция в октавах), т.к. частота воспринимается логарифмически.
 */
export function effectiveParam(
  base: number,
  l: number,
  depth: number,
  range: readonly [number, number],
  exp: boolean,
): number {
  const [min, max] = range;
  if (exp && min > 0 && max > 0) {
    const octaves = Math.log2(max / min);
    return clamp(base * Math.pow(2, depth * octaves * l), min, max);
  }
  return clamp(base + depth * (max - min) * l, min, max);
}
