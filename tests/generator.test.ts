// Тесты DSP-ядра. Golden-семплы фиксируют текущее звучание каждой формулы:
// любое изменение математики генераторов провалит сравнение.
// Регенерация эталонов: UPDATE_GOLDEN=1 npm test
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { FormulaGenerator, FORMULA_IDS, DEFAULT_PARAMS, isFormulaId } from '../src/dsp/generator';
import type { FormulaId, Params } from '../src/dsp/generator';
import { FORMULAS } from '../src/formulas';
import { mulberry32 } from '../src/dsp/rng';

const SR = 48000;
const BLOCK = 128;
const BLOCKS = 4; // 4 блока по 128 — ловим переносимое между блоками состояние
const SEED = 42;
const GOLDEN_PATH = join(dirname(fileURLToPath(import.meta.url)), 'golden', 'formulas.json');

/** Параметры формулы = дефолты слайдеров из UI-схемы. */
function uiDefaults(id: FormulaId): Params {
  const def = FORMULAS.find((f) => f.id === id);
  if (!def) throw new Error(`no UI def for ${id}`);
  const params: Params = {};
  for (const s of def.sliders) params[s.k] = s.value;
  return params;
}

function renderGolden(id: FormulaId): number[] {
  const gen = new FormulaGenerator(id, SR, uiDefaults(id), mulberry32(SEED));
  const out = new Float32Array(BLOCK);
  const all: number[] = [];
  for (let b = 0; b < BLOCKS; b++) {
    gen.fill(out);
    for (const v of out) all.push(v);
  }
  return all;
}

describe('FormulaGenerator golden samples', () => {
  const golden: Record<string, number[]> = {};
  if (process.env.UPDATE_GOLDEN) {
    for (const id of FORMULA_IDS) golden[id] = renderGolden(id);
    writeFileSync(GOLDEN_PATH, JSON.stringify(golden));
  } else {
    expect(existsSync(GOLDEN_PATH), `нет эталона ${GOLDEN_PATH}; сгенерируйте: UPDATE_GOLDEN=1 npm test`).toBe(true);
    Object.assign(golden, JSON.parse(readFileSync(GOLDEN_PATH, 'utf8')));
  }

  it.each([...FORMULA_IDS])('%s совпадает с эталоном', (id) => {
    const ref = golden[id];
    expect(ref, `в эталоне нет формулы ${id}`).toBeDefined();
    const got = renderGolden(id);
    expect(got.length).toBe(ref.length);
    for (let i = 0; i < ref.length; i++) {
      // допуск на разницу реализаций Math.sin между версиями V8
      if (Math.abs(got[i] - ref[i]) > 1e-9) {
        expect.fail(`${id}[${i}]: ${got[i]} != ${ref[i]}`);
      }
    }
  });
});

describe('FormulaGenerator свойства сигнала', () => {
  it.each([...FORMULA_IDS])('%s: выход конечен и ограничен', (id) => {
    const gen = new FormulaGenerator(id, SR, { ...uiDefaults(id), gain: 1 }, mulberry32(7));
    const out = new Float32Array(4096);
    gen.fill(out);
    for (let i = 0; i < out.length; i++) {
      expect(Number.isFinite(out[i])).toBe(true);
    }
    // gain=1: генераторы по построению не превышают ~N единиц
    const peak = Math.max(...Array.from(out, Math.abs));
    expect(peak).toBeLessThanOrEqual(2.0);
  });

  it('детерминизм: одинаковый сид → одинаковый выход', () => {
    const a = new FormulaGenerator('pinknoise', SR, undefined, mulberry32(1));
    const b = new FormulaGenerator('pinknoise', SR, undefined, mulberry32(1));
    const bufA = new Float32Array(512);
    const bufB = new Float32Array(512);
    a.fill(bufA);
    b.fill(bufB);
    expect(Array.from(bufA)).toEqual(Array.from(bufB));
  });

  it('set() меняет параметры на лету', () => {
    const gen = new FormulaGenerator('fm', SR);
    const before = new Float32Array(256);
    gen.fill(before);
    gen.set({ fc: 880 });
    expect(gen.p.fc).toBe(880);
    const after = new Float32Array(256);
    gen.fill(after);
    expect(Array.from(after)).not.toEqual(Array.from(before));
  });

  it('reset() возвращает генератор в начальное состояние (fm — без RNG)', () => {
    const gen = new FormulaGenerator('fm', SR);
    const first = new Float32Array(256);
    gen.fill(first);
    gen.fill(new Float32Array(256)); // уехали дальше по времени
    gen.reset();
    const again = new Float32Array(256);
    gen.fill(again);
    expect(Array.from(again)).toEqual(Array.from(first));
  });

  it('karplus: струна затухает', () => {
    const gen = new FormulaGenerator('karplus', SR, { gain: 1, ksFreq: 110, ksDamp: 0.95, ksBright: 0.5 }, mulberry32(3));
    const early = new Float32Array(SR); // первая секунда
    gen.fill(early);
    const late = new Float32Array(SR); // вторая секунда
    gen.fill(late);
    const rms = (buf: Float32Array) => Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
    expect(rms(late)).toBeLessThan(rms(early) * 0.1);
  });

  it('velvetnoise: плотность импульсов близка к заданной', () => {
    const density = 2000;
    const gen = new FormulaGenerator('velvetnoise', SR, { gain: 1, velvetDensity: density }, mulberry32(5));
    const buf = new Float32Array(SR); // 1 секунда
    gen.fill(buf);
    const impulses = Array.from(buf).filter((v) => v !== 0).length;
    expect(impulses).toBeGreaterThan(density * 0.7);
    expect(impulses).toBeLessThan(density * 1.4);
    for (const v of buf) expect([0, 1, -1]).toContain(v);
  });

  it('brownnoise: значения в [-1, 1]', () => {
    const gen = new FormulaGenerator('brownnoise', SR, { gain: 1, brownStep: 0.1 }, mulberry32(9));
    const buf = new Float32Array(8192);
    gen.fill(buf);
    for (const v of buf) {
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('gain масштабирует выход линейно', () => {
    const mk = (gain: number) => {
      const g = new FormulaGenerator('beats', SR, { ...uiDefaults('beats'), gain });
      const buf = new Float32Array(128);
      g.fill(buf);
      return buf;
    };
    const half = mk(0.5);
    const full = mk(1);
    for (let i = 0; i < half.length; i++) {
      expect(half[i]).toBeCloseTo(full[i] * 0.5, 6);
    }
  });

  it('bytebeat: значения квантованы в 256 уровней и детерминированы', () => {
    const gen = new FormulaGenerator('bytebeat', SR, { gain: 1, bbRecipe: 2, bbRate: 8000 });
    const buf = new Float32Array(4096);
    gen.fill(buf);
    const levels = new Set<number>();
    for (const v of buf) {
      const byte = Math.round((v + 1) * 128);
      expect(byte).toBeGreaterThanOrEqual(0);
      expect(byte).toBeLessThanOrEqual(255);
      levels.add(byte);
    }
    expect(levels.size).toBeGreaterThan(4); // это музыка, а не константа
  });

  it('bell: затухает и повторяет удар через bellPeriod', () => {
    const gen = new FormulaGenerator('bell', SR, { gain: 1, bellF0: 320, bellRatio: 1.4, bellIndex: 4, bellDecay: 1, bellPeriod: 2 });
    const peak = (buf: Float32Array) => Math.max(...Array.from(buf, Math.abs));
    const strike = new Float32Array(SR / 2); // 0–0.5 c — звон
    gen.fill(strike);
    const tail = new Float32Array(SR); // 0.5–1.5 c — хвост
    gen.fill(tail);
    const restrike = new Float32Array(SR); // 1.5–2.5 c — сюда попадает новый удар
    gen.fill(restrike);
    expect(peak(tail)).toBeLessThan(peak(strike) * 0.4);
    expect(peak(restrike)).toBeGreaterThan(peak(strike) * 0.7);
  });

  it('ocean: громкость дышит с периодом волны', () => {
    const rate = 0.5; // период 2 с
    const gen = new FormulaGenerator('ocean', SR, { gain: 1, oceanRate: rate, oceanCut: 600, oceanDepth: 1 }, mulberry32(11));
    const rms = (buf: Float32Array) => Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
    const windows: number[] = [];
    for (let w = 0; w < 8; w++) {
      const buf = new Float32Array(SR / 4); // окна по 0.25 с
      gen.fill(buf);
      windows.push(rms(buf));
    }
    const min = Math.min(...windows);
    const max = Math.max(...windows);
    expect(max).toBeGreaterThan(min * 3); // накат заметно громче затишья
  });

  it('risset: колокол звенит, затухает и переударяет через период', () => {
    const gen = new FormulaGenerator('risset', SR, { gain: 1, rissF0: 480, rissDecay: 1, rissPeriod: 2 });
    const peak = (buf: Float32Array) => Math.max(...Array.from(buf, Math.abs));
    const strike = new Float32Array(SR / 2); // 0–0.5 c — звон
    gen.fill(strike);
    const tail = new Float32Array(SR); // 0.5–1.5 c — хвост
    gen.fill(tail);
    const restrike = new Float32Array(SR); // 1.5–2.5 c — сюда попадает новый удар (t=2)
    gen.fill(restrike);
    expect(peak(tail)).toBeLessThan(peak(strike)); // затухает
    expect(peak(restrike)).toBeGreaterThan(peak(tail) * 1.5); // новый удар громче хвоста
  });

  it('rain: капли редкие, но слышны; сигнал ограничен', () => {
    const gen = new FormulaGenerator('rain', SR, { gain: 1, rainDensity: 6, rainPitch: 900, rainBed: 0 }, mulberry32(13));
    const buf = new Float32Array(SR); // 1 c, подложка выключена → только капли
    gen.fill(buf);
    const peak = Math.max(...Array.from(buf, Math.abs));
    expect(peak).toBeGreaterThan(0.05); // капли слышны
    expect(peak).toBeLessThanOrEqual(1.0);
    // капли имеют длительность (затухающий резонанс), а не одиночные сэмплы
    const active = Array.from(buf).filter((v) => Math.abs(v) > 0.02).length;
    expect(active).toBeGreaterThan(100);
  });

  it('DEFAULT_PARAMS покрывает все ключи слайдеров', () => {
    for (const def of FORMULAS) {
      for (const s of def.sliders) {
        expect(DEFAULT_PARAMS[s.k], `${def.id}.${s.k} нет в DEFAULT_PARAMS`).toBeDefined();
      }
    }
  });

  it('isFormulaId отфильтровывает неизвестные id', () => {
    expect(isFormulaId('fm')).toBe(true);
    expect(isFormulaId('am')).toBe(false); // выпилен из UI ещё в исходном проекте
    expect(isFormulaId('bitcrush')).toBe(false);
  });
});
