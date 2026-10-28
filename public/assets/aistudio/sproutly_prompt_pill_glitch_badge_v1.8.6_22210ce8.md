# Sproutly Pro — v1.8.6: стабильная капсула обновления + свежий бейдж дашборда

Файлы для правки (только эти три):
- `src/components/ui/ReloadPrompt.tsx`
- `src/components/dashboard/BentoDashboard.tsx`
- `src/data/changelog.ts`

Больше НИКАКИХ файлов не трогать.

---

## Контекст (что и почему — в changelog не переносить)

### Q1 — визуальный глитч мобильной капсулы
Покадровый разбор видео (5 fps, 0–8 с) выявил: глитч **реальный**, но только в момент анимации входа/выхода капсулы (`y: -120 → 0` spring). В статике всё чисто. Конкретные артефакты:
- кадр ~3.8 с — «рваный» левый край при появлении (backdrop-filter desync);
- кадр ~5.8 с — **потеря непрозрачности** при входе: сквозь капсулу кратко проступает резкий фон (alpha-flicker);
- кадры ~1.8 с, ~6.2 с — ореол/двоение края кнопки «Обновить»;
- кадры ~2.0–2.2 с — микро-двоение текста.

Причина: `bg-white/80 dark:bg-slate-900/85 backdrop-blur-2xl backdrop-saturate-150` на элементе, который одновременно **трансформируется** (`motion.aside` spring по `y`). Это классический баг Chromium — backdrop-filter не успевает пересчитать подложку при transform-анимации → рваный край + альфа-фликер. Плавающая шапка НИКОГДА не глитчит, потому что она **solid** (`bg-white dark:bg-slate-950`). Решение: сделать капсулу solid вслед за шапкой.

### Q1 (продолжение) — кнопка «Обновить» смотрится чужеродно
Solid-кнопка `bg-primary-500 text-white` плавает внутри (теперь solid) капсулы — диссонанс материалов. Язык CTA приложения: solid primary для **полноразмерных** кнопок форм/диалогов (Login, «Что нового», SecuritySettings). Плавающие чипы в приложении — **tinted** (`bg-{color}-500/10` + текст + опциональный бордер: сайдбар-чип обновления, пилюля «100.0%», пилюли InvestmentList). Кнопку переводим в tinted-акцент.

### Q2 — подпись сайдбар-чипа
Сейчас чип говорит просто «Обновить» — глагол без контекста, чужеродный в ритме сайдбара (Дашборд / Активы / График / Доходы — существительные). «Доступно обновление» — состояние-существительное, вписывается и даёт контекст. По ширине помещается: «Доступно обновление» ≈ 145 px @12px bold + иконка 16 + gap 8 = 169 px ≤ 208 px контента колонки на lg+. isUpdating → «Обновление…» (короче).

### Q3 — бейдж «9 активных» на «Сбережения и инвестиции»
Текущая реализация — **старый язык** (`bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/50` — стекло + бордер на нейтральном slate, цветным только число). Эталон — пилюля «100.0%» на той же карточке ЛИМИТ ВКЛАДОВ (стр. 541–544 BentoDashboard.tsx):
`bg-deposit-50 text-deposit-600 dark:bg-deposit-500/10 dark:text-deposit-400 rounded-full px-2 py-0.5 text-[10px] font-bold` — tinted, без бордера, без стекла. Приводим «9 активных» к этому эталону: цвет совпадёт с прогресс-баром «Вклады» в той же карточке → связность.

---

## Блок 1 — `ReloadPrompt.tsx` · UpdatePill: solid-капсула (фикс глитча)

**Было** (строка 23, контейнер UpdatePill):
```tsx
className="w-full py-2 pl-2.5 pr-1.5 rounded-2xl flex items-center gap-2.5 bg-white/80 dark:bg-slate-900/85 backdrop-blur-2xl backdrop-saturate-150 border border-primary-500/25 dark:border-primary-500/20 shadow-[0_16px_40px_rgba(15,23,42,0.12),0_4px_16px_rgba(var(--rgb-primary),0.10)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] select-none pointer-events-auto"
```

**Стало:**
```tsx
className="w-full py-2 pl-2.5 pr-1.5 rounded-2xl flex items-center gap-2.5 bg-white dark:bg-slate-900 border border-primary-500/25 dark:border-primary-500/20 shadow-[0_16px_40px_rgba(15,23,42,0.12),0_4px_16px_rgba(var(--rgb-primary),0.10)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] select-none pointer-events-auto"
```

Изменения: `bg-white/80 dark:bg-slate-900/85` → `bg-white dark:bg-slate-900` (solid); удалены `backdrop-blur-2xl backdrop-saturate-150`. Бордер primary, тень с primary-ореолом, радиус, `py-2 pl-2.5 pr-1.5`, `pointer-events-auto` — без изменений. Документ-комментарий над `UpdatePill` обновить: убрать упоминание «стеклянной» подсветки, заменить на «сплошная плашка с акцентным бордером».

## Блок 2 — `ReloadPrompt.tsx` · кнопка «Обновить»: solid → tinted

**Было** (строка 49, className кнопки):
```tsx
className="h-7 px-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-[11px] font-bold shadow-md shadow-primary-500/25 active:scale-95 transition-all flex items-center justify-center w-[76px] shrink-0 cursor-pointer disabled:cursor-default outline-none"
```

**Стало:**
```tsx
className="h-7 px-2.5 rounded-lg bg-primary-500/15 hover:bg-primary-500/25 text-primary-600 dark:text-primary-300 border border-primary-500/25 text-[11px] font-bold shadow-sm shadow-primary-500/20 active:scale-95 transition-all flex items-center justify-center w-[76px] shrink-0 cursor-pointer disabled:cursor-default outline-none"
```

Изменения: `bg-primary-500 hover:bg-primary-600 text-white` → `bg-primary-500/15 hover:bg-primary-500/25 text-primary-600 dark:text-primary-300 border border-primary-500/25`; `shadow-md shadow-primary-500/25` → `shadow-sm shadow-primary-500/20`. Геометрия (`h-7 px-2.5 rounded-lg w-[76px]`, шрифт, `active:scale-95`) без изменений. Содержимое кнопки (`{isUpdating ? <RefreshCw .../> : 'Обновить'}`) — без изменений.

## Блок 3 — `ReloadPrompt.tsx` · SidebarUpdatePrompt: подпись и пульс-точка

**Было** (строки 124–137, кнопка чипа):
```tsx
<button
  type="button"
  onClick={() => triggerPwaUpdate()}
  disabled={isUpdating}
  aria-label={isUpdating ? 'Обновление приложения…' : 'Применить обновление'}
  className="w-full h-10 rounded-xl flex items-center justify-center gap-2 bg-primary-500/10 dark:bg-primary-500/15 border border-primary-500/20 text-primary-600 dark:text-primary-400 text-[12px] font-bold active:scale-[0.98] transition-all cursor-pointer disabled:cursor-default outline-none"
>
  {isUpdating ? (
    <RefreshCw className="w-4 h-4 animate-spin" />
  ) : (
    <Sparkles className="w-4 h-4" />
  )}
  {isUpdating ? 'Обновление…' : 'Обновить'}
</button>
```

**Стало:**
```tsx
<button
  type="button"
  onClick={() => triggerPwaUpdate()}
  disabled={isUpdating}
  aria-label={isUpdating ? 'Обновление приложения…' : 'Применить обновление'}
  className="relative w-full h-10 rounded-xl flex items-center justify-center gap-2 bg-primary-500/10 dark:bg-primary-500/15 border border-primary-500/20 text-primary-600 dark:text-primary-400 text-[12px] font-bold active:scale-[0.98] transition-all cursor-pointer disabled:cursor-default outline-none"
>
  {isUpdating ? (
    <RefreshCw className="w-4 h-4 animate-spin" />
  ) : (
    <Sparkles className="w-4 h-4" />
  )}
  {isUpdating ? 'Обновление…' : 'Доступно обновление'}
  {!isUpdating && (
    <span
      className="absolute top-1.5 right-2 w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse"
      aria-hidden="true"
    />
  )}
</button>
```

Изменения: добавлен `relative` к контейнеру; подпись «Обновить» → «Доступно обновление»; добавлена пульс-точка (`absolute top-1.5 right-2 w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse`) в правом верхнем углу чипа — перекрёстная согласованность с мобильной капсулой, признак «живого» обновления, и визуальное отличие от активной строки навигации (у той синий бар слева, у чипа — точка справа). Во время `isUpdating` точка скрывается (вместо неё крутится `RefreshCw`). Геометрия чипа (`w-full h-10 rounded-xl gap-2`), фон, бордер, текст — без изменений.

## Блок 4 — `BentoDashboard.tsx` · бейдж «9 активных»: к эталону пилюли лимита

**Было** (строки 600–608, контейнер бейджа):
```tsx
<div className="bg-slate-50/80 dark:bg-slate-800/80 flex items-center px-2 py-1 rounded-lg backdrop-blur-md border border-slate-200/50 dark:border-white/5">
  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
    <span className="text-deposit-500 mr-1">
      {activeCount}
    </span>
    {word}
  </span>
</div>
```

**Стало:**
```tsx
<div className="flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest shrink-0 bg-deposit-50 text-deposit-600 dark:bg-deposit-500/10 dark:text-deposit-400">
  {activeCount} {word}
</div>
```

Изменения:
- контейнер: `bg-slate-50/80 dark:bg-slate-800/80 ... backdrop-blur-md border border-slate-200/50 dark:border-white/5 rounded-lg px-2 py-1` → `bg-deposit-50 text-deposit-600 dark:bg-deposit-500/10 dark:text-deposit-400 rounded-full px-2 py-0.5` (tinted, без бордера, без стекла, скругление full — точно как у пилюли «100.0%»);
- форма `rounded-lg` → `rounded-full` (эталон);
- паддинг `px-2 py-1` → `px-2 py-0.5` (эталон, тоньше);
- текст: `text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400` → `text-[10px] font-bold tracking-widest` (размер 10px, вес bold — эталон); цвет унаследован от родителя (`text-deposit-600 dark:text-deposit-400`);
- удалён внутренний спан с `text-deposit-500 mr-1` — число и слово одним цветом, как в эталоне;
- добавлены `flex items-center shrink-0` (наследуются со старого контейнера, продублировать явно);
- логика плюрализма (`activeCount`, `word` — unchanged) и условие `if (activeCount > 0)` — без изменений.

Цвет совпадает с прогресс-баром «Вклады» (`bg-deposit-500`) в той же карточке → связность.

## Блок 5 — `changelog.ts` · запись v1.8.6

Добавить НОВУЮ запись в **начало** массива (существующие не трогать):

```ts
{
  version: "1.8.6",
  date: "2026-10-27",
  title: "Стабильная капсула обновления и свежие бейджи",
  improvements: [
    // === ТЕХНИЧЕСКИЕ ИЗМЕНЕНИЯ v1.8.6 ===
    // ReloadPrompt.tsx · UpdatePill: переход на solid-фон (bg-white dark:bg-slate-900), backdrop-blur/saturate удалены — устранён глитч stale-backdrop при spring-анимации y на motion.aside (видно как рваный край и альфа-фликер при входе капсулы). Кнопка «Обновить»: solid bg-primary-500 → tinted bg-primary-500/15 border-primary-500/25 (единый материал с плавающими чипами приложения). SidebarUpdatePrompt: подпись «Обновить» → «Доступно обновление» (помещается в 208px контента сайдбара на lg+) + пульс-точка на чипе (перекрёстная согласованность с мобильной капсулой).
    // BentoDashboard.tsx · бейдж активных вкладов приведён к эталону пилюли лимита вкладов (bg-deposit-50/dark:bg-deposit-500/10 + text-deposit-600/dark:text-deposit-400, rounded-full, без бордера и стекла).
    "Капсула об обновлении перестала мигать при появлении: убрана стеклянная подсветка, которая при анимации не успевала перерисовать фон — теперь капсула сплошная, как шапка.",
    "Кнопка «Обновить» в капсуле стала тише и роднее дизайну: акцентный оттенок вместо сплошной заливки.",
    "В сайдбаре кнопка обновления теперь показывает «Доступно обновление» целиком — помещается и понятно с первого взгляда.",
    "Бейдж «N активных» на карточке «Сбережения и инвестиции» приведён к единому языку с бейджем лимита вкладов — без рамки и стекла, в цвете вкладов."
  ]
},
```

## Что НЕ трогать

- `src/lib/pwaUpdate.ts` — без изменений.
- Позиционирование `MobileUpdatePrompt` (`top`, `left-4 right-4`, `max-w-sm`, sync со скрытием шапки) — без изменений.
- Spring-анимация `motion.aside` (y: -120/0, stiffness 450, damping 32) — без изменений (глитч устранён solid-фоном, не отключением анимации).
- Иконка `Sparkles`/`RefreshCw`, пульс-точка на мобильном тайле — без изменений.
- `ReleaseNotesDialog` — подхватит v1.8.6 через `changelog[0]`.
- Остальные бейджи и пилюли в приложении (InvestmentList, SmartActionBar) — без изменений.
- Любые другие файлы.

## Самопроверка после выполнения

```bash
# 1. Glass-эффект из капсулы удалён
grep -c "backdrop-blur\|backdrop-saturate" src/components/ui/ReloadPrompt.tsx   # → 0

# 2. Кнопка больше не solid
grep -c "hover:bg-primary-600 text-white" src/components/ui/ReloadPrompt.tsx   # → 0

# 3. «Доступно обновление» в мобильной капсуле и в сайдбар-чипе
grep -c "Доступно обновление" src/components/ui/ReloadPrompt.tsx                # → 2

# 4. Пульс-точка на сайдбар-чипе
grep -c "absolute top-1.5 right-2" src/components/ui/ReloadPrompt.tsx          # → 1

# 5. Старый бейдж «9 активных» (стекло+бордер на slate) удалён
grep -c "text-deposit-500 mr-1" src/components/dashboard/BentoDashboard.tsx      # → 0

# 6. Новый бейдж совпадает с языком пилюли лимита вкладов
grep -c "bg-deposit-50 text-deposit-600 dark:bg-deposit-500/10 dark:text-deposit-400" src/components/dashboard/BentoDashboard.tsx   # → 2 (бейдж лимита + новый бейдж активных)

# 7. Changelog
grep -n "1.8.6" src/data/changelog.ts                                            # → запись на первом месте массива
```

## Dev-проверка (визуальная)

`window.__showReloadPrompt()` в консоли →
- **Мобильная капсула**: при появлении/исчезновении нет рваного края и нет проступания фона сквозь плашку (solid, как шапка); кнопка «Обновить» — tinted primary с бордером, не сплошная синяя; текст «Доступно обновление» в одну строку; пульс-точка на тайле; ✕ работает.
- **Сайдбар (≥768px)**: чип говорит «Доступно обновление» целиком, не обрезан; на иконке Sparkles — пульс-точка справа сверху; tinted primary фон; тап → «Обновление…» со спиннером, точка скрывается.
- **Дашборд · «Сбережения и инвестиции»**: бейдж «9 активных» — tinted deposit, `rounded-full`, без бордера, цвет совпадает с прогресс-баром вкладов в той же карточке; рядом с бейджем «100.0%» лимита — одинаковая геометрия и язык.
