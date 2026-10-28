# Sproutly Pro — v1.8.7: единый язык этикеток — угловые язычки вкладов + пилюли инвестиций

Файлы для правки (только эти четыре):
- `src/components/deposits/DepositRow.tsx`
- `src/components/deposits/DepositCard.tsx`
- `src/components/assets/InvestmentList.tsx`
- `src/data/changelog.ts`

Больше НИКАКИХ файлов не трогать.

⚠️ Это ОТРЕДАКТИРОВАННАЯ версия промпта (ревизия 2). Если применялась ревизия 1 — её Блок 2 (перенос `opacity-60` с обёртки) ОТМЕНЁН: в этой версии язычки остаются на уровне `td` и перенос не нужен.

---

## Контекст (что и почему — в changelog не переносить)

### Решение по таблице вкладов: угол сохраняется
Угловые ленты «Накопительный»/«Закрыт» в DepositRow **сохраняют форму и позицию** (`absolute top-0 left-0`, `rounded-br-md` на свободном углу). Причины: нулевая цена по вертикали (высота строк не меняется — пилюля под названием делала бы строки с метками выше остальных), мёртвая зона ячейки, сканируемая колонка флагов по левому краю. Меняется только оформление: сплошная заливка (громко на уже подкрашенной строке) → тихий тонированный язык.

Ремесленный приём против «призрачности» тонированного уголка: **кромка только на открытых рёбрах** (`border-b border-r`, без `border-t`/`border-l`) — элемент читается как язычок, приклеенный из угла; плюс чуть плотнее заливка в тёмной теме (`/15` вместо `/10`).

### Рецепты дизайн-кода (палитра invest полная: invest-50/400/500/600 существуют)

| Вид | Рецепт | Эталон в коде |
|---|---|---|
| Угловой язычок (только DepositRow) | `bg-{c}-500/10 dark:bg-{c}-500/15 text-{c}-600 dark:text-{c}-400` + `border-b border-r border-{c}-500/25` + `rounded-br-md`, px-1.5 py-0.5, 8px font-black uppercase tracking-widest, БЕЗ тени и opacity | — |
| Пилюля-этикетка (тип) | `text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full leading-none border shadow-xs whitespace-nowrap` + `border-{c}-500/25 bg-{c}-500/10 text-{c}-600 dark:text-{c}-400` | «Накопительный» (DepositCard, стр. 132) |
| Счётный бейдж | `px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest leading-none uppercase shrink-0` + `bg-{c}-50 text-{c}-600 dark:bg-{c}-500/10 dark:text-{c}-400`, БЕЗ рамки и тени | «9 активных» (BentoDashboard, v1.8.6) |
| Пилюля-значение | `px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest leading-none tabular-nums shrink-0` + тот же тинт, БЕЗ рамки и тени | «100.0%» лимита вкладов (BentoDashboard, стр. 541–544) |

---

## Блок 1 — `DepositRow.tsx` · контейнер язычков: убрать мёртвый класс

Таблица рендерится только на `lg+`, внутренние `sm:`-префиксы мёртвы (дисциплина v1.8.3).

**Было** (строка 86):
```tsx
<div className="absolute top-0 left-0 hidden sm:flex items-start z-20 pointer-events-none">
```
**Стало:**
```tsx
<div className="absolute top-0 left-0 flex items-start z-20 pointer-events-none">
```

## Блок 2 — `DepositRow.tsx` · язычок «Накопительный»: тонированный стиль

**Было** (строки 87–94):
```tsx
{isSavingsAccount && (
  <span className={cn(
    "bg-deposit-500 text-white dark:text-slate-900 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 leading-none opacity-90 shadow-[1px_1px_2px_rgba(0,0,0,0.1)]",
    isClosed ? "rounded-none" : "rounded-br-md"
  )}>
    Накопительный
  </span>
)}
```
**Стало:**
```tsx
{isSavingsAccount && (
  <span className={cn(
    "bg-deposit-500/10 dark:bg-deposit-500/15 text-deposit-600 dark:text-deposit-400 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 leading-none border-b border-r border-deposit-500/25",
    isClosed ? "rounded-none" : "rounded-br-md"
  )}>
    Накопительный
  </span>
)}
```
Изменения: заливка `bg-deposit-500 text-white dark:text-slate-900` → `bg-deposit-500/10 dark:bg-deposit-500/15 text-deposit-600 dark:text-deposit-400`; добавлена кромка открытых рёбер `border-b border-r border-deposit-500/25`; удалены `opacity-90` и тень. Форма, позиция, паддинги, условие `rounded-none/rounded-br-md` — без изменений.

## Блок 3 — `DepositRow.tsx` · язычок «Закрыт»: тонированный стиль

**Было** (строки 95–99):
```tsx
{isClosed && (
  <span className="bg-slate-500 text-white dark:text-slate-900 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-br-md leading-none opacity-90 shadow-[1px_1px_2px_rgba(0,0,0,0.1)]">
    Закрыт
  </span>
)}
```
**Стало:**
```tsx
{isClosed && (
  <span className="bg-slate-500/10 dark:bg-slate-500/15 text-slate-500 dark:text-slate-400 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-br-md leading-none border-b border-r border-slate-500/25">
    Закрыт
  </span>
)}
```
Тот же рецепт, slate-тинт (закрытость — нейтральное состояние). При паре «Накопительный + Закрыт» `border-r` первого образует тонкий шов между язычками — это ожидаемо и читаемо.

## Блок 4 — `DepositCard.tsx` · «Закрыт»: пилюля в слоте ставки (мобильная карточка)

На мобильной карточке язык уже пилюльный («Накопительный» — пилюля под названием), а слот ставки у закрытых пуст (`{!isClosed && ...}`) — пилюля встаёт в свободное место.

**Было** (строки 102–106):
```tsx
{isClosed && (
  <div className="absolute top-0 right-0 bg-slate-500 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl shadow-sm z-10">
    Закрыт
  </div>
)}
```
**Стало:** удалить полностью.

**Было** (блок ставки, строки 139–148):
```tsx
{!isClosed && (
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
Пилюля «Накопительный» на мобильной карточке (строки 131–135) — эталон, НЕ трогать.

## Блок 5 — `InvestmentList.tsx` · счётчик «N счетов/ИИС»: счётный бейдж

**Было** (строка 238, карточка-агрегат):
```tsx
<span className="text-[9px] font-black tracking-tight px-2 py-1 rounded-lg shadow-sm uppercase border text-invest-500 dark:text-invest-400 bg-invest-500/10 border-invest-500/20">
```
**Стало:**
```tsx
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest leading-none uppercase shrink-0 bg-invest-50 text-invest-600 dark:bg-invest-500/10 dark:text-invest-400">
```
Содержимое (строка 239) — без изменений. Рецепт зеркалит «9 активных» с дашборда (тот же вид — счётный бейдж), invest-палитра.

## Блок 6 — `InvestmentList.tsx` · тип «ИИС …/Брокерский»: пилюля-этикетка (2 места)

Найти ПО ДВУМ вхождениям строку `px-1.5 py-0.5 rounded-md text-[7px] xl:text-[8px]` (строки ~242 и ~333; первое — карточка-агрегат с `sampleAsset.type`, второе — карточка актива с `asset.type`).

**Было** (оба места, различаются только переменной):
```tsx
<span className={cn(
  "px-1.5 py-0.5 rounded-md text-[7px] xl:text-[8px] font-black uppercase tracking-widest leading-none",
  sampleAsset.type === 'iis'
    ? "text-invest-500/80 dark:text-invest-400/80 bg-white/50 dark:bg-invest-500/10 shadow-[0_1px_2px_rgba(6,182,212,0.05)] border border-invest-500/10"
    : "text-slate-400 dark:text-slate-500 bg-white/60 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50"
)}>
```
**Стало** (в обоих местах, переменную не трогать):
```tsx
<span className={cn(
  "inline-flex items-center text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full leading-none border shadow-xs whitespace-nowrap",
  sampleAsset.type === 'iis'
    ? "border-invest-500/25 bg-invest-500/10 text-invest-600 dark:text-invest-400"
    : "border-slate-500/25 bg-slate-500/10 text-slate-500 dark:text-slate-400"
)}>
```
Изменения: `rounded-md` → `rounded-full`; `text-[7px] xl:text-[8px]` → плоский `text-[8px]` (убран живой адаптивный скачок 7→8px); удалены `text-invest-500/80` (полупрозрачный текст), стеклянные `bg-white/50`/`bg-white/60`, микротень; broker-ветка → slate-рецепт «Закрыт». Рецепт зеркалит «Накопительный».

## Блок 7 — `InvestmentList.tsx` · доходность «+x.xx%»: пилюля-значение (2 места)

**Было №1** (строки ~298–305, карточка-агрегат, в теле):
```tsx
<span className={cn(
  "text-[10px] font-black tracking-tight px-2 py-1 rounded-lg shadow-sm tabular-nums border",
  isPositive 
    ? "text-invest-500 dark:text-invest-400 bg-invest-500/10 border-invest-500/20" 
    : "text-rose-500 bg-rose-500/10 border-rose-500/20"
)}>
```
**Было №2** (строки ~324–331, карточка актива, угловой стек):
```tsx
<span className={cn(
  "text-[9px] font-black tracking-tight px-2 py-0.5 rounded-lg shadow-sm tabular-nums border",
  isPositive 
    ? "text-invest-500 dark:text-invest-400 bg-invest-500/10 border-invest-500/20" 
    : "text-rose-500 bg-rose-500/10 border-rose-500/20"
)}>
```
**Стало (оба места, одинаково):**
```tsx
<span className={cn(
  "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest leading-none tabular-nums shrink-0",
  isPositive
    ? "bg-invest-50 text-invest-600 dark:bg-invest-500/10 dark:text-invest-400"
    : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
)}>
```
Изменения: `rounded-lg` → `rounded-full`; `font-black` → `font-bold`, 9px/10px → единый 10px (рецепт пилюли-значения); удалены рамка и тень; **у розовой ветки добавлена тёмная тема** (раньше её не было — в dark оставался светлый `bg-rose-500/10` без текстовой ветки). Содержимое (`{isPositive ? "+" : ""}{profitPercent.toFixed(2)}%`) — без изменений.

## Блок 8 — `changelog.ts` · запись v1.8.7

Добавить НОВУЮ запись в **начало** массива (существующие не менять):

```ts
{
  version: "1.8.7",
  date: "2026-10-27",
  title: "Единый язык этикеток вкладов и инвестиций",
  improvements: [
    // === ТЕХНИЧЕСКИЕ ИЗМЕНЕНИЯ v1.8.7 ===
    // DepositRow.tsx: угловые ленты «Накопительный»/«Закрыт» сохранены в углу (форма и позиция), оформление переведено на тонированный язык (bg-{c}-500/10 dark:/15, текст 600/400, кромка border-b border-r {c}-500/25 на открытых ребрах, rounded-br-md сохранен); удалены сплошная заливка, opacity-90 и тень; мертвый класс hidden sm: у контейнера удален.
    // DepositCard.tsx: угловая лента «Закрыт» (absolute top-0 right-0, rounded-bl-xl) заменена тонированной пилюлей в слоте ставки (у закрытых вкладов ставка скрыта — слот свободен).
    // InvestmentList.tsx: пилюли карточек приведены к видам дизайн-кода: счетчик «N счетов» — рецепт счетного бейджа (10px bold, rounded-full, без рамки), тип «ИИС/Брокерский» (2 места) — рецепт пилюли-этикетки (8px black, рамка), доходность «+x.xx%» (2 места) — рецепт пилюли-значения (10px bold, tabular-nums); удалены rounded-lg/rounded-md, тени, стеклянные фоны bg-white/50 и text-invest-500/80, у розовой ветки доходности добавлена темная тема.
    "Этикетки «Накопительный» и «Закрыт» в таблице вкладов стали тише: та же позиция в углу строки, но мягкое тонированное оформление вместо сплошной заливки — в одном языке с остальными бейджами приложения.",
    "Бейдж «Закрыт» на карточке вклада встал на место ставки — ровно, без наложения на угол карточки.",
    "Бейджи на карточках инвестиций приведены к единому стилю: счет, тип счета и доходность — аккуратные пилюли в одном языке с бейджами дашборда, включая корректную темную тему для отрицательной доходности."
  ]
},
```

## Что НЕ трогать

- Пилюлю «Накопительный» в DepositCard (строки 131–135) — эталон.
- Обёртку `flex items-center gap-3 relative z-10` с условным `opacity-60` в DepositRow — БЕЗ изменений (язычки на уровне `td`, не внутри обёртки; перенос opacity из ревизии 1 отменён).
- `stickyBg` / `trBackground` (приглушённые фоны строк) и остальные `opacity-60` в ячейках DepositRow.
- Стеклянные КАРТОЧКИ инвестиций (`bg-white/90 backdrop-blur-2xl` и т.п.) — это язык карточек, не пилюль; пилюли на них смотрятся корректно.
- Прогресс-бары с `rounded-full` в InvestmentList — это не пилюли.
- `InvestmentForm.tsx`, `SmartActionBar.tsx`, heatmap-компоненты.
- Любые другие файлы.

## Самопроверка после выполнения

```bash
# DepositRow — форма угла сохранена, старый стиль удален
grep -c "bg-deposit-500 text-white" src/components/deposits/DepositRow.tsx      # → 0
grep -c "bg-slate-500 text-white" src/components/deposits/DepositRow.tsx       # → 0
grep -c "opacity-90" src/components/deposits/DepositRow.tsx                    # → 0
grep -c "shadow-\[1px_1px_2px" src/components/deposits/DepositRow.tsx          # → 0
grep -c "hidden sm:flex" src/components/deposits/DepositRow.tsx                # → 0
grep -c "rounded-br-md" src/components/deposits/DepositRow.tsx                 # → 2 (условие + «Закрыт»)
grep -c "border-b border-r border-deposit-500/25" src/components/deposits/DepositRow.tsx   # → 1
grep -c "border-b border-r border-slate-500/25" src/components/deposits/DepositRow.tsx     # → 1

# DepositCard — угловая лента удалена, пилюля в слоте
grep -c "rounded-bl-xl" src/components/deposits/DepositCard.tsx                # → 0
grep -c "bg-slate-500 text-white" src/components/deposits/DepositCard.tsx      # → 0
grep -c "border-slate-500/25 bg-slate-500/10" src/components/deposits/DepositCard.tsx       # → 1

# InvestmentList — старые пилюли удалены, рецепты на месте
grep -c "px-1.5 py-0.5 rounded-md" src/components/assets/InvestmentList.tsx    # → 0
grep -c "px-2 py-1 rounded-lg" src/components/assets/InvestmentList.tsx        # → 0
grep -c "px-2 py-0.5 rounded-lg" src/components/assets/InvestmentList.tsx      # → 0
grep -c "text-\[7px\]" src/components/assets/InvestmentList.tsx                # → 0
grep -c "text-invest-500/80" src/components/assets/InvestmentList.tsx          # → 0
grep -c "bg-white/50 dark:bg-invest-500/10" src/components/assets/InvestmentList.tsx       # → 0
grep -c "bg-white/60 dark:bg-slate-800" src/components/assets/InvestmentList.tsx           # → 0
grep -c "bg-invest-50 text-invest-600 dark:bg-invest-500/10 dark:text-invest-400" src/components/assets/InvestmentList.tsx  # → 3
grep -c "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" src/components/assets/InvestmentList.tsx        # → 2
grep -c "border-invest-500/25 bg-invest-500/10 text-invest-600 dark:text-invest-400" src/components/assets/InvestmentList.tsx  # → 2
grep -c "border-slate-500/25 bg-slate-500/10 text-slate-500 dark:text-slate-400" src/components/assets/InvestmentList.tsx      # → 2

# Changelog
grep -n "1.8.7" src/data/changelog.ts | head -1   # → первая запись массива
```

## Dev-проверка (визуальная)

- **Таблица вкладов (lg+):** накопительный счёт — тихий deposit-язычок в углу первой ячейки (тонированный, с тонкой кромкой снизу/справа, скруглённый свободный угол), сплошной бирюзовой ленты нет; закрытый вклад — slate-язычок; закрытый накопительный — двойная полоса с тонким швом; **высота строк с метками не изменилась**.
- **Мобильная карточка вклада:** закрытая — «Закрыт» справа в слоте ставки, угловой ленты нет; накопительная — пилюля под названием (без изменений).
- **Инвестиции:** угловой стек карточки — «N счетов» (10px, без рамки) над «ИИС Тип 3» (8px, рамка, invest-тинт) или «Брокерский» (slate); доходность «+2.45%» — 10px `rounded-full` invest-тинт; отрицательная «−1.20%» — rose-тинт, **в тёмной теме читаема** (раньше тёмной ветки не было).
- **Тёмная тема:** язычки и пилюли читаемы (`dark:bg-{c}-500/15` у язычков, `dark:text-{c}-400` у всех).
