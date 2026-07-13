// «Слух» без ушей: рендерим каждый генератор и каждый пресет (стек генераторов
// с их модуляцией) в чистом ядре и проверяем, что звук вообще есть, конечен и
// не разносит по амплитуде. Ловит мёртвые формулы, тихие/битые пресеты и
// NaN/Inf от неудачных комбинаций параметров — то, что диапазонные тесты не видят.
// FX (фильтр/ревер/…) здесь не считаются — они в браузерном смоуке (npm run smoke).
import { FormulaGenerator, FORMULA_IDS } from '../src/dsp/generator';
import type { FormulaId, Params } from '../src/dsp/generator';
import { FORMULAS } from '../src/formulas';
import { PRESETS } from '../src/presets';
import { buildModPayload } from '../src/audio/modrouting';
import { mulberry32 } from '../src/dsp/rng';

const SR = 48000;
const SECONDS = 1;
const BLOCK = 128;

function uiDefaults(id: FormulaId): Params {
  const def = FORMULAS.find((f) => f.id === id);
  if (!def) throw new Error(`no UI def for ${id}`);
  const params: Params = {};
  for (const s of def.sliders) params[s.k] = s.value;
  return params;
}

function renderInto(gen: FormulaGenerator, mix: Float32Array): void {
  const buf = new Float32Array(BLOCK);
  for (let i = 0; i < mix.length; i += BLOCK) {
    gen.fill(buf);
    for (let j = 0; j < BLOCK && i + j < mix.length; j++) mix[i + j] += buf[j];
  }
}

function stats(buf: Float32Array): { peak: number; rms: number; finite: boolean; span: number } {
  let peak = 0, sumSq = 0, min = Infinity, max = -Infinity, finite = true;
  for (const v of buf) {
    if (!Number.isFinite(v)) finite = false;
    const a = Math.abs(v);
    if (a > peak) peak = a;
    sumSq += v * v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { peak, rms: Math.sqrt(sumSq / buf.length), finite, span: max - min };
}

describe('audio-sanity: генераторы (дефолты UI)', () => {
  it.each([...FORMULA_IDS])('%s: звук есть, конечен и ограничен', (id) => {
    const gen = new FormulaGenerator(id, SR, uiDefaults(id), mulberry32(42));
    const buf = new Float32Array(SR * SECONDS);
    renderInto(gen, buf);
    const s = stats(buf);
    expect(s.finite, `${id}: NaN/Inf в выходе`).toBe(true);
    expect(s.rms, `${id}: тишина (rms=${s.rms})`).toBeGreaterThan(1e-4);
    expect(s.span, `${id}: константа (span=${s.span})`).toBeGreaterThan(1e-4);
    expect(s.peak, `${id}: пик ${s.peak} слишком велик`).toBeLessThanOrEqual(1.5);
  });
});

describe('audio-sanity: пресеты (стек включённых генераторов + модуляция)', () => {
  it.each(PRESETS.map((p) => [p.name, p] as const))('%s: стек звучит, конечен, не разносит', (_name, preset) => {
    const mix = new Float32Array(SR * SECONDS);
    let generators = 0;
    const entries = Object.entries(preset.state.formulas);
    for (let i = 0; i < entries.length; i++) {
      const [id, snap] = entries[i];
      if (!snap.enabled) continue;
      const fid = FORMULA_IDS.find((f) => f === id);
      if (!fid) continue;
      generators++;
      const gen = new FormulaGenerator(fid, SR, snap.params, mulberry32(100 + i));
      gen.setMod(...modArgs(preset.state.mod ?? null, fid));
      renderInto(gen, mix);
    }
    expect(generators, `${preset.name}: нет включённых генераторов`).toBeGreaterThan(0);
    const s = stats(mix);
    expect(s.finite, `${preset.name}: NaN/Inf`).toBe(true);
    expect(s.rms, `${preset.name}: тишина`).toBeGreaterThan(1e-4);
    expect(s.peak, `${preset.name}: пик ${s.peak} — вероятный разнос`).toBeLessThanOrEqual(8);
  });
});

// Аргументы для gen.setMod из ModState пресета (через ту же чистую сборку, что и engine).
function modArgs(mod: Parameters<typeof buildModPayload>[0], fid: FormulaId) {
  const p = buildModPayload(mod, fid, FORMULAS);
  return [p.lfos, p.routes, p.ranges] as const;
}
