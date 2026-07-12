// Типобезопасные DOM-хелперы (as-касты в проекте запрещены).
export function el(id: string): HTMLElement {
  const e = document.getElementById(id);
  if (!e) throw new Error(`нет элемента #${id}`);
  return e;
}

export function inputEl(id: string): HTMLInputElement {
  const e = el(id);
  if (!(e instanceof HTMLInputElement)) throw new Error(`#${id} — не <input>`);
  return e;
}

export function selectEl(id: string): HTMLSelectElement {
  const e = el(id);
  if (!(e instanceof HTMLSelectElement)) throw new Error(`#${id} — не <select>`);
  return e;
}

export function buttonEl(id: string): HTMLButtonElement {
  const e = el(id);
  if (!(e instanceof HTMLButtonElement)) throw new Error(`#${id} — не <button>`);
  return e;
}

export function canvasEl(id: string): HTMLCanvasElement {
  const e = el(id);
  if (!(e instanceof HTMLCanvasElement)) throw new Error(`#${id} — не <canvas>`);
  return e;
}
