// UI матрицы модуляции (phase 4): панель Modulators (пул LFO) + таблица
// маршрутов «источник → формула.параметр → глубина». DOM — источник истины
// (как readFxFromUI): getState() читает контролы, setState() их выставляет.
// Чистого состояния не держим, чтобы не рассинхронизироваться с виджетами.
import type { FormulaId } from '../dsp/generator';
import { isFormulaId } from '../dsp/generator';
import type { LfoDef, LfoShape, ModRoute, ModState } from '../dsp/mod';
import { fmt } from './format';

interface SliderInfo { k: string; name: string; min: number; max: number; step: number; value: number; }
interface FormulaInfo { id: FormulaId; title: string; sliders: readonly SliderInfo[]; }

export interface ModMatrixOptions {
  host: HTMLElement;
  formulas: readonly FormulaInfo[];
  lfoCount: number;
  onChange: () => void;
  // Включена ли формула сейчас. Список приёмников в роуте фильтруется до
  // включённых (роут на выключенную формулу молчит из-за гейта). Осиротевшую
  // цель уже существующего роута оставляем видимой в его собственной строке.
  isEnabled: (id: string) => boolean;
}

const SHAPES: { value: LfoShape; label: string }[] = [
  { value: 'sine', label: 'Sine' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'saw', label: 'Saw' },
  { value: 'square', label: 'Square' },
  { value: 'random', label: 'Random (S&H)' },
];
const SHAPE_SET: ReadonlySet<string> = new Set(SHAPES.map((s) => s.value));
const SHAPE_OPTIONS = SHAPES.map((s) => `<option value="${s.value}">${s.label}</option>`).join('');

// Медленные дефолты пула: от «дыхания» до почти статики.
const DEFAULT_LFOS: readonly LfoDef[] = [
  { shape: 'sine', rate: 2, phase: 0 },
  { shape: 'sine', rate: 0.5, phase: 0 },
  { shape: 'sine', rate: 0.1, phase: 0 },
];

function toShape(v: string): LfoShape {
  return SHAPE_SET.has(v) && isShape(v) ? v : 'sine';
}
function isShape(v: string): v is LfoShape {
  return SHAPE_SET.has(v);
}

function elFromHtml(html: string): HTMLElement {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  const node = t.content.firstElementChild;
  if (!(node instanceof HTMLElement)) throw new Error('modmatrix: bad template');
  return node;
}
function qInput(root: ParentNode, sel: string): HTMLInputElement {
  const e = root.querySelector(sel);
  if (!(e instanceof HTMLInputElement)) throw new Error(`modmatrix: no input ${sel}`);
  return e;
}
function qSelect(root: ParentNode, sel: string): HTMLSelectElement {
  const e = root.querySelector(sel);
  if (!(e instanceof HTMLSelectElement)) throw new Error(`modmatrix: no select ${sel}`);
  return e;
}
function qEl(root: ParentNode, sel: string): HTMLElement {
  const e = root.querySelector(sel);
  if (!(e instanceof HTMLElement)) throw new Error(`modmatrix: no el ${sel}`);
  return e;
}
function qButton(root: ParentNode, sel: string): HTMLButtonElement {
  const e = root.querySelector(sel);
  if (!(e instanceof HTMLButtonElement)) throw new Error(`modmatrix: no button ${sel}`);
  return e;
}

const ROUTE_HTML = `
<div class="modRouteRow">
  <select class="mSrc"></select>
  <span class="modArrow">→</span>
  <select class="mFormula"></select>
  <span class="modDot">.</span>
  <select class="mParam"></select>
  <input class="mDepth" type="range" min="-1" max="1" step="0.01">
  <span class="small mDepthV"></span>
  <label class="small modExp"><input type="checkbox" class="mExp"> exp</label>
  <button class="collapseBtn mDel" type="button" title="Remove route">✕</button>
</div>`;

export class ModMatrix {
  private formulas: readonly FormulaInfo[];
  private lfoCount: number;
  private onChange: () => void;
  private isEnabled: (id: string) => boolean;
  private lfoRows: HTMLElement[] = [];
  private routesHost!: HTMLElement;
  private addBtn!: HTMLButtonElement;

  constructor(opts: ModMatrixOptions) {
    this.formulas = opts.formulas;
    this.lfoCount = opts.lfoCount;
    this.onChange = opts.onChange;
    this.isEnabled = opts.isEnabled;
    this.render(opts.host);
    this.setState(undefined);
  }

  /** Пересобрать выпадашки формул под текущий набор включённых генераторов.
   *  Зовётся из main при переключении формул / загрузке состояния. */
  refreshFormulas(): void {
    for (const row of Array.from(this.routesHost.children)) {
      const fSel = qSelect(row, '.mFormula');
      this.populateFormulaOptions(fSel, fSel.value);
    }
    this.updateAddState();
  }

  /** Текущая матрица; undefined, когда маршрутов нет (нечего модулировать). */
  getState(): ModState | undefined {
    const lfos: LfoDef[] = this.lfoRows.map((row) => ({
      shape: toShape(qSelect(row, '.mShape').value),
      rate: Number(qInput(row, '.mRate').value),
      phase: Number(qInput(row, '.mPhase').value),
    }));
    const routes: ModRoute[] = [];
    for (const row of Array.from(this.routesHost.children)) {
      const formulaRaw = qSelect(row, '.mFormula').value;
      if (!isFormulaId(formulaRaw)) continue;
      const route: ModRoute = {
        src: Number(qSelect(row, '.mSrc').value),
        formula: formulaRaw,
        param: qSelect(row, '.mParam').value,
        depth: Number(qInput(row, '.mDepth').value),
      };
      if (qInput(row, '.mExp').checked) route.exp = true;
      routes.push(route);
    }
    return routes.length ? { lfos, routes } : undefined;
  }

  /** Выставить контролы из состояния (пресет/URL). onChange не дёргаем. */
  setState(mod: ModState | undefined): void {
    const lfos = mod?.lfos ?? [];
    this.lfoRows.forEach((row, i) => {
      const def = lfos[i] ?? DEFAULT_LFOS[i] ?? DEFAULT_LFOS[0];
      qSelect(row, '.mShape').value = def.shape;
      qInput(row, '.mRate').value = String(def.rate);
      qInput(row, '.mPhase').value = String(def.phase);
      this.updateLfoLabels(row);
    });
    this.routesHost.innerHTML = '';
    for (const r of mod?.routes ?? []) this.addRoute(r);
    this.updateAddState();
  }

  private render(host: HTMLElement): void {
    host.innerHTML = `
      <div class="modSection">
        <h2>Modulators</h2>
        <div class="mLfos"></div>
      </div>
      <div class="modSection">
        <div class="modRoutesHead">
          <h2>Routes</h2>
          <button class="collapseBtn mAdd" type="button">+ add route</button>
        </div>
        <div class="mRoutes"></div>
      </div>`;

    const lfoHost = qEl(host, '.mLfos');
    this.lfoRows = [];
    for (let i = 0; i < this.lfoCount; i++) {
      const row = elFromHtml(`
        <div class="modLfoRow">
          <span class="modLfoName">LFO ${i + 1}</span>
          <select class="mShape">${SHAPE_OPTIONS}</select>
          <label class="small">Rate</label>
          <input class="mRate" type="range" min="0.02" max="8" step="0.01">
          <span class="small mRateV"></span>
          <label class="small">Phase</label>
          <input class="mPhase" type="range" min="0" max="1" step="0.01">
          <span class="small mPhaseV"></span>
        </div>`);
      qSelect(row, '.mShape').addEventListener('change', () => this.onChange());
      for (const cls of ['.mRate', '.mPhase']) {
        qInput(row, cls).addEventListener('input', () => { this.updateLfoLabels(row); this.onChange(); });
      }
      lfoHost.appendChild(row);
      this.lfoRows.push(row);
    }

    this.routesHost = qEl(host, '.mRoutes');
    this.addBtn = qButton(host, '.mAdd');
    this.addBtn.addEventListener('click', () => { this.addRoute(); this.onChange(); });
  }

  private enabledFormulas(): FormulaInfo[] {
    return this.formulas.filter((f) => this.isEnabled(f.id));
  }

  private updateAddState(): void {
    const none = this.enabledFormulas().length === 0;
    this.addBtn.disabled = none;
    this.addBtn.title = none ? 'Enable a formula first' : '';
  }

  // Опции = включённые формулы; плюс текущая цель роута, даже если она сейчас
  // выключена (помечаем «(off)»), чтобы роут не осиротел и не потерялся.
  private populateFormulaOptions(fSel: HTMLSelectElement, currentId: string): void {
    const enabled = this.enabledFormulas();
    const ids = new Set<string>(enabled.map((f) => f.id));
    const list = [...enabled];
    if (currentId && !ids.has(currentId)) {
      const target = this.formulas.find((f) => f.id === currentId);
      if (target) list.unshift(target);
    }
    fSel.innerHTML = '';
    for (const f of list) {
      const o = document.createElement('option');
      o.value = f.id;
      o.textContent = ids.has(f.id) ? f.title : `${f.title} (off)`;
      fSel.appendChild(o);
    }
    if (currentId) fSel.value = currentId;
  }

  private updateLfoLabels(row: HTMLElement): void {
    qEl(row, '.mRateV').textContent = `${fmt(Number(qInput(row, '.mRate').value))} Hz`;
    qEl(row, '.mPhaseV').textContent = Number(qInput(row, '.mPhase').value).toFixed(2);
  }

  private addRoute(route?: ModRoute): void {
    const row = elFromHtml(ROUTE_HTML);
    const src = qSelect(row, '.mSrc');
    for (let i = 0; i < this.lfoCount; i++) {
      const o = document.createElement('option');
      o.value = String(i); o.textContent = `LFO ${i + 1}`;
      src.appendChild(o);
    }
    const fSel = qSelect(row, '.mFormula');
    const pSel = qSelect(row, '.mParam');
    const depth = qInput(row, '.mDepth');
    const exp = qInput(row, '.mExp');

    const formulaId = route ? route.formula : (this.enabledFormulas()[0]?.id ?? this.formulas[0].id);
    this.populateFormulaOptions(fSel, formulaId);
    this.populateParams(formulaId, pSel, route?.param);
    src.value = String(route ? route.src : 0);
    depth.value = String(route ? route.depth : 0.3);
    exp.checked = route ? route.exp === true : this.freqDefault(formulaId, pSel.value);
    this.updateDepthLabel(row);

    fSel.addEventListener('change', () => {
      const id = fSel.value;
      this.populateFormulaOptions(fSel, id); // сбросить более не выбранную «(off)»-цель
      this.populateParams(id, pSel);
      exp.checked = this.freqDefault(id, pSel.value);
      this.onChange();
    });
    pSel.addEventListener('change', () => {
      exp.checked = this.freqDefault(fSel.value, pSel.value);
      this.onChange();
    });
    src.addEventListener('change', () => this.onChange());
    exp.addEventListener('change', () => this.onChange());
    depth.addEventListener('input', () => { this.updateDepthLabel(row); this.onChange(); });
    qEl(row, '.mDel').addEventListener('click', () => { row.remove(); this.onChange(); });

    this.routesHost.appendChild(row);
  }

  private updateDepthLabel(row: HTMLElement): void {
    const d = Number(qInput(row, '.mDepth').value);
    qEl(row, '.mDepthV').textContent = (d >= 0 ? '+' : '') + d.toFixed(2);
  }

  private populateParams(formulaId: string, pSel: HTMLSelectElement, selected?: string): void {
    const f = this.formulas.find((x) => x.id === formulaId);
    pSel.innerHTML = '';
    if (!f) return;
    for (const s of f.sliders) {
      const o = document.createElement('option');
      o.value = s.k; o.textContent = s.name;
      pSel.appendChild(o);
    }
    if (selected !== undefined && f.sliders.some((s) => s.k === selected)) pSel.value = selected;
  }

  // Частотные слайдеры («… (Hz)») по умолчанию модулируются в октавах (exp).
  private freqDefault(formulaId: string, paramK: string): boolean {
    const s = this.formulas.find((x) => x.id === formulaId)?.sliders.find((sl) => sl.k === paramK);
    return s ? /\(hz\)/i.test(s.name) : false;
  }
}
