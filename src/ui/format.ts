// Умное форматирование чисел у слайдеров (порт NT.ui.fmt):
// |v| >= 100 → целое, |v| >= 10 → 2 знака, иначе 3 знака.
export function fmt(v: number): string {
  if (Math.abs(v) >= 100) return String(Math.round(v));
  if (Math.abs(v) >= 10) return v.toFixed(2);
  return v.toFixed(3);
}
