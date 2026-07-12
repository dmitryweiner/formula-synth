import { b64urlEncode, b64urlDecode, encodeStateToken, decodeStateToken, tokenFromHash } from '../src/state/share';
import { sanitizeState, DEFAULT_FX } from '../src/state/schema';
import type { AppState } from '../src/state/schema';

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
    v: 3,
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

  it('mod переживает roundtrip', () => {
    const withMod: AppState = {
      ...state,
      mod: {
        lfos: [
          { shape: 'sine', rate: 2, phase: 0 },
          { shape: 'random', rate: 0.5, phase: 0.25 },
        ],
        routes: [
          { src: 0, formula: 'fm', param: 'fc', depth: 0.3, exp: true },
          { src: 1, formula: 'fm', param: 'I', depth: -0.6 },
        ],
      },
    };
    const decoded = decodeStateToken(encodeStateToken(withMod));
    expect(decoded?.mod).toEqual(withMod.mod);
  });

  it('битый токен → null', () => {
    expect(decodeStateToken('%%%')).toBeNull();
    expect(decodeStateToken(b64urlEncode('not a json'))).toBeNull();
    expect(decodeStateToken(b64urlEncode('42'))).toBeNull();
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

  it('mod: отбрасывает негодные маршруты, оставляет годные', () => {
    const st = sanitizeState({
      mod: {
        lfos: [{ shape: 'triangle', rate: 3, phase: 0.1 }],
        routes: [
          { src: 0, formula: 'fm', param: 'fc', depth: 0.5, exp: true }, // ок
          { src: 5, formula: 'fm', param: 'fc', depth: 0.5 }, // src вне пула — отброс
          { src: 0, formula: 'nope', param: 'fc', depth: 0.5 }, // чужая формула — отброс
          { src: 0, formula: 'fm', param: 'fc', depth: 'x' }, // depth не число — отброс
          { src: 0, formula: 'fm', param: 'fc' }, // нет depth — отброс
        ],
      },
    });
    expect(st?.mod?.lfos).toEqual([{ shape: 'triangle', rate: 3, phase: 0.1 }]);
    expect(st?.mod?.routes).toEqual([{ src: 0, formula: 'fm', param: 'fc', depth: 0.5, exp: true }]);
  });

  it('mod: битый LFO рушит весь блок (позиционные индексы)', () => {
    const st = sanitizeState({
      mod: {
        lfos: [{ shape: 'sine', rate: 2, phase: 0 }, { shape: 'wobble', rate: 1, phase: 0 }],
        routes: [{ src: 0, formula: 'fm', param: 'fc', depth: 0.5 }],
      },
    });
    expect(st?.mod).toBeUndefined();
  });

  it('mod: не-объект / без массивов — отброс', () => {
    expect(sanitizeState({ mod: 42 })?.mod).toBeUndefined();
    expect(sanitizeState({ mod: { lfos: {}, routes: [] } })?.mod).toBeUndefined();
    expect(sanitizeState({ mod: { lfos: [] } })?.mod).toBeUndefined();
  });
});
