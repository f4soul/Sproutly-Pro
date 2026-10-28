# Sproutly Pro — v1.9.0: воздух для этикеток, угловая метка «Закрыт» + ставка на лице карточки, стабильные диалоги, консолидация changelog

Файлы для правки (только эти семь):
- `src/components/deposits/DepositRow.tsx`
- `src/components/deposits/DepositCard.tsx`
- `src/components/assets/InvestmentList.tsx`
- `src/components/assets/CashList.tsx`
- `src/components/assets/CryptoList.tsx`
- `src/components/layout/Layout.tsx`
- `src/data/changelog.ts`

Больше НИКАКИХ файлов не трогать.

---

## Контекст (что и почему — в changelog не переносить)

1. **Воздух для угловых этикеток таблицы.** Зазор между нижним краем угловой этикетки и верхним краем логотипа банка сейчас ~2px (логотип: `mt-1` от верха `td` c `p-2.5`). Решение: не уменьшать шрифт (8px — пол типографики проекта, 7px запрещен AGENTS.md §3), а добавить воздуха: `mt-1 → mt-2` у логотипа и названия (+4px к высоте каждой строки) и `px-1.5 → px-2` внутри этикеток.
2. **Мобильная карточка закрытого вклада.** «Закрыт» возвращается в угол карточки (top-right, тонированный язычок — зеркало настольного top-left), а ставка, скрытая с лица закрытой карточки, возвращается на него (приглушенная — как в таблице на ПК). Чтобы язычок не наследовал приглушение, `opacity-70 grayscale-[0.3]` переносится с корня карточки на контентные секции (шапка, прогресс, низ, разворот).
3. **Прыжок окон подтверждения.** Обертка `fixed inset-0 overflow-y-auto` + мобильная анимация входа (`translate-y-4` / motion `y: 20`) на первом кадре выталкивает панель за нижний край обертки → у обертки появляется собственный скроллбар → панель `w-full` сужается на его ширину и прыгает. Лечение — паттерн, уже примененный в 6 модалках-формах проекта: `[scrollbar-gutter:stable]` (желоб зарезервирован всегда — скроллбар не меняет ширину панели) + `overscroll-contain`. Четыре места: InvestmentList (удаление счета), CashList (удаление), CryptoList (удаление), Layout (подтверждение выхода).
4. **Changelog.** Записи 1.8.5, 1.8.6, 1.8.7 (однодневные итерации) консолидируются вместе с текущими правками в одну запись v1.9.0.

---

## Часть A — `DepositRow.tsx` (воздух)

### Блок A1 — этикетка «Накопительный»: внутренние отступы

**Было** (строка 89):
```tsx
"bg-deposit-500/10 dark:bg-deposit-500/15 text-deposit-600 dark:text-deposit-400 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 leading-none border-b border-r border-deposit-500/25",
```
**Стало:**
```tsx
"bg-deposit-500/10 dark:bg-deposit-500/15 text-deposit-600 dark:text-deposit-400 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 leading-none border-b border-r border-deposit-500/25",
```
Изменение: только `px-1.5` → `px-2`.

### Блок A2 — этикетка «Закрыт»: внутренние отступы

**Было** (строка 96):
```tsx
<span className="bg-slate-500/10 dark:bg-slate-500/15 text-slate-500 dark:text-slate-400 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-br-md leading-none border-b border-r border-slate-500/25">
```
**Стало:**
```tsx
<span className="bg-slate-500/10 dark:bg-slate-500/15 text-slate-500 dark:text-slate-400 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-br-md leading-none border-b border-r border-slate-500/25">
```
Изменение: только `px-1.5` → `px-2`.

### Блок A3 — логотип банка: воздух от верха

**Было** (строка 109, класс div-обертки логотипа):
```tsx
<div className="w-8 h-8 rounded-lg overflow-hidden bg-white/50 dark:bg-transparent border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1 shrink-0 shadow-sm transition-all mt-1">
```
**Стало:**
```tsx
<div className="w-8 h-8 rounded-lg overflow-hidden bg-white/50 dark:bg-transparent border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1 shrink-0 shadow-sm transition-all mt-2">
```
Изменение: только `mt-1` → `mt-2`.

### Блок A4 — название банка: синхронный воздух

**Было** (строка 125):
```tsx
<div className="min-w-0 flex flex-col justify-center mt-1">
```
**Стало:**
```tsx
<div className="min-w-0 flex flex-col justify-center mt-2">
```
Изменение: только `mt-1` → `mt-2`.

---

## Часть B — `DepositCard.tsx` (угловая метка + ставка + приглушение по секциям)

### Блок B1 — корень: убрать общее приглушение карточки

**Было** (className корневого div карточки, строки ~74–83):
```tsx
      className={cn(
        "flex flex-col p-4 relative cursor-pointer group transition-colors duration-150 overflow-hidden outline-none focus:outline-none focus-visible:outline-none select-none tap-highlight-none active:scale-100",
        isClosed
          ? "opacity-70 grayscale-[0.3]"
          : isSavingsAccount
            ? "bg-deposit-500/[0.02] dark:bg-deposit-500/[0.05] hover:bg-deposit-500/[0.04] dark:hover:bg-deposit-500/[0.08] active:bg-deposit-500/[0.08] dark:active:bg-deposit-500/[0.14]"
            : "hover:bg-slate-50/50 dark:hover:bg-white/5 active:bg-slate-100/80 dark:active:bg-white/[0.08]",
        !isLast && "border-b border-slate-200 dark:border-slate-800",
      )}
```
**Стало:**
```tsx
      className={cn(
        "flex flex-col p-4 relative cursor-pointer group transition-colors duration-150 overflow-hidden outline-none focus:outline-none focus-visible:outline-none select-none tap-highlight-none active:scale-100",
        isSavingsAccount
          ? "bg-deposit-500/[0.02] dark:bg-deposit-500/[0.05] hover:bg-deposit-500/[0.04] dark:hover:bg-deposit-500/[0.08] active:bg-deposit-500/[0.08] dark:active:bg-deposit-500/[0.14]"
          : "hover:bg-slate-50/50 dark:hover:bg-white/5 active:bg-slate-100/80 dark:active:bg-white/[0.08]",
        !isLast && "border-b border-slate-200 dark:border-slate-800",
      )}
```
Изменение: удалена ветка `isClosed ? "opacity-70 grayscale-[0.3]"`; тернарник фонов упрощен. Приглушение переносится на секции (блоки B3–B6).

### Блок B2 — угловая метка «Закрыт» (top-right)

Сразу ПОСЛЕ закрывающего `/>` блока «Dynamic Background Tint» (div с linear-gradient, строки ~95–100) добавить:
```tsx
      {isClosed && (
        <div className="absolute top-0 right-0 z-10 bg-slate-500/10 dark:bg-slate-500/15 text-slate-500 dark:text-slate-400 text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-bl-xl leading-none border-b border-l border-slate-500/25">
          Закрыт
        </div>
      )}
```
Рецепт — зеркало настольного язычка top-left: тонированный slate, кромка на открытых рёбрах (для top-right это низ + лево), скругление свободного угла `rounded-bl-xl`.

### Блок B3 — секция шапки (лого + ставка): приглушение

**Было** (строка ~103):
```tsx
      <div className="flex items-center justify-between mb-4 relative z-10">
```
**Стало:**
```tsx
      <div className={cn("flex items-center justify-between mb-4 relative z-10", isClosed && "opacity-70 grayscale-[0.3]")}>
```

### Блок B4 — секция прогресса: приглушение

**Было** (строка ~152):
```tsx
      <div className="mb-3 relative z-10">
```
**Стало:**
```tsx
      <div className={cn("mb-3 relative z-10", isClosed && "opacity-70 grayscale-[0.3]")}>
```

### Блок B5 — нижняя секция (суммы): приглушение

**Было** (строка ~193):
```tsx
      <div className="flex items-end justify-between pt-3 border-t border-slate-200/50 dark:border-slate-800/50 relative z-10">
```
**Стало:**
```tsx
      <div className={cn("flex items-end justify-between pt-3 border-t border-slate-200/50 dark:border-slate-800/50 relative z-10", isClosed && "opacity-70 grayscale-[0.3]")}>
```

### Блок B6 — контент разворота: приглушение

**Было** (строка ~221, внутренний div с «Формула/Доход в день/Итоговая сумма»):
```tsx
          <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-2.5 text-xs">
```
**Стало:**
```tsx
          <div className={cn("mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-2.5 text-xs", isClosed && "opacity-70 grayscale-[0.3]")}>
```

### Блок B7 — ставка всегда на лице (пилюля «Закрыт» удалена)

**Было** (блок в правой части шапки, строки ~133–148):
```tsx
        {isClosed ? (
          <div className="shrink-0 ml-3 flex items-center">
            <span className="inline-flex items-center text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full leading-none border border-slate-500/25 bg-slate-500/10 text-slate-500 dark:text-slate-400 shadow-xs whitespace-nowrap">
              Закрыт
            </span>
          </div>
        ) : (
          <div className="text-right shrink-0 ml-3">
            <span
              className="text-xl sm:text-2xl font-black tracking-tighter"
              style={{ color: bankDetails.color }}
            >
              <span className="tabular-nums">{deposit.rate}%</span>
            </span>
          </div>
        )}
```
**Стало:**
```tsx
        <div className="text-right shrink-0 ml-3">
          <span
            className="text-xl sm:text-2xl font-black tracking-tighter"
            style={{ color: bankDetails.color }}
          >
            <span className="tabular-nums">{deposit.rate}%</span>
          </span>
        </div>
```
Ставка показывается всегда; для закрытых карточек она приглушается вместе с секцией шапки (блок B3) — паритет с таблицей на ПК. Пилюля «Накопительный» под названием банка — БЕЗ изменений.

---

## Часть C — стабильные диалоги (`[scrollbar-gutter:stable]` + `overscroll-contain`)

### Блок C1 — `InvestmentList.tsx` (обертка подтверждения удаления счета, строка ~461)

**Было:**
```tsx
          <div className="fixed inset-0 z-10 overflow-y-auto">
```
**Стало:**
```tsx
          <div className="fixed inset-0 z-10 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
```

### Блок C2 — `CashList.tsx` (строка ~470)

**Было:**
```tsx
          <div className="fixed inset-0 z-10 overflow-y-auto">
```
**Стало:**
```tsx
          <div className="fixed inset-0 z-10 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
```

### Блок C3 — `CryptoList.tsx` (строка ~442)

**Было:**
```tsx
          <div className="fixed inset-0 z-10 overflow-y-auto">
```
**Стало:**
```tsx
          <div className="fixed inset-0 z-10 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
```

### Блок C4 — `Layout.tsx` (подтверждение выхода, строка ~729)

**Было:**
```tsx
            <div className="fixed inset-0 overflow-y-auto">
```
**Стало:**
```tsx
            <div className="fixed inset-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
```

### Блок C5 — `InvestmentList.tsx`: последняя пилюля доходности в шапке списка (строка ~167)

**Было:**
```tsx
                  <span className={cn("text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-md", stats.profit >= 0 ? "bg-invest-50 text-invest-600 dark:bg-invest-500/10 dark:text-invest-400" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400")}>
```
**Стало:**
```tsx
                  <span className={cn("text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full", stats.profit >= 0 ? "bg-invest-50 text-invest-600 dark:bg-invest-500/10 dark:text-invest-400" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400")}>
```
Изменение: `px-1.5 py-0.5 rounded-md` → `px-2 py-0.5 rounded-full` (рецепт пилюли-значения; цвета уже верные). Содержимое — без изменений.

---

## Часть D — `changelog.ts` (консолидация в v1.9.0)

Удалить ПЕРВЫЕ ТРИ записи массива `changelog` — `1.8.7`, `1.8.6` и `1.8.5` (объекты с этими version, включая их технические комментарии) — и вставить на их место, в начало массива, одну новую запись:

```ts
{
  version: "1.9.0",
  date: "2026-10-27",
  title: "Тихая капсула обновления и единый язык бейджей",
  improvements: [
    // === ТЕХНИЧЕСКИЕ ИЗМЕНЕНИЯ v1.9.0 (консолидация дневных итераций дизайна) ===
    // ReloadPrompt.tsx: капсула обновления в одну строку с кнопкой «Обновить» (tinted) и пульс-точкой; глобальная кликабельность капсулы убрана — обновление запускает только кнопка; solid-фон без backdrop-blur (фикс мигания при spring-анимации); сайдбар-чип «Доступно обновление» с пульс-точкой.
    // BentoDashboard.tsx: бейдж «N активных» приведен к рецепту счетного бейджа (rounded-full, без рамки, deposit-тинт).
    // DepositRow.tsx: угловые этикетки «Накопительный»/«Закрыт» — тонированный язык с кромкой на открытых ребрах, угол сохранен; px-1.5 → px-2 внутри этикеток, mt-1 → mt-2 у логотипа и названия — воздух между этикеткой и логотипом.
    // DepositCard.tsx: «Закрыт» — угловая тонированная метка top-right (кромка на открытых ребрах, rounded-bl-xl); ставка возвращена на лицо закрытой карточки; приглушение opacity-70 grayscale-[0.3] перенесено с корня на контентные секции — метка полноконтрастна.
    // InvestmentList/CashList/CryptoList/Layout: обертки диалогов подтверждения (fixed inset-0 overflow-y-auto) получили overscroll-contain + [scrollbar-gutter:stable] — устранен прыжок окна при появлении (собственный скроллбар обертки на кадре анимации входа менял ширину панели w-full).
    // InvestmentList.tsx: пилюли карточек (счет, тип счета, доходность) приведены к рецептам дизайн-кода; добавлена темная тема для отрицательной доходности; пилюля доходности в шапке списка — rounded-full.
    "Уведомление об обновлении стало компактным и спокойным: одна строка, тихая кнопка «Обновить» вместо инструкции; случайный тап по капсуле больше не перезапускает приложение.",
    "В сайдбаре уведомление об обновлении больше не обрезается — компактная кнопка «Доступно обновление» в ритме навигации.",
    "Этикетки «Накопительный» и «Закрыт» в таблице вкладов остались на своих местах в углу строки, но стали тише и с воздухом между этикеткой и логотипом банка.",
    "Закрытый вклад на телефоне: метка «Закрыт» снова в углу карточки, а ставка, под которую открывался вклад, видна прямо на карточке — приглушенная, как в таблице на ПК.",
    "Бейджи дашборда и карточек инвестиций приведены к единому языку пилюль; у отрицательной доходности теперь корректная темная тема.",
    "Окна подтверждения (удаление счета, выход) больше не дергаются при появлении — полоса прокрутки больше не меняет их ширину на кадре анимации."
  ]
},
```

Записи `1.8.4` и более старые — НЕ трогать.

---

## Что НЕ трогать

- Пилюлю «Накопительный» в DepositCard (под названием банка) — эталон.
- Угловые этикетки DepositRow: позицию, `rounded-br-md`/`rounded-none`, кромку `border-b border-r`, цвета — меняются только `px` (A1, A2) и `mt` (A3, A4).
- Обертку `flex items-center gap-3 relative z-10` с условным `opacity-60` в DepositRow — без изменений (этикетки на уровне `td`, вне обертки).
- `DeleteConfirmModal.tsx` (диалог удаления вклада) — у него нет `overflow-y-auto`-обертки, не трогать.
- Модалки-формы (DepositForm, InvestmentForm, CashForm, CryptoForm, IncomeSettingsDialog, IncomeColumnsDialog) — у них `[scrollbar-gutter:stable]` уже есть.
- `html { scrollbar-gutter: stable; }` в index.css — без изменений.
- `stickyBg` / `trBackground` в DepositRow, остальные `opacity-60` в ячейках.
- Стеклянные карточки InvestmentList (`bg-white/90 backdrop-blur-2xl`), прогресс-бары, чипы статистики в шапке списка (кроме пилюли из блока C5).
- Любые другие файлы.

## Самопроверка после выполнения

```bash
# A — воздух в DepositRow
grep -c "px-1.5 py-0.5" src/components/deposits/DepositRow.tsx      # → 0
grep -c "mt-1" src/components/deposits/DepositRow.tsx               # → 0
grep -c "mt-2" src/components/deposits/DepositRow.tsx               # → 2

# B — карточка: уголок, ставка, приглушение по секциям
grep -c "absolute top-0 right-0" src/components/deposits/DepositCard.tsx            # → 1
grep -c "border-b border-l border-slate-500/25" src/components/deposits/DepositCard.tsx   # → 1
grep -c "grayscale" src/components/deposits/DepositCard.tsx                          # → 4
grep -c "deposit.rate}%" src/components/deposits/DepositCard.tsx                     # → 1
grep -c "isClosed ? (" src/components/deposits/DepositCard.tsx                       # → 0

# C — стабильные диалоги + последняя пилюля
grep -c "scrollbar-gutter:stable" src/components/assets/InvestmentList.tsx   # → 1
grep -c "scrollbar-gutter:stable" src/components/assets/CashList.tsx         # → 1
grep -c "scrollbar-gutter:stable" src/components/assets/CryptoList.tsx       # → 1
grep -c "scrollbar-gutter:stable" src/components/layout/Layout.tsx           # → 1
grep -c "px-1.5 py-0.5 rounded-md" src/components/assets/InvestmentList.tsx  # → 0

# D — changelog консолидирован
grep -n '"1.8.5"\|"1.8.6"\|"1.8.7"' src/data/changelog.ts    # → 0 совпадений
grep -n '"1.9.0"' src/data/changelog.ts | head -1            # → первая запись массива
```

## Dev-проверка (визуальная)

1. **Таблица вкладов (lg+):** между угловой этикеткой и логотипом банка теперь явный воздух (~6px); этикетки чуть шире изнутри; строки стали на 4px выше — равномерно у всех, ритм не сломан.
2. **Мобильная карточка закрытого вклада:** «Закрыт» — тихий язычок в правом верхнем углу (тонированный, кромка снизу и слева, скруглен свободный угол), полноконтрастный; ставка банка видна справа на лице карточки, приглушенная вместе с контентом; остальной контент карточки приглушен как раньше (после раскрытия — тоже).
3. **Мобильная карточка открытого вклада:** без изменений (ставка на месте, угловой метки нет).
4. **Диалоги подтверждения (инвестиции/наличные/крипта/выход) на ширине <640px:** окно появляется без горизонтального дерганья и без прыжка ширины на кадре анимации; полоса прокрутки (если мелькает на кадре входа) не сжимает панель.
5. **Шапка списка инвестиций:** пилюля доходности «+x.xx%» — `rounded-full`.
6. **«Что нового?»:** открывается с v1.9.0 единой записью (1.8.5–1.8.7 в списке отсутствуют).
