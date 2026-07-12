// Аудио-движок: AudioContext, воркалет-генераторы, FX-цепочка, запись.
// Не трогает DOM — принимает готовое состояние (schema.ts), UI дергает методы.
//
// Отличия от исходного formulas-audio-lab (сознательные):
// - sum-ноды эффектов создаются один раз при старте, а не на каждом
//   переключении роутинга (в оригинале «осиротевшие» ноды копились);
// - импульс ревербератора пересчитывается только при смене Decay
//   (в оригинале — на каждом input любого FX-слайдера);
// - Stages фазера реально ограничивает число all-pass звеньев
//   (в оригинале параметр читался, но не использовался).
import workletUrl from '../worklet/processors.ts?worker&url';
import { FORMULAS } from '../formulas';
import type { FxState } from '../state/schema';
import type { Params } from '../dsp/generator';

export interface FormulaSetting {
  enabled: boolean;
  params: Params;
}

export interface EngineState {
  masterGain: number;
  fx: FxState;
  formulas: Record<string, FormulaSetting>;
}

interface FormulaNodes {
  aw: AudioWorkletNode;
  g: GainNode;
}

const GAIN_SMOOTH = 0.02; // с — сглаживание включения/выключения генератора

function makeImpulseResponse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.max(1, Math.floor(sr * seconds));
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t / Math.max(1e-3, decay));
      data[i] = (Math.random() * 2 - 1) * env;
    }
  }
  return buf;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;

  private mixBus!: GainNode;
  private master!: GainNode;

  private filterNode!: BiquadFilterNode;

  private chorusDelay!: DelayNode;
  private chorusLFO!: OscillatorNode;
  private chorusLFOGain!: GainNode;
  private chorusDry!: GainNode;
  private chorusWet!: GainNode;
  private chorusFb!: GainNode;
  private chorusSum!: GainNode;

  private reverbConv!: ConvolverNode;
  private reverbDry!: GainNode;
  private reverbWet!: GainNode;
  private reverbSum!: GainNode;
  private lastReverbDecay = NaN;

  private limiter!: DynamicsCompressorNode;

  private delayNode!: DelayNode;
  private delayDry!: GainNode;
  private delayWet!: GainNode;
  private delayFb!: GainNode;
  private delaySum!: GainNode;

  private phaserFilters: BiquadFilterNode[] = [];
  private phaserLFO!: OscillatorNode;
  private phaserLFOGains: GainNode[] = [];
  private phaserDry!: GainNode;
  private phaserWet!: GainNode;
  private phaserFb!: GainNode;
  private phaserInput!: GainNode;
  private phaserOutput!: GainNode;
  private phaserSum!: GainNode;
  private phaserStagesConnected = 0;

  private recorderNode: AudioWorkletNode | null = null;
  private nodes = new Map<string, FormulaNodes>();

  get running(): boolean {
    return this.ctx !== null;
  }

  get analyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  get contextState(): AudioContextState | null {
    return this.ctx ? this.ctx.state : null;
  }

  get sampleRate(): number {
    return this.ctx ? this.ctx.sampleRate : 48000;
  }

  async resume(): Promise<void> {
    if (this.ctx && this.ctx.state === 'suspended') await this.ctx.resume();
  }

  async start(state: EngineState): Promise<void> {
    if (this.ctx) return;

    const ctx = new AudioContext({ latencyHint: 'interactive' });
    // iOS Safari: контекст может создаться в suspended даже по клику
    if (ctx.state === 'suspended') await ctx.resume();
    await ctx.audioWorklet.addModule(workletUrl);
    this.ctx = ctx;

    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 2048;

    this.mixBus = ctx.createGain();
    this.mixBus.gain.value = 1;

    this.filterNode = ctx.createBiquadFilter();

    this.chorusDelay = ctx.createDelay(0.2);
    this.chorusDry = ctx.createGain();
    this.chorusWet = ctx.createGain();
    this.chorusFb = ctx.createGain();
    this.chorusSum = ctx.createGain();
    this.chorusLFO = ctx.createOscillator();
    this.chorusLFOGain = ctx.createGain();
    this.chorusLFO.connect(this.chorusLFOGain);
    this.chorusLFOGain.connect(this.chorusDelay.delayTime);
    this.chorusLFO.start();

    this.reverbConv = ctx.createConvolver();
    this.reverbDry = ctx.createGain();
    this.reverbWet = ctx.createGain();
    this.reverbSum = ctx.createGain();
    this.lastReverbDecay = NaN;

    this.limiter = ctx.createDynamicsCompressor();

    this.delayNode = ctx.createDelay(3.0);
    this.delayDry = ctx.createGain();
    this.delayWet = ctx.createGain();
    this.delayFb = ctx.createGain();
    this.delaySum = ctx.createGain();

    const numPhaserStages = 8; // максимум; реальное число звеньев задаёт fx.phaserStages
    this.phaserFilters = [];
    this.phaserLFOGains = [];
    this.phaserLFO = ctx.createOscillator();
    this.phaserLFO.type = 'sine';
    this.phaserLFO.start();
    for (let i = 0; i < numPhaserStages; i++) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'allpass';
      filter.frequency.value = 1000;
      filter.Q.value = 0.5;
      this.phaserFilters.push(filter);

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 1500;
      this.phaserLFO.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      this.phaserLFOGains.push(lfoGain);
    }
    this.phaserDry = ctx.createGain();
    this.phaserWet = ctx.createGain();
    this.phaserFb = ctx.createGain();
    this.phaserInput = ctx.createGain();
    this.phaserOutput = ctx.createGain();
    this.phaserSum = ctx.createGain();

    this.master = ctx.createGain();
    this.master.gain.value = state.masterGain;

    this.recorderNode = new AudioWorkletNode(ctx, 'recorder-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });

    this.applyFx(state.fx);

    // Генераторы
    for (const f of FORMULAS) {
      const setting = state.formulas[f.id];
      const params: Params = setting ? { ...setting.params } : {};
      const aw = new AudioWorkletNode(ctx, 'formula-generator', {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: { formula: f.id, params, enabled: setting ? setting.enabled : false },
      });
      const g = ctx.createGain();
      g.gain.value = 0;
      aw.connect(g);
      g.connect(this.mixBus);
      this.nodes.set(f.id, { aw, g });

      if (setting) {
        const gain = typeof params.gain === 'number' ? params.gain : 0;
        g.gain.setTargetAtTime(setting.enabled ? gain : 0, ctx.currentTime, GAIN_SMOOTH);
      }
    }
  }

  /** Плавно глушит мастер и закрывает контекст. */
  async stop(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx) return;
    this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.01);
    await new Promise((r) => setTimeout(r, 80));
    try { this.chorusLFO.stop(); } catch { /* уже остановлен */ }
    try { this.phaserLFO.stop(); } catch { /* уже остановлен */ }
    await ctx.close();
    this.ctx = null;
    this.analyserNode = null;
    this.recorderNode = null;
    this.nodes.clear();
  }

  setMasterGain(v: number): void {
    if (this.ctx) this.master.gain.value = v;
  }

  /** Полное применение блока эффектов: роутинг + параметры. */
  applyFx(fx: FxState): void {
    if (!this.ctx) return;
    this.applyRouting(fx);
    this.applyFxParams(fx);
  }

  private applyRouting(fx: FxState): void {
    const ctx = this.ctx;
    if (!ctx || !this.analyserNode) return;

    this.mixBus.disconnect();
    this.filterNode.disconnect();

    this.chorusDry.disconnect(); this.chorusWet.disconnect();
    this.chorusDelay.disconnect(); this.chorusFb.disconnect();
    this.chorusSum.disconnect();

    this.reverbDry.disconnect(); this.reverbWet.disconnect();
    this.reverbConv.disconnect(); this.reverbSum.disconnect();

    this.limiter.disconnect();

    this.delayNode.disconnect(); this.delayDry.disconnect();
    this.delayWet.disconnect(); this.delayFb.disconnect();
    this.delaySum.disconnect();

    this.phaserDry.disconnect(); this.phaserWet.disconnect();
    this.phaserInput.disconnect(); this.phaserOutput.disconnect();
    this.phaserFb.disconnect(); this.phaserSum.disconnect();
    for (const f of this.phaserFilters) f.disconnect();

    this.master.disconnect();
    this.analyserNode.disconnect();

    this.analyserNode.connect(ctx.destination);

    let node: AudioNode = this.mixBus;

    if (fx.filterOn) {
      node.connect(this.filterNode);
      node = this.filterNode;
    }

    if (fx.chorusOn) {
      node.connect(this.chorusDry);
      node.connect(this.chorusDelay);
      this.chorusDelay.connect(this.chorusFb);
      this.chorusFb.connect(this.chorusDelay);
      this.chorusDelay.connect(this.chorusWet);
      this.chorusDry.connect(this.chorusSum);
      this.chorusWet.connect(this.chorusSum);
      node = this.chorusSum;
    }

    if (fx.phaserOn) {
      node.connect(this.phaserDry);
      node.connect(this.phaserInput);
      const stages = Math.max(1, Math.min(this.phaserFilters.length, Math.floor(fx.phaserStages)));
      this.phaserStagesConnected = stages;
      let pNode: AudioNode = this.phaserInput;
      for (let i = 0; i < stages; i++) {
        pNode.connect(this.phaserFilters[i]);
        pNode = this.phaserFilters[i];
      }
      pNode.connect(this.phaserOutput);
      this.phaserOutput.connect(this.phaserFb);
      this.phaserFb.connect(this.phaserInput);
      this.phaserOutput.connect(this.phaserWet);
      this.phaserDry.connect(this.phaserSum);
      this.phaserWet.connect(this.phaserSum);
      node = this.phaserSum;
    }

    if (fx.delayOn) {
      node.connect(this.delayDry);
      node.connect(this.delayNode);
      this.delayNode.connect(this.delayFb);
      this.delayFb.connect(this.delayNode);
      this.delayNode.connect(this.delayWet);
      this.delayDry.connect(this.delaySum);
      this.delayWet.connect(this.delaySum);
      node = this.delaySum;
    }

    if (fx.reverbOn) {
      node.connect(this.reverbDry);
      node.connect(this.reverbConv);
      this.reverbConv.connect(this.reverbWet);
      this.reverbDry.connect(this.reverbSum);
      this.reverbWet.connect(this.reverbSum);
      node = this.reverbSum;
    }

    if (fx.limiterOn) {
      node.connect(this.limiter);
      node = this.limiter;
    }

    node.connect(this.master);
    this.master.connect(this.analyserNode);

    // Рекордер слушает мастер; на выход идёт тишина (иначе звук задвоится),
    // но нода должна быть подключена к destination, чтобы граф её обсчитывал.
    if (this.recorderNode) {
      this.master.connect(this.recorderNode);
      try { this.recorderNode.disconnect(); } catch { /* не был подключён */ }
      const silent = ctx.createGain();
      silent.gain.value = 0;
      this.recorderNode.connect(silent);
      silent.connect(ctx.destination);
    }
  }

  applyFxParams(fx: FxState): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;

    this.filterNode.type = fx.filterType;
    this.filterNode.frequency.setValueAtTime(fx.filterFreq, now);
    this.filterNode.Q.setValueAtTime(fx.filterQ, now);

    const baseMs = fx.chorusMode === 'flanger' ? 2.0 : 12.0;
    this.chorusDelay.delayTime.setValueAtTime(baseMs / 1000, now);
    this.chorusLFO.frequency.setValueAtTime(fx.chorusRate, now);
    this.chorusLFOGain.gain.setValueAtTime(fx.chorusDepth / 1000, now);
    this.chorusDry.gain.setValueAtTime(1 - fx.chorusMix, now);
    this.chorusWet.gain.setValueAtTime(fx.chorusMix, now);
    this.chorusFb.gain.setValueAtTime(fx.chorusFb, now);

    this.reverbDry.gain.setValueAtTime(1 - fx.reverbMix, now);
    this.reverbWet.gain.setValueAtTime(fx.reverbMix, now);
    if (fx.reverbDecay !== this.lastReverbDecay) {
      this.lastReverbDecay = fx.reverbDecay;
      const seconds = Math.min(6.0, Math.max(0.3, fx.reverbDecay * 1.4));
      this.reverbConv.buffer = makeImpulseResponse(ctx, seconds, fx.reverbDecay);
    }

    this.limiter.threshold.setValueAtTime(fx.limiterThr, now);
    this.limiter.ratio.setValueAtTime(20, now);
    this.limiter.attack.setValueAtTime(0.003, now);
    this.limiter.release.setValueAtTime(fx.limiterRel, now);
    this.limiter.knee.setValueAtTime(0, now);

    this.delayNode.delayTime.setValueAtTime(fx.delayTime, now);
    this.delayFb.gain.setValueAtTime(fx.delayFb, now);
    this.delayDry.gain.setValueAtTime(1 - fx.delayMix, now);
    this.delayWet.gain.setValueAtTime(fx.delayMix, now);

    // Смена числа звеньев требует пересборки цепочки
    const stages = Math.max(1, Math.min(this.phaserFilters.length, Math.floor(fx.phaserStages)));
    if (fx.phaserOn && stages !== this.phaserStagesConnected) {
      this.applyRouting(fx);
    }
    this.phaserLFO.frequency.setValueAtTime(fx.phaserRate, now);
    this.phaserFb.gain.setValueAtTime(fx.phaserFb, now);
    this.phaserDry.gain.setValueAtTime(1 - fx.phaserMix, now);
    this.phaserWet.gain.setValueAtTime(fx.phaserMix, now);
    const freqRange = 3000 * fx.phaserDepth;
    for (let i = 0; i < this.phaserFilters.length; i++) {
      this.phaserFilters[i].frequency.setValueAtTime(1000, now);
      this.phaserLFOGains[i].gain.setValueAtTime(freqRange, now);
    }
  }

  setFormulaEnabled(id: string, enabled: boolean, gain: number): void {
    const ctx = this.ctx;
    const st = this.nodes.get(id);
    if (!ctx || !st) return;
    st.aw.port.postMessage({ type: 'enabled', enabled });
    st.g.gain.setTargetAtTime(enabled ? gain : 0, ctx.currentTime, GAIN_SMOOTH);
  }

  setFormulaParam(id: string, key: string, value: number, enabled: boolean): void {
    const ctx = this.ctx;
    const st = this.nodes.get(id);
    if (!ctx || !st) return;
    st.aw.port.postMessage({ type: 'set', params: { [key]: value } });
    if (key === 'gain' && enabled) {
      st.g.gain.setTargetAtTime(value, ctx.currentTime, GAIN_SMOOTH);
    }
  }

  resetFormula(id: string): void {
    this.nodes.get(id)?.aw.port.postMessage({ type: 'reset' });
  }

  /** Живое применение целого состояния (после загрузки пресета/URL). */
  applyState(state: EngineState): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.master.gain.value = state.masterGain;
    this.applyFx(state.fx);
    for (const f of FORMULAS) {
      const st = this.nodes.get(f.id);
      const setting = state.formulas[f.id];
      if (!st || !setting) continue;
      st.aw.port.postMessage({ type: 'set', params: setting.params });
      st.aw.port.postMessage({ type: 'enabled', enabled: setting.enabled });
      const gain = typeof setting.params.gain === 'number' ? setting.params.gain : 0;
      st.g.gain.setTargetAtTime(setting.enabled ? gain : 0, ctx.currentTime, GAIN_SMOOTH);
    }
  }

  startRecording(): void {
    this.recorderNode?.port.postMessage({ type: 'start' });
  }

  stopRecording(): Promise<Float32Array> {
    const rec = this.recorderNode;
    if (!rec) return Promise.resolve(new Float32Array(0));
    const samples = new Promise<Float32Array>((resolve) => {
      rec.port.onmessage = (e: MessageEvent) => {
        const msg: unknown = e.data;
        if (typeof msg !== 'object' || msg === null) return;
        const recMsg: Record<string, unknown> = { ...msg };
        if (recMsg.type === 'data' && recMsg.samples instanceof Float32Array) {
          resolve(recMsg.samples);
        }
      };
    });
    rec.port.postMessage({ type: 'stop' });
    return samples;
  }
}
