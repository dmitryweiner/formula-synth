# CLAUDE.md — карта проекта для агента

Formula Synth: браузерный синтезатор на математических формулах
(TypeScript + Vite + Web Audio AudioWorklet). Порт неструктурированного
`../neural-things/formulas-audio-lab` (один index.html на 2600 строк) в
модульный вид; сборка/линт/тесты — по образцу ../drive-town. Спецификация
для людей — в README.md. UI-тексты — на английском (публичное приложение).

## Команды

```bash
npm run check          # tsc --noEmit && eslint . && vitest run — ОДНОЙ командой
                       # после любой правки (заменяет три отдельные)
npm test               # vitest (≈190 тестов) — ДОЛЖНЫ быть зелёными
UPDATE_GOLDEN=1 npm test  # перегенерация golden-семплов (ТОЛЬКО при осознанном
                       # изменении звука; диff эталона показать пользователю)
npm run lint           # eslint; `as`-касты ЗАПРЕЩЕНЫ (assertionStyle: never)
npx tsc --noEmit       # строгие типы
npm run dev            # Vite на :5173
npm run build          # tsc + сборка в ./docs (GitHub Pages)
npm run smoke          # браузерный смоук: КАЖДЫЙ пресет грузится+играет, КАЖДАЯ
                       # формула включается — падает на любой ошибке консоли.
                       # Точечно: npm run smoke -- --preset "Wind flanger" --play
                       #   [--panel effects|scope|mod] [--enable id,id]
                       #   [--fx-preset "Jet flanger"] [--hash <token>]
                       #   [--screenshot shots/x.png] [--preview]
                       # ЕДИНСТВЕННЫЙ способ проверить engine/FX/воркалет — они
                       # не грузятся в vitest (Web Audio + registerProcessor).
npm run shot -- [--mobile] [--fx] [--preset N] [--preview] [--help-shot]
                       # скриншоты в ./shots + смоук аудио (включает формулу,
                       # ловит консольные ошибки; --preview гоняет прод-сборку)
```

Процесс — TDD: сначала тест, потом код. Не коммитить без просьбы пользователя.

## Карта модулей

```
src/dsp/generator.ts   ЯДРО: FormulaGenerator — все 21 формулу посэмплово,
                       switch по FormulaId; RNG инъецируется (Rng), в тестах
                       mulberry32, в воркалете Math.random. Общий пул
                       DEFAULT_PARAMS на все формулы (как в оригинале).
                       Свои сверх оригинала: bytebeat, bell (FM-колокол),
                       ocean (шум сквозь «дышащий» LP), risset (аддитивный
                       колокол Риссе), rain (резонансные капли + шумовая подложка)
src/dsp/gate.ts        гейт генератора: фейд до тишины, затем воркалет НЕ
                       считает семплы (perf); чистая логика, тестируется
src/dsp/mod.ts         матрица модуляции (чистая): типы ModState/LfoDef/
                       ModRoute, lfoValue(t) (5 форм, S&H — детерминир. хэш),
                       effectiveParam (кламп/биполяр/exp-октавы). Импортируют
                       генератор, схема и воркалет
src/dsp/wav.ts         encodeWAV → ArrayBuffer (16-bit PCM), чистый
src/dsp/recorder.ts    RecorderCore — накопитель PCM-чанков (чистый)
src/worklet/processors.ts  AudioWorklet-обёртки (formula-generator,
                       recorder-processor); отдельный entry — engine грузит
                       через `?worker&url` (в dev — ESM с импортами, работает
                       в Chromium; в проде — самодостаточный IIFE-чанк)
src/audio/engine.ts    AudioEngine: контекст, генераторы+гейны, FX-цепочка
                       Filter→Chorus→Phaser→Delay→Reverb→Limiter→Master→
                       Analyser; запись через recorder-ноду с нулевым выходом.
                       Filter мультирежимный: 8 biquad-типов + formant (3 band-
                       pass на формантах) + comb (задержка с ОС) — роутинг
                       ветвится по filterType в applyRouting
src/audio/filters.ts   ЧИСТАЯ математика фильтра (filterMode/toBiquadType/
                       vowelFormants/clampNum) — вынесена из engine, тестируется
src/audio/modrouting.ts  ЧИСТАЯ сборка mod-пейлоуда (buildModPayload) — тоже
                       вынесена из engine ради unit-тестов
src/state/schema.ts    AppState v3 (+ mod?: ModState) + DEFAULT_FX +
                       sanitizeState (терпимый разбор unknown-JSON без as-кастов)
src/state/share.ts     base64url токены #s=… (совместимость со старым деплоем
                       НЕ поддерживается — переехали в отдельный репо)
src/state/userPresets.ts  localStorage; ключи НАМЕРЕННО старые
                       (formula_audio_lab_*) — пресеты пользователей живы
src/formulas.ts        UI-схема: порядок карточек, слайдеры (min/max/step/value)
src/presets.ts         встроенные пресеты (полное состояние приложения)
src/fxPresets.ts       пресеты МОДУЛЕЙ эффектов (Filter/Flanger/Phaser…): меню
                       «Effects preset» — частичный FxState поверх текущего, трогает
                       только свой модуль (не генераторы, не URL, не общее состояние)
src/ui/…               scope.ts (осциллограф+спектрограмма-водопад, rAF гасится
                       при скрытой вкладке/свёрнутом скоупе), adjust.ts (+/− с
                       автоповтором), wakelock.ts, dom.ts (el/inputEl/… с
                       instanceof вместо кастов), format.ts (fmt),
                       modmatrix.ts (панель Modulators: пул из 3 LFO + таблица
                       маршрутов; DOM — источник истины, get/setState; список
                       приёмников фильтруется до включённых формул, но цель
                       уже созданного роута остаётся видимой как «(off)»)
src/main.ts            сборка UI и вся связка событий
tests/…                golden-семплы (tests/golden/formulas.json + mod.json,
                       сид 42, 4×128 семплов, допуск 1e-9), свойства сигналов,
                       матрица модуляции (mod.test.ts), сериализация, WAV, пресеты;
                       audio-sanity.test.ts (каждый генератор/пресет — не тишина,
                       конечен, не разносит); engine-pure.test.ts (filters +
                       modrouting)
scripts/smoke.mjs      переиспользуемый браузерный смоук (npm run smoke): все
                       пресеты/формулы; флаги --preset/--panel/--fx-preset/--enable/
                       --hash/--url/--screenshot/--play/--preview
scripts/shot.mjs       playwright-скриншоты + аудио-смоук
```

## Ключевые решения (не ломать)

- **Ключи localStorage — замороженный контракт** (formula_audio_lab_*):
  сохранённые пользователем пресеты должны открываться. А вот формат
  состояния переехал на **v3** (добавлен `mod?: ModState`), и совместимость
  со старыми share-ссылками сознательно НЕ поддерживается — репо отдельный.
  sanitizeState всё равно терпим к отсутствию/битости полей, включая mod.
- **DSP отделён от Web Audio**: generator.ts не знает про AudioWorklet —
  его импортируют и воркалет, и vitest. Всю математику менять только тут
  и только с перегенерацией golden (звук — «текущее состояние кода»).
- **Движок не грузится в vitest** (тянет worklet-url + registerProcessor).
  Стратегия проверки: чистую логику выносить в отдельные модули (filters.ts,
  modrouting.ts, dsp/*) и покрывать unit-тестами; граф/FX/воркалет проверять
  `npm run smoke`; пресеты/формулы — audio-sanity тестом. Т.е. при правках
  движка/FX запускать И `npm run check`, И `npm run smoke`.
- **Формул 21**: 16 портированы из formulas-audio-lab (`am` и `bitcrush` из
  старого README там уже отсутствовали) + 5 своих: bytebeat, bell, ocean,
  risset (аддитивный колокол Риссе, 11 партиалов), rain (капли: редкие
  резонансные «плинки» с восходящим глиссандо + мягкая шумовая подложка).
- **Выключенный генератор перестаёт считаться** (src/dsp/gate.ts + сообщение
  `enabled` в воркалет): фейд до нуля за 5 блоков, потом process() выходит
  сразу. Нюанс: выключенная формула «замирает» на месте, а не идёт фоном —
  при повторном включении хаос/глиссандо продолжатся с той же точки.
- **Golden-тесты детерминированы** инъекцией mulberry32; Math.random в
  ядре напрямую не вызывать — только через this.rng.
- **Матрица модуляции** (src/dsp/mod.ts): любой параметр генератора можно
  «качать» LFO. Считается block-rate (раз в блок), LFO — чистая функция
  времени → ноды синхронны без обмена сообщениями. В fill() —
  overwrite-then-restore: перекрыли базу эффективными значениями, отработали
  блок, вернули базу. `modT` НЕ сбрасывается в reset() (reset — про звук, не
  про модуляцию). Диапазоны параметров ядру не известны — engine.ts шлёт
  каждой ноде только её маршруты + пул LFO + [min,max] нужных параметров
  (из formulas.ts). Частоты модулируются в октавах (exp), т.к. воспринимаются
  логарифмически. Модуляция FX пока НЕ реализована (только генераторы).
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

## Сделано в ревизии визуала/перфа (согласовано с пользователем)

- Карточки формул свёрнуты по умолчанию (видно чек+название+формулу);
  включение разворачивает. Мобила — один столбец, десктоп — grid 2 колонки
  (≥720px, каждая карточка — бокс). Reset — маленькая ↺ в шапке карточки.
  Компактный топбар: [Play/Rec/Scope/Effects/Mod] и [пресеты/Save/Share]
  (актуальное состояние кнопок-панелей — в пункте про топбар ниже).
- Выключенные генераторы не считаются (gate.ts, см. выше).
- Добавлены bytebeat / bell / ocean / risset / rain.
- Матрица модуляции (топбар: ∿) — панель Modulators + таблица маршрутов;
  индикатор ∿ на «живых» слайдерах. Демо-пресеты с LFO: «Tidal drift (mod)»,
  «Generative bells (S&H)», «Aurora pad (mod)», «Wandering Lorenz (mod)»,
  «Cave drips (mod)», «Vowel choir (formant)». Полный план — MODULATION.md.
- Пресеты фленджера/фейзера — это пресеты МОДУЛЯ (src/fxPresets.ts, меню
  «Effects preset»), а не общие пресеты приложения: Jet/Slow/Subtle flanger,
  Deep/Fast phaser, Phaser swirl (+delay).
- Встроенный пресет можно открыть по query-параметру `?preset=<имя|номер>`
  (имя точно/без регистра или 1-based индекс). При наличии `#s=`-токена
  приоритет у него. Логика — findBuiltinPreset в main.ts.
- Фильтр — мультирежимный (см. engine.ts выше). Контролы карточки Filter
  показываются под выбранный тип (updateFilterControls в main.ts): Gain для
  peaking/shelf, Vowel для formant, Feedback для comb; Freq/Q переименовываются
  под режим. Смена типа фильтра требует applyFx (перестройка графа), не только
  applyFxParams. Демо-пресеты приложения на эффекты: «Vowel choir (formant)»,
  «Wind flanger». Плюс меню «Effects preset» ВВЕРХУ
  панели эффектов (снаружи карточек, .filterPresetBar; src/fxPresets.ts) —
  пресеты модулей (Filter/Flanger/Phaser), каждый ставит СВОИ поля FxState
  поверх текущего и включает модуль. Ручная правка любого FX-контрола сбрасывает
  выбор пресета в плейсхолдер (setFxField/reset-логика в main.ts).
- Топбар: кнопки-панели теперь иконка + подпись (Scope/Effects/Mod), класс
  .panelToggle; включённая залита акцентом + точка-индикатор — понятнее, что
  это переключатели и что открыто. Панели взаимоисключающие (radio): активна
  максимум одна — setPanel/currentPanel в main.ts. Master volume всегда сверху
  (в topgrid перед scopeWrap), не «уезжает» под осциллограф.

## Бэклог

- Пресеты под новые формулы: ocean (Wind flanger) и bell (Generative bells)
  уже есть; risset сейчас без общего демо-пресета (Cathedral bells убрали) —
  можно вернуть в src/presets.ts.
- Вернуть am/bitcrush по желанию (формулы есть в старом README).
- Модуляция (MODULATION.md, phase 6, опционально): модуляция FX нативными
  Web Audio-нодами; drag-to-assign у слайдера; генератор как источник.

## Чего не делать

- Не коммитить без просьбы пользователя.
- Не менять ключи localStorage (formula_audio_lab_*) — живые пресеты
  пользователей. Формат состояния и схему URL-токена менять можно
  (совместимость со старым деплоем уже не держим).
- Не перегенерировать golden «чтобы тесты прошли» — сначала понять, почему
  звук изменился, и согласовать с пользователем.
- Не добавлять runtime-зависимости: приложение — чистый Web Audio + Canvas.
