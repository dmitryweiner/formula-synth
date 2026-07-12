# Formula Synth

## [Live Preview](https://dmitryweiner.github.io/formula-synth/)

**A web application for sound synthesis based on mathematical formulas.**

An interactive audio laboratory where sound is generated in real-time via the
AudioWorklet API. Each generator is a mathematical formula turned into a sound
wave. Successor of `neural-things/formulas-audio-lab`, moved to its own
repository and ported to TypeScript + Vite with unit tests.

---

## Development

```bash
npm install
npm run dev            # Vite dev server on :5173
npm test               # vitest unit tests (incl. golden-sample DSP tests)
UPDATE_GOLDEN=1 npm test  # regenerate golden samples after intended DSP changes
npm run lint           # eslint (no `as` casts allowed)
npm run build          # tsc + build to ./docs (GitHub Pages)
npm run shot           # headless-Chromium screenshots to ./shots + audio smoke test
npm run shot -- --mobile --fx --preview   # mobile viewport, FX panel, prod build
```

### Architecture

```text
src/dsp/generator.ts      pure DSP core: all 16 formulas, sample-by-sample,
                          injectable RNG (deterministic in tests)
src/dsp/{wav,recorder}.ts WAV encoder (16-bit PCM), PCM chunk collector
src/worklet/processors.ts AudioWorklet entries (generator + recorder) — thin
                          wrappers over the DSP core, bundled as a separate
                          chunk via Vite `?worker&url`
src/audio/engine.ts       Web Audio graph: mix bus, FX chain, recording
src/state/…               state schema (v2), base64url share links, user presets
src/ui/…                  scope/spectrogram, +/- buttons, wake lock, DOM helpers
src/main.ts               UI assembly and wiring
src/formulas.ts           UI schema: titles, descriptions, slider ranges
src/presets.ts            built-in presets
```

### Audio Graph

```text
[Generators] → [MixBus] → [Filter?] → [Chorus?] → [Phaser?] → [Delay?] → [Reverb?] → [Limiter?] → [MasterGain] → [Analyser] → [Destination]
                                                                                          ↓
                                                                                  [Recorder] → WAV
```

- **AudioWorklet** (`formula-generator`) — sample generation in a separate audio thread
- **MixBus** — summing all active generators
- **Effects** — optional effects chain (each can be toggled on/off)
- **Analyser** — data for the oscilloscope/spectrogram

### State

All functional state (enabled effects/formulas and their parameters) is
serialized to JSON (format `v: 2`, compatible with the old
formulas-audio-lab — old share links keep working):

- User presets → `localStorage` (key `formula_audio_lab_user_presets_v1`,
  kept from the old app so existing presets survive)
- Share → base64url token in the URL hash (`#s=…`)
- Auto-loading from URL on open; shared URLs include the preset name and are
  auto-saved to the recipient's presets

---

## Generators (Formulas)

Each generator can be enabled independently (checkbox), parameters are
adjusted with sliders. Multiple generators can play simultaneously.

| # | Generator | Formula | Parameters |
|---|-----------|---------|------------|
| 1 | **Harmonic Sum** (`additive`) | `Σ (1/k)·sin(move·t + k)·sin(2π·k·fund·t)` | fund 20–500 Hz, N 1–40, move 0.01–5 Hz |
| 2 | **Lorenz Attractor** (`lorenz`) | Lorenz ODE → freq/amp | σ 0–30, ρ 0–60, β 0.1–10, base 20–400 Hz, freq scale 0–200, amp 0–1 |
| 3 | **Rossler Attractor** (`rossler`) | `dx=-y-z, dy=x+ay, dz=b+z(x-c)` | a, b 0.01–0.5, c 2–12, base 20–400 Hz, freq scale 0–100, amp 0–1 |
| 4 | **Exponential Glissando** (`gliss`) | `f(t) = f0·e^(k·t)` | f0 10–400 Hz, k −2…2 |
| 5 | **Shepard Tone** (`shepard`) | `Σ envelope(k)·sin(2π·f0·2^(k+t)·t)` | base 20–200 Hz, speed −0.5…0.5, octaves 3–10 |
| 6 | **FM Sine** (`fm`) | `sin(2π·fc·t + I·sin(2π·fm·t))` | fc 20–2000 Hz, fm 0.1–60 Hz, I 0–20 |
| 7 | **Two Sines / Beats** (`beats`) | `0.5·(sin(2π·f·t) + sin(2π·(f+Δf)·t))` | f 20–2000 Hz, Δf 0–20 Hz |
| 8 | **Phase Modulation** (`pm`) | `sin(2π·f·t + 5·sin(sin(2π·f2·t)))` | f 20–2000 Hz, f2 0.1–40 Hz |
| 9 | **Quasi-random LFO** (`quasi`) | `f(t) = fq + Aq·sin(sin(sin(w·t)))` | fq 20–500 Hz, Aq 0–1200 Hz, w 0.05–6 |
| 10 | **Logistic Map** (`logistic`) | `xₙ₊₁ = r·xₙ·(1−xₙ)` → freq | base 20–800 Hz, depth 0–1200 Hz, r 2.8–4.0, rate 1–400 Hz |
| 11 | **Nonlinear Saturation** (`dist`) | `tanh(α·sin(2π·f·t))` | f 20–2000 Hz, α 0–10 |
| 12 | **Karplus–Strong** (`karplus`) | noise → delay line → averaging → feedback | freq 40–880 Hz, damping 0.90–0.9999, brightness 0–1 |
| 13 | **Noise → Low-pass** (`noiselp`) | white noise → 1-pole LP | cutoff 20–18000 Hz |
| 14 | **Pink Noise** (`pinknoise`) | Paul Kellet's 1/f approximation | brightness 0–1 |
| 15 | **Brown Noise** (`brownnoise`) | `x[n] = clamp(x[n−1] + noise·step)` | step 0.001–0.1 |
| 16 | **Velvet Noise** (`velvetnoise`) | sparse ±1 impulses | density 100–10000 imp/s |

Notes:

- At `r < 3` the logistic map is stable, at `r ≈ 3.57` — period-doubling, at `r > 3.57` — chaos.
- Classic Lorenz values: σ=10, ρ=28, β=8/3 ≈ 2.667. Classic Rossler: a=0.2, b=0.2, c=5.7.
- "Reset state" is available for Gliss, PM, Quasi, Lorenz, Rossler, Karplus-Strong, Shepard
  (for Karplus-Strong it "plucks" the string again; for Shepard it restarts the illusion).
- Try negative Shepard speed for the endless falling illusion.

---

## Effects

The effects panel opens with the 🎛 button. Each effect is enabled with an "ON" checkbox.

| Effect | Parameters |
|--------|------------|
| **Filter (Biquad)** | type (low/high/band-pass), cutoff 20–2000 Hz, Q 0.1–30 |
| **Chorus / Flanger** | mode (base 12 ms / 2 ms), rate 0.01–8 Hz, depth 0–20 ms, mix, feedback 0–0.95 |
| **Reverb (Convolver)** | procedural impulse response; decay 0.1–8 s, mix |
| **Limiter** | compressor with ratio 20; threshold −40–0 dB, release 0.02–1 s |
| **Delay / Echo** | time 0.05–2 s, feedback 0–0.9, mix |
| **Phaser** | all-pass chain; rate 0.1–10 Hz, depth 0–1, stages 2–8, feedback 0–0.9, mix |

---

## UI

- **Top bar**: Play/Stop, Record (WAV), presets dropdown (built-in + user
  presets with delete), Save preset, Share, 📊 scope toggle, 🎛 effects
  panel, ? help popup (auto-shows on first visit).
- **Auto-start**: enabling any formula starts audio automatically.
- **Oscilloscope / Spectrogram**: Wave/Spectrum toggle; spectrogram is a
  scrolling waterfall with a logarithmic frequency scale (20 Hz–10 kHz),
  constant scroll speed; drawing stops when hidden to save CPU. Collapsed by
  default on mobile; the effects panel auto-collapses the scope.
- **Formula cards**: enable checkbox (green highlight when active),
  collapse/expand, +/− buttons with hold-to-repeat, "Reset state",
  Disable all / Collapse all.
- **Recording**: WAV 16-bit PCM; on mobile uses the Web Share API, otherwise
  auto-download plus a "download" link in the status line.

### Usage Tips

1. **Always start with low Gain** — some formulas can produce loud output.
2. **Use Limiter** when experimenting with chaos (Lorenz, Rossler, Logistic).
3. **Combine generators** — enable several simultaneously.
4. **Delay + Phaser** combine well with Chorus for rich sound.

---

## Platform Specifics

- **iOS Safari**: AudioContext may start `suspended` even after a user click —
  the app calls `resume()` automatically.
- **Wake Lock**: while audio plays, the screen is kept awake (Chrome/Edge 84+,
  Safari 16.4+; gracefully degrades in Firefox).
- **Background**: when the tab is hidden, visualization stops (saves CPU)
  while audio continues; both resume on return.

## Browser Compatibility

| Browser | Version |
|---------|---------|
| Chrome / Edge | 66+ |
| Safari (iOS/macOS) | 14.1+ |
| Firefox | 146+ |

## Dependencies

No runtime dependencies — pure Web Audio API + Canvas 2D. Dev stack:
TypeScript, Vite, vitest, eslint, playwright (screenshots).
