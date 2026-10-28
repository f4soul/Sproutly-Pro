# 2 задачи: Индикатор загрузки доходов + Унификация модалок

## ЗАДАЧА 1: Индикатор загрузки данных на дашборде

### Контекст

При открытии приложения на дашборде данные «Средний доход (NET)» и другие показатели доходов появляются с задержкой 1-3 секунды. Это ожидаемое поведение offline-first архитектуры (сначала Dexie, потом Firebase sync), но UI показывает нули вместо индикатора загрузки.

### Причина

`syncStatus` из `AuthSyncContext` переходит в `'syncing'` при login и в `'success'`/`'error'` по завершении. Но `App.tsx` и `BentoDashboard.tsx` этот статус не используют — рендерят нули во время синхронизации.

### Решение

В `src/components/dashboard/BentoDashboard.tsx` добавить `useAuthSync` для получения `syncStatus` и показывать скелетон на показателях дохода во время `'syncing'`.

#### Изменения в `BentoDashboard.tsx`

1. Добавить импорт:
```tsx
import { useAuthSync } from "../../context/AuthSyncContext";
```

2. В начале компонента `BentoDashboard` добавить:
```tsx
const { syncStatus } = useAuthSync();
const isSyncing = syncStatus === 'syncing';
```

3. В `AveragesBlock` добавить проп `isSyncing`:
```tsx
<AveragesBlock totalNet={data.totalNet} isPrivate={isPrivate} isSyncing={isSyncing} />
```

4. В `src/components/dashboard/AveragesBlock.tsx` добавить проп и шиммер:

```tsx
interface AveragesBlockProps {
  totalNet: number;
  isPrivate: boolean;
  isSyncing?: boolean;  // ← новый проп
}

export function AveragesBlock({ totalNet, isPrivate, isSyncing = false }: AveragesBlockProps) {
```

В разметке значения заменить на шиммер при `isSyncing && totalNet === 0`:

```tsx
{/* Основное значение /мес */}
<AutoFitText className="flex items-baseline gap-1.5 leading-none mb-0.5 pointer-events-none">
  {isSyncing && totalNet === 0 ? (
    <div className="h-10 w-40 rounded-xl bg-slate-200/60 dark:bg-white/5 animate-pulse" />
  ) : (
    <span className="text-3xl sm:text-3xl lg:text-[2.5rem] font-black text-primary-600 dark:text-primary-400 drop-shadow-sm p-0.5">
      {formatVal(totalNet / 12)}
    </span>
  )}
  <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase shrink-0">
    / мес
  </span>
</AutoFitText>

{/* Значения /день и /час — тоже шиммер */}
<div className="flex flex-wrap items-center gap-0.5 mt-1">
  {isSyncing && totalNet === 0 ? (
    <>
      <div className="h-7 w-28 rounded-lg bg-slate-200/60 dark:bg-white/5 animate-pulse" />
      <div className="h-7 w-28 rounded-lg bg-slate-200/60 dark:bg-white/5 animate-pulse" />
    </>
  ) : (
    <>
      <div className="inline-flex items-baseline gap-1.5 leading-none bg-slate-50/50 dark:bg-slate-950/50 px-2.5 py-2 rounded-[8px] border border-slate-200/50 dark:border-white/5 w-max max-w-full">
        <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
          {formatVal(totalNet / 365)}
        </span>
        <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest shrink-0">/ день</span>
      </div>
      <div className="inline-flex items-baseline gap-1.5 leading-none bg-slate-50/50 dark:bg-slate-950/50 px-2.5 py-2 rounded-[8px] border border-slate-200/50 dark:border-white/5 w-max max-w-full">
        <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
          {formatVal(totalNet / 1973)}
        </span>
        <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest shrink-0">/ час</span>
      </div>
    </>
  )}
</div>
```

**Логика:** скелетон показывается ТОЛЬКО когда `isSyncing === true` AND `totalNet === 0`. Если `totalNet > 0` — данные уже есть из Dexie (offline-first), показываем реальные значения. Когда sync завершится и данные придут из Firebase — шиммер исчезнет автоматически (`syncStatus` станет `'success'`, `totalNet` обновится).

### НЕ менять

- `IncomeContext.tsx` — работает корректно.
- `syncWithFirebase` — не трогать.
- Логику расчёта `totalNet` в `useMemo`.
- Остальные карточки дашборда (Чистый капитал, Структура доходов и т.д.) — можно добавить позже по аналогии.

---

## ЗАДАЧА 2: Унификация модалки logout в Layout.tsx

### Контекст

В проекте два подхода к анимации модалок:
- **Framer Motion** (`motion.div` + spring) — 35 мест (все современные модалки)
- **Headless UI `Transition.Child`** (CSS classes) — 16 мест (legacy)

Модалка logout в `Layout.tsx` (строки ~715-781) использует устаревший `Transition.Child` паттерн. Кроме того, в ней опечатка `sm:rounded-[24px]` (должно быть `sm:rounded-[32px]` как во всех остальных модалках).

### Что сделать

Заменить `<Transition.Child>` на `<motion.div>` с spring-анимацией (как в `DeleteConfirmModal.tsx`).

#### Было (строки ~715-781):

```tsx
<Transition appear show={showLogoutConfirm} as={Fragment}>
  <Dialog as="div" className="relative z-[100]" onClose={() => setShowLogoutConfirm(false)}>
    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
      <div className="fixed inset-0 bg-slate-900/10 dark:bg-black/60" />
    </Transition.Child>
    <div className="fixed inset-0 overflow-y-auto">
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4 text-center">
        <Transition.Child as={Fragment} enter="ease-out duration-300 transform" enterFrom="opacity-0 translate-y-full sm:translate-y-4 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200 transform" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-full sm:translate-y-4 sm:scale-95">
          <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-t-[32px] sm:rounded-[24px] bg-white dark:bg-slate-950 px-6 pt-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:p-8 text-left align-middle shadow-2xl transition-all border border-slate-200 dark:border-slate-800">
            {/* содержимое */}
          </Dialog.Panel>
        </Transition.Child>
      </div>
    </div>
  </Dialog>
</Transition>
```

#### Стало:

```tsx
<AnimatePresence>
  {showLogoutConfirm && (
    <Dialog as="div" className="relative z-[100]" onClose={() => setShowLogoutConfirm(false)} static>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-slate-900/10 dark:bg-black/60"
        aria-hidden="true"
      />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
          <Dialog.Panel as={Fragment}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm overflow-hidden rounded-t-[32px] sm:rounded-[32px] bg-white dark:bg-slate-950 px-6 pt-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:p-8 text-left align-middle shadow-2xl transition-all border border-slate-200 dark:border-slate-800 pointer-events-auto"
            >
              {/* содержимое без изменений */}
            </motion.div>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  )}
</AnimatePresence>
```

**Что изменилось:**
- `<Transition appear show={...} as={Fragment}>` → `<AnimatePresence>` + условный рендер `{showLogoutConfirm && ...}`
- `<Transition.Child>` для backdrop → `<motion.div>` с fade (opacity 0→1)
- `<Transition.Child>` для panel → `<motion.div>` с spring (scale 0.95→1, y 20→0)
- `sm:rounded-[24px]` → `sm:rounded-[32px]` (фикс опечатки)
- Добавлен `pointer-events-none` на wrapper + `pointer-events-auto` на panel (стандартный паттерн)
- Добавлен `static` на Dialog (контролируем монтирование через AnimatePresence, не через `show` prop)
- Класс `transform` убран из panel (Framer Motion управляет transform сам)

### Также проверить другие модалки с `Transition.Child`

Если `Transition.Child` используется в других местах (`DepositForm.tsx`, `SecuritySettings.tsx`) — привести к тому же Framer Motion паттерну. Но приоритет — `Layout.tsx` (logout), так как это самая заметная модалка.

### Что НЕ менять

- Логику `showLogoutConfirm`, `handleLogout` (функцию logout).
- Содержимое модалки (иконка LogOut, заголовок «Выход», кнопки «Отмена»/«Выйти»).
- `max-w-sm`, `pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]`.
- Стили кнопок.
- Другие модалки, которые уже используют Framer Motion.

### Убрать неиспользуемые импорты

После замены проверить, не остались ли неиспользуемые `Transition`, `Transition.Child`, `appear`, `Fragment` (если Fragment используется только для Transition). Удалить из импортов, если нигде больше не нужны.

---

## Финальные проверки

1. `npx tsc --noEmit` — без ошибок.
2. `npm run lint` — без ошибок.
3. Визуально:
   - **Доходы при открытии:** скелетон-шиммер вместо «0.00 ₽» во время синхронизации. После sync — реальные данные.
   - **Доходы при offline:** если sync не завершается — скелетон остаётся (это корректно — данных нет).
   - **Logout modal:** spring-анимация (как у других модалок), `rounded-[32px]` на десктопе.
   - **Mobile:** bottom-sheet паттерн работает, safe-area отступы на месте.
