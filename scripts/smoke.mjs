#!/usr/bin/env node
// Переиспользуемый браузерный смоук — заменяет одноразовые скрипты «подними
// dev, дёрни chromium, поймай ошибки консоли». Движок/фильтры/воркалет нельзя
// грузить в vitest (Web Audio + registerProcessor), поэтому проверяем их здесь.
//
//   node scripts/smoke.mjs                      # СТОЯЧИЙ смоук: каждый встроенный
//                                               # пресет грузится и играет, каждая
//                                               # формула включается — без ошибок
//   node scripts/smoke.mjs --preset "Metallic comb" --play
//   node scripts/smoke.mjs --preset "Vowel choir (formant)" --panel effects --screenshot shots/x.png
//   node scripts/smoke.mjs --hash <token>       # открыть #s=<token>
//   node scripts/smoke.mjs --url http://localhost:5173/?preset=8
//   node scripts/smoke.mjs --enable additive,fm --panel mod
//   node scripts/smoke.mjs --enable fm --panel effects --fx-preset "Jet flanger"
//   node scripts/smoke.mjs --preview            # прод-сборка (vite preview :4173)
//
// Любая ошибка консоли/страницы → ненулевой код выхода (годится для CI).

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const VALUE_FLAGS = new Set(['preset', 'hash', 'url', 'panel', 'enable', 'screenshot', 'fx-preset']);
const flags = new Map();
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('--')) {
    const name = a.slice(2);
    flags.set(name, VALUE_FLAGS.has(name) ? args[++i] : 'true');
  }
}

const preview = flags.has('preview');
const PORT = preview ? 4173 : 5173;
const BASE = `http://localhost:${PORT}`;
const PANEL_BTN = { scope: '#scopeToggleBtn', effects: '#effectsBtn', mod: '#modBtn' };

async function serverUp() {
  try { return (await fetch(BASE)).ok; } catch { return false; }
}

let devProc = null;
async function ensureServer() {
  if (await serverUp()) return;
  const cmd = preview
    ? ['vite', 'preview', '--port', String(PORT), '--strictPort']
    : ['vite', '--port', String(PORT), '--strictPort'];
  devProc = spawn('npx', cmd, { stdio: 'ignore' });
  for (let i = 0; i < 30 && !(await serverUp()); i++) await new Promise((r) => setTimeout(r, 1000));
  if (!(await serverUp())) { console.error(`server did not start on :${PORT}`); process.exit(1); }
}

const errors = [];
let ctxLabel = 'app';
function attach(page) {
  page.on('pageerror', (e) => errors.push(`[${ctxLabel}] ${String(e)}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${ctxLabel}] ${m.text()}`); });
}
async function closeHelp(page) {
  await page.locator('#helpCloseBtn').click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(150);
}

async function standingSmoke(page) {
  // 1) каждая формула включается без ошибок (тумблим on→off)
  await page.goto(BASE); await page.waitForTimeout(400); await closeHelp(page);
  const ids = await page.$$eval('[id^="en_"]', (els) => els.map((e) => e.id.replace('en_', '')));
  for (const id of ids) {
    ctxLabel = `formula:${id}`;
    await page.locator(`#en_${id}`).click(); await page.waitForTimeout(120);
    await page.locator(`#en_${id}`).click().catch(() => {}); await page.waitForTimeout(60);
  }
  console.log(`formulas checked: ${ids.length}`);

  // 2) каждый встроенный пресет грузится и играет
  await page.locator('#presetDropdownBtn').click(); await page.waitForTimeout(150);
  const names = await page.$$eval('#presetDropdownMenu .preset-item', (els) => els.map((e) => e.textContent.trim()));
  await page.locator('#presetDropdownBtn').click();
  let played = 0;
  for (const name of names) {
    ctxLabel = `preset:${name}`;
    await page.goto(`${BASE}/?preset=${encodeURIComponent(name)}`); await page.waitForTimeout(350);
    await closeHelp(page);
    await page.locator('#playStopBtn').click().catch(() => {});
    await page.waitForTimeout(900);
    const status = await page.locator('#status').textContent();
    if (status !== 'running') errors.push(`[preset:${name}] status="${status}" (ожидалось running)`);
    else played++;
  }
  console.log(`presets played: ${played}/${names.length}`);
}

async function targeted(page) {
  const url = flags.get('url')
    ?? (flags.has('hash') ? `${BASE}/#s=${flags.get('hash')}`
      : flags.has('preset') ? `${BASE}/?preset=${encodeURIComponent(flags.get('preset'))}`
        : BASE);
  ctxLabel = flags.get('preset') ?? flags.get('hash') ?? url;
  await page.goto(url); await page.waitForTimeout(400); await closeHelp(page);

  if (flags.has('enable')) {
    for (const id of flags.get('enable').split(',')) {
      await page.locator(`#en_${id.trim()}`).click().catch((e) => errors.push(`enable ${id}: ${e}`));
      await page.waitForTimeout(150);
    }
  }
  if (flags.has('panel')) {
    const sel = PANEL_BTN[flags.get('panel')];
    if (sel) { await page.locator(sel).click(); await page.waitForTimeout(200); }
  }
  if (flags.has('fx-preset')) {
    await page.locator('#fxPreset').selectOption(flags.get('fx-preset')).catch((e) => errors.push(`fx-preset: ${e}`));
    await page.waitForTimeout(200);
    console.log('fx-preset applied ->', await page.locator('#fxPreset').inputValue() || '(none)');
  }
  if (flags.has('play')) { await page.locator('#playStopBtn').click().catch(() => {}); }
  await page.waitForTimeout(1500);

  if (flags.has('screenshot')) {
    const path = flags.get('screenshot');
    mkdirSync(dirname(path), { recursive: true });
    await page.screenshot({ path });
    console.log(path);
  }
  console.log('status:', await page.locator('#status').textContent());
}

await ensureServer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
attach(page);

const isTargeted = ['preset', 'hash', 'url', 'panel', 'enable', 'screenshot', 'play', 'fx-preset'].some((f) => flags.has(f));
if (isTargeted) await targeted(page);
else await standingSmoke(page);

console.log('console/page errors:', errors.length ? errors : 'none');
await browser.close();
devProc?.kill();
process.exit(errors.length ? 2 : 0);
