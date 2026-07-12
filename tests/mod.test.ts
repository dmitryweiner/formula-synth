// Тесты ядра матрицы модуляции. Всё считается в чистом ядре, поэтому
// покрывается в текущем стиле generator.test.ts (включая golden-эталон
// промодулированного генератора). Регенерация: UPDATE_GOLDEN=1 npm test
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { lfoValue, effectiveParam } from '../src/dsp/mod';
import type { LfoDef, ModRoute, ParamRanges } from '../src/dsp/mod';
import { FormulaGenerator } from '../src/dsp/generator';
import { mulberry32 } from '../src/dsp/rng';

const SR = 48000;
const BLOCK = 128;
const BLOCKS = 4;
const SEED = 42;
const GOLDEN_PATH = join(dirname(fileURLToPath(import.meta.url)), 'golden', 'mod.json');

describe('lfoValue — формы', () => {
  const shapes = ['sine', 'triangle', 'saw', 'square', 'random'] as const;

  it.each(shapes)('%s: выход в [-1, 1]', (shape) => {
    const lfo: LfoDef = { shape, rate: 3, phase: 0.2 };
    for (let i = 0; i <= 2000; i++) {
      const v = lfoValue(lfo, i / 200);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('sine: узловые точки', () => {
    const lfo: LfoDef = { shape: 'sine', rate: 1, phase: 0 };
    expect(lfoValue(lfo, 0)).toBeCloseTo(0, 12);
    expect(lfoValue(lfo, 0.25)).toBeCloseTo(1, 12);
    expect(lfoValue(lfo, 0.5)).toBeCloseTo(0, 12);
    expect(lfoValue(lfo, 0.75)).toBeCloseTo(-1, 12);
  });

  it('triangle: -1 → +1 → -1', () => {
    const lfo: LfoDef = { shape: 'triangle', rate: 1, phase: 0 };
    expect(lfoValue(lfo, 0)).toBeCloseTo(-1, 12);
    expect(lfoValue(lfo, 0.25)).toBeCloseTo(0, 12);
    expect(lfoValue(lfo, 0.5)).toBeCloseTo(1, 12);
    expect(lfoValue(lfo, 0.75)).toBeCloseTo(0, 12);
  });

  it('saw: линейный подъём -1 → +1', () => {
    const lfo: LfoDef = { shape: 'saw', rate: 1, phase: 0 };
    expect(lfoValue(lfo, 0)).toBeCloseTo(-1, 12);
    expect(lfoValue(lfo, 0.5)).toBeCloseTo(0, 12);
    expect(lfoValue(lfo, 0.999999)).toBeCloseTo(1, 4);
  });

  it('square: первая половина +1, вторая -1', () => {
    const lfo: LfoDef = { shape: 'square', rate: 1, phase: 0 };
    expect(lfoValue(lfo, 0.1)).toBe(1);
    expect(lfoValue(lfo, 0.49)).toBe(1);
    expect(lfoValue(lfo, 0.51)).toBe(-1);
    expect(lfoValue(lfo, 0.99)).toBe(-1);
  });

  it('random (S&H): держит значение внутри цикла, меняет между', () => {
    const lfo: LfoDef = { shape: 'random', rate: 2, phase: 0 }; // цикл 0.5 с
    const a1 = lfoValue(lfo, 0.05);
    const a2 = lfoValue(lfo, 0.45); // тот же цикл [0, 0.5)
    const b = lfoValue(lfo, 0.55); // следующий цикл
    expect(a1).toBe(a2);
    expect(b).not.toBe(a1);
  });

  it('детерминизм: та же (форма, t) → то же значение', () => {
    const lfo: LfoDef = { shape: 'random', rate: 5, phase: 0.3 };
    expect(lfoValue(lfo, 1.234)).toBe(lfoValue(lfo, 1.234));
  });
});

describe('effectiveParam', () => {
  const range: readonly [number, number] = [0, 20];

  it('depth 0 → база без изменений', () => {
    expect(effectiveParam(3, 1, 0, range, false)).toBe(3);
    expect(effectiveParam(3, -1, 0, range, false)).toBe(3);
  });

  it('линейный: биполярно вокруг базы', () => {
    const up = effectiveParam(10, 1, 0.25, range, false); // 10 + 0.25*20
    const down = effectiveParam(10, -1, 0.25, range, false); // 10 - 0.25*20
    expect(up).toBeCloseTo(15, 12);
    expect(down).toBeCloseTo(5, 12);
  });

  it('линейный: клампится в диапазон', () => {
    expect(effectiveParam(18, 1, 0.5, range, false)).toBe(20);
    expect(effectiveParam(2, -1, 0.5, range, false)).toBe(0);
  });

  it('exp: модуляция в октавах симметрична по частоте', () => {
    const fr: readonly [number, number] = [20, 2000]; // 6.64 октавы
    const octaves = Math.log2(2000 / 20);
    const up = effectiveParam(220, 1, 0.1, fr, true);
    const down = effectiveParam(220, -1, 0.1, fr, true);
    expect(up).toBeCloseTo(220 * Math.pow(2, 0.1 * octaves), 6);
    expect(down).toBeCloseTo(220 / Math.pow(2, 0.1 * octaves), 6);
    // симметрия в log-домене: произведение = база^2
    expect(up * down).toBeCloseTo(220 * 220, 3);
  });

  it('exp: клампится в диапазон', () => {
    const fr: readonly [number, number] = [20, 2000];
    expect(effectiveParam(1900, 1, 1, fr, true)).toBe(2000);
    expect(effectiveParam(25, -1, 1, fr, true)).toBe(20);
  });
});

describe('FormulaGenerator + модуляция', () => {
  const lfos: LfoDef[] = [{ shape: 'sine', rate: 4, phase: 0 }];
  const ranges: ParamRanges = { fc: [20, 2000], I: [0, 20] };

  function mkFm(routes: ModRoute[]): FormulaGenerator {
    const gen = new FormulaGenerator('fm', SR, undefined, mulberry32(SEED));
    gen.setMod(lfos, routes, ranges);
    return gen;
  }

  it('модуляция меняет выход относительно немодулированного', () => {
    const plain = new FormulaGenerator('fm', SR);
    const modded = mkFm([{ src: 0, formula: 'fm', param: 'fc', depth: 0.5, exp: true }]);
    const a = new Float32Array(BLOCK);
    const b = new Float32Array(BLOCK);
    // первый блок: modT=0, sine=0 → эффект нулевой; расходятся дальше
    plain.fill(a); modded.fill(b);
    plain.fill(a); modded.fill(b);
    expect(Array.from(b)).not.toEqual(Array.from(a));
  });

  it('две ноды с одинаковой модуляцией синхронны', () => {
    const routes: ModRoute[] = [{ src: 0, formula: 'fm', param: 'fc', depth: 0.5, exp: true }];
    const g1 = mkFm(routes);
    const g2 = mkFm(routes);
    for (let blk = 0; blk < 5; blk++) {
      const o1 = new Float32Array(BLOCK);
      const o2 = new Float32Array(BLOCK);
      g1.fill(o1); g2.fill(o2);
      expect(Array.from(o1)).toEqual(Array.from(o2));
    }
  });

  it('база параметра восстанавливается после блока', () => {
    const gen = mkFm([{ src: 0, formula: 'fm', param: 'fc', depth: 0.5, exp: true }]);
    gen.fill(new Float32Array(BLOCK));
    gen.fill(new Float32Array(BLOCK)); // здесь sine != 0, fc реально уезжает
    expect(gen.p.fc).toBe(220); // но снаружи видна база, не эффективное значение
  });

  it('reset() НЕ сбрасывает modT (модуляция продолжается)', () => {
    const routes: ModRoute[] = [{ src: 0, formula: 'fm', param: 'fc', depth: 0.5, exp: true }];
    const advanced = mkFm(routes);
    for (let blk = 0; blk < 10; blk++) advanced.fill(new Float32Array(BLOCK));
    advanced.reset(); // звук с t=0, но modT уехал на 10 блоков
    const afterReset = new Float32Array(BLOCK);
    advanced.fill(afterReset);

    const fresh = mkFm(routes); // и звук, и modT с нуля
    const freshFirst = new Float32Array(BLOCK);
    fresh.fill(freshFirst);

    // Одинаковый звук-старт, но разный modT → разный промодулированный выход.
    expect(Array.from(afterReset)).not.toEqual(Array.from(freshFirst));
  });

  it('пустые маршруты не трогают выход', () => {
    const withEmpty = mkFm([]);
    const plain = new FormulaGenerator('fm', SR);
    const a = new Float32Array(BLOCK);
    const b = new Float32Array(BLOCK);
    for (let blk = 0; blk < 3; blk++) { withEmpty.fill(a); plain.fill(b); }
    expect(Array.from(a)).toEqual(Array.from(b));
  });
});

// Golden промодулированного генератора: две формы LFO (периодическая + S&H),
// два маршрута (частота exp + индекс линейно). Фиксирует композицию
// lfoValue + effectiveParam + перекрытие в fill().
describe('golden: промодулированный генератор', () => {
  const lfos: LfoDef[] = [
    { shape: 'sine', rate: 2, phase: 0 },
    { shape: 'random', rate: 5, phase: 0.25 },
  ];
  const ranges: ParamRanges = { fc: [20, 2000], I: [0, 20] };
  const routes: ModRoute[] = [
    { src: 0, formula: 'fm', param: 'fc', depth: 0.3, exp: true },
    { src: 1, formula: 'fm', param: 'I', depth: 0.6 },
  ];

  function render(): number[] {
    const gen = new FormulaGenerator('fm', SR, undefined, mulberry32(SEED));
    gen.setMod(lfos, routes, ranges);
    const out = new Float32Array(BLOCK);
    const all: number[] = [];
    for (let b = 0; b < BLOCKS; b++) {
      gen.fill(out);
      for (const v of out) all.push(v);
    }
    return all;
  }

  it('совпадает с эталоном', () => {
    if (process.env.UPDATE_GOLDEN) {
      writeFileSync(GOLDEN_PATH, JSON.stringify({ fmMod: render() }));
    }
    expect(existsSync(GOLDEN_PATH), `нет эталона ${GOLDEN_PATH}; сгенерируйте: UPDATE_GOLDEN=1 npm test`).toBe(true);
    const ref: number[] = JSON.parse(readFileSync(GOLDEN_PATH, 'utf8')).fmMod;
    const got = render();
    expect(got.length).toBe(ref.length);
    for (let i = 0; i < ref.length; i++) {
      if (Math.abs(got[i] - ref[i]) > 1e-9) {
        expect.fail(`fmMod[${i}]: ${got[i]} != ${ref[i]}`);
      }
    }
  });
});
