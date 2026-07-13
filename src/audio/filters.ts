// Чистая математика мультирежимного фильтра (без Web Audio) — чтобы её можно
// было юнит-тестировать в vitest, а не только гонять смоуком в браузере.
import type { FilterType } from '../state/schema';

export type FilterMode = 'biquad' | 'formant' | 'comb';

export function clampNum(x: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, x));
}

export function filterMode(t: FilterType): FilterMode {
  if (t === 'formant') return 'formant';
  if (t === 'comb') return 'comb';
  return 'biquad';
}

// Сужаем FilterType до нативного BiquadFilterType без as-каста (formant/comb
// не биквадные — в биквадную ветку не попадают).
export function toBiquadType(t: FilterType): BiquadFilterType {
  switch (t) {
    case 'lowpass': case 'highpass': case 'bandpass': case 'notch':
    case 'peaking': case 'lowshelf': case 'highshelf': case 'allpass':
      return t;
    default:
      return 'lowpass';
  }
}

// Форманты гласных (F1,F2,F3 в Гц) и относительные амплитуды. Порядок A E I O U;
// ползунок Vowel морфит между ними.
export const VOWELS: readonly { f: readonly [number, number, number]; a: readonly [number, number, number] }[] = [
  { f: [800, 1150, 2800], a: [1.0, 0.5, 0.25] }, // A
  { f: [400, 1600, 2700], a: [1.0, 0.6, 0.30] }, // E
  { f: [350, 1700, 3000], a: [1.0, 0.5, 0.35] }, // I
  { f: [450, 800, 2830], a: [1.0, 0.5, 0.25] }, // O
  { f: [325, 700, 2700], a: [1.0, 0.4, 0.20] }, // U
];

export function vowelFormants(v: number): { f: [number, number, number]; a: [number, number, number] } {
  const pos = clampNum(v, 0, 1) * (VOWELS.length - 1);
  const i0 = Math.min(VOWELS.length - 2, Math.floor(pos));
  const fr = pos - i0;
  const A = VOWELS[i0];
  const B = VOWELS[i0 + 1];
  const lerp = (x: number, y: number) => x + (y - x) * fr;
  return {
    f: [lerp(A.f[0], B.f[0]), lerp(A.f[1], B.f[1]), lerp(A.f[2], B.f[2])],
    a: [lerp(A.a[0], B.a[0]), lerp(A.a[1], B.a[1]), lerp(A.a[2], B.a[2])],
  };
}
