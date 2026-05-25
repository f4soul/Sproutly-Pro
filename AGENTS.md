# Cashflow Tracker Pro - UI/UX Design System & Developer Guidelines

This file contains the core UI/UX guidelines for this project. **All future modifications, refactoring, and new components MUST adhere to these styles.**

## 1. Visual Style & Theme
- **Glassmorphism**: Extensive use of frosted glass effects for depth and modern look.
  - Standard glass panel: `bg-white/60 dark:bg-slate-900/60 backdrop-blur-md`
  - Deep glass panel (modals/main cards): `bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl`
- **Borders**: Subtle, barely visible borders for separation.
  - Light mode: `border-slate-200` or `border-slate-200/50`
  - Dark mode: `border-white/10` or `border-white/[0.08]`
- **Shadows**: 
  - General: `shadow-sm` for small UI elements, `shadow-xl` or `shadow-2xl` for floating cards and modals.
  - Colored Glow: Buttons or active elements often cast a soft colored glow, e.g., `shadow-[0_4px_12px_rgba(16,185,129,0.15)]`.

## 2. Color Palette
- **Brand / Primary**: Emerald (`emerald-500`). Used for "income", active states, positive trends, and primary buttons.
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
- **Inner elements (buttons, inputs, filters, chips)**: Standardized to `rounded-xl` or `rounded-2xl` to match the outer softness.

## 5. Interaction & Animation
- **Hover States**: 
  - Buttons: Brighten or slightly pronounce the background `hover:bg-white/80 dark:hover:bg-white/10 transition-all`.
  - Cards: Give outline feedback `hover:border-emerald-500/30`.
- **Click States**: Physical button press feel using `active:scale-95`.
- **Framer Motion**: Use for smooth layout transitions (`layoutId`), modal entering (`AnimatePresence`), and pop-overs (`initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}`).

## 6. Layouts & Structure
- **Scrollbars**: Hide default system scrollbars on custom horizontal/vertical scrolling containers using `[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`.
- **Action Blocks**: Group related actions (like close buttons, navigation) consistently in top-right or logical corners with a unified background block.

## Rule of Thumb for AI Agents:
When asked to build or modify a new component, **DO NOT** use standard default Tailwind (like basic square buttons or generic flat grey backgrounds). Blend it with the glassmorphism, rounded corners, and emerald-accented design rules defined above so it feels like a native part of the Cashflow Tracker Pro platform.
