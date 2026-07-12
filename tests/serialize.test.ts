import { b64urlEncode, b64urlDecode, encodeStateToken, decodeStateToken, tokenFromHash } from '../src/state/share';
import { sanitizeState, DEFAULT_FX } from '../src/state/schema';
import type { AppState } from '../src/state/schema';

// Реальный share-токен со старого деплоя formulas-audio-lab (из его README) —
// совместимость со старыми ссылками не должна ломаться.
const LEGACY_TOKEN =
  'eyJ2IjoyLCJtYXN0ZXJHYWluIjowLjUxNCwiZngiOnsicGFuZWxPcGVuIjpmYWxzZSwiZmlsdGVyT24iOnRydWUsImZpbHRlclR5cGUiOiJsb3dwYXNzIiwiZmlsdGVyRnJlcSI6MzQwMCwiZmlsdGVyUSI6Ni4zLCJjaG9ydXNPbiI6dHJ1ZSwiY2hvcnVzTW9kZSI6ImNob3J1cyIsImNob3J1c1JhdGUiOjAuMDEsImNob3J1c0RlcHRoIjo4LjQsImNob3J1c01peCI6MC4zNSwiY2hvcnVzRmIiOjAuOTUsInJldmVyYk9uIjp0cnVlLCJyZXZlcmJEZWNheSI6My4yLCJyZXZlcmJNaXgiOjAuNSwibGltaXRlck9uIjp0cnVlLCJsaW1pdGVyVGhyIjotMTIsImxpbWl0ZXJSZWwiOjAuMTUsImRlbGF5T24iOnRydWUsImRlbGF5VGltZSI6MC42MywiZGVsYXlGYiI6MC42MiwiZGVsYXlNaXgiOjAuMywicGhhc2VyT24iOnRydWUsInBoYXNlclJhdGUiOjAuNDcsInBoYXNlckRlcHRoIjowLjU5LCJwaGFzZXJTdGFnZXMiOjQsInBoYXNlckZiIjowLjYyLCJwaGFzZXJNaXgiOjAuMjJ9LCJmb3JtdWxhcyI6eyJmbSI6eyJlbmFibGVkIjpmYWxzZSwiY29sbGFwc2VkIjpmYWxzZSwicGFyYW1zIjp7ImdhaW4iOjAuMTUsImZjIjoyMjAsImZtIjoyLCJJIjozfX0sImFtIjp7ImVuYWJsZWQiOmZhbHNlLCJjb2xsYXBzZWQiOmZhbHNlLCJwYXJhbXMiOnsiZ2FpbiI6MC4xNSwiZjEiOjIyMCwiZjIiOjIyMX19LCJsb2dpc3RpYyI6eyJlbmFibGVkIjpmYWxzZSwiY29sbGFwc2VkIjpmYWxzZSwicGFyYW1zIjp7ImdhaW4iOjAuMTIsImJhc2UiOjExMCwiZGVwdGgiOjMzMCwiciI6My44NiwibGZvSHoiOjQwfX0sImdsaXNzIjp7ImVuYWJsZWQiOmZhbHNlLCJjb2xsYXBzZWQiOmZhbHNlLCJwYXJhbXMiOnsiZ2FpbiI6MC4xLCJmMCI6NTUsImsiOjAuMTV9fSwiYWRkaXRpdmUiOnsiZW5hYmxlZCI6dHJ1ZSwiY29sbGFwc2VkIjpmYWxzZSwicGFyYW1zIjp7ImdhaW4iOjAuNDc0LCJmdW5kIjo1NywiTiI6MTIsIm1vdmUiOjAuMzV9fSwicG0iOnsiZW5hYmxlZCI6ZmFsc2UsImNvbGxhcHNlZCI6ZmFsc2UsInBhcmFtcyI6eyJnYWluIjowLjEyLCJmIjoyMjAsImYycG0iOjN9fSwiYmVhdHMiOnsiZW5hYmxlZCI6ZmFsc2UsImNvbGxhcHNlZCI6ZmFsc2UsInBhcmFtcyI6eyJnYWluIjowLjEyLCJmYmVhdCI6MjIwLCJkZiI6MC44fX0sImRpc3QiOnsiZW5hYmxlZCI6ZmFsc2UsImNvbGxhcHNlZCI6ZmFsc2UsInBhcmFtcyI6eyJnYWluIjowLjEsImZkIjoxMTAsImFscGhhIjozfX0sInF1YXNpIjp7ImVuYWJsZWQiOmZhbHNlLCJjb2xsYXBzZWQiOmZhbHNlLCJwYXJhbXMiOnsiZ2FpbiI6MC4xLCJmcSI6MTIwLCJBcSI6MjIwLCJ3cSI6MC44fX0sImxvcmVueiI6eyJlbmFibGVkIjpmYWxzZSwiY29sbGFwc2VkIjpmYWxzZSwicGFyYW1zIjp7ImdhaW4iOjAuMjkzLCJzaWdtYSI6MTAsInJobyI6MjgsImJldGEiOjIuNjY2NywibEJhc2UiOjEyMCwibEZyZXFTY2FsZSI6NDAsImxBbXAiOjAuMjV9fSwia2FycGx1cyI6eyJlbmFibGVkIjpmYWxzZSwiY29sbGFwc2VkIjpmYWxzZSwicGFyYW1zIjp7ImdhaW4iOjAuMTQsImtzRnJlcSI6MTEwLCJrc0RhbXAiOjAuOTg1LCJrc0JyaWdodCI6MC41fX0sImJpdGNydXNoIjp7ImVuYWJsZWQiOmZhbHNlLCJjb2xsYXBzZWQiOmZhbHNlLCJwYXJhbXMiOnsiZ2FpbiI6MC4xMiwiYmNGcmVxIjoyMjAsImJjQml0cyI6NiwiYmNEb3duIjo4fX0sIm5vaXNlbHAiOnsiZW5hYmxlZCI6ZmFsc2UsImNvbGxhcHNlZCI6ZmFsc2UsInBhcmFtcyI6eyJnYWluIjowLjEsIm5DdXQiOjgwMH19LCJwaW5rbm9pc2UiOnsiZW5hYmxlZCI6ZmFsc2UsImNvbGxhcHNlZCI6ZmFsc2UsInBhcmFtcyI6eyJnYWluIjowLjEyLCJwaW5rQnJpZ2h0IjowLjN9fSwiYnJvd25ub2lzZSI6eyJlbmFibGVkIjpmYWxzZSwiY29sbGFwc2VkIjpmYWxzZSwicGFyYW1zIjp7ImdhaW4iOjAuMTUsImJyb3duU3RlcCI6MC4wMn19LCJ2ZWx2ZXRub2lzZSI6eyJlbmFibGVkIjpmYWxzZSwiY29sbGFwc2VkIjpmYWxzZSwicGFyYW1zIjp7ImdhaW4iOjAuMSwidmVsdmV0RGVuc2l0eSI6MjAwMH19LCJyb3NzbGVyIjp7ImVuYWJsZWQiOnRydWUsImNvbGxhcHNlZCI6ZmFsc2UsInBhcmFtcyI6eyJnYWluIjowLjE2OSwicm9zc0EiOjAuMTgxLCJyb3NzQiI6MC4yMzgsInJvc3NDIjo2LjQyLCJyb3NzQmFzZSI6MzQ1LCJyb3NzRnJlcVNjYWxlIjozOC40LCJyb3NzQW1wIjowLjI1fX0sInNoZXBhcmQiOnsiZW5hYmxlZCI6ZmFsc2UsImNvbGxhcHNlZCI6ZmFsc2UsInBhcmFtcyI6eyJnYWluIjowLjEyLCJzaGVwQmFzZSI6NTUsInNoZXBTcGVlZCI6MC4xLCJzaGVwT2N0YXZlcyI6Nn19fSwic2NvcGVDb2xsYXBzZWQiOmZhbHNlfQ';

describe('b64url', () => {
  it('roundtrip с UTF-8', () => {
    const src = 'Пресет №1 — ambient ✨';
    expect(b64urlDecode(b64urlEncode(src))).toBe(src);
  });

  it('не содержит символов + / =', () => {
    const token = b64urlEncode(JSON.stringify({ a: '???>>>', b: 'ю' }));
    expect(token).toMatch(/^[A-Za-z0-9\-_]+$/);
  });
});

describe('state token', () => {
  const state: AppState = {
    v: 2,
    masterGain: 0.42,
    fx: { ...DEFAULT_FX, reverbOn: true, reverbMix: 0.6 },
    formulas: {
      fm: { enabled: true, params: { gain: 0.15, fc: 440, fm: 2, I: 3 } },
    },
  };

  it('roundtrip encode → decode', () => {
    const decoded = decodeStateToken(encodeStateToken(state));
    expect(decoded).not.toBeNull();
    expect(decoded?.masterGain).toBe(0.42);
    expect(decoded?.fx?.reverbOn).toBe(true);
    expect(decoded?.fx?.reverbMix).toBe(0.6);
    expect(decoded?.formulas?.fm.enabled).toBe(true);
    expect(decoded?.formulas?.fm.params?.fc).toBe(440);
  });

  it('presetName переживает roundtrip', () => {
    const named: AppState = { ...state, presetName: 'My preset' };
    expect(decodeStateToken(encodeStateToken(named))?.presetName).toBe('My preset');
  });

  it('битый токен → null', () => {
    expect(decodeStateToken('%%%')).toBeNull();
    expect(decodeStateToken(b64urlEncode('not a json'))).toBeNull();
    expect(decodeStateToken(b64urlEncode('42'))).toBeNull();
  });

  it('декодирует legacy-ссылку старого деплоя', () => {
    const st = decodeStateToken(LEGACY_TOKEN);
    expect(st).not.toBeNull();
    expect(st?.masterGain).toBe(0.514);
    expect(st?.fx?.filterOn).toBe(true);
    expect(st?.fx?.filterFreq).toBe(3400);
    expect(st?.formulas?.additive.enabled).toBe(true);
    expect(st?.formulas?.additive.params?.fund).toBe(57);
    expect(st?.formulas?.rossler.enabled).toBe(true);
    // выпиленные формулы приходят как записи, но приложение их игнорирует
    expect(st?.formulas?.am).toBeDefined();
  });
});

describe('tokenFromHash', () => {
  it('вытаскивает токен из хэша', () => {
    expect(tokenFromHash('#s=abc-DEF_123')).toBe('abc-DEF_123');
  });
  it('null для пустого/чужого хэша', () => {
    expect(tokenFromHash('')).toBeNull();
    expect(tokenFromHash('#other')).toBeNull();
  });
});

describe('sanitizeState', () => {
  it('отбрасывает мусорные поля и неверные типы', () => {
    const st = sanitizeState({
      masterGain: 'loud', // не число — отброс
      fx: { filterOn: 1, filterType: 'notch', filterFreq: 500, reverbMix: NaN },
      formulas: { fm: { enabled: 'yes', params: { fc: 440, bad: 'x' } }, junk: 42 },
      scopeCollapsed: true,
    });
    expect(st).not.toBeNull();
    expect(st?.masterGain).toBeUndefined();
    expect(st?.fx?.filterOn).toBeUndefined();
    expect(st?.fx?.filterType).toBeUndefined();
    expect(st?.fx?.filterFreq).toBe(500);
    expect(st?.fx?.reverbMix).toBeUndefined();
    expect(st?.formulas?.fm.enabled).toBeUndefined();
    expect(st?.formulas?.fm.params).toEqual({ fc: 440 });
    expect(st?.formulas?.junk).toBeUndefined();
  });

  it('null для не-объекта', () => {
    expect(sanitizeState(null)).toBeNull();
    expect(sanitizeState('str')).toBeNull();
    expect(sanitizeState(7)).toBeNull();
  });
});
