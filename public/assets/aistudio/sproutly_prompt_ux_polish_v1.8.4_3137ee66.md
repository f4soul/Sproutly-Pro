# Sproutly.Pro — UX-полировка v1.8.4: карточки, клавиатура, зона обновлений, «Что нового?»

**Контекст:** 4 точечных улучшения после аудита. Все формы модалок (Deposit/Cash/Crypto/Investment) используют общий хук `useSafeModalClose` и одинаковую разметку `fixed inset-y-0 flex items-end sm:items-center` + `max-h-[90dvh]` — правки хука и viewport-meta действуют на все четыре формы сразу.

**Файлы:** `src/components/deposits/DepositCard.tsx`, `index.html`, `src/hooks/useSafeModalClose.ts`, `src/components/ui/ReloadPrompt.tsx`, `src/components/layout/Layout.tsx`, `src/App.tsx`, `src/components/ui/ToastContainer.tsx`, `src/components/ui/ReleaseNotesDialog.tsx`, `src/data/changelog.ts`.

---

## Блок 1 — DepositCard.tsx: центрирование процента

Верхний ряд карточки — `flex items-start justify-between`. Процент прижат к верху: на карточках без бейджа он висит чуть выше оптического центра иконки, на карточках с бейджем «Накопительный» под ним остается пустота (левый блок выше).

1.1. Строка «Top Row: Logo & Rate»: `flex items-start justify-between mb-4 relative z-10` → `flex items-center justify-between mb-4 relative z-10`. Больше ничего в карточке не менять: размеры, цвета, `ml-3`, скрытие процента у закрытых вкладов — без изменений.

Результат: без бейджа — иконка, имя и процент на одной оптической оси; с бейджем — процент центрируется между именем и бейджем, заполняя пустоту.

## Блок 2 — Скачок интерфейса при сохранении формы (клавиатура)

Диагноз: в `useSafeModalClose` уже есть blur → save → 80ms → close, но (а) 80ms намного короче анимации схлопывания клавиатуры (~250–300ms), поэтому exit-анимация модалки стартует ВОВРЕМЯ движения вьюпорта — это и есть скачок; (б) ref `initialScrollY` захватывается, но нигде не используется — восстановление скролла не реализовано; (в) в viewport-meta нет `interactive-widget` — на Android Chrome клавиатура не меняет layout viewport, браузер панорамирует visual viewport и при закрытии «отдает» позицию рывком.

2.1. `index.html` — дополнить meta viewport флагом Android (iOS игнорирует):
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content" />
```

2.2. `src/hooks/useSafeModalClose.ts` — переработать `safeClose` (публичный API и `isSubmitting` сохранить):

a) Добавить приватный helper ожидания стабилизации вьюпорта:
```ts
const waitForViewportSettle = (maxWait = 350) =>
  new Promise<void>((resolve) => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : undefined;
    if (!vv) { setTimeout(resolve, maxWait); return; }
    let done = false;
    let debounce: ReturnType<typeof setTimeout>;
    const finish = () => {
      if (done) return;
      done = true;
      vv.removeEventListener('resize', onResize);
      resolve();
    };
    const onResize = () => { clearTimeout(debounce); debounce = setTimeout(finish, 90); };
    const cap = setTimeout(finish, maxWait); // жесткий потолок
    const stopCap = () => clearTimeout(cap);
    vv.addEventListener('resize', onResize);
    // снять cap, когда завершились через debounce — мелочь, но чистим оба таймера в finish
    void stopCap;
  });
```
(В финальном коде почистить оба таймера в `finish` — cap и debounce.)

b) Логика `safeClose`:
1. `isClosingRef` guard — как есть.
2. Определить, было ли поле ввода в фокусе: `const hadKeyboard = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement || document.activeElement instanceof HTMLSelectElement;`
3. Blur активного элемента — как есть.
4. `await action()` — как есть (с `setIsSubmitting` и откатом при ошибке).
5. Если `hadKeyboard`: `await waitForViewportSettle();` затем мгновенно восстановить позицию — `window.scrollTo({ top: initialScrollY.current, behavior: 'instant' as ScrollBehavior });` (ref уже есть, теперь он реально используется). Если `!hadKeyboard`: маленькая пауза `await new Promise(r => setTimeout(r, 16));` вместо старых 80ms — закрытие без клавиатуры остается быстрым.
6. `onClose()`.

Результат: клавиатура схлопывается и вьюпорт стабилизируется ДО старта exit-анимации модалки; скролл восстанавливается детерминированно и мгновенно, а не анимацией Safari. На Android `resizes-content` убирает панорамирование целиком. Честный остаток: на iOS в редких случаях возможен микросдвиг ~1–2px — после правки это не читается как «скачок».

## Блок 3 — ReloadPrompt.tsx: перенос наверх + редизайн

Сегодня мобильная капсула висит внизу (`bottom-[calc(...+5.4rem)]`) — там уже тесно: панель аналитики, FAB. Зона тостов на мобильных в приложении и так верхняя (`ToastContainer`), а плавающая шапка занимает `safe-top+16px … safe-top+80px`.

3.1. Позиция: капсула появляется ПОД шапкой и скрывается вместе с ней при прокрутке. Перенести рендер мобильной капсулы из `App.tsx` в `Layout.tsx` (внутрь `md:hidden`-блока рядом с `<motion.header>`), чтобы использовать состояние `isMobileHeaderHidden` (единый источник правды; в `App.tsx` монтирование `<ReloadPrompt />` удалить — инициализация PWA на md+ уже выполняется `SidebarUpdatePrompt` внутри aside).

3.2. Новый JSX мобильной капсулы в `ReloadPrompt.tsx` (экспортировать как `MobileUpdatePrompt({ hidden }: { hidden?: boolean })`):
```tsx
<motion.aside
  initial={{ opacity: 0, y: -24 }}
  animate={hidden ? { opacity: 0, y: -120 } : { opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -24, transition: { duration: 0.16 } }}
  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
  role="status"
  aria-live="polite"
  className="md:hidden fixed z-[60] left-4 right-4 top-[calc(env(safe-area-inset-top,0px)+5.5rem)] max-w-sm mx-auto pointer-events-none"
>
  <UpdatePill />  {/* pointer-events-auto на самой капсуле */}
</motion.aside>
```
В `Layout.tsx`: `<MobileUpdatePrompt hidden={isMobileHeaderHidden} />`.

3.3. Редизайн `UpdatePill` (общий для мобильной капсулы и сайдбара) — перевести с «кричащей кнопки» на язык уведомлений-тостов приложения:
- Контейнер: `w-full py-2 pl-2.5 pr-1.5 rounded-2xl flex items-center gap-2.5 bg-white/80 dark:bg-slate-900/85 backdrop-blur-2xl backdrop-saturate-150 border border-slate-200/60 dark:border-white/[0.08] shadow-[0_16px_40px_rgba(15,23,42,0.12)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] active:scale-[0.98] transition-all cursor-pointer select-none pointer-events-auto`.
- Слева иконка-тайл: `w-8 h-8 rounded-xl bg-primary-500/10 dark:bg-primary-500/15 flex items-center justify-center shrink-0` внутри `Sparkles` `w-4 h-4 text-primary-600 dark:text-primary-400` (при обновлении — `RefreshCw` spin), убрать `animate-pulse`.
- Текст — колонка, а не капс: заголовок «Доступно обновление» `text-[13px] font-bold text-slate-950 dark:text-white leading-tight` + подзаголовок «Нажмите, чтобы применить» / «Обновление…» `text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight` (подзаголовок и объясняет тап — отдельная кнопка не нужна, вся капсула кликабельна, как сейчас).
- Справа ✕ (dismiss): `p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-90 shrink-0` c `X` `w-3.5 h-3.5`, `e.stopPropagation()` → `dismissPwaUpdate()`.
- Обрезать длинные строки `truncate`; в сайдбаре (ширина ~272px) композиция помещается, т.к. текстовая колонка `min-w-0 flex-1`.

3.4. Согласование зоны (1 строка): `ToastContainer.tsx` — мобильный `top-[calc(env(safe-area-inset-top)+1.5rem)]` → `top-[calc(env(safe-area-inset-top)+5.5rem)]`, чтобы тосты не перекрывали шапку и вся верхняя зона уведомлений была единой (сейчас тост на mobile всплывает ПОВЕРХ шапки, z-9999 против z-60).

## Блок 4 — ReleaseNotesDialog.tsx: шапка «Что нового?»

Проблема: в шапке герой-заголовок «Что нового?» + подзаголовок «Версия 1.8.3», а сразу под шапкой в теле — свой заголовок релиза (lg bold) + дата. Получаются два конкурирующих заголовка и четыре уровня текста подряд; при ручном открытии («История обновлений») строка «Версия X» в шапке выглядит нелогично.

4.1. Перестроить шапку (блок «Header Graphic») по схеме «один герой»:
- Верхний ряд (слева направо): компактный тайл иконки `w-10 h-10 rounded-xl` (вместо 56px, glow-blоб за ним сохранить) + колонка: eyebrow `text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400` — `{isManual ? 'История обновлений' : 'Что нового'}` и рядом чип версии в стиле годовых чипов IncomeDesktopTable: `inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-500/20 leading-none` с текстом `v{LATEST_VERSION}`.
- Герой — название релиза: `{changelog[0].title}` → `text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white leading-tight` (это настоящий заголовок окна).
- Под героем дата последнего релиза: `text-xs font-medium text-slate-500 dark:text-slate-400` (формат как сейчас, ru-RU, длинный месяц).
- Закрывающий ✕ — без изменений. Выравнивание ряда — по левому краю (`items-start text-left`), т.к. герой теперь читается как заголовок контента; `pt-8 pb-6 px-6`.
- В теле у первого релиза (i === 0) блок с дублирующим заголовком `{release.title}` и датой УДАЛИТЬ (эти данные теперь в шапке) — оставить только списки Новое/Улучшения/Исправления. Разделители старых версий (v{version} — линия — дата) и приглушение (`opacity-60 grayscale`) — без изменений.
- Подвал и кнопка «Понятно, спасибо!» — без изменений.

## Блок 5 — Changelog (src/data/changelog.ts)

Добавить запись ВЕРХНИМ элементом массива:
```ts
{
  version: "1.8.4",
  date: "2026-10-27",
  title: "Плавные формы и новая зона обновлений",
  improvements: [
    // === ТЕХНИЧЕСКИЕ ИЗМЕНЕНИЯ v1.8.4 ===
    // Viewport-meta: добавлен interactive-widget=resizes-content (Android) — клавиатура меняет layout, без панорамирования.
    // useSafeModalClose: ожидание стабилизации visualViewport после blur + мгновенное восстановление исходной позиции скролла (задействован ранее неиспользуемый ref), быстрый путь 16ms без клавиатуры.
    // MobileUpdatePrompt перенесен в Layout и синхронизирован с автоскрытием шапки; монтирование в App.tsx удалено.
    // ReleaseNotesDialog: дублирующий заголовок первого релиза в теле удален (перенесен в шапку).
    "Сохранение без рывков: закрытие клавиатуры, возврат экрана на место и анимация формы теперь идут строгой последовательностью — скачок интерфейса при сохранении вклада на мобильных устранен.",
    "Уведомление об обновлении переехало наверх: капсула появляется под шапкой и уезжает вместе с ней при прокрутке, освобождая нижнюю зону с аналитикой и кнопкой добавления.",
    "Новый вид уведомления об обновлении: спокойная стеклянная капсула с заголовком «Доступно обновление» и подсказкой вместо кричащей кнопки — в едином языке уведомлений приложения.",
    "Шапка окна «Что нового?»: главным заголовком стало название релиза, а «Что нового» и номер версии оформлены компактной строкой с чипом — иерархия стала чище.",
    "Проценты на карточках вкладов выровнены по центру блока банка: карточки с бейджем «Накопительный» перестали выглядеть перевешенными вверх.",
    "Тосты на мобильных больше не всплывают поверх шапки — вся верхняя зона уведомлений живет под шапкой."
  ]
},
```

## Самопроверка

1. Мобильная карточка без бейджа и с бейджем: процент по центру блока; у закрытых вкладов процент по-прежнему скрыт.
2. Форма вклада на телефоне: открыть, войти в поле суммы (клавиатура), нажать «Сохранить» — клавиатура уходит, затем форма плавно съезжает; фон не «дергается». Проверить и на Android Chrome, и на iOS Safari. Также проверить закрытие ✕ без клавиатуры — мгновенное.
3. `grep -n "interactive-widget" index.html` — флаг на месте; остальные модалки (Cash/Crypto/Investment) сохраняются при сохранении без скачка (общий хук).
4. Собрать: `bun run build` без ошибок; PWA-обновление: капсула видна под шапкой на мобильном, в сайдбаре на md+, клик запускает обновление, ✕ скрывает.
5. «Что новое»: авто-открытие после релиза и ручное из настроек — в шапке чип версии и название релиза, дублей заголовка в теле нет.
