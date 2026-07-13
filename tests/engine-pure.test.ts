// Юнит-тесты чистой логики движка, вынесенной из engine.ts (её нельзя было
// покрыть раньше — engine тянет Web Audio и worklet-url, не грузится в node).
import { filterMode, toBiquadType, vowelFormants, VOWELS, clampNum } from '../src/audio/filters';
import { buildModPayload } from '../src/audio/modrouting';
import type { ModState } from '../src/dsp/mod';

describe('filterMode', () => {
  it('распознаёт спец-режимы, остальное — biquad', () => {
    expect(filterMode('formant')).toBe('formant');
    expect(filterMode('comb')).toBe('comb');
    for (const t of ['lowpass', 'highpass', 'bandpass', 'notch', 'peaking', 'lowshelf', 'highshelf', 'allpass'] as const) {
      expect(filterMode(t)).toBe('biquad');
    }
  });
});

describe('toBiquadType', () => {
  it('биквадные типы проходят как есть', () => {
    for (const t of ['lowpass', 'highpass', 'bandpass', 'notch', 'peaking', 'lowshelf', 'highshelf', 'allpass'] as const) {
      expect(toBiquadType(t)).toBe(t);
    }
  });
  it('formant/comb не биквадные → lowpass (в биквадную ветку не попадают)', () => {
    expect(toBiquadType('formant')).toBe('lowpass');
    expect(toBiquadType('comb')).toBe('lowpass');
  });
});

describe('vowelFormants', () => {
  it('края морфа = чистые гласные A и U', () => {
    expect(vowelFormants(0).f).toEqual([...VOWELS[0].f]);
    expect(vowelFormants(1).f).toEqual([...VOWELS[VOWELS.length - 1].f]);
  });
  it('узлы попадают на табличные гласные (v=0.5 → I)', () => {
    expect(vowelFormants(0.5).f).toEqual([...VOWELS[2].f]);
  });
  it('линейно интерполирует между соседями (v=0.125 → середина A–E)', () => {
    const mid = vowelFormants(0.125);
    for (let k = 0; k < 3; k++) {
      expect(mid.f[k]).toBeCloseTo((VOWELS[0].f[k] + VOWELS[1].f[k]) / 2, 6);
    }
  });
  it('за пределами [0,1] клампится, частоты конечны и положительны', () => {
    for (const v of [-1, 0, 0.37, 1, 2]) {
      const { f, a } = vowelFormants(v);
      for (const x of [...f, ...a]) expect(Number.isFinite(x)).toBe(true);
      for (const hz of f) expect(hz).toBeGreaterThan(0);
    }
  });
});

describe('clampNum', () => {
  it('ограничивает в диапазон', () => {
    expect(clampNum(5, 0, 10)).toBe(5);
    expect(clampNum(-1, 0, 10)).toBe(0);
    expect(clampNum(99, 0, 10)).toBe(10);
  });
});

describe('buildModPayload', () => {
  const formulas = [
    { id: 'fm', sliders: [{ k: 'fc', min: 20, max: 2000 }, { k: 'I', min: 0, max: 20 }] },
    { id: 'additive', sliders: [{ k: 'fund', min: 20, max: 500 }] },
  ];
  const mod: ModState = {
    lfos: [{ shape: 'sine', rate: 2, phase: 0 }],
    routes: [
      { src: 0, formula: 'fm', param: 'fc', depth: 0.3, exp: true },
      { src: 0, formula: 'additive', param: 'fund', depth: 0.5 },
      { src: 0, formula: 'fm', param: 'nope', depth: 0.4 }, // параметра нет в схеме
    ],
  };

  it('null → пустой пейлоуд', () => {
    expect(buildModPayload(null, 'fm', formulas)).toEqual({ lfos: [], routes: [], ranges: {} });
  });

  it('фильтрует маршруты по приёмнику и отдаёт весь пул LFO', () => {
    const p = buildModPayload(mod, 'fm', formulas);
    expect(p.lfos).toBe(mod.lfos);
    expect(p.routes.map((r) => r.param)).toEqual(['fc', 'nope']);
  });

  it('диапазоны берутся из схемы; для несуществующего параметра — пропуск', () => {
    const p = buildModPayload(mod, 'fm', formulas);
    expect(p.ranges).toEqual({ fc: [20, 2000] }); // nope нет в схеме → нет диапазона
  });

  it('маршруты чужой формулы не попадают', () => {
    const p = buildModPayload(mod, 'additive', formulas);
    expect(p.routes.map((r) => r.param)).toEqual(['fund']);
    expect(p.ranges).toEqual({ fund: [20, 500] });
  });
});
