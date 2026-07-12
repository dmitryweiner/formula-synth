// Встроенные пресеты — кураторские саундскейпы.
import type { AppState } from './state/schema';

export interface Preset {
  name: string;
  state: AppState;
}

export const PRESETS: Preset[] = [
  {
    name: 'Stillness meditation',
    state: {
      v: 2,
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
      v: 2,
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
      v: 2,
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
      v: 2,
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
      v: 2,
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
];
