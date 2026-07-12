// Formula Synth — сборка UI: карточки формул, панель эффектов, пресеты,
// share-ссылки, запись WAV, осциллограф. Аудио — в audio/engine.ts.
import { FORMULAS } from './formulas';
import { PRESETS } from './presets';
import { AudioEngine } from './audio/engine';
import { encodeWAV } from './dsp/wav';
import type { AppState, FxState, PartialAppState } from './state/schema';
import type { ModState } from './dsp/mod';
import { ModMatrix } from './ui/modmatrix';
import { DEFAULT_FX, DEFAULT_MASTER_GAIN } from './state/schema';
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
function updateModIndicators(mod: ModState | undefined): void {
  const targets = new Set((mod?.routes ?? []).map((r) => `${r.formula}_${r.param}`));
  for (const f of FORMULAS) {
    for (const s of f.sliders) {
      const row = document.getElementById(`${f.id}_${s.k}`)?.closest('.ctrl');
      if (row) row.classList.toggle('modulated', targets.has(`${f.id}_${s.k}`));
    }
  }
}
const modMatrix = new ModMatrix({
  host: el('modPanel'),
  formulas: FORMULAS,
  lfoCount: 3,
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
function readFxFromUI(): FxState {
  const filterTypeRaw = selectEl('fxFilterType').value;
  const chorusModeRaw = selectEl('fxChorusMode').value;
  return {
    filterOn: inputEl('fxFilterOn').checked,
    filterType: filterTypeRaw === 'highpass' ? 'highpass' : filterTypeRaw === 'bandpass' ? 'bandpass' : 'lowpass',
    filterFreq: Number(inputEl('fxFilterFreq').value),
    filterQ: Number(inputEl('fxFilterQ').value),
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

function updateFXLabels(): void {
  el('fxFilterFreqVal').textContent = inputEl('fxFilterFreq').value;
  el('fxFilterQVal').textContent = Number(inputEl('fxFilterQ').value).toFixed(1);
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

scopeToggleBtn.addEventListener('click', () => {
  setScopeCollapsed(!scopeWrap.classList.contains('scopeCollapsed'));
});

scopeModeBtn.addEventListener('click', () => {
  scopeModeBtn.textContent = scope.toggleMode() === 'wave' ? 'Wave' : 'Spectrum';
});

// ---------- Панель эффектов ----------
const effectsPanel = el('effectsPanel');
const effectsBtn = buttonEl('effectsBtn');
const modPanel = el('modPanel');
const modBtn = buttonEl('modBtn');

function closeModPanel(): void {
  modPanel.classList.remove('open');
  modBtn.classList.remove('active');
}
function closeEffectsPanel(): void {
  effectsPanel.classList.remove('open');
  effectsBtn.classList.remove('active');
}

effectsBtn.addEventListener('click', () => {
  const open = !effectsPanel.classList.contains('open');
  effectsPanel.classList.toggle('open', open);
  effectsBtn.classList.toggle('active', open);
  if (open) closeModPanel();
  // панель эффектов вытесняет осциллограф
  setScopeCollapsed(open);
});

modBtn.addEventListener('click', () => {
  const open = !modPanel.classList.contains('open');
  modPanel.classList.toggle('open', open);
  modBtn.classList.toggle('active', open);
  if (open) { closeEffectsPanel(); setScopeCollapsed(true); }
});

const fxRoutingInputs = ['fxFilterOn', 'fxChorusOn', 'fxReverbOn', 'fxLimiterOn', 'fxDelayOn', 'fxPhaserOn'];
for (const id of fxRoutingInputs) {
  inputEl(id).addEventListener('change', () => {
    if (engine.running) engine.applyFx(readFxFromUI());
  });
}

const fxParamInputs = [
  'fxFilterType', 'fxFilterFreq', 'fxFilterQ',
  'fxChorusMode', 'fxChorusRate', 'fxChorusDepth', 'fxChorusMix', 'fxChorusFb',
  'fxReverbDecay', 'fxReverbMix',
  'fxLimiterThr', 'fxLimiterRel',
  'fxDelayTime', 'fxDelayFb', 'fxDelayMix',
  'fxPhaserRate', 'fxPhaserDepth', 'fxPhaserStages', 'fxPhaserFb', 'fxPhaserMix',
];
for (const id of fxParamInputs) {
  el(id).addEventListener('input', () => {
    updateFXLabels();
    if (engine.running) engine.applyFxParams(readFxFromUI());
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

function addPresetItem(name: string, state: AppState, deletable: boolean): void {
  const item = document.createElement('div');
  item.className = 'preset-item';
  if (selectedPresetName === name) item.classList.add('selected');

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
    for (const preset of PRESETS) addPresetItem(preset.name, preset.state, false);
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

const urlToken = tokenFromHash(location.hash);
const urlState = urlToken ? decodeStateToken(urlToken) : null;
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
}
