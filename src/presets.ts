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
  // --- Демо модуляции FX (LFO → фильтр/эффекты) ---
  {
    // Всё дышит и плывёт: LFO гоняет cutoff фильтра на всю октавную ширину
    // («вау»/свип), второй раскачивает скорость фейзера, третий — «дыхание»
    // реверб-хвоста, а S&H ступенчато дёргает резонанс. Максимально «кислотная»
    // витрина FX-модуляции — четыре LFO работают одновременно (только по FX,
    // высота пада статична).
    name: 'Psychedelic melt (FX mod)',
    state: {
      v: 3,
      masterGain: 0.7,
      fx: {
        ...DEFAULT_FX,
        filterOn: true, filterType: 'lowpass', filterFreq: 500, filterQ: 6,
        phaserOn: true, phaserRate: 0.4, phaserDepth: 0.8, phaserStages: 6, phaserFb: 0.6, phaserMix: 0.6,
        delayOn: true, delayTime: 0.4, delayFb: 0.5, delayMix: 0.35,
        reverbOn: true, reverbDecay: 4.5, reverbMix: 0.4,
        limiterOn: true,
      },
      formulas: {
        additive: { enabled: true, params: { gain: 0.5, fund: 65, N: 18, move: 0.4 } },
        fm: { enabled: true, params: { gain: 0.12, fc: 330, fm: 3, I: 5 } },
      },
      mod: {
        lfos: [
          { shape: 'sine', rate: 0.08, phase: 0 },
          { shape: 'sine', rate: 0.2, phase: 0.25 },
          { shape: 'triangle', rate: 0.05, phase: 0 },
          { shape: 'random', rate: 0.15, phase: 0 },
        ],
        routes: [
          { src: 0, formula: 'fx', param: 'filterFreq', depth: 0.85, exp: true },
          { src: 1, formula: 'fx', param: 'phaserRate', depth: 0.6, exp: true },
          { src: 2, formula: 'fx', param: 'reverbMix', depth: 0.4 },
          { src: 3, formula: 'fx', param: 'filterQ', depth: 0.5 },
        ],
      },
    },
  },
  {
    // «Космический полёт»: бесконечно восходящий тон Шепарда (иллюзия вечного
    // подъёма — сам «полёт») поверх низкого гармонического дрона и мерцающей FM.
    // Вся FX-цепь дышит: сверхмедленный LFO гоняет cutoff на всю октавную ширину
    // (пролёт сквозь туманности), треугольник тянет ВРЕМЯ дилея — эхо
    // «варпит»/питчится по-доплеровски, третий LFO разгоняет свирл фейзера и
    // раскрывает реверб-хвост (пространство то распахивается, то схлопывается),
    // а S&H ступенчато дёргает резонанс и хвост эха. Психоделика, но не
    // «кислотный размаз», а холодный дрейф в вакууме. Семь маршрутов, 4 LFO.
    name: 'Space journey (FX mod)',
    state: {
      v: 3,
      masterGain: 0.72,
      fx: {
        ...DEFAULT_FX,
        filterOn: true, filterType: 'lowpass', filterFreq: 420, filterQ: 5,
        chorusOn: true, chorusMode: 'chorus', chorusRate: 0.12, chorusDepth: 9, chorusMix: 0.4, chorusFb: 0.3,
        phaserOn: true, phaserRate: 0.3, phaserDepth: 0.75, phaserStages: 8, phaserFb: 0.55, phaserMix: 0.55,
        delayOn: true, delayTime: 0.6, delayFb: 0.45, delayMix: 0.4,
        reverbOn: true, reverbDecay: 6.5, reverbMix: 0.45,
        limiterOn: true,
      },
      formulas: {
        additive: { enabled: true, params: { gain: 0.55, fund: 44, N: 24, move: 0.6 } },
        shepard: { enabled: true, params: { gain: 0.22, shepBase: 40, shepSpeed: 0.06, shepOctaves: 7 } },
        fm: { enabled: true, params: { gain: 0.16, fc: 110, fm: 1.5, I: 8 } },
      },
      mod: {
        lfos: [
          { shape: 'sine', rate: 0.05, phase: 0 },
          { shape: 'triangle', rate: 0.037, phase: 0.5 },
          { shape: 'sine', rate: 0.11, phase: 0.25 },
          { shape: 'random', rate: 0.08, phase: 0 },
        ],
        routes: [
          // depth подобран так, чтобы ПОЛ свипа был ~92 Гц (не 20-герцовый
          // кламп): LP ниже фундаменталов глушил бы всё в ноль, а «полёт»
          // должен длиться непрерывной лентой. Потолок ~1.9 кГц сохранён.
          { src: 0, formula: 'fx', param: 'filterFreq', depth: 0.33, exp: true },
          { src: 0, formula: 'fx', param: 'chorusDepth', depth: 0.4 },
          { src: 1, formula: 'fx', param: 'delayTime', depth: 0.4, exp: true },
          { src: 2, formula: 'fx', param: 'phaserRate', depth: 0.6, exp: true },
          { src: 2, formula: 'fx', param: 'reverbMix', depth: 0.35 },
          { src: 3, formula: 'fx', param: 'filterQ', depth: 0.5 },
          { src: 3, formula: 'fx', param: 'delayFb', depth: 0.25 },
        ],
      },
    },
  },
  {
    // «Поливокс»: жирный тягучий дрон в духе советского аналога. Пила из
    // суммы 30 гармоник на низком фундаменте + расстроенная пара (медленные
    // биения = «два VCO») + tanh-сатурация (рык серого металлического ящика)
    // + тихий brown noise (тёмный неровный гул — «шум блока питания»).
    // Звезда — резонансный LP: сверхмедленный LFO тянет cutoff по низам,
    // треугольник «дышит» резонансом (фирменный нестабильный фильтр).
    // Частоты LFO взаимно иррациональны (0.019/0.031/0.047/0.029) — общий
    // узор НЕ повторяется никогда, дрон вечно эволюционирует: дрейфует высота
    // сатурированного голоса (dist.fd, ±⅓ октавы), плывёт скорость биений
    // (beats.df), S&H раз в ~35 с ступенчато меняет злость сатурации, скорость
    // движения гармоник и хвост эха. Всё ≤0.05 Гц — вязко и загадочно.
    name: 'Polivoks drone (FX mod)',
    state: {
      v: 3,
      masterGain: 0.72,
      fx: {
        ...DEFAULT_FX,
        filterOn: true, filterType: 'lowpass', filterFreq: 300, filterQ: 8,
        chorusOn: true, chorusMode: 'chorus', chorusRate: 0.05, chorusDepth: 12, chorusMix: 0.5, chorusFb: 0.35,
        delayOn: true, delayTime: 1.3, delayFb: 0.5, delayMix: 0.35,
        reverbOn: true, reverbDecay: 6.5, reverbMix: 0.4,
        limiterOn: true,
      },
      formulas: {
        additive: { enabled: true, params: { gain: 0.5, fund: 55, N: 30, move: 0.12 } },
        beats: { enabled: true, params: { gain: 0.3, fbeat: 55, df: 0.7 } },
        dist: { enabled: true, params: { gain: 0.14, fd: 110, alpha: 4 } },
        brownnoise: { enabled: true, params: { gain: 0.05, brownStep: 0.008 } },
      },
      mod: {
        lfos: [
          { shape: 'sine', rate: 0.019, phase: 0 },
          { shape: 'triangle', rate: 0.031, phase: 0.5 },
          { shape: 'sine', rate: 0.047, phase: 0.25 },
          { shape: 'random', rate: 0.029, phase: 0 },
        ],
        routes: [
          // depth ограничен: пол свипа ~69 Гц (выше фундаментала 55 Гц) —
          // дрон «дышит» фильтром, но никогда не затухает в ноль (сплошная
          // лента звука). При 0.8 LFO клампил cutoff в 20 Гц → тишина.
          { src: 0, formula: 'fx', param: 'filterFreq', depth: 0.32, exp: true },
          { src: 1, formula: 'fx', param: 'filterQ', depth: 0.5 },
          { src: 1, formula: 'beats', param: 'df', depth: 0.05 },
          { src: 2, formula: 'fx', param: 'chorusDepth', depth: 0.4 },
          { src: 2, formula: 'fx', param: 'reverbMix', depth: 0.35 },
          { src: 2, formula: 'dist', param: 'fd', depth: 0.05, exp: true },
          { src: 3, formula: 'dist', param: 'alpha', depth: 0.3 },
          { src: 3, formula: 'additive', param: 'move', depth: 0.08 },
          { src: 3, formula: 'fx', param: 'delayFb', depth: 0.2 },
        ],
      },
    },
  },
  {
    // «Переливающиеся ленты»: жирный дрон (пила из 26 гармоник + расстроенная
    // пара на 49 Гц) и две «ленты» поверх — quasi (плавно блуждающий по высоте
    // голос) и pm (водянистое мерцание). Их высоты качают РАЗНЫЕ медленные LFO
    // в противофазе — ленты плетутся навстречу и перекрещиваются. Переливание
    // красок — peaking-фильтр: он НЕ режет жир (пропускает весь спектр), а
    // водит по дрону светящуюся полосу +10 dB, у которой дышит и яркость
    // (filterGain). Хорус утолщает, медленный 8-звенный фейзер лакирует,
    // S&H раз в ~32 с меняет характер блуждания ленты (quasi.wq) и внутреннее
    // движение гармоник. Частоты LFO взаимно иррациональны — узор не
    // повторяется. Всё ≤0.06 Гц, лента сплошная: peaking не глушит в ноль.
    name: 'Iridescent ribbons (FX mod)',
    state: {
      v: 3,
      masterGain: 0.72,
      fx: {
        ...DEFAULT_FX,
        filterOn: true, filterType: 'peaking', filterFreq: 800, filterQ: 4, filterGain: 8,
        chorusOn: true, chorusMode: 'chorus', chorusRate: 0.07, chorusDepth: 10, chorusMix: 0.45, chorusFb: 0.3,
        phaserOn: true, phaserRate: 0.15, phaserDepth: 0.6, phaserStages: 8, phaserFb: 0.4, phaserMix: 0.4,
        delayOn: true, delayTime: 1.1, delayFb: 0.45, delayMix: 0.3,
        reverbOn: true, reverbDecay: 6, reverbMix: 0.4,
        limiterOn: true,
      },
      formulas: {
        additive: { enabled: true, params: { gain: 0.55, fund: 49, N: 26, move: 0.25 } },
        beats: { enabled: true, params: { gain: 0.32, fbeat: 49, df: 0.5 } },
        quasi: { enabled: true, params: { gain: 0.13, fq: 200, Aq: 130, wq: 0.3 } },
        pm: { enabled: true, params: { gain: 0.1, f: 220, f2pm: 0.3 } },
      },
      mod: {
        lfos: [
          { shape: 'sine', rate: 0.023, phase: 0 },
          { shape: 'triangle', rate: 0.041, phase: 0.5 },
          { shape: 'sine', rate: 0.059, phase: 0.25 },
          { shape: 'random', rate: 0.031, phase: 0 },
        ],
        routes: [
          // Светящаяся полоса peaking скользит по дрону (~130…2000 Гц) и
          // дышит яркостью; жир не страдает — peaking пропускает весь спектр.
          { src: 0, formula: 'fx', param: 'filterFreq', depth: 0.4, exp: true },
          { src: 1, formula: 'fx', param: 'filterGain', depth: 0.2 },
          // Ленты: высоты quasi и pm качаются разными LFO — плетутся навстречу.
          { src: 1, formula: 'quasi', param: 'fq', depth: 0.15, exp: true },
          { src: 2, formula: 'pm', param: 'f', depth: 0.1, exp: true },
          { src: 2, formula: 'fx', param: 'chorusDepth', depth: 0.35 },
          { src: 0, formula: 'fx', param: 'reverbMix', depth: 0.3 },
          // S&H: характер блуждания ленты и внутренняя жизнь дрона.
          { src: 3, formula: 'quasi', param: 'wq', depth: 0.1 },
          { src: 3, formula: 'additive', param: 'move', depth: 0.08 },
          { src: 3, formula: 'fx', param: 'phaserFb', depth: 0.2 },
        ],
      },
    },
  },
  {
    // «Ткацкий станок»: пресет, РИСУЮЩИЙ узоры на спектрограмме. Основа — та
    // же пульсирующая пряжа (пила 28 гармоник + биения на 55 Гц: красные
    // «стежки» внизу водопада). Новые карандаши: FM-веера — LFO качает индекс
    // модуляции, и боковые полосы (fc=440 ± n·55 — решётка, выровненная с
    // дроном!) раскрываются и складываются веером; тон Шепарда тихой сеткой
    // диагоналей ползёт сквозь весь спектр, причём S&H изредка МЕНЯЕТ ему
    // направление (shepSpeed через ноль — сетка то восходит, то ниспадает);
    // comb-фильтр — движущаяся гребёнка: её пики скользят поперёк гармоник
    // дрона и ткут муар (feedback-comb, провалы мягкие — жир не страдает).
    // Частоты LFO взаимно иррациональны, узор не повторяется. Лента сплошная.
    name: 'Harmonic loom (FX mod)',
    state: {
      v: 3,
      masterGain: 0.72,
      fx: {
        ...DEFAULT_FX,
        filterOn: true, filterType: 'comb', filterFreq: 220, filterCombFb: 0.65,
        chorusOn: true, chorusMode: 'chorus', chorusRate: 0.06, chorusDepth: 8, chorusMix: 0.4, chorusFb: 0.3,
        phaserOn: true, phaserRate: 0.12, phaserDepth: 0.65, phaserStages: 8, phaserFb: 0.45, phaserMix: 0.45,
        delayOn: true, delayTime: 0.8, delayFb: 0.4, delayMix: 0.25,
        reverbOn: true, reverbDecay: 5.5, reverbMix: 0.35,
        limiterOn: true,
      },
      formulas: {
        additive: { enabled: true, params: { gain: 0.65, fund: 55, N: 28, move: 0.2 } },
        beats: { enabled: true, params: { gain: 0.4, fbeat: 55, df: 0.6 } },
        fm: { enabled: true, params: { gain: 0.16, fc: 440, fm: 55, I: 6 } },
        shepard: { enabled: true, params: { gain: 0.09, shepBase: 60, shepSpeed: 0.03, shepOctaves: 7 } },
      },
      mod: {
        lfos: [
          { shape: 'sine', rate: 0.017, phase: 0 },
          { shape: 'triangle', rate: 0.043, phase: 0.5 },
          { shape: 'sine', rate: 0.061, phase: 0.25 },
          { shape: 'random', rate: 0.027, phase: 0 },
        ],
        routes: [
          // Гребёнка скользит (~80…600 Гц): пики comb пересекают решётку
          // гармоник дрона — муар. Пол не 20 Гц: провалы comb неглубокие.
          { src: 0, formula: 'fx', param: 'filterFreq', depth: 0.22, exp: true },
          { src: 0, formula: 'fx', param: 'reverbMix', depth: 0.25 },
          // Веера: индекс FM дышит 0…13 — боковые полосы раскрываются и
          // складываются; центр веера медленно дрейфует на ±полоктавы.
          { src: 1, formula: 'fm', param: 'I', depth: 0.35 },
          { src: 1, formula: 'fx', param: 'filterCombFb', depth: 0.15 },
          { src: 2, formula: 'fm', param: 'fc', depth: 0.08, exp: true },
          { src: 2, formula: 'fx', param: 'chorusDepth', depth: 0.35 },
          // S&H раз в ~37 с: сетка Шепарда меняет направление (через ноль),
          // пряжа — скорость движения, эхо — длину хвоста.
          { src: 3, formula: 'shepard', param: 'shepSpeed', depth: 0.1 },
          { src: 3, formula: 'additive', param: 'move', depth: 0.08 },
          { src: 3, formula: 'fx', param: 'delayFb', depth: 0.2 },
        ],
      },
    },
  },
  {
    // «Серебряное кружево»: тот же тканый стиль, что Harmonic loom, но на
    // октаву выше, светлее и тоньше. ВСЁ сидит на гармонической решётке
    // 110 Гц и НЕПРЕРЫВНО — без перкуссии. (Пробовали: колокол Риссе — его
    // партиалы негармоничны по построению и трутся с дроном, в прозрачном
    // регистре не маскируется; FM-колокол — гармоничен при ratio 2, но его
    // мгновенная атака «бьёт» сквозь тонкую ткань.) Пряжа — пила 22 гармоник
    // + лёгкие биения; FM-веер на 880 Гц дышит индексом; нить quasi мягко
    // качается вокруг 440 Гц (4-я гармоника; фазовый аккумулятор — модуляция
    // без разрывов). Peaking +6 dB бродит по верхней середине (жир не
    // режется), 6-звенный фейзер выгибает арки, его скорость плывёт LFO —
    // кривизна арок гуляет. S&H-цели только «ступенько-безопасные»: НЕ
    // additive.move / rissF0 — их ступенька рвёт фазу (sin(2π·param·t)) и
    // щёлкает; quasi.wq безопасен (шаг частоты через аккумулятор, не фазы).
    // LFO взаимно иррациональны; лента сплошная (peaking ничего не глушит).
    name: 'Silver lace (FX mod)',
    state: {
      v: 3,
      masterGain: 0.72,
      fx: {
        ...DEFAULT_FX,
        filterOn: true, filterType: 'peaking', filterFreq: 1400, filterQ: 2, filterGain: 6,
        chorusOn: true, chorusMode: 'chorus', chorusRate: 0.08, chorusDepth: 6, chorusMix: 0.35, chorusFb: 0.25,
        phaserOn: true, phaserRate: 0.18, phaserDepth: 0.55, phaserStages: 6, phaserFb: 0.3, phaserMix: 0.35,
        delayOn: true, delayTime: 0.55, delayFb: 0.35, delayMix: 0.25,
        reverbOn: true, reverbDecay: 5, reverbMix: 0.45,
        limiterOn: true,
      },
      formulas: {
        additive: { enabled: true, params: { gain: 0.58, fund: 110, N: 22, move: 0.3 } },
        beats: { enabled: true, params: { gain: 0.3, fbeat: 110, df: 0.8 } },
        fm: { enabled: true, params: { gain: 0.16, fc: 880, fm: 55, I: 4 } },
        quasi: { enabled: true, params: { gain: 0.12, fq: 440, Aq: 60, wq: 0.4 } },
      },
      mod: {
        lfos: [
          { shape: 'sine', rate: 0.021, phase: 0 },
          { shape: 'triangle', rate: 0.037, phase: 0.5 },
          { shape: 'sine', rate: 0.053, phase: 0.25 },
          { shape: 'random', rate: 0.033, phase: 0 },
        ],
        routes: [
          // Глоу бродит ~280 Гц…2 кГц — подсвечивает то пряжу, то кружево.
          { src: 0, formula: 'fx', param: 'filterFreq', depth: 0.35, exp: true },
          { src: 0, formula: 'fx', param: 'reverbMix', depth: 0.25 },
          // Веер FM дышит; глубина покачивания нити — в противофазе.
          { src: 1, formula: 'fm', param: 'I', depth: 0.3 },
          { src: 1, formula: 'quasi', param: 'Aq', depth: 0.05 },
          // Кривизна арок фейзера плывёт; хорус утолщается и тает.
          { src: 2, formula: 'fx', param: 'phaserRate', depth: 0.4, exp: true },
          { src: 2, formula: 'fx', param: 'chorusDepth', depth: 0.3 },
          // S&H раз в ~30 с: характер покачивания нити + хвост эха.
          { src: 3, formula: 'quasi', param: 'wq', depth: 0.1 },
          { src: 3, formula: 'fx', param: 'delayFb', depth: 0.15 },
        ],
      },
    },
  },
  {
    // «Фрактальный сад»: пресет, выращенный итерациями по спектрограмме
    // (максимизация узорности/фрактальности водопада). Ключевой голос —
    // логистическое отображение: сверхмедленный треугольник (период ~77 с)
    // ведёт r через хаос и периодические окна — на водопаде каскады
    // удвоения периода (буквально фрактал бифуркаций); второй маршрут дышит
    // частотой обновления карты — узор сгущается/разрежается, как смена
    // масштаба. Октавная сетка Шепарда (самоподобие по частоте), FM-веер,
    // муар comb-гребёнки и эхо-решётка дилея — вложенные узоры на всех
    // масштабах. Всё на решётке 55 Гц; logistic/shepard/quasi — фазовые
    // аккумуляторы, модуляция без разрывов. Лента сплошная.
    name: 'Fractal garden (FX mod)',
    state: {
      v: 3,
      masterGain: 0.72,
      fx: {
        ...DEFAULT_FX,
        filterOn: true, filterType: 'comb', filterFreq: 220, filterCombFb: 0.7,
        chorusOn: true, chorusMode: 'chorus', chorusRate: 0.07, chorusDepth: 7, chorusMix: 0.25, chorusFb: 0.25,
        phaserOn: true, phaserRate: 0.25, phaserDepth: 0.7, phaserStages: 8, phaserFb: 0.5, phaserMix: 0.45,
        delayOn: true, delayTime: 0.66, delayFb: 0.5, delayMix: 0.3,
        reverbOn: true, reverbDecay: 5.5, reverbMix: 0.25,
        limiterOn: true,
      },
      formulas: {
        additive: { enabled: true, params: { gain: 0.45, fund: 55, N: 24, move: 0.25 } },
        beats: { enabled: true, params: { gain: 0.28, fbeat: 55, df: 0.6 } },
        logistic: { enabled: true, params: { gain: 0.12, base: 330, depth: 500, r: 3.68, lfoHz: 16 } },
        fm: { enabled: true, params: { gain: 0.15, fc: 880, fm: 55, I: 5 } },
        shepard: { enabled: true, params: { gain: 0.1, shepBase: 55, shepSpeed: 0.05, shepOctaves: 8 } },
      },
      mod: {
        lfos: [
          { shape: 'sine', rate: 0.023, phase: 0 },
          { shape: 'triangle', rate: 0.013, phase: 0.25 },
          { shape: 'sine', rate: 0.089, phase: 0 },
          { shape: 'random', rate: 0.031, phase: 0 },
        ],
        routes: [
          // Муар: гребёнка скользит поперёк решётки гармоник.
          { src: 0, formula: 'fx', param: 'filterFreq', depth: 0.3, exp: true },
          { src: 0, formula: 'fx', param: 'reverbMix', depth: 0.25 },
          // Бифуркации: r идёт сквозь окна хаоса; плотность узора «зумится».
          { src: 1, formula: 'logistic', param: 'r', depth: 0.15 },
          { src: 1, formula: 'logistic', param: 'lfoHz', depth: 0.2, exp: true },
          // Хрусталь Шепарда накатывает волнами (~77 с) и растворяется в
          // ноль — против монотонности; gain — множитель, треугольник
          // непрерывен, щелчков нет.
          { src: 1, formula: 'shepard', param: 'gain', depth: 0.1 },
          // Средний масштаб: веер FM дышит, хорус утолщается.
          { src: 2, formula: 'fm', param: 'I', depth: 0.35 },
          { src: 2, formula: 'fx', param: 'chorusDepth', depth: 0.3 },
          // S&H: регистр хаотического голоса, направление сетки Шепарда, эхо.
          { src: 3, formula: 'logistic', param: 'base', depth: 0.1, exp: true },
          { src: 3, formula: 'shepard', param: 'shepSpeed', depth: 0.12 },
          { src: 3, formula: 'fx', param: 'delayFb', depth: 0.2 },
        ],
      },
    },
  },
];
