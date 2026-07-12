import { fmt } from '../src/ui/format';
import { mulberry32 } from '../src/dsp/rng';

describe('fmt', () => {
  it('>=100 — целое', () => {
    expect(fmt(345)).toBe('345');
    expect(fmt(345.6)).toBe('346');
    expect(fmt(-120.4)).toBe('-120');
  });
  it('>=10 — два знака', () => {
    expect(fmt(12.345)).toBe('12.35');
    expect(fmt(-28.9)).toBe('-28.90');
  });
  it('<10 — три знака', () => {
    expect(fmt(0.25)).toBe('0.250');
    expect(fmt(3.8642)).toBe('3.864');
    expect(fmt(0)).toBe('0.000');
  });
});

describe('mulberry32', () => {
  it('детерминирован и в [0, 1)', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    for (let i = 0; i < 1000; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('разные сиды → разные последовательности', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});
