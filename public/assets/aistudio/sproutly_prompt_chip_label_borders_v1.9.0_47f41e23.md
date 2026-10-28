# Sproutly Pro — v1.9.0 (доп. правки): подпись сайдбар-чипа, двойные границы таблицы

Файлы для правки (только эти три):
- `src/components/ui/ReloadPrompt.tsx`
- `src/components/deposits/DepositRow.tsx`
- `src/components/deposits/DepositList.tsx`
- `src/data/changelog.ts` (минимальные точечные правки внутри уже существующей записи 1.9.0 — НОВАЯ запись не создаётся)

Больше НИКАКИХ файлов не трогать.

---

## Контекст (что и почему — в changelog не переносить)

1. **Сайдбар-чип обновления обрезается.** В сайдбаре на 272px контент-бюджет 208–232px. Текст «Доступно обновление» (20 символов) + иконка 20px + пульс-точка 8px + padding 32px = физически не помещается, обрезается до «Доступно обн…». Стиль чипа уже выровнен с `NavItem` (тот же `px-4 rounded-xl text-sm font-semibold border`, tinted-primary вместо slate-50 активного пункта — это уместно, чип важнее). Решение — только укоротить подпись до однослойного «Обновление» (11 символов), параллельно Дашборд/Активы/Настройки. Пульс-точка указывает «новое», клик по чипу запускает обновление (как и раньше).
2. **Двойная граница над строками с угловыми метками.** Угловая метка «Накопительный»/«Закрыт» имеет `border-b border-r border-{c}-500/25`. Её `border-b` лежит ВНУТРИ строки на y≈12px (высота метки) в левом углу — короткая параллельная линия чуть ниже настоящей границы строки, глаз воспринимает её как «двойную». Решение — убрать у метки `border-b`, оставить `border-r` для язычка/тайла. tinted bg и `border-r` сохраняют идентичность метки; `rounded-br-md`/`rounded-none` и `px-2 py-0.5 text-[8px] font-black uppercase tracking-widest` — БЕЗ изменений.
3. **Двойная граница над итоговой строкой.** Таблица на `border-separate border-spacing-0` (границы соседних ячеек НЕ коллапсируют). У последнего основного `<tr>` данных (main-tr последнего вклада) его `td` получает `border-b` от tbody-селектора `[&>tr>td]:border-b`, а у `tfoot > tr` есть `border-t` — они складываются в 2px. Селектор `[&>tr:last-child>td]:border-b-0` снимает только у ПОСЛЕДНЕГО `<tr>` (это expanded-tr последнего вклада, он всегда рендерится в DOM, даже свёрнутый в 0 высоты), а на main-tr `border-b` остаётся. Решение — добавить селектор `[&>tr:nth-last-child(2)>td]:border-b-0` для предпоследнего `<tr>` (это и есть main-tr последнего вклада). После правки останется только `border-t` футера = 1px над итогом, и `border-b` expanded-tr при раскрытии последнего вклада по-прежнему даёт границу между раскрытым контентом и футером.

---

## Часть A — `ReloadPrompt.tsx` (подпись сайдбар-чипа)

### Блок A1 — подпись в не-обновляющемся состоянии

**Было** (строка ~138, внутри `SidebarUpdatePrompt`):
```tsx
{isUpdating ? 'Обновление…' : 'Доступно обновление'}
```
**Стало:**
```tsx
{isUpdating ? 'Обновление…' : 'Обновление'}
```

Подпись мобильной капсулы `UpdatePill` (строка ~40) — БЕЗ изменений, там «Доступно обновление» помещается.

---

## Часть B — `DepositRow.tsx` (убрать нижнюю кромку угловых меток)

### Блок B1 — метка «Накопительный»

**Было** (строка ~89):
```tsx
"bg-deposit-500/10 dark:bg-deposit-500/15 text-deposit-600 dark:text-deposit-400 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 leading-none border-b border-r border-deposit-500/25",
```
**Стало:**
```tsx
"bg-deposit-500/10 dark:bg-deposit-500/15 text-deposit-600 dark:text-deposit-400 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 leading-none border-r border-deposit-500/25",
```
Изменение: удалено `border-b `.

### Блок B2 — метка «Закрыт»

**Было** (строка ~96):
```tsx
<span className="bg-slate-500/10 dark:bg-slate-500/15 text-slate-500 dark:text-slate-400 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-br-md leading-none border-b border-r border-slate-500/25">
```
**Стало:**
```tsx
<span className="bg-slate-500/10 dark:bg-slate-500/15 text-slate-500 dark:text-slate-400 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-br-md leading-none border-r border-slate-500/25">
```
Изменение: удалено `border-b `.

---

## Часть C — `DepositList.tsx` (tbody: снять border-b с main-tr последнего вклада)

### Блок C1 — tbody className

**Было** (строка ~519):
```tsx
<tbody className="[&>tr>td]:border-b [&>tr:last-child>td]:border-b-0 [&>tr>td]:border-slate-200 dark:[&>tr>td]:border-slate-800">
```
**Стало:**
```tsx
<tbody className="[&>tr>td]:border-b [&>tr:last-child>td]:border-b-0 [&>tr:nth-last-child(2)>td]:border-b-0 [&>tr>td]:border-slate-200 dark:[&>tr>td]:border-slate-800">
```
Изменение: добавлен сегмент `[&>tr:nth-last-child(2)>td]:border-b-0`.

---

## Часть D — `changelog.ts` (точечные правки внутри записи 1.9.0)

НОВАЯ запись НЕ создаётся — все правки за 27.10 уже живут в `1.9.0`. Внести три точечные правки внутри существующей записи.

### Блок D1 — обновить improvement-пункт про сайдбар-чип (стал stale)

**Было** (improvements, пункт 2):
```ts
"В сайдбаре уведомление об обновлении больше не обрезается — компактный чип «Доступно обновление» с пульс-точкой в ритме навигации.",
```
**Стало:**
```ts
"В сайдбаре уведомление об обновлении — короткий чип «Обновление» с пульс-точкой, в одном ритме с пунктами навигации; подпись больше не обрезается.",
```

### Блок D2 — добавить новый fix-пункт про двойные границы

В массив `fixes` записи 1.9.0, ПОСЛЕ существующих трёх пунктов, добавить четвёртый:
```ts
"Двойная толщина границ между строками таблицы вкладов устранена: над строками с угловыми метками «Накопительный»/«Закрыт» и над итоговой строкой границы теперь одинарные.",
```

### Блок D3 — технический комментарий [1.8.5–1.8.7] (обновить фразу про сайдбар-чип)

**Было** (внутри блока технических комментариев, фраза про сайдбар-чип):
```
// [1.8.5–1.8.7] ReloadPrompt.tsx: капсула в одну строку с кнопкой «Обновить» (tinted) и пульс-точкой; глобальная кликабельность капсулы убрана — обновление запускает только кнопка; solid-фон без backdrop-blur (фикс мигания при spring-анимации); сайдбар-чип «Доступно обновление» выровнен по левой оси и ритму навигации (text-sm, w-5 h-5, пульс-точка). BentoDashboard.tsx: бейдж «N активных» — рецепт счетного бейджа (rounded-full, без рамки, deposit-тинт). InvestmentList.tsx: пилюли карточек (счет, тип, доходность) — рецепты дизайн-кода.
```
**Стало:**
```
// [1.8.5–1.8.7] ReloadPrompt.tsx: капсула в одну строку с кнопкой «Обновить» (tinted) и пульс-точкой; глобальная кликабельность капсулы убрана — обновление запускает только кнопка; solid-фон без backdrop-blur (фикс мигания при spring-анимации); сайдбар-чип — короткая подпись «Обновление» (вместо обрезаемой «Доступно обновление»), выровнен по левой оси и ритму навигации (text-sm, w-5 h-5, пульс-точка). BentoDashboard.tsx: бейдж «N активных» — рецепт счетного бейджа (rounded-full, без рамки, deposit-тинт). InvestmentList.tsx: пилюли карточек (счет, тип, доходность) — рецепты дизайн-кода.
```

### Блок D4 — технический комментарий [1.9.0] (дополнить фразой про границы)

В существующий комментарий `[1.9.0]` (про DepositRow / DepositCard / диалоги) В КОНЕЦ добавить одну фразу:
```
DepositRow.tsx: у угловых этикеток убрана нижняя кромка (border-b → border-r) — её линия внутри строки воспринималась как двойная граница. DepositList.tsx: tbody получил селектор nth-last-child(2):border-b-0 — снимает border-b с main-tr последнего вклада, устраняя двойную границу над итоговой строкой (border-separate не коллапсирует, td border-b + footer border-t складывались в 2px).
```

---

## Что НЕ трогать

- Подпись мобильной капсулы `UpdatePill` («Доступно обновление» — там помещается).
- Пилюлю «Накопительный» в DepositCard (под названием банка) — эталон.
- Угловые метки DepositRow: позицию `absolute top-0 left-0`, `rounded-br-md`/`rounded-none`, цвета, `px-2 py-0.5`, `text-[8px]`, `font-black uppercase tracking-widest` — БЕЗ изменений; меняется только `border-b border-r` → `border-r`.
- Кнопку «Обновить» в `UpdatePill` (tinted, w-[76px]).
- Иконку `Sparkles`, пульс-точку, поведение клика по чипу (`triggerPwaUpdate`).
- Остальные селекторы tbody (`[&>tr>td]:border-b`, `[&>tr:last-child>td]:border-b-0`, цветовые классы).
- `tfoot > tr` className (`border-t border-slate-200 dark:border-slate-800` — остаётся как есть).
- Expanded-tr `border-b border-transparent` (он сам по себе прозрачный, не влияет).
- Записи changelog 1.8.2 и старше — БЕЗ изменений.
- Любые другие файлы.

## Самопроверка после выполнения

```bash
# A — подпись сайдбар-чипа
grep -n "'Доступно обновление'" src/components/ui/ReloadPrompt.tsx | head -3   # → 1 совпадение (в UpdatePill, мобильная капсула — НЕ в SidebarUpdatePrompt)

# B — угловые метки без border-b
grep -c "border-b border-r border-deposit-500/25" src/components/deposits/DepositRow.tsx   # → 0
grep -c "border-b border-r border-slate-500/25" src/components/deposits/DepositRow.tsx     # → 0
grep -c "border-r border-deposit-500/25" src/components/deposits/DepositRow.tsx            # → 1
grep -c "border-r border-slate-500/25" src/components/deposits/DepositRow.tsx               # → 1

# C — tbody селектор nth-last-child(2)
grep -c "nth-last-child(2)>td" src/components/deposits/DepositList.tsx   # → 1

# D — changelog точечные правки
grep -c 'короткий чип «Обновление»' src/data/changelog.ts                                                  # → 1
grep -c 'Двойная толщина границ между строками' src/data/changelog.ts                                       # → 1
grep -c 'border-b → border-r' src/data/changelog.ts                                                          # → 1
grep -c 'nth-last-child(2):border-b-0' src/data/changelog.ts                                                  # → 1
```

## Dev-проверка (визуальная)

1. **Сайдбар (md+):** чип «Обновление» + иконка Sparkles + пульс-точка — помещается целиком без троеточия, по высоте/ритму совпадает с пунктами навигации.
2. **Таблица вкладов (lg+):** между любыми двумя строками — одинарная граница 1px; в строках с «Накопительный»/«Закрыт» в левом углу больше нет второй короткой параллельной линии под основной границей; над итоговой строкой («ИТОГО ВЫПЛАЧЕНО») — одна линия 1px, а не двойная.
3. **Что нового?:** открывается одной записью v1.9.0; в её improvement-пункте про сайдбар написано «Обновление» (не «Доступно обновление»); в fixes появился пункт про двойные границы таблицы.
