import { RecorderCore } from '../src/dsp/recorder';

describe('RecorderCore', () => {
  it('склеивает чанки в порядке записи', () => {
    const rec = new RecorderCore();
    rec.start();
    rec.push(new Float32Array([1, 2]));
    rec.push(new Float32Array([3]));
    rec.push(new Float32Array([4, 5, 6]));
    expect(Array.from(rec.stop())).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('игнорирует push вне записи', () => {
    const rec = new RecorderCore();
    rec.push(new Float32Array([9, 9]));
    rec.start();
    rec.push(new Float32Array([1]));
    expect(Array.from(rec.stop())).toEqual([1]);
  });

  it('повторный start очищает буфер', () => {
    const rec = new RecorderCore();
    rec.start();
    rec.push(new Float32Array([1]));
    rec.start();
    rec.push(new Float32Array([2]));
    expect(Array.from(rec.stop())).toEqual([2]);
  });

  it('копирует чанк (не держит ссылку на живой буфер)', () => {
    const rec = new RecorderCore();
    rec.start();
    const live = new Float32Array([1, 1]);
    rec.push(live);
    live.fill(7); // воркалет переиспользует буферы блоков
    expect(Array.from(rec.stop())).toEqual([1, 1]);
  });
});
