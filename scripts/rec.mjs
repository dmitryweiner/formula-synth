#!/usr/bin/env node
// Записывает звук РЕАЛЬНОГО движка в WAV (через кнопку Rec в headless-Chromium)
// и печатает метрики: пик, RMS и — по флагу — щёлчки (разрывы сэмплов). Нужен
// затем, что vitest не грузит Web Audio, а smoke ловит лишь ошибки консоли, но
// НЕ звук. Так можно измерять «а не поменялся/не щёлкает ли звук» объективно.
//
//   node scripts/rec.mjs --preset "Psychedelic melt (FX mod)" --secs 12 --clicks
//   node scripts/rec.mjs --preset "Deep phaser demo" --set fxPhaserDepth=0.3 --clicks
//   node scripts/rec.mjs --hash <token> --out shots/x.wav
//   node scripts/rec.mjs --url http://localhost:5173/?preset=8 --enable additive,fm
//
// --preset/--hash/--url — источник (иначе пустое приложение). --set id=val
// (можно повторять) правит слайдер/селект перед записью. --enable a,b включает
// формулы. --secs N (10). --out путь (shots/rec.wav). --clicks — анализ разрывов.
// Dev-сервер поднимается сам (и гасится), если порт свободен.

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const VALUE_FLAGS = new Set(['preset', 'hash', 'url', 'secs', 'out', 'enable']);
const flags = new Map();
const sets = []; // --set id=value, можно несколько
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (!a.startsWith('--')) continue;
  const name = a.slice(2);
  if (name === 'set') sets.push(args[++i]);
  else flags.set(name, VALUE_FLAGS.has(name) ? args[++i] : 'true');
}

const preview = flags.has('preview');
const PORT = preview ? 4173 : 5173;
const BASE = `http://localhost:${PORT}`;
const SECS = Number(flags.get('secs') ?? 10);
const OUT = flags.get('out') ?? 'shots/rec.wav';

async function serverUp() { try { return (await fetch(BASE)).ok; } catch { return false; } }
let devProc = null;
async function ensureServer() {
  if (await serverUp()) return;
  const cmd = preview
    ? ['vite', 'preview', '--port', String(PORT), '--strictPort']
    : ['vite', '--port', String(PORT), '--strictPort'];
  devProc = spawn('npx', cmd, { stdio: 'ignore' });
  for (let i = 0; i < 30 && !(await serverUp()); i++) await new Promise((r) => setTimeout(r, 1000));
  if (!(await serverUp())) { console.error(`сервер не поднялся на :${PORT}`); process.exit(1); }
}

function urlFor() {
  if (flags.has('url')) return flags.get('url');
  if (flags.has('hash')) return `${BASE}/#s=${flags.get('hash')}`;
  if (flags.has('preset')) return `${BASE}/?preset=${encodeURIComponent(flags.get('preset'))}`;
  return BASE;
}

// --- запись ---
await ensureServer();
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(urlFor());
await page.waitForTimeout(500);
await page.locator('#helpCloseBtn').click({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(200);

if (flags.has('enable')) {
  for (const id of flags.get('enable').split(',')) {
    await page.locator(`#en_${id.trim()}`).click().catch((e) => errors.push(`enable ${id}: ${e}`));
    await page.waitForTimeout(150);
  }
}
await page.locator('#playStopBtn').click().catch(() => {});
await page.waitForTimeout(500);

for (const kv of sets) {
  const eq = kv.indexOf('=');
  const id = kv.slice(0, eq);
  const val = kv.slice(eq + 1);
  await page.evaluate(([id, val]) => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`нет контрола #${id}`);
    if (el.type === 'checkbox') el.checked = val === 'true' || val === '1';
    else el.value = String(val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, [id, val]).catch((e) => errors.push(`set ${kv}: ${e}`));
  await page.waitForTimeout(120);
}

const downloadP = page.waitForEvent('download', { timeout: (SECS + 30) * 1000 });
await page.locator('#recBtn').click();          // старт записи
await page.waitForTimeout(SECS * 1000);
await page.locator('#recBtn').click();          // стоп → download (WAV)
const download = await downloadP;
mkdirSync(dirname(OUT), { recursive: true });
await download.saveAs(OUT);
await browser.close();
devProc?.kill();

// --- разбор WAV (16-bit PCM из dsp/wav.ts) ---
const buf = readFileSync(OUT);
let off = 12, dataOff = -1, dataLen = 0, sr = 48000, ch = 1;
while (off + 8 <= buf.length) {
  const id = buf.toString('ascii', off, off + 4);
  const sz = buf.readUInt32LE(off + 4);
  if (id === 'fmt ') { ch = buf.readUInt16LE(off + 10); sr = buf.readUInt32LE(off + 12); }
  if (id === 'data') { dataOff = off + 8; dataLen = sz; break; }
  off += 8 + sz + (sz & 1);
}
const n = Math.floor(dataLen / 2 / ch);
const x = new Float32Array(n);
for (let i = 0; i < n; i++) x[i] = buf.readInt16LE(dataOff + i * 2 * ch) / 32768;

let peak = 0, sum2 = 0;
for (let i = 0; i < n; i++) { const a = Math.abs(x[i]); if (a > peak) peak = a; sum2 += x[i] * x[i]; }
const out = { out: OUT, secs: +(n / sr).toFixed(2), peak: +peak.toFixed(3), rms: +Math.sqrt(sum2 / n).toFixed(4) };

if (flags.has('clicks')) {
  // Щёлчок = кадр с аномально высокой ВЧ-энергией (2-я разность ≈ ФВЧ).
  const frame = Math.round(sr * 0.005);
  const nf = Math.floor(n / frame);
  const hf = new Float32Array(nf);
  for (let f = 0; f < nf; f++) {
    let e = 0;
    for (let i = 2; i < frame; i++) {
      const j = f * frame + i;
      const dd = x[j] - 2 * x[j - 1] + x[j - 2];
      e += dd * dd;
    }
    hf[f] = Math.sqrt(e / frame);
  }
  const med = [...hf].sort((a, b) => a - b)[Math.floor(nf / 2)] || 1e-9;
  const times = [];
  let last = -1e9;
  for (let f = 1; f < nf; f++) {
    const t = (f * frame) / sr;
    if (hf[f] > med * 6 && hf[f] > 0.002 && t - last > 0.04) { times.push(+t.toFixed(2)); last = t; }
  }
  out.clickCount = times.length;
  out.clickTimes = times;
}

console.log(JSON.stringify(out));
console.log('console/page errors:', errors.length ? errors : 'none');
process.exit(errors.length ? 2 : 0);
