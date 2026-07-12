import { encodeWAV } from '../src/dsp/wav';

function str(view: DataView, offset: number, len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(view.getUint8(offset + i));
  return s;
}

describe('encodeWAV', () => {
  const samples = new Float32Array([0, 0.5, -0.5, 1, -1, 2, -2]);
  const sr = 48000;
  const view = new DataView(encodeWAV(samples, sr));

  it('корректный RIFF/WAVE заголовок', () => {
    expect(str(view, 0, 4)).toBe('RIFF');
    expect(str(view, 8, 4)).toBe('WAVE');
    expect(str(view, 12, 4)).toBe('fmt ');
    expect(str(view, 36, 4)).toBe('data');
    expect(view.getUint32(4, true)).toBe(36 + samples.length * 2);
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(sr);
    expect(view.getUint32(28, true)).toBe(sr * 2); // byteRate
    expect(view.getUint16(32, true)).toBe(2); // blockAlign
    expect(view.getUint16(34, true)).toBe(16); // bits
    expect(view.getUint32(40, true)).toBe(samples.length * 2);
  });

  it('16-бит семплы с клампом за пределами [-1, 1]', () => {
    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBe(Math.trunc(0.5 * 0x7fff)); // DataView усекает
    expect(view.getInt16(48, true)).toBe(-0.5 * 0x8000);
    expect(view.getInt16(50, true)).toBe(0x7fff);
    expect(view.getInt16(52, true)).toBe(-0x8000);
    expect(view.getInt16(54, true)).toBe(0x7fff); // 2 → кламп
    expect(view.getInt16(56, true)).toBe(-0x8000); // -2 → кламп
  });

  it('общий размер = 44 + 2N', () => {
    expect(view.byteLength).toBe(44 + samples.length * 2);
  });
});
