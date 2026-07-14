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
      masterGain: 0.75,
      fx: {
        // ...DEFAULT_FX бэкфиллит любые будущие поля FxState; ниже — курируемые
        // значения этого пресета (перекрывают дефолты).
        ...DEFAULT_FX,
        filterOn: true, filterType: 'lowpass', filterFreq: 3400, filterQ: 6.3, filterGain: 0, filterVowel: 0, filterCombFb: 0.5,
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
      masterGain: 0.75,
      fx: {
        ...DEFAULT_FX,
        filterOn: true, filterType: 'lowpass', filterFreq: 2000, filterQ: 6.3, filterGain: 0, filterVowel: 0, filterCombFb: 0.5,
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
      masterGain: 0.75,
      fx: {
        ...DEFAULT_FX,
        filterOn: true, filterType: 'lowpass', filterFreq: 2000, filterQ: 10.3, filterGain: 0, filterVowel: 0, filterCombFb: 0.5,
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
      masterGain: 0.75,
      fx: {
        ...DEFAULT_FX,
        filterOn: true, filterType: 'lowpass', filterFreq: 285, filterQ: 13.3, filterGain: 0, filterVowel: 0, filterCombFb: 0.5,
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
      masterGain: 0.75,
      fx: {
        ...DEFAULT_FX,
        filterOn: true, filterType: 'lowpass', filterFreq: 2000, filterQ: 0.7, filterGain: 0, filterVowel: 0, filterCombFb: 0.5,
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
    name: 'Whale talks (mod)',
    state: {
      v: 3,
      masterGain: 0.75,
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
      masterGain: 0.75,
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
  {
    // Пышный аддитивный пад: медленный дрейф основного тона (в октавах) +
    // «дыхание» гармонической анимации (move) и плавно гуляющее число гармоник.
    name: 'Aurora pad (mod)',
    state: {
      v: 3,
      masterGain: 0.75,
      fx: {
        ...DEFAULT_FX,
        filterOn: true, filterType: 'lowpass', filterFreq: 1800, filterQ: 0.7,
        chorusOn: true, chorusMode: 'chorus', chorusRate: 0.08, chorusDepth: 8, chorusMix: 0.4, chorusFb: 0.3,
        reverbOn: true, reverbDecay: 4.5, reverbMix: 0.48,
        limiterOn: true,
      },
      formulas: {
        additive: { enabled: true, params: { gain: 0.75, fund: 82, N: 16, move: 0.3 } },
      },
      mod: {
        lfos: [
          { shape: 'sine', rate: 0.04, phase: 0 },
          { shape: 'sine', rate: 0.11, phase: 0.3 },
          { shape: 'triangle', rate: 0.07, phase: 0 },
        ],
        routes: [
          { src: 0, formula: 'additive', param: 'fund', depth: 0.12, exp: true },
          { src: 1, formula: 'additive', param: 'move', depth: 0.5 },
          { src: 2, formula: 'additive', param: 'N', depth: 0.3 },
        ],
      },
    },
  },
  {
    // Хаос Лоренца, чей центр высоты медленно дрейфует (в октавах), а размах
    // частоты «дышит» вторым LFO — генеративная текстура, которая никогда не
    // повторяется, но остаётся тональной.
    name: 'Wandering Lorenz (mod)',
    state: {
      v: 3,
      masterGain: 0.75,
      fx: {
        ...DEFAULT_FX,
        filterOn: true, filterType: 'lowpass', filterFreq: 1600, filterQ: 0.9,
        reverbOn: true, reverbDecay: 4, reverbMix: 0.42,
        delayOn: true, delayTime: 0.45, delayFb: 0.3, delayMix: 0.25,
        limiterOn: true,
      },
      formulas: {
        lorenz: { enabled: true, params: { gain: 0.75, sigma: 10, rho: 28, beta: 2.6667, lBase: 120, lFreqScale: 40, lAmp: 0.25 } },
      },
      mod: {
        lfos: [
          { shape: 'sine', rate: 0.035, phase: 0 },
          { shape: 'sine', rate: 0.09, phase: 0.5 },
          { shape: 'triangle', rate: 0.06, phase: 0 },
        ],
        routes: [
          { src: 0, formula: 'lorenz', param: 'lBase', depth: 0.18, exp: true },
          { src: 1, formula: 'lorenz', param: 'lFreqScale', depth: 0.5 },
        ],
      },
    },
  },
  {
    // Капли в гулкой пещере: редкие резонансные «плинки», чья частота и
    // плотность медленно гуляют двумя LFO (как накаты у Ocean).
    name: 'Cave drips (mod)',
    state: {
      v: 3,
      masterGain: 0.75,
      fx: {
        ...DEFAULT_FX,
        filterOn: true, filterType: 'lowpass', filterFreq: 2400, filterQ: 0.7,
        reverbOn: true, reverbDecay: 5, reverbMix: 0.55,
        delayOn: true, delayTime: 0.5, delayFb: 0.4, delayMix: 0.3,
        limiterOn: true,
      },
      formulas: {
        rain: { enabled: true, params: { gain: 0.4, rainDensity: 3, rainPitch: 1100, rainBed: 0.1 } },
      },
      mod: {
        lfos: [
          { shape: 'sine', rate: 0.05, phase: 0 },
          { shape: 'triangle', rate: 0.03, phase: 0 },
          { shape: 'sine', rate: 0.09, phase: 0.4 },
        ],
        routes: [
          { src: 0, formula: 'rain', param: 'rainDensity', depth: 0.3 },
          { src: 1, formula: 'rain', param: 'rainPitch', depth: 0.3, exp: true },
        ],
      },
    },
  },
  // --- Демо фильтров (phase: filters) ---
  {
    // Formant-фильтр на гармоническом паде: «гласная» окраска → хоровой,
    // вокальный тембр; генератор медленно дрейфует высотой (LFO).
    name: 'Vowel choir (formant)',
    state: {
      v: 3,
      masterGain: 0.75,
      fx: {
        ...DEFAULT_FX,
        filterOn: true, filterType: 'formant', filterVowel: 0.25, filterQ: 2, filterFreq: 1000,
        reverbOn: true, reverbDecay: 3.8, reverbMix: 0.42,
        limiterOn: true,
      },
      formulas: {
        additive: { enabled: true, params: { gain: 0.28, fund: 130, N: 14, move: 0.3 } },
      },
      mod: {
        lfos: [
          { shape: 'sine', rate: 0.06, phase: 0 },
          { shape: 'sine', rate: 0.1, phase: 0.3 },
          { shape: 'triangle', rate: 0.04, phase: 0 },
        ],
        routes: [
          { src: 0, formula: 'additive', param: 'fund', depth: 0.1, exp: true },
          { src: 1, formula: 'additive', param: 'move', depth: 0.4 },
        ],
      },
    },
  },
  {
    // Морской шум сквозь медленный фленджер → воющий ветер / прибой с
    // «гребёнчатыми» накатами. Статичный (океан уже дышит сам).
    name: 'Wind flanger',
    state: {
      v: 3,
      masterGain: 0.75,
      fx: {
        ...DEFAULT_FX,
        filterOn: true, filterType: 'lowpass', filterFreq: 1200, filterQ: 0.7,
        chorusOn: true, chorusMode: 'flanger', chorusRate: 0.08, chorusDepth: 6, chorusMix: 0.55, chorusFb: 0.75,
        reverbOn: true, reverbDecay: 4, reverbMix: 0.4,
        limiterOn: true,
      },
      formulas: {
        ocean: { enabled: true, params: { gain: 0.5, oceanRate: 0.1, oceanCut: 700, oceanDepth: 0.8 } },
      },
    },
  },
];
