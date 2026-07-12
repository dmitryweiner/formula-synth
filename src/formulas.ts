// UI-схема формул: заголовки, описания и слайдеры с диапазонами.
// Порядок массива = порядок карточек на странице.
import type { FormulaId } from './dsp/generator';

export interface SliderDef {
  k: string;
  name: string;
  min: number;
  max: number;
  step: number;
  value: number;
}

export interface FormulaDef {
  id: FormulaId;
  title: string;
  tag: string;
  desc: string;
  hasReset?: boolean;
  sliders: SliderDef[];
}

export const FORMULAS: FormulaDef[] = [
  { id: 'additive', title: 'Harmonic Sum', tag: 'Additive', desc: 'Σ aₙ(t) sin(2π n f t)',
    sliders: [
      { k: 'gain', name: 'Gain', min: 0, max: 1, step: 0.001, value: 0.12 },
      { k: 'fund', name: 'Fund (Hz)', min: 20, max: 500, step: 1, value: 110 },
      { k: 'N', name: 'Harmonics N', min: 1, max: 40, step: 1, value: 12 },
      { k: 'move', name: 'Move (Hz)', min: 0.01, max: 5, step: 0.01, value: 0.35 },
    ] },
  { id: 'lorenz', title: 'Lorenz Attractor', tag: 'Lorenz', desc: 'Lorenz ODE mapped to freq/amp', hasReset: true,
    sliders: [
      { k: 'gain', name: 'Gain', min: 0, max: 1, step: 0.001, value: 0.10 },
      { k: 'sigma', name: 'σ', min: 0, max: 30, step: 0.01, value: 10 },
      { k: 'rho', name: 'ρ', min: 0, max: 60, step: 0.01, value: 28 },
      { k: 'beta', name: 'β', min: 0.1, max: 10, step: 0.0001, value: 2.6667 },
      { k: 'lBase', name: 'Base f (Hz)', min: 20, max: 400, step: 1, value: 120 },
      { k: 'lFreqScale', name: 'Freq scale', min: 0, max: 200, step: 0.1, value: 40 },
      { k: 'lAmp', name: 'Amp scale', min: 0, max: 1, step: 0.001, value: 0.25 },
    ] },
  { id: 'rossler', title: 'Rossler Attractor', tag: 'Chaos', desc: 'dx=-y-z, dy=x+ay, dz=b+z(x-c)', hasReset: true,
    sliders: [
      { k: 'gain', name: 'Gain', min: 0, max: 1, step: 0.001, value: 0.10 },
      { k: 'rossA', name: 'a', min: 0.01, max: 0.5, step: 0.001, value: 0.2 },
      { k: 'rossB', name: 'b', min: 0.01, max: 0.5, step: 0.001, value: 0.2 },
      { k: 'rossC', name: 'c', min: 2, max: 12, step: 0.01, value: 5.7 },
      { k: 'rossBase', name: 'Base f (Hz)', min: 20, max: 400, step: 1, value: 120 },
      { k: 'rossFreqScale', name: 'Freq scale', min: 0, max: 100, step: 0.1, value: 30 },
      { k: 'rossAmp', name: 'Amp scale', min: 0, max: 1, step: 0.001, value: 0.25 },
    ] },
  { id: 'gliss', title: 'Exponential Glissando', tag: 'Gliss', desc: 'f(t)=f0·e^{k t}', hasReset: true,
    sliders: [
      { k: 'gain', name: 'Gain', min: 0, max: 1, step: 0.001, value: 0.10 },
      { k: 'f0', name: 'f0 (Hz)', min: 10, max: 400, step: 1, value: 55 },
      { k: 'k', name: 'k', min: -2.0, max: 2.0, step: 0.001, value: 0.15 },
    ] },
  { id: 'shepard', title: 'Shepard Tone', tag: 'Illusion', desc: 'Endless rising illusion', hasReset: true,
    sliders: [
      { k: 'gain', name: 'Gain', min: 0, max: 1, step: 0.001, value: 0.12 },
      { k: 'shepBase', name: 'Base f (Hz)', min: 20, max: 200, step: 1, value: 55 },
      { k: 'shepSpeed', name: 'Speed', min: -0.5, max: 0.5, step: 0.001, value: 0.1 },
      { k: 'shepOctaves', name: 'Octaves', min: 3, max: 10, step: 1, value: 6 },
    ] },
  { id: 'bell', title: 'FM Bell', tag: 'Bell', desc: 'e^{-3t/d}·sin(2π f t + I·e^{-3t/d}·sin(2π·ratio·f t))', hasReset: true,
    sliders: [
      { k: 'gain', name: 'Gain', min: 0, max: 1, step: 0.001, value: 0.15 },
      { k: 'bellF0', name: 'f0 (Hz)', min: 100, max: 1000, step: 1, value: 320 },
      { k: 'bellRatio', name: 'Inharmonicity', min: 1, max: 3, step: 0.01, value: 1.4 },
      { k: 'bellIndex', name: 'FM index', min: 0, max: 10, step: 0.1, value: 4 },
      { k: 'bellDecay', name: 'Decay (s)', min: 0.5, max: 8, step: 0.1, value: 3 },
      { k: 'bellPeriod', name: 'Strike every (s)', min: 1, max: 20, step: 0.5, value: 6 },
    ] },
  { id: 'fm', title: 'FM Sine', tag: 'FM', desc: 'sin(2π f_c t + I sin(2π f_m t))',
    sliders: [
      { k: 'gain', name: 'Gain', min: 0, max: 1, step: 0.001, value: 0.15 },
      { k: 'fc', name: 'f_c (Hz)', min: 20, max: 2000, step: 1, value: 220 },
      { k: 'fm', name: 'f_m (Hz)', min: 0.1, max: 60, step: 0.1, value: 2.0 },
      { k: 'I', name: 'Index I', min: 0, max: 20, step: 0.01, value: 3.0 },
    ] },
  { id: 'beats', title: 'Two Sines (Beats)', tag: 'Beats', desc: 'sin(2π f t)+sin(2π(f+Δf)t)',
    sliders: [
      { k: 'gain', name: 'Gain', min: 0, max: 1, step: 0.001, value: 0.12 },
      { k: 'fbeat', name: 'f (Hz)', min: 20, max: 2000, step: 1, value: 220 },
      { k: 'df', name: 'Δf (Hz)', min: 0, max: 20, step: 0.01, value: 0.8 },
    ] },
  { id: 'pm', title: 'Phase Modulation', tag: 'PM', desc: 'sin(2π f t + 5·sin(sin(2π f2 t)))', hasReset: true,
    sliders: [
      { k: 'gain', name: 'Gain', min: 0, max: 1, step: 0.001, value: 0.12 },
      { k: 'f', name: 'f (Hz)', min: 20, max: 2000, step: 1, value: 220 },
      { k: 'f2pm', name: 'f2 (Hz)', min: 0.1, max: 40, step: 0.1, value: 3 },
    ] },
  { id: 'quasi', title: 'Quasi-random LFO', tag: 'Quasi', desc: 'f(t)=fq + Aq·sin(sin(sin(w·t)))', hasReset: true,
    sliders: [
      { k: 'gain', name: 'Gain', min: 0, max: 1, step: 0.001, value: 0.10 },
      { k: 'fq', name: 'Base f (Hz)', min: 20, max: 500, step: 1, value: 120 },
      { k: 'Aq', name: 'Depth (Hz)', min: 0, max: 1200, step: 1, value: 220 },
      { k: 'wq', name: 'w', min: 0.05, max: 6, step: 0.01, value: 0.8 },
    ] },
  { id: 'logistic', title: 'Logistic Map', tag: 'Chaos', desc: 'xₙ₊₁ = r xₙ(1−xₙ)',
    sliders: [
      { k: 'gain', name: 'Gain', min: 0, max: 1, step: 0.001, value: 0.12 },
      { k: 'base', name: 'Base f (Hz)', min: 20, max: 800, step: 1, value: 110 },
      { k: 'depth', name: 'Depth (Hz)', min: 0, max: 1200, step: 1, value: 330 },
      { k: 'r', name: 'r', min: 2.8, max: 4.0, step: 0.0001, value: 3.86 },
      { k: 'lfoHz', name: 'Update rate (Hz)', min: 1, max: 400, step: 1, value: 40 },
    ] },
  { id: 'dist', title: 'Nonlinear Saturation', tag: 'tanh', desc: 'tanh(α·sin(2π f t))',
    sliders: [
      { k: 'gain', name: 'Gain', min: 0, max: 1, step: 0.001, value: 0.10 },
      { k: 'fd', name: 'f (Hz)', min: 20, max: 2000, step: 1, value: 110 },
      { k: 'alpha', name: 'α', min: 0, max: 10, step: 0.01, value: 3.0 },
    ] },
  { id: 'karplus', title: 'Karplus–Strong (String)', tag: 'KS', desc: 'noise-in-delay + averaging + damping', hasReset: true,
    sliders: [
      { k: 'gain', name: 'Gain', min: 0, max: 1, step: 0.001, value: 0.14 },
      { k: 'ksFreq', name: 'Freq (Hz)', min: 40, max: 880, step: 1, value: 110 },
      { k: 'ksDamp', name: 'Damping', min: 0.90, max: 0.9999, step: 0.0001, value: 0.985 },
      { k: 'ksBright', name: 'Brightness', min: 0, max: 1, step: 0.001, value: 0.5 },
    ] },
  { id: 'bytebeat', title: 'Bytebeat', tag: '8-bit', desc: 'classic integer formulas, e.g. ((t>>10)&42)·t mod 256', hasReset: true,
    sliders: [
      { k: 'gain', name: 'Gain', min: 0, max: 1, step: 0.001, value: 0.10 },
      { k: 'bbRecipe', name: 'Recipe #', min: 1, max: 5, step: 1, value: 1 },
      { k: 'bbRate', name: 'Rate (Hz)', min: 1000, max: 16000, step: 100, value: 8000 },
    ] },
  { id: 'ocean', title: 'Ocean / Wind', tag: 'Noise', desc: 'noise → breathing LP filter (two slow LFOs)', hasReset: true,
    sliders: [
      { k: 'gain', name: 'Gain', min: 0, max: 1, step: 0.001, value: 0.25 },
      { k: 'oceanRate', name: 'Wave rate (Hz)', min: 0.03, max: 0.5, step: 0.001, value: 0.12 },
      { k: 'oceanCut', name: 'Cutoff (Hz)', min: 100, max: 2000, step: 1, value: 600 },
      { k: 'oceanDepth', name: 'Swell depth', min: 0, max: 1, step: 0.01, value: 0.7 },
    ] },
  { id: 'noiselp', title: 'Noise → Low-pass', tag: 'Noise', desc: 'white noise → 1-pole LP',
    sliders: [
      { k: 'gain', name: 'Gain', min: 0, max: 1, step: 0.001, value: 0.10 },
      { k: 'nCut', name: 'Cutoff (Hz)', min: 20, max: 18000, step: 1, value: 800 },
    ] },
  { id: 'pinknoise', title: 'Pink Noise (1/f)', tag: 'Noise', desc: 'Natural 1/f spectrum noise',
    sliders: [
      { k: 'gain', name: 'Gain', min: 0, max: 1, step: 0.001, value: 0.12 },
      { k: 'pinkBright', name: 'Brightness', min: 0, max: 1, step: 0.01, value: 0.3 },
    ] },
  { id: 'brownnoise', title: 'Brown Noise (Brownian)', tag: 'Noise', desc: 'Random walk — deep rumble',
    sliders: [
      { k: 'gain', name: 'Gain', min: 0, max: 1, step: 0.001, value: 0.15 },
      { k: 'brownStep', name: 'Step size', min: 0.001, max: 0.1, step: 0.001, value: 0.02 },
    ] },
  { id: 'velvetnoise', title: 'Velvet Noise', tag: 'Noise', desc: 'Sparse random impulses',
    sliders: [
      { k: 'gain', name: 'Gain', min: 0, max: 1, step: 0.001, value: 0.10 },
      { k: 'velvetDensity', name: 'Density (imp/s)', min: 100, max: 10000, step: 10, value: 2000 },
    ] },
];
