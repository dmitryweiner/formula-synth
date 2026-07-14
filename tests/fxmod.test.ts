// Тесты модуляции FX (LFO → фильтр/эффекты). Чистая часть: allowlist/диапазоны
// FX-полей (schema) и сборка эффективного FxState (modulateFx в modrouting).
// Интеграция графа/таймера — через npm run smoke.
import {
  DEFAULT_FX, FX_MOD_PARAMS, FX_PARAM_RANGES, FX_PARAM_LABELS, FX_EXP_PARAMS, isFxModParam,
} from '../src/state/schema';
import type { FxState } from '../src/state/schema';
import { modulateFx } from '../src/audio/modrouting';
import type { LfoDef, ModRoute } from '../src/dsp/mod';

describe('FX allowlist / диапазоны', () => {
  it('каждый модулируемый параметр — реальное числовое поле FxState', () => {
    for (const k of FX_MOD_PARAMS) {
      expect(typeof DEFAULT_FX[k], k).toBe('number');
    }
  });

  it('диапазоны и подписи покрывают ровно FX_MOD_PARAMS, min < max', () => {
    expect(Object.keys(FX_PARAM_RANGES).sort()).toEqual([...FX_MOD_PARAMS].sort());
    expect(Object.keys(FX_PARAM_LABELS).sort()).toEqual([...FX_MOD_PARAMS].sort());
    for (const k of FX_MOD_PARAMS) {
      const [min, max] = FX_PARAM_RANGES[k];
      expect(min, k).toBeLessThan(max);
    }
  });

  it('isFxModParam: allowlist — да, дискретные/дорогие — нет', () => {
    for (const k of FX_MOD_PARAMS) expect(isFxModParam(k)).toBe(true);
    for (const k of ['filterType', 'chorusMode', 'phaserStages', 'reverbDecay', 'nope']) {
      expect(isFxModParam(k)).toBe(false);
    }
  });

  it('exp-параметры — частотоподобные и все в allowlist', () => {
    for (const k of FX_EXP_PARAMS) expect(isFxModParam(k)).toBe(true);
    expect([...FX_EXP_PARAMS].sort()).toEqual(['chorusRate', 'delayTime', 'filterFreq', 'phaserRate']);
  });
});

describe('modulateFx', () => {
  const base: FxState = { ...DEFAULT_FX, filterFreq: 500, filterQ: 6, reverbMix: 0.4 };
  const lfos: LfoDef[] = [
    { shape: 'sine', rate: 1, phase: 0 },   // 0: lfoValue(t=0.25) = +1
    { shape: 'sine', rate: 1, phase: 0.5 }, // 1: lfoValue(t=0.25) = -1
  ];

  it('без FX-маршрутов возвращает базу как есть (копию)', () => {
    const routes: ModRoute[] = [{ src: 0, formula: 'additive', param: 'fund', depth: 0.5 }];
    const eff = modulateFx(base, routes, lfos, 0.25);
    expect(eff).toEqual(base);
    expect(eff).not.toBe(base);
  });

  it('меняет только allowlist-поля, остальное — из базы', () => {
    const routes: ModRoute[] = [{ src: 0, formula: 'fx', param: 'reverbMix', depth: 0.4 }];
    const eff = modulateFx(base, routes, lfos, 0.25); // lfo0 = +1 → 0.4 + 0.4*1 = 0.8
    expect(eff.reverbMix).toBeCloseTo(0.8, 10);
    expect(eff.filterFreq).toBe(500); // не тронуто
    expect(eff.filterQ).toBe(6);
  });

  it('exp-маппинг: частота в октавах', () => {
    // filterFreq range [20,2000], octaves = log2(100); base 500, depth 0.2, lfo=+1
    // → 500·2^(0.2·log2(100)) ≈ 1255 (в пределах диапазона, без клампа)
    const routes: ModRoute[] = [{ src: 0, formula: 'fx', param: 'filterFreq', depth: 0.2, exp: true }];
    const eff = modulateFx(base, routes, lfos, 0.25);
    const oct = Math.log2(2000 / 20);
    expect(eff.filterFreq).toBeCloseTo(500 * Math.pow(2, 0.2 * oct), 6);
  });

  it('клампит по диапазону поля', () => {
    // reverbMix range [0,1]; l=-1 (lfo1), base 0.4, depth 0.9 → 0.4-0.9 = -0.5 → 0
    const routes: ModRoute[] = [{ src: 1, formula: 'fx', param: 'reverbMix', depth: 0.9 }];
    const eff = modulateFx(base, routes, lfos, 0.25);
    expect(eff.reverbMix).toBe(0);
  });

  it('битый параметр / несуществующий LFO — пропуск', () => {
    const routes: ModRoute[] = [
      { src: 0, formula: 'fx', param: 'reverbDecay', depth: 0.5 }, // не allowlist
      { src: 9, formula: 'fx', param: 'reverbMix', depth: 0.5 },   // нет такого LFO
    ];
    expect(modulateFx(base, routes, lfos, 0.25)).toEqual(base);
  });
});
