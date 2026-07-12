// Валидация встроенных пресетов: они должны ссылаться только на живые
// формулы и укладываться в диапазоны слайдеров — иначе UI молча обрежет.
import { PRESETS } from '../src/presets';
import { FORMULAS } from '../src/formulas';
import { isFormulaId } from '../src/dsp/generator';

describe('встроенные пресеты', () => {
  it('имена уникальны и непусты', () => {
    const names = PRESETS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(n.trim().length).toBeGreaterThan(0);
  });

  it('masterGain в [0, 1]', () => {
    for (const p of PRESETS) {
      expect(p.state.masterGain).toBeGreaterThanOrEqual(0);
      expect(p.state.masterGain).toBeLessThanOrEqual(1);
    }
  });

  it.each(PRESETS.map((p) => [p.name, p] as const))('%s: формулы и параметры в диапазонах', (_name, p) => {
    for (const [id, snap] of Object.entries(p.state.formulas)) {
      expect(isFormulaId(id), `неизвестная формула ${id}`).toBe(true);
      const def = FORMULAS.find((f) => f.id === id);
      expect(def).toBeDefined();
      if (!def) continue;
      for (const [k, v] of Object.entries(snap.params)) {
        const slider = def.sliders.find((s) => s.k === k);
        expect(slider, `${id}.${k}: нет такого слайдера`).toBeDefined();
        if (!slider) continue;
        expect(v, `${id}.${k}=${v} < min ${slider.min}`).toBeGreaterThanOrEqual(slider.min);
        expect(v, `${id}.${k}=${v} > max ${slider.max}`).toBeLessThanOrEqual(slider.max);
      }
    }
  });

  it('в каждом пресете есть хотя бы одна включённая формула', () => {
    for (const p of PRESETS) {
      const enabled = Object.values(p.state.formulas).filter((f) => f.enabled);
      expect(enabled.length, p.name).toBeGreaterThan(0);
    }
  });
});
