// Осциллограф + спектрограмма-водопад на canvas.
// Спектрограмма скроллится с постоянной скоростью (~30 кадров/с по таймеру,
// а не по rAF — иначе троттлинг браузера менял скорость прокрутки).
export type ScopeMode = 'wave' | 'spectrum';

const SPECTRO_INTERVAL = 33; // мс между колонками водопада
const MIN_FREQ = 20;     // нижняя граница слышимого
const MAX_FREQ = 10000;  // верх отображения

/** 0–255 → цвет: от синего (тихо) к красному (громко). */
export function spectroColor(value: number): string {
  const v = Math.min(255, Math.max(0, value));
  const hue = 240 - (v / 255) * 240;
  const lightness = 20 + (v / 255) * 40;
  return `hsl(${hue}, 100%, ${lightness}%)`;
}

function ctx2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const c = canvas.getContext('2d');
  if (!c) throw new Error('canvas 2d context недоступен');
  return c;
}

export class Scope {
  mode: ScopeMode = 'spectrum';

  private canvas: HTMLCanvasElement;
  private wrap: HTMLElement;
  private c2d: CanvasRenderingContext2D;
  private analyser: AnalyserNode | null = null;
  private nyquist = 24000;
  private raf: number | null = null;
  private autoGain = 1.0;
  private pageVisible = !document.hidden;

  private spectroCanvas: HTMLCanvasElement | null = null;
  private spectroCtx: CanvasRenderingContext2D | null = null;
  private lastW = 0;
  private lastH = 0;
  private lastSpectroTime = 0;

  constructor(canvas: HTMLCanvasElement, wrap: HTMLElement) {
    this.canvas = canvas;
    this.wrap = wrap;
    this.c2d = ctx2d(canvas);
    window.addEventListener('resize', () => this.resize());
  }

  get active(): boolean {
    return this.raf !== null;
  }

  setPageVisible(visible: boolean): void {
    this.pageVisible = visible;
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    if (this.analyser) {
      this.initSpectro(this.canvas.width, this.canvas.height);
    }
  }

  start(analyser: AnalyserNode, sampleRate: number): void {
    this.analyser = analyser;
    this.nyquist = sampleRate / 2;
    if (this.raf !== null) return;
    this.resize();
    this.initSpectro(this.canvas.width, this.canvas.height);

    const timeBuf = new Uint8Array(analyser.fftSize);
    const freqBuf = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      this.raf = requestAnimationFrame(draw);
      if (!this.analyser) return;
      if (!this.pageVisible) return; // страница скрыта — экономим CPU
      if (this.wrap.classList.contains('scopeCollapsed')) return;

      this.analyser.getByteTimeDomainData(timeBuf);
      this.analyser.getByteFrequencyData(freqBuf);

      const w = this.canvas.width, h = this.canvas.height;
      if (w !== this.lastW || h !== this.lastH) this.initSpectro(w, h);

      if (this.mode === 'spectrum') this.drawSpectrum(freqBuf, w, h);
      else this.drawWave(timeBuf, w, h);
    };
    draw();
  }

  stop(): void {
    if (this.raf !== null) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
    this.analyser = null;
  }

  toggleMode(): ScopeMode {
    this.mode = this.mode === 'wave' ? 'spectrum' : 'wave';
    return this.mode;
  }

  private initSpectro(w: number, h: number): void {
    if (this.spectroCanvas && this.lastW === w && this.lastH === h) return;

    const newCanvas = document.createElement('canvas');
    newCanvas.width = w;
    newCanvas.height = h;
    const newCtx = ctx2d(newCanvas);
    newCtx.fillStyle = '#060a0f';
    newCtx.fillRect(0, 0, w, h);
    // содержимое старого водопада сохраняем с масштабированием
    if (this.spectroCanvas) newCtx.drawImage(this.spectroCanvas, 0, 0, w, h);

    this.spectroCanvas = newCanvas;
    this.spectroCtx = newCtx;
    this.lastW = w;
    this.lastH = h;
  }

  private drawSpectrum(freqBuf: Uint8Array, w: number, h: number): void {
    const now = performance.now();
    if (now - this.lastSpectroTime >= SPECTRO_INTERVAL && this.spectroCtx && this.spectroCanvas) {
      this.lastSpectroTime = now;
      const shift = 2;
      this.spectroCtx.drawImage(this.spectroCanvas, -shift, 0);

      const bins = freqBuf.length;
      for (let i = 0; i < h; i++) {
        // логарифмическая шкала: y=0 (верх) → MAX_FREQ, y=h (низ) → MIN_FREQ
        const normalizedY = i / h;
        const freq = MAX_FREQ * Math.pow(MIN_FREQ / MAX_FREQ, normalizedY);
        const binIndex = Math.floor((freq / this.nyquist) * bins);
        const value = freqBuf[Math.min(binIndex, bins - 1)];
        this.spectroCtx.fillStyle = spectroColor(value);
        this.spectroCtx.fillRect(w - shift, i, shift, 1);
      }
    }

    if (this.spectroCanvas) {
      this.c2d.drawImage(this.spectroCanvas, 0, 0);
    } else {
      this.c2d.fillStyle = '#060a0f';
      this.c2d.fillRect(0, 0, w, h);
    }
  }

  private drawWave(timeBuf: Uint8Array, w: number, h: number): void {
    let peak = 1e-4;
    for (let i = 0; i < timeBuf.length; i++) {
      const a = Math.abs((timeBuf[i] - 128) / 128);
      if (a > peak) peak = a;
    }
    // автомасштаб по Y с плавным подстраиванием
    let target = 0.85 / peak;
    target = Math.max(0.25, Math.min(12.0, target));
    this.autoGain += (target - this.autoGain) * 0.08;

    this.c2d.fillStyle = '#060a0f';
    this.c2d.fillRect(0, 0, w, h);

    this.c2d.strokeStyle = 'rgba(18, 32, 51, 0.7)';
    this.c2d.lineWidth = 1;
    this.c2d.beginPath();
    for (let i = 1; i < 10; i++) {
      const x = (w * i) / 10;
      this.c2d.moveTo(x, 0);
      this.c2d.lineTo(x, h);
    }
    for (let i = 1; i < 5; i++) {
      const y = (h * i) / 5;
      this.c2d.moveTo(0, y);
      this.c2d.lineTo(w, y);
    }
    this.c2d.stroke();

    const mid = h / 2;
    this.c2d.strokeStyle = '#8ab4ff';
    this.c2d.lineWidth = 2;
    this.c2d.beginPath();
    for (let i = 0; i < timeBuf.length; i++) {
      const v = (timeBuf[i] - 128) / 128;
      const y = mid - v * (mid * 0.9) * this.autoGain;
      const x = (w * i) / (timeBuf.length - 1);
      if (i === 0) this.c2d.moveTo(x, y);
      else this.c2d.lineTo(x, y);
    }
    this.c2d.stroke();
  }
}
