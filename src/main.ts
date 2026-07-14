// Formula Synth — сборка UI: карточки формул, панель эффектов, пресеты,
// share-ссылки, запись WAV, осциллограф. Аудио — в audio/engine.ts.
import { FORMULAS } from './formulas';
import { PRESETS } from './presets';
import { AudioEngine } from './audio/engine';
import { IosAudioUnlock } from './audio/iosUnlock';
import { encodeWAV } from './dsp/wav';
import type { AppState, FxState, FilterType, PartialAppState } from './state/schema';
import type { ModState } from './dsp/mod';
import { ModMatrix } from './ui/modmatrix';
import { FX_PRESETS } from './fxPresets';
import { DEFAULT_FX, DEFAULT_MASTER_GAIN, FX_MOD_PARAMS } from './state/schema';
import { encodeStateToken, decodeStateToken, tokenFromHash } from './state/share';
import { loadUserPresets, saveUserPresets, nextPresetNumber } from './state/userPresets';
import type { UserPreset } from './state/userPresets';
import { el, inputEl, selectEl, buttonEl, canvasEl } from './ui/dom';
import { fmt } from './ui/format';
import { setupAdjustmentButtons } from './ui/adjust';
import { Scope } from './ui/scope';
import { acquireWakeLock, releaseWakeLock } from './ui/wakelock';

const HELP_SHOWN_KEY = 'formula_audio_lab_help_shown';

const engine = new AudioEngine();
const iosUnlock = new IosAudioUnlock();
const formulasRoot = el('formulas');
const statusEl = el('status');

let userPresets: UserPreset[] = [];
let selectedPresetName: string | null = null;

// Матрица модуляции (phase 4): своя панель Modulators + таблица маршрутов.
// modMatrix — источник истины по mod; при правке шлём в движок и подсвечиваем
// «живые» слайдеры. (onModChange/updateModIndicators — hoisted, дёргаются
// только по действию пользователя, когда modMatrix уже создан.)
function onModChange(): void {
  const mod = modMatrix.getState();
  if (engine.running) engine.setMod(mod);
  updateModIndicators(mod);
}
function fxControlId(param: string): string {
  return `fx${param.charAt(0).toUpperCase()}${param.slice(1)}`;
}
function updateModIndicators(mod: ModState | undefined): void {
  const targets = new Set((mod?.routes ?? []).map((r) => `${r.formula}_${r.param}`));
  for (const f of FORMULAS) {
    for (const s of f.sliders) {
      const row = document.getElementById(`${f.id}_${s.k}`)?.closest('.ctrl');
      if (row) row.classList.toggle('modulated', targets.has(`${f.id}_${s.k}`));
    }
  }
  // Индикатор ∿ и на FX-слайдерах панели эффектов (цель 'fx').
  for (const param of FX_MOD_PARAMS) {
    const row = document.getElementById(fxControlId(param))?.closest('.ctrl');
    if (row) row.classList.toggle('modulated', targets.has(`fx_${param}`));
  }
}
const modMatrix = new ModMatrix({
  host: el('modPanel'),
  formulas: FORMULAS,
  lfoCount: 4,
  onChange: onModChange,
  isEnabled: (id) => {
    const e = document.getElementById(`en_${id}`);
    return e instanceof HTMLInputElement && e.checked;
  },
});

let isRecording = false;
let downloadUrl: string | null = null;

function setStatus(text: string): void {
  statusEl.textContent = text;
}

// ---------- Карточки формул ----------
function makeFormulaUI(f: (typeof FORMULAS)[number]): void {
  const wrap = document.createElement('div');
  wrap.className = 'formula';

  const resetHtml = f.hasReset
    ? `<button class="collapseBtn resetBtn" id="reset_${f.id}" type="button" title="Reset state" disabled>↺</button>`
    : '';

  wrap.innerHTML = `
    <div class="fhead">
      <div>
        <h3>
          <input type="checkbox" id="en_${f.id}">
          ${f.title}
        </h3>
        <div class="small">${f.desc}</div>
      </div>
      <div class="factions">
        ${resetHtml}
        <button class="collapseBtn" id="col_${f.id}" type="button">▶</button>
      </div>
    </div>

    <div class="fbody collapsed" id="body_${f.id}">
      <div id="sl_${f.id}"></div>
    </div>
  `;
  formulasRoot.appendChild(wrap);

  const slidersHost = wrap.querySelector(`#sl_${f.id}`);
  if (!slidersHost) return;
  for (const s of f.sliders) {
    const line = document.createElement('div');
    line.className = 'ctrl with-adj';
    line.innerHTML = `
      <label for="${f.id}_${s.k}">${s.name}</label>
      <button class="adj-btn" data-slider="${f.id}_${s.k}" data-dir="-1">−</button>
      <input id="${f.id}_${s.k}" type="range" min="${s.min}" max="${s.max}" step="${s.step}" value="${s.value}">
      <button class="adj-btn" data-slider="${f.id}_${s.k}" data-dir="1">+</button>
      <div class="small" id="${f.id}_${s.k}_v">${fmt(Number(s.value))}</div>
    `;
    slidersHost.appendChild(line);
  }
}
for (const f of FORMULAS) makeFormulaUI(f);

// ---------- Чтение/применение состояния ----------
const VOWEL_LETTERS = ['A', 'E', 'I', 'O', 'U'];
function vowelLabel(v: number): string {
  return VOWEL_LETTERS[Math.max(0, Math.min(4, Math.round(v * 4)))];
}

function toFilterType(v: string): FilterType {
  switch (v) {
    case 'lowpass': case 'highpass': case 'bandpass': case 'notch':
    case 'peaking': case 'lowshelf': case 'highshelf': case 'allpass':
    case 'formant': case 'comb':
      return v;
    default: return 'lowpass';
  }
}

function readFxFromUI(): FxState {
  const chorusModeRaw = selectEl('fxChorusMode').value;
  return {
    filterOn: inputEl('fxFilterOn').checked,
    filterType: toFilterType(selectEl('fxFilterType').value),
    filterFreq: Number(inputEl('fxFilterFreq').value),
    filterQ: Number(inputEl('fxFilterQ').value),
    filterGain: Number(inputEl('fxFilterGain').value),
    filterVowel: Number(inputEl('fxFilterVowel').value),
    filterCombFb: Number(inputEl('fxFilterCombFb').value),
    chorusOn: inputEl('fxChorusOn').checked,
    chorusMode: chorusModeRaw === 'flanger' ? 'flanger' : 'chorus',
    chorusRate: Number(inputEl('fxChorusRate').value),
    chorusDepth: Number(inputEl('fxChorusDepth').value),
    chorusMix: Number(inputEl('fxChorusMix').value),
    chorusFb: Number(inputEl('fxChorusFb').value),
    reverbOn: inputEl('fxReverbOn').checked,
    reverbDecay: Number(inputEl('fxReverbDecay').value),
    reverbMix: Number(inputEl('fxReverbMix').value),
    limiterOn: inputEl('fxLimiterOn').checked,
    limiterThr: Number(inputEl('fxLimiterThr').value),
    limiterRel: Number(inputEl('fxLimiterRel').value),
    delayOn: inputEl('fxDelayOn').checked,
    delayTime: Number(inputEl('fxDelayTime').value),
    delayFb: Number(inputEl('fxDelayFb').value),
    delayMix: Number(inputEl('fxDelayMix').value),
    phaserOn: inputEl('fxPhaserOn').checked,
    phaserRate: Number(inputEl('fxPhaserRate').value),
    phaserDepth: Number(inputEl('fxPhaserDepth').value),
    phaserStages: Number(selectEl('fxPhaserStages').value),
    phaserFb: Number(inputEl('fxPhaserFb').value),
    phaserMix: Number(inputEl('fxPhaserMix').value),
  };
}

function readStateFromUI(): AppState {
  const formulas: AppState['formulas'] = {};
  for (const f of FORMULAS) {
    const enabled = inputEl(`en_${f.id}`).checked;
    const params: Record<string, number> = {};
    for (const s of f.sliders) params[s.k] = Number(inputEl(`${f.id}_${s.k}`).value);
    formulas[f.id] = { enabled, params };
  }
  return { v: 3, masterGain: Number(inputEl('masterGain').value), fx: readFxFromUI(), formulas, mod: modMatrix.getState() };
}

const BIQUAD_TYPES = ['lowpass', 'highpass', 'bandpass', 'notch', 'peaking', 'lowshelf', 'highshelf', 'allpass'];
// Показываем только релевантные текущему типу фильтра контролы + переименовываем
// Freq/Q под режим (чтобы не путать: у comb это высота, у formant — сдвиг/резонанс).
function updateFilterControls(): void {
  const t = selectEl('fxFilterType').value;
  const setShown = (id: string, on: boolean) => { el(id).style.display = on ? '' : 'none'; };
  setShown('rowFilterQ', BIQUAD_TYPES.includes(t) || t === 'formant');
  setShown('rowFilterGain', t === 'peaking' || t === 'lowshelf' || t === 'highshelf');
  setShown('rowFilterVowel', t === 'formant');
  setShown('rowFilterCombFb', t === 'comb');
  el('lblFilterFreq').textContent = t === 'comb' ? 'Pitch (Hz)' : t === 'formant' ? 'Formant shift (Hz)' : 'Cutoff (Hz)';
  el('lblFilterQ').textContent = t === 'formant' ? 'Resonance' : 'Q';
}

function updateFXLabels(): void {
  el('fxFilterFreqVal').textContent = inputEl('fxFilterFreq').value;
  el('fxFilterQVal').textContent = Number(inputEl('fxFilterQ').value).toFixed(1);
  el('fxFilterGainVal').textContent = Number(inputEl('fxFilterGain').value).toFixed(1);
  el('fxFilterVowelVal').textContent = vowelLabel(Number(inputEl('fxFilterVowel').value));
  el('fxFilterCombFbVal').textContent = Number(inputEl('fxFilterCombFb').value).toFixed(2);
  el('fxChorusRateVal').textContent = Number(inputEl('fxChorusRate').value).toFixed(2);
  el('fxChorusDepthVal').textContent = Number(inputEl('fxChorusDepth').value).toFixed(1);
  el('fxChorusMixVal').textContent = Number(inputEl('fxChorusMix').value).toFixed(2);
  el('fxChorusFbVal').textContent = Number(inputEl('fxChorusFb').value).toFixed(2);
  el('fxReverbDecayVal').textContent = Number(inputEl('fxReverbDecay').value).toFixed(1);
  el('fxReverbMixVal').textContent = Number(inputEl('fxReverbMix').value).toFixed(2);
  el('fxLimiterThrVal').textContent = Number(inputEl('fxLimiterThr').value).toFixed(1);
  el('fxLimiterRelVal').textContent = Number(inputEl('fxLimiterRel').value).toFixed(2);
  el('fxDelayTimeVal').textContent = Number(inputEl('fxDelayTime').value).toFixed(2);
  el('fxDelayFbVal').textContent = Number(inputEl('fxDelayFb').value).toFixed(2);
  el('fxDelayMixVal').textContent = Number(inputEl('fxDelayMix').value).toFixed(2);
  el('fxPhaserRateVal').textContent = Number(inputEl('fxPhaserRate').value).toFixed(2);
  el('fxPhaserDepthVal').textContent = Number(inputEl('fxPhaserDepth').value).toFixed(2);
  el('fxPhaserFbVal').textContent = Number(inputEl('fxPhaserFb').value).toFixed(2);
  el('fxPhaserMixVal').textContent = Number(inputEl('fxPhaserMix').value).toFixed(2);
  updateFilterControls();
}

function setFormulaActive(id: string, on: boolean): void {
  const enEl = inputEl(`en_${id}`);
  const wrap = enEl.closest('.formula');
  if (wrap) wrap.classList.toggle('active', on);
}

function setFormulaCollapsed(id: string, collapsed: boolean): void {
  el(`body_${id}`).classList.toggle('collapsed', collapsed);
  buttonEl(`col_${id}`).textContent = collapsed ? '▶' : '▼';
}

function resetToDefaults(): void {
  modMatrix.setState(undefined);
  inputEl('masterGain').value = String(DEFAULT_MASTER_GAIN);
  el('masterGainVal').textContent = DEFAULT_MASTER_GAIN.toFixed(3);

  inputEl('fxFilterOn').checked = DEFAULT_FX.filterOn;
  selectEl('fxFilterType').value = DEFAULT_FX.filterType;
  inputEl('fxFilterFreq').value = String(DEFAULT_FX.filterFreq);
  inputEl('fxFilterQ').value = String(DEFAULT_FX.filterQ);
  inputEl('fxFilterGain').value = String(DEFAULT_FX.filterGain);
  inputEl('fxFilterVowel').value = String(DEFAULT_FX.filterVowel);
  inputEl('fxFilterCombFb').value = String(DEFAULT_FX.filterCombFb);

  inputEl('fxChorusOn').checked = DEFAULT_FX.chorusOn;
  selectEl('fxChorusMode').value = DEFAULT_FX.chorusMode;
  inputEl('fxChorusRate').value = String(DEFAULT_FX.chorusRate);
  inputEl('fxChorusDepth').value = String(DEFAULT_FX.chorusDepth);
  inputEl('fxChorusMix').value = String(DEFAULT_FX.chorusMix);
  inputEl('fxChorusFb').value = String(DEFAULT_FX.chorusFb);

  inputEl('fxReverbOn').checked = DEFAULT_FX.reverbOn;
  inputEl('fxReverbDecay').value = String(DEFAULT_FX.reverbDecay);
  inputEl('fxReverbMix').value = String(DEFAULT_FX.reverbMix);

  inputEl('fxLimiterOn').checked = DEFAULT_FX.limiterOn;
  inputEl('fxLimiterThr').value = String(DEFAULT_FX.limiterThr);
  inputEl('fxLimiterRel').value = String(DEFAULT_FX.limiterRel);

  inputEl('fxDelayOn').checked = DEFAULT_FX.delayOn;
  inputEl('fxDelayTime').value = String(DEFAULT_FX.delayTime);
  inputEl('fxDelayFb').value = String(DEFAULT_FX.delayFb);
  inputEl('fxDelayMix').value = String(DEFAULT_FX.delayMix);

  inputEl('fxPhaserOn').checked = DEFAULT_FX.phaserOn;
  inputEl('fxPhaserRate').value = String(DEFAULT_FX.phaserRate);
  inputEl('fxPhaserDepth').value = String(DEFAULT_FX.phaserDepth);
  selectEl('fxPhaserStages').value = String(DEFAULT_FX.phaserStages);
  inputEl('fxPhaserFb').value = String(DEFAULT_FX.phaserFb);
  inputEl('fxPhaserMix').value = String(DEFAULT_FX.phaserMix);

  updateFXLabels();

  for (const f of FORMULAS) {
    inputEl(`en_${f.id}`).checked = false;
    setFormulaActive(f.id, false);
    setFormulaCollapsed(f.id, true);
    for (const s of f.sliders) {
      inputEl(`${f.id}_${s.k}`).value = String(s.value);
      el(`${f.id}_${s.k}_v`).textContent = fmt(s.value);
    }
  }
}

function applyStateToUI(state: PartialAppState, resetFirst = false): void {
  if (resetFirst) resetToDefaults();

  if (typeof state.masterGain === 'number') {
    inputEl('masterGain').value = String(state.masterGain);
    el('masterGainVal').textContent = state.masterGain.toFixed(3);
  }

  const fx = state.fx ?? {};
  const setVal = (id: string, val: number | string | undefined) => {
    if (val === undefined) return;
    const e = el(id);
    if (e instanceof HTMLInputElement || e instanceof HTMLSelectElement) e.value = String(val);
  };
  const setChk = (id: string, val: boolean | undefined) => {
    if (val !== undefined) inputEl(id).checked = val;
  };

  setChk('fxFilterOn', fx.filterOn); setVal('fxFilterType', fx.filterType);
  setVal('fxFilterFreq', fx.filterFreq); setVal('fxFilterQ', fx.filterQ);
  setVal('fxFilterGain', fx.filterGain); setVal('fxFilterVowel', fx.filterVowel);
  setVal('fxFilterCombFb', fx.filterCombFb);

  setChk('fxChorusOn', fx.chorusOn); setVal('fxChorusMode', fx.chorusMode);
  setVal('fxChorusRate', fx.chorusRate); setVal('fxChorusDepth', fx.chorusDepth);
  setVal('fxChorusMix', fx.chorusMix); setVal('fxChorusFb', fx.chorusFb);

  setChk('fxReverbOn', fx.reverbOn); setVal('fxReverbDecay', fx.reverbDecay);
  setVal('fxReverbMix', fx.reverbMix);

  setChk('fxLimiterOn', fx.limiterOn); setVal('fxLimiterThr', fx.limiterThr);
  setVal('fxLimiterRel', fx.limiterRel);

  setChk('fxDelayOn', fx.delayOn); setVal('fxDelayTime', fx.delayTime);
  setVal('fxDelayFb', fx.delayFb); setVal('fxDelayMix', fx.delayMix);

  setChk('fxPhaserOn', fx.phaserOn); setVal('fxPhaserRate', fx.phaserRate);
  setVal('fxPhaserDepth', fx.phaserDepth); setVal('fxPhaserStages', fx.phaserStages);
  setVal('fxPhaserFb', fx.phaserFb); setVal('fxPhaserMix', fx.phaserMix);

  updateFXLabels();

  const formulas = state.formulas ?? {};
  for (const f of FORMULAS) {
    const st = formulas[f.id];
    if (!st) continue;

    if (st.enabled !== undefined) {
      inputEl(`en_${f.id}`).checked = st.enabled;
      setFormulaActive(f.id, st.enabled);
      setFormulaCollapsed(f.id, !st.enabled);
    }

    const params = st.params ?? {};
    for (const s of f.sliders) {
      const v = params[s.k];
      if (v === undefined) continue;
      inputEl(`${f.id}_${s.k}`).value = String(v);
      el(`${f.id}_${s.k}_v`).textContent = fmt(v);
    }
  }

  // Матрицу выставляем в конце: приёмники-выпадашки фильтруются по включённым
  // формулам, а чекбоксы enable выставлены выше по функции.
  modMatrix.setState(state.mod);
  updateModIndicators(modMatrix.getState());
}

function updateResetButtons(): void {
  for (const f of FORMULAS) {
    if (!f.hasReset) continue;
    buttonEl(`reset_${f.id}`).disabled = !engine.running || !inputEl(`en_${f.id}`).checked;
  }
}

// ---------- Старт/стоп аудио ----------
const playStopBtn = buttonEl('playStopBtn');
const recBtn = buttonEl('recBtn');

async function startAudio(): Promise<void> {
  if (engine.running) return;
  // iOS: беззвучный <audio> должен стартовать СИНХРОННО в жесте (до первого
  // await), иначе переключатель «без звука» заглушит Web Audio. См. iosUnlock.ts.
  iosUnlock.play();
  await engine.start(readStateFromUI());
  setStatus('running');
  playStopBtn.textContent = '⏹ Stop';
  playStopBtn.classList.add('running');
  recBtn.disabled = false;
  updateResetButtons();
  acquireWakeLock();
  const analyser = engine.analyser;
  if (analyser) scope.start(analyser, engine.sampleRate);
}

async function stopAudio(): Promise<void> {
  if (!engine.running) return;
  releaseWakeLock();
  cleanupDownloadUrl();
  if (isRecording) {
    await engine.stopRecording();
    isRecording = false;
  }
  scope.stop();
  iosUnlock.stop();
  await engine.stop();

  setStatus('stopped');
  playStopBtn.textContent = '▶ Play';
  playStopBtn.classList.remove('running');
  recBtn.disabled = true;
  recBtn.textContent = 'Record';
  recBtn.classList.remove('recording');
  updateResetButtons();
}

playStopBtn.addEventListener('click', () => {
  if (engine.running) void stopAudio();
  else void startAudio();
});

// ---------- Видимость страницы ----------
document.addEventListener('visibilitychange', () => {
  const visible = document.visibilityState === 'visible';
  scope.setPageVisible(visible);
  if (visible && engine.running) {
    void engine.resume().then(() => {
      if (engine.contextState === 'running') void acquireWakeLock();
    });
  }
});

// ---------- Осциллограф ----------
const scopeWrap = el('scopeWrap');
const scope = new Scope(canvasEl('scope'), scopeWrap);
const scopeToggleBtn = buttonEl('scopeToggleBtn');
const scopeModeBtn = buttonEl('scopeModeBtn');

function setScopeCollapsed(collapsed: boolean): void {
  scopeWrap.classList.toggle('scopeCollapsed', collapsed);
  scopeToggleBtn.classList.toggle('active', !collapsed);
  // после разворота пересчитать размеры канвы, иначе рисуем в 0-высоту
  if (!collapsed) setTimeout(() => scope.resize(), 0);
}

// на узких экранах по умолчанию свёрнут
setScopeCollapsed(window.matchMedia('(max-width: 600px)').matches);

scopeModeBtn.addEventListener('click', () => {
  scopeModeBtn.textContent = scope.toggleMode() === 'wave' ? 'Wave' : 'Spectrum';
});

// ---------- Панели Scope / Effects / Mod — взаимоисключающие (как radio) ----------
const effectsPanel = el('effectsPanel');
const effectsBtn = buttonEl('effectsBtn');
const modPanel = el('modPanel');
const modBtn = buttonEl('modBtn');

type Panel = 'scope' | 'effects' | 'mod';
function currentPanel(): Panel | null {
  if (effectsPanel.classList.contains('open')) return 'effects';
  if (modPanel.classList.contains('open')) return 'mod';
  if (!scopeWrap.classList.contains('scopeCollapsed')) return 'scope';
  return null;
}
// Активна максимум одна панель; выбор одной гасит остальные (повторный клик по
// активной — выключает всё).
function setPanel(active: Panel | null): void {
  effectsPanel.classList.toggle('open', active === 'effects');
  effectsBtn.classList.toggle('active', active === 'effects');
  modPanel.classList.toggle('open', active === 'mod');
  modBtn.classList.toggle('active', active === 'mod');
  setScopeCollapsed(active !== 'scope');
}

scopeToggleBtn.addEventListener('click', () => setPanel(currentPanel() === 'scope' ? null : 'scope'));
effectsBtn.addEventListener('click', () => setPanel(currentPanel() === 'effects' ? null : 'effects'));
modBtn.addEventListener('click', () => setPanel(currentPanel() === 'mod' ? null : 'mod'));

// Пресеты модулей эффектов: выставляют СВОИ поля FxState (частично) поверх
// текущего состояния и включают модуль. Выбор остаётся показанным; сбрасывается
// на плейсхолдер, когда пользователь трогает любой FX-контрол руками.
const fxPresetSel = selectEl('fxPreset');
const fxPresetGroups = new Map<string, HTMLOptGroupElement>();
for (const p of FX_PRESETS) {
  let g = fxPresetGroups.get(p.group);
  if (!g) {
    g = document.createElement('optgroup');
    g.label = p.group;
    fxPresetSel.appendChild(g);
    fxPresetGroups.set(p.group, g);
  }
  const o = document.createElement('option');
  o.value = p.name; o.textContent = p.name;
  g.appendChild(o);
}

// Ключ FxState → id соответствующего контрола (filterOn → fxFilterOn и т.д.).
function setFxField(key: string, val: number | string | boolean): void {
  const e = document.getElementById(`fx${key.charAt(0).toUpperCase()}${key.slice(1)}`);
  if (e instanceof HTMLInputElement) {
    if (e.type === 'checkbox') e.checked = val === true;
    else e.value = String(val);
  } else if (e instanceof HTMLSelectElement) {
    e.value = String(val);
  }
}

fxPresetSel.addEventListener('change', () => {
  const preset = FX_PRESETS.find((p) => p.name === fxPresetSel.value);
  if (!preset) return;
  for (const [k, v] of Object.entries(preset.fx)) {
    if (v !== undefined) setFxField(k, v);
  }
  updateFilterControls();
  updateFXLabels();
  if (engine.running) engine.applyFx(readFxFromUI());
});

const fxRoutingInputs = ['fxFilterOn', 'fxChorusOn', 'fxReverbOn', 'fxLimiterOn', 'fxDelayOn', 'fxPhaserOn'];
for (const id of fxRoutingInputs) {
  inputEl(id).addEventListener('change', () => {
    fxPresetSel.value = ''; // ручной тумблинг модуля → уже не именованный пресет
    if (engine.running) engine.applyFx(readFxFromUI());
  });
}

// Смена типа фильтра меняет и роутинг графа (biquad / formant / comb), поэтому
// полный applyFx, а не только параметры; плюс показать нужные контролы.
selectEl('fxFilterType').addEventListener('change', () => {
  fxPresetSel.value = '';
  updateFilterControls();
  updateFXLabels();
  if (engine.running) engine.applyFx(readFxFromUI());
});

const fxParamInputs = [
  'fxFilterFreq', 'fxFilterQ', 'fxFilterGain', 'fxFilterVowel', 'fxFilterCombFb',
  'fxChorusMode', 'fxChorusRate', 'fxChorusDepth', 'fxChorusMix', 'fxChorusFb',
  'fxReverbDecay', 'fxReverbMix',
  'fxLimiterThr', 'fxLimiterRel',
  'fxDelayTime', 'fxDelayFb', 'fxDelayMix',
  'fxPhaserRate', 'fxPhaserDepth', 'fxPhaserStages', 'fxPhaserFb', 'fxPhaserMix',
];
for (const id of fxParamInputs) {
  el(id).addEventListener('input', () => {
    fxPresetSel.value = ''; // ручная правка любого FX → сбросить имя пресета
    updateFXLabels();
    if (engine.running) engine.setBaseFx(readFxFromUI());
  });
}

// ---------- Кнопки формул ----------
buttonEl('disableAllBtn').addEventListener('click', () => {
  for (const f of FORMULAS) {
    inputEl(`en_${f.id}`).checked = false;
    setFormulaActive(f.id, false);
    if (engine.running) engine.setFormulaEnabled(f.id, false, 0);
  }
  updateResetButtons();
  modMatrix.refreshFormulas();
});

const collapseAllBtn = buttonEl('collapseAllBtn');
let allCollapsed = true; // карточки свёрнуты при загрузке
collapseAllBtn.addEventListener('click', () => {
  allCollapsed = !allCollapsed;
  for (const f of FORMULAS) setFormulaCollapsed(f.id, allCollapsed);
  collapseAllBtn.textContent = allCollapsed ? '▶ Expand all' : '▼ Collapse all';
});

const masterGainInput = inputEl('masterGain');
masterGainInput.addEventListener('input', () => {
  const v = Number(masterGainInput.value);
  el('masterGainVal').textContent = v.toFixed(3);
  engine.setMasterGain(v);
});

for (const f of FORMULAS) {
  const en = inputEl(`en_${f.id}`);
  const body = el(`body_${f.id}`);
  const col = buttonEl(`col_${f.id}`);

  col.addEventListener('click', () => {
    setFormulaCollapsed(f.id, !body.classList.contains('collapsed'));
  });

  en.addEventListener('change', async () => {
    // включение формулы автоматически запускает звук
    if (!engine.running && en.checked) await startAudio();
    if (!engine.running) {
      en.checked = false;
      return;
    }

    const on = en.checked;
    engine.setFormulaEnabled(f.id, on, Number(inputEl(`${f.id}_gain`).value));
    setFormulaActive(f.id, on);
    updateResetButtons();
    modMatrix.refreshFormulas(); // список приёмников в роутах следит за включёнными

    // включили — развернуть, выключили — свернуть
    setFormulaCollapsed(f.id, !on);
  });

  if (f.hasReset) {
    buttonEl(`reset_${f.id}`).addEventListener('click', () => {
      if (engine.running) engine.resetFormula(f.id);
    });
  }

  for (const s of f.sliders) {
    const slider = inputEl(`${f.id}_${s.k}`);
    slider.addEventListener('input', () => {
      const v = Number(slider.value);
      el(`${f.id}_${s.k}_v`).textContent = fmt(v);
      engine.setFormulaParam(f.id, s.k, v, en.checked);
    });
  }
}

// ---------- Запись WAV ----------
function cleanupDownloadUrl(): void {
  if (downloadUrl) {
    URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }
}

async function toggleRecording(): Promise<void> {
  if (!engine.running) {
    setStatus('start audio first');
    return;
  }

  if (!isRecording) {
    cleanupDownloadUrl();
    isRecording = true;
    recBtn.textContent = '● REC';
    recBtn.classList.add('recording');
    setStatus('recording…');
    engine.startRecording();
    return;
  }

  recBtn.disabled = true;
  recBtn.classList.remove('recording');
  setStatus('finalizing…');

  const samples = await engine.stopRecording();
  isRecording = false;
  recBtn.disabled = false;
  recBtn.textContent = 'Record';

  const blob = new Blob([encodeWAV(samples, engine.sampleRate)], { type: 'audio/wav' });
  downloadUrl = URL.createObjectURL(blob);
  const name = `formula-synth-${new Date().toISOString().replace(/[:.]/g, '-')}.wav`;

  // На мобильных пробуем нативный share
  const file = new File([blob], name, { type: 'audio/wav' });
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Formula Synth Recording' });
      statusEl.innerHTML = `shared — <a href="${downloadUrl}" download="${name}" style="color:#8ab4ff;">download</a>`;
      return;
    } catch (shareErr) {
      if (!(shareErr instanceof Error) || shareErr.name !== 'AbortError') {
        console.warn('Share failed:', shareErr);
      }
    }
  }

  // Фолбэк: автоскачивание
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = name;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();

  statusEl.innerHTML = `ready — <a href="${downloadUrl}" download="${name}" style="color:#8ab4ff;">download</a>`;
}
recBtn.addEventListener('click', () => void toggleRecording());

// ---------- Пресеты ----------
const presetDropdown = el('presetDropdown');
const presetDropdownBtn = buttonEl('presetDropdownBtn');
const presetDropdownMenu = el('presetDropdownMenu');
let dropdownOpen = false;

function updateDropdownButtonText(): void {
  presetDropdownBtn.textContent = selectedPresetName ?? '— Presets —';
}

function addPresetItem(name: string, state: AppState, deletable: boolean, id?: number): void {
  const item = document.createElement('div');
  item.className = 'preset-item';
  if (selectedPresetName === name) item.classList.add('selected');

  if (id !== undefined) {
    // id = 1-based индекс встроенного пресета — он же работает в ?preset=N.
    const idSpan = document.createElement('span');
    idSpan.className = 'preset-item-id';
    idSpan.textContent = String(id);
    item.appendChild(idSpan);
  }

  const nameSpan = document.createElement('span');
  nameSpan.className = 'preset-item-name';
  nameSpan.textContent = name;
  item.appendChild(nameSpan);

  if (deletable) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'preset-delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Delete preset';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Delete preset "${name}"?`)) {
        userPresets = userPresets.filter((p) => p.name !== name);
        saveUserPresets(userPresets);
        if (selectedPresetName === name) selectedPresetName = null;
        populatePresetDropdown();
        setStatus(`deleted: ${name}`);
      }
    });
    item.appendChild(deleteBtn);
  }

  item.addEventListener('click', (e) => {
    e.stopPropagation();
    selectPreset(name, state);
    closeDropdown();
  });

  presetDropdownMenu.appendChild(item);
}

function populatePresetDropdown(): void {
  presetDropdownMenu.innerHTML = '';

  if (PRESETS.length > 0) {
    const label = document.createElement('div');
    label.className = 'preset-section-label';
    label.textContent = 'Built-in';
    presetDropdownMenu.appendChild(label);
    PRESETS.forEach((preset, i) => { addPresetItem(preset.name, preset.state, false, i + 1); });
  }

  if (userPresets.length > 0) {
    if (presetDropdownMenu.children.length > 0) {
      const divider = document.createElement('div');
      divider.className = 'preset-divider';
      presetDropdownMenu.appendChild(divider);
    }
    const label = document.createElement('div');
    label.className = 'preset-section-label';
    label.textContent = 'My presets';
    presetDropdownMenu.appendChild(label);
    for (const preset of userPresets) addPresetItem(preset.name, preset.state, true);
  }

  updateDropdownButtonText();
}

function selectPreset(name: string, state: AppState): void {
  selectedPresetName = name;
  applyStateToUI(state, true);
  if (engine.running) engine.applyState(readStateFromUI());
  updateResetButtons();
  setStatus(`loaded: ${name}`);
  updateDropdownButtonText();
  populatePresetDropdown();
}

function openDropdown(): void {
  dropdownOpen = true;
  presetDropdownMenu.classList.add('open');
}

function closeDropdown(): void {
  dropdownOpen = false;
  presetDropdownMenu.classList.remove('open');
}

presetDropdownBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (dropdownOpen) closeDropdown();
  else openDropdown();
});

document.addEventListener('click', (e) => {
  if (e.target instanceof Node && !presetDropdown.contains(e.target)) closeDropdown();
});

function addUserPreset(name: string, state: AppState): void {
  const existing = userPresets.find((p) => p.name === name);
  if (existing) existing.state = state;
  else userPresets.push({ name, state });
  saveUserPresets(userPresets);
  populatePresetDropdown();
}

buttonEl('savePresetBtn').addEventListener('click', () => {
  const defaultName = `Preset ${nextPresetNumber(userPresets)}`;
  const name = prompt('Enter preset name:', defaultName);
  if (name === null) return;

  const finalName = name.trim() || defaultName;
  addUserPreset(finalName, readStateFromUI());
  selectedPresetName = finalName;
  updateDropdownButtonText();
  populatePresetDropdown();
  setStatus(`saved: ${finalName}`);
});

// ---------- Share ----------
buttonEl('shareBtn').addEventListener('click', async () => {
  const state = readStateFromUI();
  if (selectedPresetName) state.presetName = selectedPresetName;
  history.replaceState(null, '', `#s=${encodeStateToken(state)}`);
  try {
    await navigator.clipboard.writeText(location.href);
    setStatus('link copied');
  } catch {
    setStatus('link in URL');
  }
});

// ---------- Help ----------
const helpOverlay = el('helpOverlay');

function openHelp(): void {
  helpOverlay.classList.add('open');
}

function closeHelp(): void {
  helpOverlay.classList.remove('open');
  localStorage.setItem(HELP_SHOWN_KEY, 'true');
}

if (!localStorage.getItem(HELP_SHOWN_KEY)) openHelp();

buttonEl('helpCloseBtn').addEventListener('click', closeHelp);
buttonEl('helpBtn').addEventListener('click', openHelp);
helpOverlay.addEventListener('click', (e) => {
  if (e.target === helpOverlay) closeHelp();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && helpOverlay.classList.contains('open')) closeHelp();
});

// ---------- Инициализация ----------
setupAdjustmentButtons(formulasRoot);
setupAdjustmentButtons(effectsPanel);
const topgrid = document.querySelector('.topgrid');
if (topgrid instanceof HTMLElement) setupAdjustmentButtons(topgrid);

userPresets = loadUserPresets();
populatePresetDropdown();
updateFXLabels();

// Встроенный пресет по query-параметру ?preset=<имя|номер>: точное имя,
// затем без учёта регистра, затем 1-based индекс. Удобно шарить конкретный
// пресет коротким URL (полное состояние по-прежнему едет в #s=…).
function findBuiltinPreset(q: string): (typeof PRESETS)[number] | null {
  const key = q.trim();
  if (!key) return null;
  const exact = PRESETS.find((p) => p.name === key);
  if (exact) return exact;
  const ci = PRESETS.find((p) => p.name.toLowerCase() === key.toLowerCase());
  if (ci) return ci;
  if (/^\d+$/.test(key)) {
    const idx = Number(key) - 1;
    if (idx >= 0 && idx < PRESETS.length) return PRESETS[idx];
  }
  return null;
}

const urlToken = tokenFromHash(location.hash);
const urlState = urlToken ? decodeStateToken(urlToken) : null;
const presetParam = new URLSearchParams(location.search).get('preset');
if (urlState) {
  applyStateToUI(urlState);
  // именованный шаренный пресет автоматически сохраняем получателю
  if (urlState.presetName) {
    const presetName = urlState.presetName;
    const stateToSave = readStateFromUI();
    addUserPreset(presetName, stateToSave);
    selectedPresetName = presetName;
    updateDropdownButtonText();
    populatePresetDropdown();
    setStatus(`loaded shared: ${presetName}`);
  }
} else if (presetParam !== null) {
  const preset = findBuiltinPreset(presetParam);
  if (preset) selectPreset(preset.name, preset.state);
  else setStatus(`unknown preset: ${presetParam}`);
}
