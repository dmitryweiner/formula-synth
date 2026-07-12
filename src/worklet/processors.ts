// AudioWorklet-обёртки над чистым DSP-ядром. Этот файл — отдельный entry,
// который Vite собирает в самостоятельный модуль (см. engine.ts: ?worker&url).
import { FormulaGenerator, isFormulaId, DEFAULT_PARAMS } from '../dsp/generator';
import type { FormulaId, Params } from '../dsp/generator';
import { RecorderCore } from '../dsp/recorder';
import { applyGate, gateIsSilent } from '../dsp/gate';

function toParams(v: unknown): Params {
  const out: Params = {};
  if (typeof v === 'object' && v !== null) {
    for (const [k, val] of Object.entries(v)) {
      if (typeof val === 'number') out[k] = val;
    }
  }
  return out;
}

function toFormulaId(v: unknown): FormulaId {
  return typeof v === 'string' && isFormulaId(v) ? v : 'fm';
}

class FormulaGeneratorProcessor extends AudioWorkletProcessor {
  private gen: FormulaGenerator;
  private enabled: boolean;
  private fade: number;

  constructor(options?: { processorOptions?: unknown }) {
    super();
    const o: unknown = options?.processorOptions;
    let formula: FormulaId = 'fm';
    let params: Params = { ...DEFAULT_PARAMS };
    let enabled = false;
    if (typeof o === 'object' && o !== null) {
      const rec: Record<string, unknown> = { ...o };
      formula = toFormulaId(rec.formula);
      params = toParams(rec.params);
      enabled = rec.enabled === true;
    }
    this.gen = new FormulaGenerator(formula, sampleRate, params);
    this.enabled = enabled;
    this.fade = enabled ? 1 : 0;

    this.port.onmessage = (e: MessageEvent) => {
      const msg: unknown = e.data;
      if (typeof msg !== 'object' || msg === null) return;
      const rec: Record<string, unknown> = { ...msg };
      if (rec.type === 'set') {
        this.gen.set(toParams(rec.params));
      } else if (rec.type === 'reset') {
        this.gen.reset();
      } else if (rec.type === 'enabled') {
        this.enabled = rec.enabled === true;
      }
    };
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    // Выключенный генератор после фейда не считает семплы вовсе —
    // экономия CPU аудиопотока (выходной буфер уже обнулён браузером).
    if (gateIsSilent(this.fade, this.enabled)) return true;
    const out = outputs[0][0];
    this.gen.fill(out);
    this.fade = applyGate(out, this.fade, this.enabled);
    return true;
  }
}

class RecorderProcessor extends AudioWorkletProcessor {
  private core = new RecorderCore();

  constructor() {
    super();
    this.port.onmessage = (e: MessageEvent) => {
      const msg: unknown = e.data;
      if (typeof msg !== 'object' || msg === null) return;
      const rec: Record<string, unknown> = { ...msg };
      if (rec.type === 'start') {
        this.core.start();
      } else if (rec.type === 'stop') {
        this.port.postMessage({ type: 'data', samples: this.core.stop() });
      }
    };
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const input = inputs[0];
    const output = outputs[0];
    // Пропускаем звук насквозь (нода остаётся активной в графе)
    if (input && input[0] && output && output[0]) {
      output[0].set(input[0]);
      this.core.push(input[0]);
    }
    return true;
  }
}

registerProcessor('formula-generator', FormulaGeneratorProcessor);
registerProcessor('recorder-processor', RecorderProcessor);
