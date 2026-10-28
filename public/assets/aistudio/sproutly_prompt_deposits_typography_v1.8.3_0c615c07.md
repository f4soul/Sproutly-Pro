# Sproutly.Pro — Типографика таблицы вкладов + переименование колонок дат (v1.8.3)

**Контекст:** вкладка «Активы → Вклады». Десктопная таблица видна только на `lg+` (компонент `DepositRow` внутри `hidden lg:block` в `DepositList.tsx`), мобильные карточки (`DepositCard`) — ниже `lg`. Обнаружены расхождения шрифтовых размеров между брейкпоинтами `lg` (планшет горизонтальный) и `xl` (ПК), а также расхождение терминологии колонок дат с формой и экспортом.

**Файлы:** `src/components/deposits/DepositList.tsx`, `src/components/deposits/DepositRow.tsx`, `src/components/deposits/DepositCard.tsx`, `src/components/deposits/DepositFormFormulaSelect.tsx`, `AGENTS.md`, `src/data/changelog.ts`.

Целевая шкала для таблицы вкладов (единственная на весь проект, кроме Income):
- Заголовки колонок (thead): `text-[10px] font-bold uppercase tracking-widest`
- Значения ячеек: `text-[13px]` (деньги — `font-bold`, даты — `font-medium`)
- Вторичные под-значения: `text-[11px] font-bold`
- Итоги: сумма/доход — `text-[13px] font-bold`, итоговая сумма — `text-[13px] font-black`
- Подписи над значениями (eyebrow): `text-[8px] font-black uppercase tracking-widest`

Запрещенные размеры после правки (в папке `deposits/`): `text-[6px]`, `text-[7px]`, `text-[7.5px]`, `text-[10.5px]`, `text-[12px]` для значений ячеек, `text-slate-850`.

---

## Блок 1 — DepositRow.tsx (строки таблицы)

1.1. Название банка — удалить мертвые брейкпоинты (таблица рендерится только на lg+, классы `sm:`/`md:` не работают):
- Было: `font-bold text-[13px] sm:text-xs md:text-[13px] whitespace-nowrap truncate text-slate-950 dark:text-white leading-tight`
- Стало: `font-bold text-[13px] whitespace-nowrap truncate text-slate-950 dark:text-white leading-tight`

1.2. Уголки-ленты в ячейке банка (2 шт: «Накопительный», «Закрыт») — поднять с нечитаемых 6px до системных 8px:
- `text-[6px]` → `text-[8px]` (классы `font-black uppercase tracking-widest px-1.5 py-0.5 leading-none` не менять).

1.3. Колонка «ПЕРИОД» (`table-cell xl:hidden`, видна на lg..xl) — сейчас даты 12px/10px при 13px во всех остальных колонках. Привести к единому виду:
- Стартовая дата: `text-[12px] font-medium text-slate-950 dark:text-white` → `text-[13px] font-medium text-slate-950 dark:text-white`
- Конечная дата: `text-[10px]` → `text-[11px]` (условие amber ≤7 дней с `font-bold` сохранить).
- **Удалить третий span полностью** (дубликат с `lg:hidden` — мертвый код, внутри td, который существует только на lg..xl, он не виден никогда).
- **Удалить блок пилюль полностью**: `<div className="flex sm:hidden items-center justify-center gap-1 mt-0.5">...` — тоже мертвый код (`sm:hidden` скрывает его на всем диапазоне существования этой колонки).

1.4. Остальные ячейки (ставка, сумма, доход, итого) — НЕ трогать: там уже корректные `text-[13px]`.

## Блок 2 — DepositList.tsx, шапка таблицы (thead)

2.1. Во всех 8 `<th>` шапки: `text-[9px]` → `text-[10px]`, добавить `whitespace-nowrap` (защита от переноса после удлинения заголовков).

2.2. Переименовать заголовки дат (в исходнике и с сохранением `renderSortIndicator`):
- `ОТКРЫТ` → `ОТКРЫТИЕ`
- `ЗАКРЫТ` → `ЗАКРЫТИЕ`

Логика: колонки содержат даты (события), а не состояния. Причастия «Открыт/Закрыт» остаются только в статус-бейджах. Это унифицирует таблицу с формой вклада («Дата открытия»/«Дата закрытия» в `DepositFormDateFields.tsx`) и с экспортом Excel/PDF (`ExportService.ts`), где уже используются «Дата открытия»/«Дата закрытия». Колонку `ПЕРИОД` (lg..xl) не переименовывать.

2.3. Косметика исходника: литерал `Банк` в первом `<th>` заменить на `БАНК` (остальные заголовки уже в верхнем регистре; визуально ничего не меняется, класс `uppercase` остается).

## Блок 3 — DepositList.tsx, подвал таблицы (tfoot)

3.1. Сумма: `tabular-nums text-[12px] xl:text-[13px] tracking-tight font-semibold text-slate-950 dark:text-white` → `tabular-nums text-[13px] font-bold text-slate-950 dark:text-white`
3.2. Доход (xl): `tabular-nums text-[13px] font-semibold text-deposit-600 dark:text-deposit-400` → `tabular-nums text-[13px] font-bold text-deposit-600 dark:text-deposit-400`
3.3. Итого (xl): оставить `text-[13px] font-black` (эталон).
3.4. Итого (lg..xl): `text-[12px] font-bold text-slate-950 dark:text-white` → `text-[13px] font-black text-slate-950 dark:text-white`; под ним доход `text-[10.5px] text-deposit-600 dark:text-deposit-400` → `text-[11px] font-bold text-deposit-600 dark:text-deposit-400`
3.5. Счетчик вкладов: `text-[12px] font-bold text-slate-850 dark:text-slate-200` → `text-[12px] font-bold text-slate-800 dark:text-slate-200` (цвета `slate-850` в палитре не существует — класс-пустышка).

## Блок 4 — DepositList.tsx, плавающая сводка (desktop) и мобильная аналитика

4.1. Плавающая панель (lg+): суммы — `font-semibold` → `font-bold` (2 места: Amount и Income); Итоговая сумма: `text-[14px] font-black` → `text-[13px] font-black` (синхронизация с tfoot).
4.2. Мобильная аналитика: свернутый заголовок `text-[7px]` → `text-[8px]`; подписи «Сумма вкладов» и «Ожидаемый доход» `text-[9px]` → `text-[10px]` (как у «Итоговая сумма»); свернутая сумма `text-xs font-bold text-slate-850 dark:text-white` → `text-xs font-bold text-slate-800 dark:text-white`.

## Блок 5 — DepositCard.tsx (мобильные карточки)

5.1. Пилюля «Накопительный»: `text-[7.5px]` → `text-[8px]`.
5.2. Бейдж «Закрыт»: `bg-rose-500` → `bg-slate-500` — унификация с десктопной лентой (`bg-slate-500`) и пилюлей (`bg-slate-500/10`). По дизайн-системе красный зарезервирован за деструктивными действиями; закрытый вклад — нейтральное архивное состояние.

## Блок 6 — DepositFormFormulaSelect.tsx

6.1. `text-slate-850` → `text-slate-800` (последнее из 3 мест по проекту).

## Блок 7 — AGENTS.md, раздел 3 «Typography Rules»

Добавить строку в конец раздела, чтобы зафиксировать стандарт и предотвратить будущий дрейф:
```
- **Desktop Tables (Вклады/Доход)**: headers `text-[10px] font-bold uppercase tracking-widest`; data cells `text-[13px]` (money `font-bold`, dates `font-medium`); secondary sub-values `text-[11px]`; totals `font-black`; eyebrow labels above values `text-[8px] font-black uppercase tracking-widest`. Never use off-scale sizes (6/7/7.5/9/10.5px) or non-existent colors (e.g. `slate-850`).
```

## Блок 8 — Changelog (src/data/changelog.ts)

Добавить новую запись ВЕРХНИМ элементом массива `changelog`:
```ts
{
  version: "1.8.3",
  date: "2026-10-27",
  title: "Единая типографика таблицы вкладов",
  improvements: [
    // === ТЕХНИЧЕСКИЕ ИЗМЕНЕНИЯ v1.8.3 ===
    // Унификация шрифтов десктопной таблицы вкладов: значения ячеек 13px, вторичные под-значения 11px, заголовки 10px, итоги bold/black. Удалены мертвые классы и блоки (адаптивные брейкпоинты у названия банка, дублирующий span и пилюли в колонке «Период»).
    // Исправлен несуществующий цвет text-slate-850 → text-slate-800 (3 места: tfoot, мобильная аналитика, выбор формулы).
    "Скачков размеров больше нет: при переходе между планшетной и полноэканной компоновкой таблицы вкладов все значения отображаются в едином размере — даты, суммы и итоги выровнены по одной шкале.",
    "Колонки дат переименованы: «Открыт» → «Открытие», «Закрыт» → «Закрытие» — заголовки теперь обозначают события (даты), а не состояния, единая терминология с формой вклада и экспортом в Excel/PDF.",
    "Заголовки таблицы стали читабельнее: размер увеличен с 9px до 10px с защитой от переноса строк.",
    "Согласованные итоги: строка «Итого» и плавающая панель сводки приведены к одной схеме — суммы и доход жирные, итоговая сумма акцентная в обоих местах.",
    "Единый стиль статуса «Закрыт»: бейдж на мобильной карточке переведен с красного на нейтральный серый, как в настольной таблице."
  ]
},
```

## Самопроверка после правок

1. `grep -rn "text-\[6px\]\|text-\[7px\]\|text-\[7.5px\]\|text-\[10.5px\]\|slate-850" src/components/deposits/ src/components/assets/` — 0 совпадений.
2. `grep -n "ЗАКРЫТ\|ОТКРЫТ" src/components/deposits/DepositList.tsx` — только `ОТКРЫТИЕ`/`ЗАКРЫТИЕ`.
3. `grep -c "text-\[13px\]" src/components/deposits/DepositRow.tsx` — ячейки значений единообразны.
4. Визуальная проверка на 1024px (lg), 1280px (xl), 1440px: даты в «Период» не мельче сумм; в шапке нет переносов; tfoot и плавающая сводка выглядят одинаково; бейдж «Закрыт» на карточке серый.
5. Тесты типов: `bun run build` без ошибок.
