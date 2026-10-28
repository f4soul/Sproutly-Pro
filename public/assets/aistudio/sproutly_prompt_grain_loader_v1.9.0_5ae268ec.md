# Sproutly — промпт для AI Studio: лоадер «Зёрна» + сплэш + тосты

Проект: Sproutly.Pro (React + Tailwind v4, PWA). Задача: унификация индикации загрузки по решению ревью. Работаем по частям A–D + changelog + самопроверка. Ничего сверх списка не менять.

---

## Часть A. SplashLoader — «освежить»: убрать тайл, оставить росток с дыханием

Файл: `src/App.tsx`, компонент `SplashLoader` (~строка 31).

Сейчас внутри есть контейнер-тайл: `w-24 h-24 bg-white/80 dark:bg-slate-900/80 shadow-2xl border border-slate-200/50 dark:border-white/10 rounded-[2rem] backdrop-blur-xl`.

Заменить весь `SplashLoader` на:

```tsx
const SplashLoader = ({ theme }: { theme: 'light' | 'dark' }) => (
  <div className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-950'}`}>
    <div className="relative flex h-24 w-24 items-center justify-center">
      <div className="absolute inset-0 bg-primary-500/20 dark:bg-primary-500/30 rounded-full blur-3xl animate-pulse scale-150" />
      <SproutlyLogo className="relative w-16 h-16 text-primary-500 drop-shadow-[0_0_12px_rgba(var(--rgb-primary),0.5)] animate-pulse" />
    </div>
  </div>
);
```

Суть: рамка/подложка/тень/blur-тайл удалены; glow-круг и `animate-pulse` на логотипе сохранены; логотип увеличен `w-12 → w-16` (без тайла росток должен держать вес экрана); обёртка `h-24 w-24` сохраняет площадь glow; `relative` на логотипе обязателен (иначе glow перекроет его).

## Часть B. Лоадер «Зёрна» — новый компонент и замена двух border-спиннеров

### B1. `src/index.css` — в блок `@theme` рядом с существующим `--animate-shimmer` добавить:

```css
  --animate-grain: grain-wave 1.3s ease-in-out infinite;

  @keyframes grain-wave {
    0%, 100% { transform: scale(0.5); opacity: 0.35; }
    45%      { transform: scale(1); opacity: 1; }
  }
```

### B2. Новый файл `src/components/ui/GrainLoader.tsx`:

```tsx
const GRAINS = [
  'bg-primary-500 dark:bg-primary-400',   // доходы
  'bg-deposit-500 dark:bg-deposit-400',   // вклады
  'bg-invest-500 dark:bg-invest-400',     // инвестиции
  'bg-crypto-500 dark:bg-crypto-400',     // крипта
  'bg-cash-500 dark:bg-cash-400',         // наличные
] as const;

interface GrainLoaderProps {
  size?: number;
  label?: string;
}

export const GrainLoader = ({ size = 40, label }: GrainLoaderProps) => (
  <div className="flex flex-col items-center gap-4" role="status" aria-label={label ?? 'Загрузка'}>
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {GRAINS.map((bg, i) => (
        <span key={i} className="absolute inset-0" style={{ transform: `rotate(${i * 72}deg)` }} aria-hidden="true">
          <span
            className={`animate-grain absolute left-1/2 top-1/2 h-2 w-2 -ml-1 -mt-1 rounded-full ${bg}`}
            style={{ translate: `0 -${size / 2}px`, animationDelay: `${(i * 0.13).toFixed(2)}s` }}
          />
        </span>
      ))}
    </div>
    {label && <span className="text-sm font-medium text-slate-400">{label}</span>}
  </div>
);
```

Важно: смещение зерна сделано CSS-свойством `translate`, а не `transform` — иначе анимация `grain-wave` (которая тоже использует `transform: scale`) перезапишет позицию. Не «оптимизировать» обратно в transform.

### B3. Замена №1 — `src/App.tsx`, Suspense fallback (~строка 368):

```tsx
<Suspense fallback={
  <div className="fixed inset-0 md:left-68 flex items-center justify-center pointer-events-none z-30">
    <GrainLoader />
  </div>
}>
```

(импортировать `GrainLoader`; старый `<div className="w-10 h-10 rounded-full border-[3.5px] ... animate-spin" />` удалить)

### B4. Замена №2 — `src/components/income/IncomeTracker.tsx` (~строка 549):

```tsx
if (!isInitialized || !activeYearData) {
  return (
    <div className="fixed inset-0 md:left-68 flex items-center justify-center pointer-events-none z-30">
      <GrainLoader label="Загрузка данных..." />
    </div>
  );
}
```

(импортировать `GrainLoader`; подпись «Загрузка данных...» сохраняется через проп `label`)

## Часть C. Тост-процесс — тот же спиннер, что в PWA-обновлении

Файл: `src/components/ui/ToastContainer.tsx`.

1. Импорт: `import { Check, Info, RefreshCw, AlertCircle } from 'lucide-react';` — `Loader2` удалить полностью.
2. В ветке `isLoading` (~строка 57) заменить:

```tsx
<RefreshCw size={20} className="text-primary-500 dark:text-primary-400 animate-spin shrink-0" />
```

Остальные ветки (isError/isSuccess/Info) не трогать.

## Часть D. Скелетон списков — новый компонент + аккуратное внедрение

### D1. Новый файл `src/components/ui/ListSkeleton.tsx`:

```tsx
import { SproutlyLogo } from './SproutlyLogo';

const Bone = ({ className }: { className: string }) => (
  <div className={`relative overflow-hidden ${className}`}>
    <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10" />
  </div>
);

export const ListSkeleton = ({ rows = 3, className }: { rows?: number; className?: string }) => (
  <div className={`space-y-3 ${className ?? ''}`} aria-hidden="true">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white p-3 dark:border-white/5 dark:bg-slate-900">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-slate-200/80 dark:bg-slate-700/60">
          <SproutlyLogo className="absolute inset-0 m-auto h-6 w-6 animate-pulse text-slate-400/70 dark:text-slate-400/50" />
          <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10" />
        </div>
        <div className="flex-1 space-y-2">
          <Bone className="h-2.5 w-3/4 rounded-full bg-slate-200/80 dark:bg-slate-700/60" />
          <Bone className="h-2.5 w-1/2 rounded-full bg-slate-200/60 dark:bg-slate-700/40" />
        </div>
        <Bone className="h-2.5 w-12 rounded-full bg-slate-200/60 dark:bg-slate-700/40" />
      </div>
    ))}
  </div>
);
```

(`animate-shimmer` уже есть в `@theme` проекта — shимmer 2s linear, переиспользуем)

### D2. Внедрение — только там, где реально есть состояние ожидания данных

Проверить списки: `DepositList`, `InvestmentList`, `CashList`, `CryptoList` (и их обёртки-разделы). Если в компоненте/разделе есть флаг вида `isInitialized` / `isLoading` / данные ещё не пришли — показать `ListSkeleton rows={3}` вместо пустого тела на время ожидания. Вписать карточку-строку в стиль конкретного списка (скругления/отступы), но структура обязательна: аватар-тайл с ростком + две линии + короткая справа, shimmer по всем «косточкам».

Запреты: empty-state («нет данных») скелетоном НЕ подменять; готовые скелетоны (например, AveragesBlock) не трогать. Если флага ожидания в списке нет — НЕ добавлять искусственные таймеры: пропустить список и перечислить пропущенные в отчёте (компонент останется про запас).

## Часть E. Changelog

Файл: `src/data/changelog.ts`. В существующую консолидированную запись 1.9.0 от 27.10 (не создавать новую версию) добавить в массив `improvements`:

- «Спиннеры заменили на фирменный лоадер „Зёрна" в акцентах разделов»
- «Сплэш-экран стал легче: росток без рамки, с дыханием и подсветкой»
- «Добавили скелетоны списков для разделов активов»
- «Тосты используют тот же спиннер, что и PWA-обновление»

В технический `//`-комментарий записи дописать: `// loaders: GrainLoader.tsx + ListSkeleton.tsx (новые), App.tsx, IncomeTracker.tsx, ToastContainer.tsx, index.css (animate-grain)`.

## Самопроверка (grep)

```
rg -n "rounded-\[2rem\]" src/App.tsx                       # 0 вхождений (тайл удалён)
rg -n "GrainLoader" src/App.tsx src/components/income/IncomeTracker.tsx   # оба импорта + использование
rg -n "animate-grain|--animate-grain" src/index.css        # keyframes + алиас на месте
rg -c "border-t-primary-500.*animate-spin" src/App.tsx src/components/income/IncomeTracker.tsx  # 0 (спиннеры ушли)
rg -n "Loader2" src/                                       # 0 вхождений по проекту
rg -n "RefreshCw" src/components/ui/ToastContainer.tsx     # импорт + использование
rg -n "ListSkeleton" src/                                  # компонент есть; использование — по факту D2
rg -n "Зёрна|Зерна" src/data/changelog.ts                  # пункты добавлены в 1.9.0
```

## Dev-проверка

1. Перезагрузить приложение: сплэш — росток без рамки, дышит, glow остался; нет скачка при исчезновении.
2. Перейти в «Доходы» с жёсткой перезагрузкой вкладки: мелькает «Зёрна» + «Загрузка данных...»; зерна — blue/teal/cyan/amber/emerald, волна набегает по кругу.
3. Первое открытие любой ленивой вкладки: «Зёрна» в том же оверлее (со сдвигом от сайдбара на md+).
4. Тост с isLoading (синхронизация): крутится RefreshCw, стили прежние.
5. Светлая и тёмная темы: зёрна читаются в обеих (500/400), росток сплэша не теряется.
6. Консоль чистая, changelog-диалог показывает 1.9.0 с четырьмя новыми пунктами.

## Отчёт

Кратко: что сделано по A–E; какие списки получили ListSkeleton, а какие пропущены (и почему); любые отклонения от классов в этом промпте — явно перечислить.
