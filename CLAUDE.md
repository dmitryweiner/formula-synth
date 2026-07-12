# CLAUDE.md — карта проекта для агента

Formula Synth: браузерный синтезатор на математических формулах
(TypeScript + Vite + Web Audio AudioWorklet). Порт неструктурированного
`../neural-things/formulas-audio-lab` (один index.html на 2600 строк) в
модульный вид; сборка/линт/тесты — по образцу ../drive-town. Спецификация
для людей — в README.md. UI-тексты — на английском (публичное приложение).

## Команды

```bash
npm test               # vitest, ~70 тестов — ДОЛЖНЫ быть зелёными после любой правки
UPDATE_GOLDEN=1 npm test  # перегенерация golden-семплов (ТОЛЬКО при осознанном
                       # изменении звука; диff эталона показать пользователю)
npm run lint           # eslint; `as`-касты ЗАПРЕЩЕНЫ (assertionStyle: never)
npx tsc --noEmit       # строгие типы
npm run dev            # Vite на :5173
npm run build          # tsc + сборка в ./docs (GitHub Pages)
npm run shot -- [--mobile] [--fx] [--preset N] [--preview] [--help-shot]
                       # скриншоты в ./shots + смоук аудио (включает формулу,
                       # ловит консольные ошибки; --preview гоняет прод-сборку)
```

Процесс — TDD: сначала тест, потом код. Не коммитить без просьбы пользователя.

## Карта модулей

```
src/dsp/generator.ts   ЯДРО: FormulaGenerator — все 16 формул посэмплово,
                       switch по FormulaId; RNG инъецируется (Rng), в тестах
                       mulberry32, в воркалете Math.random. Общий пул
                       DEFAULT_PARAMS на все формулы (как в оригинале)
src/dsp/wav.ts         encodeWAV → ArrayBuffer (16-bit PCM), чистый
src/dsp/recorder.ts    RecorderCore — накопитель PCM-чанков (чистый)
src/worklet/processors.ts  AudioWorklet-обёртки (formula-generator,
                       recorder-processor); отдельный entry — engine грузит
                       через `?worker&url` (в dev — ESM с импортами, работает
                       в Chromium; в проде — самодостаточный IIFE-чанк)
src/audio/engine.ts    AudioEngine: контекст, генераторы+гейны, FX-цепочка
                       Filter→Chorus→Phaser→Delay→Reverb→Limiter→Master→
                       Analyser; запись через recorder-ноду с нулевым выходом
src/state/schema.ts    AppState v2 + DEFAULT_FX + sanitizeState (терпимый
                       разбор unknown-JSON без as-кастов)
src/state/share.ts     base64url токены #s=…, СОВМЕСТИМЫ со старым деплоем
src/state/userPresets.ts  localStorage; ключи НАМЕРЕННО старые
                       (formula_audio_lab_*) — пресеты пользователей живы
src/formulas.ts        UI-схема: порядок карточек, слайдеры (min/max/step/value)
src/presets.ts         5 встроенных пресетов
src/ui/…               scope.ts (осциллограф+спектрограмма-водопад, rAF гасится
                       при скрытой вкладке/свёрнутом скоупе), adjust.ts (+/− с
                       автоповтором), wakelock.ts, dom.ts (el/inputEl/… с
                       instanceof вместо кастов), format.ts (fmt)
src/main.ts            сборка UI и вся связка событий
tests/…                golden-семплы (tests/golden/formulas.json, сид 42,
                       4×128 семплов, допуск 1e-9), свойства сигналов,
                       сериализация (+реальный legacy-токен), WAV, пресеты
scripts/shot.mjs       playwright-скриншоты + аудио-смоук
```

## Ключевые решения (не ломать)

- **Формат состояния v2 и ключи localStorage — замороженный контракт** со
  старым formulas-audio-lab: старые share-ссылки и сохранённые пресеты
  должны открываться. Тест с legacy-токеном это фиксирует.
- **DSP отделён от Web Audio**: generator.ts не знает про AudioWorklet —
  его импортируют и воркалет, и vitest. Всю математику менять только тут
  и только с перегенерацией golden (звук — «текущее состояние кода»).
- **Формул 16, не 18**: `am` и `bitcrush` из старого README в реальном коде
  отсутствовали ещё до переноса (остались только их дефолтные параметры).
- **Golden-тесты детерминированы** инъекцией mulberry32; Math.random в
  ядре напрямую не вызывать — только через this.rng.
- Сознательные отличия движка от оригинала (описаны в engine.ts):
  sum-ноды FX создаются один раз (оригинал плодил их на каждый toggle);
  импульс реверба пересчитывается только при смене Decay (был пересчёт на
  каждый input любого FX-слайдера); Stages фазера реально меняет число
  звеньев (в оригинале параметр не подключён).
- **eslint запрещает `as`** — типы из DOM добывать через instanceof-хелперы
  (src/ui/dom.ts), unknown разбирать type guard'ами (schema.ts).
- Воркалет в dev-режиме грузится как ES-модуль с импортами — это работает
  в Chromium (dev/скриншоты), прод-сборка самодостаточна для всех браузеров.
- iOS: после создания AudioContext всегда resume() (autoplay policy);
  wake lock перезапрашивается на visibilitychange.

## Бэклог (обсуждено с пользователем)

- Ревизия визуала (перегружен, особенно мобильный) — обсудить варианты
  с пользователем ДО правок.
- Производительность: 16 воркалет-нод всегда активны (даже выключенные
  генераторы считаются с gain 0) — кандидат на отключение по enabled.
- Новые формулы: предложить пользователю (вернуть am/bitcrush и добавить
  новых классно звучащих).

## Чего не делать

- Не коммитить без просьбы пользователя.
- Не менять формат v2 / ключи localStorage / схему URL-токена.
- Не перегенерировать golden «чтобы тесты прошли» — сначала понять, почему
  звук изменился, и согласовать с пользователем.
- Не добавлять runtime-зависимости: приложение — чистый Web Audio + Canvas.
