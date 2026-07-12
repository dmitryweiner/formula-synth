// Встроенные пресеты — кураторские саундскейпы.
import type { AppState } from './state/schema';
import { DEFAULT_FX } from './state/schema';

export interface Preset {
  name: string;
  state: AppState;
}

export const PRESETS: Preset[] = [
  {
    name: 'Stillness meditation',
    state: {
      v: 3,
      masterGain: 0.514,
      fx: {
        filterOn: true, filterType: 'lowpass', filterFreq: 3400, filterQ: 6.3,
        chorusOn: true, chorusMode: 'chorus', chorusRate: 0.01, chorusDepth: 8.4,
        chorusMix: 0.35, chorusFb: 0.95,
        reverbOn: true, reverbDecay: 3.2, reverbMix: 0.5,
        limiterOn: true, limiterThr: -12, limiterRel: 0.15,
        delayOn: true, delayTime: 0.63, delayFb: 0.62, delayMix: 0.3,
        phaserOn: true, phaserRate: 0.47, phaserDepth: 0.59, phaserStages: 4,
        phaserFb: 0.62, phaserMix: 0.22,
      },
      formulas: {
        additive: { enabled: true, params: { gain: 0.474, fund: 57, N: 12, move: 0.35 } },
        rossler: {
          enabled: true,
          params: { gain: 0.169, rossA: 0.181, rossB: 0.238, rossC: 6.42, rossBase: 345, rossFreqScale: 38.4, rossAmp: 0.25 },
        },
      },
    },
  },
  {
    name: 'Waiting for the subway',
    state: {
      v: 3,
      masterGain: 0.514,
      fx: {
        filterOn: true, filterType: 'lowpass', filterFreq: 2000, filterQ: 6.3,
        chorusOn: true, chorusMode: 'flanger', chorusRate: 0.98, chorusDepth: 5.7,
        chorusMix: 0.68, chorusFb: 0.45,
        reverbOn: true, reverbDecay: 3.2, reverbMix: 1,
        limiterOn: true, limiterThr: -12, limiterRel: 0.15,
        delayOn: false, delayTime: 1.77, delayFb: 0.62, delayMix: 1,
        phaserOn: false, phaserRate: 5.25, phaserDepth: 0.38, phaserStages: 4,
        phaserFb: 0.62, phaserMix: 0.22,
      },
      formulas: {
        additive: { enabled: true, params: { gain: 0.255, fund: 200, N: 5, move: 3.94 } },
        lorenz: {
          enabled: true,
          params: { gain: 0.498, sigma: 10, rho: 24.51, beta: 2.6667, lBase: 192, lFreqScale: 40, lAmp: 0.25 },
        },
        noiselp: { enabled: true, params: { gain: 0.081, nCut: 2085 } },
      },
    },
  },
  {
    name: 'Inside the nuclear power plant',
    state: {
      v: 3,
      masterGain: 0.536,
      fx: {
        filterOn: true, filterType: 'lowpass', filterFreq: 2000, filterQ: 10.3,
        chorusOn: true, chorusMode: 'flanger', chorusRate: 0.15, chorusDepth: 0.6,
        chorusMix: 0.28, chorusFb: 0.88,
        reverbOn: true, reverbDecay: 8, reverbMix: 0.36,
        limiterOn: true, limiterThr: -12, limiterRel: 0.15,
        delayOn: false, delayTime: 1.77, delayFb: 0.62, delayMix: 1,
        phaserOn: false, phaserRate: 5.25, phaserDepth: 0.38, phaserStages: 8,
        phaserFb: 0.62, phaserMix: 0.22,
      },
      formulas: {
        additive: { enabled: true, params: { gain: 0.529, fund: 110, N: 19, move: 2.5 } },
      },
    },
  },
  {
    name: 'Long journey on the helicopter',
    state: {
      v: 3,
      masterGain: 0.585,
      fx: {
        filterOn: true, filterType: 'lowpass', filterFreq: 285, filterQ: 13.3,
        chorusOn: true, chorusMode: 'flanger', chorusRate: 0.13, chorusDepth: 1.2,
        chorusMix: 0.65, chorusFb: 0.8,
        reverbOn: false, reverbDecay: 5.5, reverbMix: 0.36,
        limiterOn: true, limiterThr: -12, limiterRel: 0.15,
        delayOn: false, delayTime: 1.77, delayFb: 0.62, delayMix: 1,
        phaserOn: false, phaserRate: 4.19, phaserDepth: 0.59, phaserStages: 4,
        phaserFb: 0.62, phaserMix: 0.22,
      },
      formulas: {
        additive: { enabled: true, params: { gain: 0.733, fund: 56, N: 23, move: 2.5 } },
        rossler: {
          enabled: true,
          params: { gain: 0.458, rossA: 0.085, rossB: 0.472, rossC: 7.06, rossBase: 51, rossFreqScale: 100, rossAmp: 0.605 },
        },
        velvetnoise: { enabled: true, params: { gain: 0.883, velvetDensity: 2000 } },
      },
    },
  },
  {
    name: 'Abandoned shrine',
    state: {
      v: 3,
      masterGain: 0.25,
      fx: {
        filterOn: true, filterType: 'lowpass', filterFreq: 2000, filterQ: 0.7,
        chorusOn: true, chorusMode: 'chorus', chorusRate: 0.01, chorusDepth: 6.6,
        chorusMix: 0.35, chorusFb: 0.95,
        reverbOn: true, reverbDecay: 2.8, reverbMix: 0.25,
        limiterOn: true, limiterThr: -12, limiterRel: 0.15,
        delayOn: false, delayTime: 0.35, delayFb: 0.4, delayMix: 0.3,
        phaserOn: false, phaserRate: 0.5, phaserDepth: 0.7, phaserStages: 4,
        phaserFb: 0.3, phaserMix: 0.5,
      },
      formulas: {
        additive: { enabled: true, params: { gain: 0.526, fund: 57, N: 12, move: 0.35 } },
        lorenz: {
          enabled: true,
          params: { gain: 0.293, sigma: 10, rho: 28, beta: 2.6667, lBase: 120, lFreqScale: 40, lAmp: 0.25 },
        },
        noiselp: { enabled: true, params: { gain: 0.1, nCut: 800 } },
      },
    },
  },
  // --- Демо матрицы модуляции (phase 5) ---
  {
    // Периодические LFO: медленный дрейф высоты (в октавах) + «дыхание» тембра.
    name: 'Tidal drift (mod)',
    state: {
      v: 3,
      masterGain: 0.4,
      fx: {
        ...DEFAULT_FX,
        filterOn: true, filterType: 'lowpass', filterFreq: 1400, filterQ: 0.8,
        reverbOn: true, reverbDecay: 3.6, reverbMix: 0.42,
        limiterOn: true,
      },
      formulas: {
        fm: { enabled: true, params: { gain: 0.18, fc: 220, fm: 2, I: 4 } },
      },
      mod: {
        lfos: [
          { shape: 'sine', rate: 0.05, phase: 0 },
          { shape: 'sine', rate: 0.13, phase: 0.25 },
          { shape: 'triangle', rate: 0.08, phase: 0 },
        ],
        routes: [
          { src: 0, formula: 'fm', param: 'fc', depth: 0.15, exp: true },
          { src: 1, formula: 'fm', param: 'I', depth: 0.6 },
        ],
      },
    },
  },
  {
    // Sample & Hold: случайный источник «переступает» высоту колокола почти
    // на каждый удар — генеративная звонница; медленная синусоида ведёт тембр.
    name: 'Generative bells (S&H)',
    state: {
      v: 3,
      masterGain: 0.45,
      fx: {
        ...DEFAULT_FX,
        reverbOn: true, reverbDecay: 5, reverbMix: 0.5,
        delayOn: true, delayTime: 0.5, delayFb: 0.35, delayMix: 0.3,
        limiterOn: true,
      },
      formulas: {
        bell: { enabled: true, params: { gain: 0.3, bellF0: 320, bellRatio: 1.4, bellIndex: 4, bellDecay: 3, bellPeriod: 4 } },
      },
      mod: {
        lfos: [
          { shape: 'random', rate: 0.25, phase: 0 },
          { shape: 'sine', rate: 0.07, phase: 0 },
          { shape: 'triangle', rate: 0.03, phase: 0 },
        ],
        routes: [
          { src: 0, formula: 'bell', param: 'bellF0', depth: 0.4, exp: true },
          { src: 1, formula: 'bell', param: 'bellIndex', depth: 0.5 },
        ],
      },
    },
  },
];
