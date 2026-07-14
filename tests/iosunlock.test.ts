import { describe, it, expect } from 'vitest';
import { silentWavDataUri } from '../src/audio/iosUnlock';

describe('silentWavDataUri', () => {
  it('возвращает data-URI audio/wav base64', () => {
    const uri = silentWavDataUri();
    expect(uri.startsWith('data:audio/wav;base64,')).toBe(true);
  });

  it('декодируется в валидный WAV (RIFF/WAVE), полностью тихий', () => {
    const uri = silentWavDataUri(0.1, 8000);
    const b64 = uri.slice('data:audio/wav;base64,'.length);
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const tag = (o: number) => String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3]);
    expect(tag(0)).toBe('RIFF');
    expect(tag(8)).toBe('WAVE');

    // 0.1 c * 8000 Гц = 800 сэмплов * 2 байта + 44 заголовка.
    expect(bytes.length).toBe(44 + 800 * 2);

    // Все PCM-байты — нули (тишина).
    const data = bytes.slice(44);
    expect(data.every((v) => v === 0)).toBe(true);
  });

  it('не создаёт пустой буфер при крошечной длительности', () => {
    const uri = silentWavDataUri(0, 8000);
    const b64 = uri.slice('data:audio/wav;base64,'.length);
    const bytes = atob(b64).length;
    // минимум 1 сэмпл → 44 + 2 байта.
    expect(bytes).toBe(44 + 2);
  });
});
