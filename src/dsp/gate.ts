// Гейт выключенного генератора: плавный фейд до тишины, после чего
// воркалет вообще не считает семплы (экономия CPU аудиопотока).
// Полный фейд — FADE_BLOCKS блоков по 128 семплов (~13 мс на 48 кГц).
const FADE_BLOCKS = 5;

export const FADE_STEP = 1 / (FADE_BLOCKS * 128);

/** Тишина без расчёта: фейд закончился и генератор выключен. */
export function gateIsSilent(fade: number, enabled: boolean): boolean {
  return fade === 0 && !enabled;
}

/**
 * Ведёт fade к цели (enabled → 1, выключен → 0), домножая буфер.
 * Возвращает новое значение fade. При fade уже в цели буфер не трогается.
 */
export function applyGate(buf: Float32Array, fade: number, enabled: boolean): number {
  const target = enabled ? 1 : 0;
  if (fade === target) return fade;
  const d = target > fade ? FADE_STEP : -FADE_STEP;
  let f = fade;
  for (let i = 0; i < buf.length; i++) {
    f += d;
    if (f > 1) f = 1;
    else if (f < 0) f = 0;
    buf[i] *= f;
  }
  return f;
}
