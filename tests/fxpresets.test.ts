// Пресеты модулей эффектов должны ссылаться на валидные поля FxState и
// укладываться в диапазоны слайдеров карточек эффектов (index.html).
import { FX_PRESETS } from '../src/fxPresets';

const FILTER_TYPES = [
  'lowpass', 'highpass', 'bandpass', 'notch', 'peaking',
  'lowshelf', 'highshelf', 'allpass', 'formant', 'comb',
];
// Числовые поля FxState → [min, max] соответствующих слайдеров.
const RANGES: Record<string, readonly [number, number]> = {
  filterFreq: [20, 2000], filterQ: [0.1, 30], filterGain: [-24, 24], filterVowel: [0, 1], filterCombFb: [0, 0.95],
  chorusRate: [0.01, 8], chorusDepth: [0, 20], chorusMix: [0, 1], chorusFb: [0, 0.95],
  reverbDecay: [0.1, 8], reverbMix: [0, 1],
  limiterThr: [-40, 0], limiterRel: [0.02, 1],
  delayTime: [0.05, 2], delayFb: [0, 0.9], delayMix: [0, 1],
  phaserRate: [0.1, 10], phaserDepth: [0, 1], phaserStages: [2, 8], phaserFb: [0, 0.9], phaserMix: [0, 1],
};
const BOOL_KEYS = new Set(['filterOn', 'chorusOn', 'reverbOn', 'limiterOn', 'delayOn', 'phaserOn']);

describe('пресеты модулей эффектов (FX_PRESETS)', () => {
  it('имена уникальны, непусты, у каждого есть group', () => {
    const names = FX_PRESETS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
    for (const p of FX_PRESETS) {
      expect(p.name.trim().length).toBeGreaterThan(0);
      expect(p.group.trim().length).toBeGreaterThan(0);
    }
  });

  it.each(FX_PRESETS.map((p) => [p.name, p] as const))('%s: поля валидны и в диапазонах', (_name, p) => {
    const keys = Object.keys(p.fx);
    expect(keys.length, 'пустой fx').toBeGreaterThan(0);
    for (const [k, v] of Object.entries(p.fx)) {
      if (BOOL_KEYS.has(k)) {
        expect(typeof v, `${k} должен быть boolean`).toBe('boolean');
      } else if (k === 'filterType') {
        expect(FILTER_TYPES, `filterType ${String(v)}`).toContain(v);
      } else if (k === 'chorusMode') {
        expect(['chorus', 'flanger'], `chorusMode ${String(v)}`).toContain(v);
      } else {
        const range = RANGES[k];
        expect(range, `неизвестное поле FxState: ${k}`).toBeDefined();
        if (range && typeof v === 'number') {
          expect(v >= range[0] && v <= range[1], `${k}=${v} вне [${range[0]}, ${range[1]}]`).toBe(true);
        }
      }
    }
  });
});
