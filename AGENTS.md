# Sproutly.Pro - UI/UX Design System & Developer Guidelines

This file contains the core UI/UX guidelines for this project. **All future modifications, refactoring, and new components MUST adhere to these styles.**

## 1. Visual Style & Theme
- **Glassmorphism**: Extensive use of frosted glass effects for depth and pure elegance.
  - Soft panels: `bg-white/40 dark:bg-slate-950/40 backdrop-blur-md`
  - Standard glass panel: `bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl`
  - Deep glass panel (modals/main cards): `bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl`
  - **Decorative Glows**: Use blurred background ellipses (`blur-3xl rounded-full opacity-10/20`) to create soft, modern ambient lighting behind cards.
- **Borders**: Subtle, barely visible borders offering high-end finish.
  - Light mode: `border-slate-200/50` or `border-slate-200/60`
  - Dark mode: `border-white/[0.05]` or `border-white/[0.08]` (Never use distinct thick borders in dark mode)
- **Shadows**: 
  - General: `shadow-sm` for inner elements, `shadow-xl`, `shadow-2xl` for floatings. Apply `shadow-inner` for nested card sections.
  - Colored Glow: Primary action buttons or focused elements cast a colored glow, e.g. `shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_20px_rgba(16,185,129,0.4)]`.

## 2. Color Palette
- **Brand / Primary**: CSS variables `--primary` (primary accent blue/indigo) and `--deposit` (the custom deposit teal, mapped to `teal-500` / `teal-400`). Use `--deposit` for deposit-related operations, accents, select elements, active states, and positive trends.
- **Investments**: CSS variable `--invest` (the custom investment cyan/sky blue, mapped to `cyan-500` / `cyan-400`). Use `--invest` and its related shades for all elements representing the "Биржа" (investments) section to give it a distinct high-tech cold color.
- **Cash**: CSS variable `--cash` (the custom cash emerald, mapped to `emerald-500` / `emerald-400`). Use `--cash` and its related shades for all elements representing the "Наличные" (cash operations) section to give it a dedicated organic feeling.
- **Secondary / Actions**: 
  - Amber (`amber-400`, `amber-500`) for "cash-out", maturity, pending states.
  - Red (`red-500`) for destructive actions (delete, close) or expenses.
- **Backgrounds**:
  - Light mode: `bg-slate-50` for app background, `bg-white` for solid cards.
  - Dark mode: `bg-[#0B0F19]` / `bg-slate-950` for app background, `bg-[#111315]` / `bg-slate-900` for solid cards.
- **Typography Colors**:
  - Headers/Primary text: `text-slate-900 dark:text-white`
  - Secondary/Muted text: `text-slate-500 dark:text-slate-400`

## 3. Typography Rules
- **Main Headings**: Strong, bold typography. Pattern: `font-black uppercase tracking-tight`.
- **Small Labels / Subtitles**: Pattern: `text-[10px]` or `text-[8px]`, `font-bold` or `font-black`, `uppercase tracking-widest`, usually muted (`text-slate-500`).
- **Numbers/Amounts**: Emphasize numbers related to money with primary colors and bold weights.

## 4. Shapes & Rounding (Border Radius)
- **Large containers (modals, main dashboard cards)**: Soft oversized corners like `rounded-[2rem]` or `rounded-[2.5rem]`.
- **Inner elements (buttons, inputs, filters, chips)**: Standardized to `rounded-xl` or `rounded-2xl` to match the outer softness. Very small or compact UI elements (like compact bank chips) can use `rounded-[10px]`.

## 5. Interaction & Animation
- **Hover States**: 
  - Buttons: Brighten or slightly pronounce the background `hover:bg-white/80 dark:hover:bg-white/10 transition-all`.
  - Cards: Give outline feedback `hover:border-emerald-500/30`.
- **Click States**: Physical button press feel using `active:scale-95`.
- **Framer Motion**: Use for smooth layout transitions (`layoutId`), modal entering (`AnimatePresence`), and pop-overs (`initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}`).

## 6. Layouts & Structure
- **Scrollbars**: Hide default system scrollbars on custom horizontal/vertical scrolling containers using `[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`.
- **Action Blocks**: Group related actions (like close buttons, navigation) consistently in top-right or logical corners with a unified background block.
- **Selects and Dropdowns**: Never use native `<select>` tags because they cannot be fully styled natively. Always use `@headlessui/react` `Listbox` (with `Transition` and `lucide-react` icons like `ChevronDown` and `Check`) combined with Tailwind glassmorphism/styles to ensure drop-downs match the exact design language of the rest of the application.
- **Segmented Controls (Toggles)**: Whenever inline tabular choices are needed (e.g. types of calculation, visual tabs), DO NOT use standard select drop-downs. Use a `SegmentedControl` styled similarly to the dashboard tabs: a pill shape container (`rounded-xl` or `rounded-2xl` with `bg-slate-100/80` / `bg-slate-900/80`) and an internal sliding `motion.div` background pill utilizing `layoutId` from Framer Motion. Text should be small, bold, and uppercase with wide tracking.

## Rule of Thumb for AI Agents:
When asked to build or modify a new component, **DO NOT** use standard default Tailwind (like basic square buttons or generic flat grey backgrounds). Blend it with the glassmorphism, rounded corners, and deposit-accented design rules defined above so it feels like a native part of the Sproutly.Pro platform.

---

## 7. Release Notes & Changelog (MANDATORY FOR ALL AGENTS)
**CRITICAL INSTRUCTION FOR ALL AI MODELS:**
Whenever you implement a meaningful, user-facing feature, enhancement, or major bug fix, you **MUST** update `src/data/changelog.ts` (or the designated changelog file in the project).

- **User-Facing Only:** Only include changes that are genuinely useful and visible to normal users in the public string arrays.
- **Technical Changes as Comments:** For technical fixes, refactoring, or under-the-hood stability improvements (like resolving `useEffect` infinite loops, internal DB connection errors, etc.), **DO NOT** add them as visible strings. Instead, add them as inline JavaScript comments (`//`) within the current version block in `src/data/changelog.ts`. This keeps them in the historical flow for developers but invisible to users.
- **Log Logically, Not Literally:** DO NOT log trivial code refactors, minor CSS tweaks, or typo fixes as public features. Group minor visual adjustments into single, comprehensive bullet points.
- **Version Control:** DO NOT create a new version number for every small prompt. If you are continuing work on an ongoing feature in the current session, **append** your changes to the latest existing version block in the array. Increment the version ONLY when starting a fresh, logically distinct update cycle.
- **Format & Tone:** Write in clear, professional Russian. Categorize under `features`, `improvements`, or `fixes`. Keep entries focused on the *value* delivered to the user.
- **Why:** This project uses an active user base, and showing them a beautifully formatted "What's New" popup after updates is critical for adoption and transparency.

**Never forget to log your major implementations here without the user having to remind you.**

---

## 8. PWA & Mobile Responsiveness
- **Safe Areas**: Always respect iOS notches and home indicators. Use Tailwind's `pb-safe`, `pt-safe`, or `min-h-screen` combined with proper safe-area-insets for fullscreen modals and bottom sheets.
- **Dynamic Theme Color**: When implementing theme switchers (Light/Dark), ensure the `<meta name="theme-color">` tag is dynamically updated via JavaScript (e.g., `#090D16` for dark, `#F2F2F7` for light) so the PWA standalone header matches the UI.
- **Modals on Mobile**: On screens `< sm`, modals should generally behave as Bottom Sheets (anchored to the bottom, 100% width, rounded top corners) to improve thumb reachability.

---

## 9. Animation Mode Decisions (LOCKED — DO NOT CHANGE WITHOUT EXPLICIT REQUEST)
- Main transitions between top-level sections (Layout.tsx, AnimatePresence wrapping {children} inside <main>): use `mode="wait"`. `popLayout` caused noticeable lag and stuttering on resource-intensive views (Heatmap/Dashboard), especially on mobile devices. This is a deliberate, tested trade-off. Do not change it to `popLayout` unless explicitly requested.
- Transitions between lightweight subsections within the same section (AssetsView: Deposits/Savings/Exchange; UnifiedDashboard: Overview/Income/Deposits): use `mode="popLayout"`. Since these views contain relatively little content, avoiding the exit/enter delay results in a more responsive experience.
- Scroll position is reset synchronously when the user switches top-level sections (App.tsx, `handleNavigation`), not in `onExitComplete`. This intentionally prevents race conditions between scroll restoration and page transition animations.

---

## 10. Drag-and-Drop для вкладок активов (LOCKED — DO NOT CHANGE)
- Переупорядочивание вкладок активов (Сейф, Биржа, Крипта) в Настройках реализовано строго через встроенный компонент `Reorder` и хук `useDragControls` из уже используемого пакета `motion/react` (без сторонних библиотек).
- Драг инициируется **только через выделенный grip-хендл** (иконка слева), а не всей строкой. Это сделано намеренно, чтобы предотвратить конфликты со скроллом страницы на тач-устройствах и случайными нажатиями на тумблеры видимости.
- Это архитектурное решение зафиксировано и не должно изменяться, заменяться или откатываться при последующих правках в AI Studio.
---

## 11. Modal Switching Patterns (LOCKED — DO NOT UNIFY)
Модальные окна в проекте намеренно используют два разных паттерна переключения bottom-sheet ↔ центрированное окно, в зависимости от назначения:
- Окна ПРОСМОТРА данных (детали сгруппированных активов, AssetStack.tsx) переключаются по типу указателя (`pointer-fine:`) — это соответствует Apple HIG/Material Design: bottom sheet для тач-устройств независимо от ширины экрана, центрирование только при наличии мыши/трекпада.
- Окна ВВОДА данных (формы добавления/редактирования активов: CashForm/CryptoForm/InvestmentForm) переключаются по ширине экрана (`sm:`) — это осознанное решение, не путать с недоработкой: форма ввода на широком экране лучше смотрится центрированной карточкой фиксированной ширины, а не растянутой во всю ширину шторкой.
Это два разных, каждый по-своему корректных паттерна, а не рассинхронизация — не унифицировать их под одну логику при последующих правках.
