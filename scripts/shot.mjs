#!/usr/bin/env node
// Скриншоты приложения в headless-Chromium — для визуальной проверки UI
// и смоук-теста аудио (включает формулу и смотрит на консольные ошибки).
//
//   node scripts/shot.mjs                  # базовый кадр + кадр с играющей формулой
//   node scripts/shot.mjs --mobile         # мобильный вьюпорт 420×850
//   node scripts/shot.mjs --fx             # + кадр с открытой панелью эффектов
//   node scripts/shot.mjs --preset 1       # выбрать встроенный пресет по индексу
//   node scripts/shot.mjs --preview        # прод-сборка из docs (vite preview :4173)
//   node scripts/shot.mjs --wait 3         # подождать перед кадром (default 1.5)
//   node scripts/shot.mjs --help-shot      # оставить help-модалку в кадре
//
// Кадры пишутся в ./shots/*.png. Dev-сервер поднимается сам (и гасится),
// если на порту ещё ничего не слушает.

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const VALUE_FLAGS = new Set(['wait', 'out', 'preset']);
const flags = new Map();
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('--')) {
    const name = a.slice(2);
    flags.set(name, VALUE_FLAGS.has(name) ? args[++i] : 'true');
  }
}
const waitSec = Number(flags.get('wait') ?? 1.5);
const mobile = flags.has('mobile');
const preview = flags.has('preview');
const outDir = flags.get('out') ?? 'shots';
const suffix = mobile ? '-mobile' : '';

const PORT = preview ? 4173 : 5173;
const BASE = `http://localhost:${PORT}`;

async function serverUp() {
  try {
    const res = await fetch(BASE);
    return res.ok;
  } catch {
    return false;
  }
}

let devProc = null;
if (!(await serverUp())) {
  const cmd = preview
    ? ['vite', 'preview', '--port', String(PORT), '--strictPort']
    : ['vite', '--port', String(PORT), '--strictPort'];
  devProc = spawn('npx', cmd, { stdio: 'ignore', detached: false });
  for (let i = 0; i < 30 && !(await serverUp()); i++) {
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!(await serverUp())) {
    console.error(`сервер не поднялся на :${PORT}`);
    process.exit(1);
  }
}

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage(
  mobile
    ? { viewport: { width: 420, height: 850 }, hasTouch: true, isMobile: true }
    : { viewport: { width: 1280, height: 800 } },
);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

await page.goto(BASE);
await page.waitForTimeout(500);

if (flags.has('help-shot')) {
  await page.screenshot({ path: `${outDir}/help${suffix}.png` });
  console.log(`${outDir}/help${suffix}.png`);
}
// закрыть help-модалку (появляется на первый визит)
await page.locator('#helpCloseBtn').click({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(200);

await page.screenshot({ path: `${outDir}/base${suffix}.png`, fullPage: true });
console.log(`${outDir}/base${suffix}.png`);

if (flags.has('preset')) {
  await page.locator('#presetDropdownBtn').click();
  const idx = Number(flags.get('preset'));
  await page.locator('.preset-item').nth(idx).click();
  await page.waitForTimeout(300);
}

// включить формулу (первый чекбокс — additive) → аудио стартует само
await page.locator('#en_additive').click();
await page.waitForTimeout(waitSec * 1000);
await page.screenshot({ path: `${outDir}/playing${suffix}.png` });
console.log(`${outDir}/playing${suffix}.png`);

if (flags.has('fx')) {
  await page.locator('#effectsBtn').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/fx${suffix}.png` });
  console.log(`${outDir}/fx${suffix}.png`);
}

const status = await page.locator('#status').textContent();
console.log('status:', status);
console.log('console/page errors:', errors.length ? errors : 'none');
await browser.close();
devProc?.kill();
process.exit(errors.length ? 2 : 0);
