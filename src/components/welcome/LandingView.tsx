import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ShieldCheck,
  BarChart3,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { SproutlyLogo } from '../ui/SproutlyLogo';

interface LandingViewProps {
  onStart: () => void;
}

const features = [
  {
    icon: ShieldCheck,
    iconClass: 'text-deposit-500',
    glowClass: 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]',
    title: 'Полная анонимность',
    desc: 'Данные хранятся локально и полностью под вашим контролем.',
  },
  {
    icon: BarChart3,
    iconClass: 'text-primary-500',
    glowClass: 'group-hover:shadow-[0_0_20px_rgba(59,130,246,0.25)]',
    title: 'Единый обзор',
    desc: 'Все банковские продукты и аналитика в одном месте.',
  },
  {
    icon: TrendingUp,
    iconClass: 'text-teal-500',
    glowClass: 'group-hover:shadow-[0_0_20px_rgba(20,184,166,0.25)]',
    title: 'Расчет доходностей',
    desc: 'Налоги, НДФЛ и сложные проценты в режиме реального времени.',
  },
];

export const LandingView: React.FC<LandingViewProps> = ({ onStart }) => {
  const shouldReduceMotion = useReducedMotion();

  // Precision cubic-bezier for silky, natural, non-linear deceleration (Apple iOS style)
  const easeOutSmooth = [0.22, 1, 0.36, 1] as const;

  // Staggered Container Orchestration - allows distinctive cascade while keeping flow connected
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.12,
        delayChildren: shouldReduceMotion ? 0 : 0.05,
      },
    },
  };

  // Hero Section Elements - crisp, clean fade-in
  const heroItemVariants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 18,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.65,
        ease: easeOutSmooth,
      },
    },
  };

  // Features Cards Stagger & Cascading Floating Entrance
  const cardItemVariants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 28,
      scale: shouldReduceMotion ? 1 : 0.98,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.7,
        ease: easeOutSmooth,
      },
    },
  };

  // CTA Button Entry
  const ctaVariants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 18,
      scale: shouldReduceMotion ? 1 : 0.98,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: easeOutSmooth,
      },
    },
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } }}
      exit={{ opacity: 0, y: -12, transition: { duration: 0.25, ease: easeOutSmooth } }}
      className="relative min-h-[100dvh] w-full overflow-hidden bg-slate-50 selection:bg-deposit-500/30 dark:bg-[#0B0F19]"
    >
      {/* ================================================================
          Ambient Background (Hardware-accelerated glows)
          ================================================================ */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* Deposit Green Glow */}
        <motion.div
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [0, 24, 0],
                  y: [0, -18, 0],
                }
          }
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -left-[15%] -top-[15%] h-[55%] w-[55%] rounded-full bg-deposit-500/10 blur-[120px] transform-gpu dark:bg-deposit-500/15"
        />

        {/* Primary Blue Glow */}
        <motion.div
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [0, -20, 0],
                  y: [0, 22, 0],
                }
          }
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -right-[15%] top-[10%] h-[60%] w-[45%] rounded-full bg-primary-500/10 blur-[120px] transform-gpu dark:bg-primary-500/15"
        />

        {/* Teal Accent Glow */}
        <motion.div
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [0, 18, 0],
                }
          }
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -bottom-[20%] left-[15%] h-[45%] w-[70%] rounded-full bg-teal-500/10 blur-[110px] transform-gpu"
        />
      </div>

      {/* ================================================================
          Main Content Orchestration
          ================================================================ */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col justify-center px-4 py-8 sm:px-6 sm:py-10 lg:px-8"
      >
        {/* ================================================================
            Hero Section
            ================================================================ */}
        <section className="flex flex-col items-center text-center">
          {/* Logo */}
          <motion.div variants={heroItemVariants} className="mb-5 sm:mb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-slate-200/60 bg-white/80 shadow-xl backdrop-blur-xl transition-transform duration-300 hover:scale-105 dark:border-white/10 dark:bg-slate-900/80 sm:h-16 sm:w-16">
              <SproutlyLogo className="h-7 w-7 text-primary-500 drop-shadow-[0_0_12px_rgba(var(--rgb-primary),0.5)] sm:h-8 sm:w-8" />
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={heroItemVariants}
            className="max-w-3xl text-[clamp(2.15rem,5vw,4.5rem)] font-black leading-[1.08] tracking-[-0.04em] text-slate-900 dark:text-white"
          >
            Управляйте капиталом
            <br />
            <span className="inline-block whitespace-nowrap bg-gradient-to-r from-deposit-500 to-primary-500 bg-clip-text text-transparent">
              с элегантностью
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={heroItemVariants}
            className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400 sm:mt-5 sm:text-base lg:text-lg"
          >
            Ваши доходы и вклады под полным контролем. Инструмент премиального уровня для персональной финансовой аналитики.
          </motion.p>
        </section>

        {/* ================================================================
            Features (Hardware-Accelerated Staggered Grid)
            ================================================================ */}
        <section className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-4 lg:mt-12 lg:gap-5">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <motion.article
                key={feature.title}
                variants={cardItemVariants}
                whileHover={
                  shouldReduceMotion
                    ? undefined
                    : {
                        y: -4,
                        transition: { duration: 0.25, ease: easeOutSmooth },
                      }
                }
                whileTap={
                  shouldReduceMotion
                    ? undefined
                    : {
                        scale: 0.985,
                        transition: { duration: 0.15, ease: easeOutSmooth },
                      }
                }
                className="group relative flex items-center gap-4 rounded-2xl border border-slate-200/60 bg-white/65 p-4 shadow-lg backdrop-blur-xl transform-gpu transition-[box-shadow,border-color,background-color] duration-300 hover:border-slate-300/80 hover:bg-white/85 hover:shadow-xl dark:border-white/[0.06] dark:bg-slate-900/60 dark:hover:border-white/15 dark:hover:bg-slate-900/85 sm:flex-col sm:items-center sm:p-5 sm:text-center lg:rounded-[1.5rem] lg:p-6"
              >
                {/* Icon Container with subtle micro-scale and glow on hover */}
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white shadow-sm transition-all duration-300 ease-out group-hover:scale-105 ${feature.glowClass} dark:border-slate-700/60 dark:bg-slate-800 sm:h-12 sm:w-12 sm:rounded-2xl`}
                >
                  <Icon className={`h-5 w-5 ${feature.iconClass} sm:h-6 sm:w-6`} />
                </div>

                {/* Text Content */}
                <div className="min-w-0">
                  <h2 className="text-sm font-black text-slate-900 dark:text-white sm:text-base lg:text-lg">
                    {feature.title}
                  </h2>

                  <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400 sm:mt-2 sm:text-sm">
                    {feature.desc}
                  </p>
                </div>
              </motion.article>
            );
          })}
        </section>

        {/* ================================================================
            CTA Action
            ================================================================ */}
        <motion.div variants={ctaVariants} className="mt-7 flex justify-center sm:mt-9">
          <motion.button
            type="button"
            onClick={onStart}
            whileHover={
              shouldReduceMotion
                ? undefined
                : {
                    scale: 1.02,
                    transition: { duration: 0.2, ease: easeOutSmooth },
                  }
            }
            whileTap={
              shouldReduceMotion
                ? undefined
                : {
                    scale: 0.97,
                    transition: { duration: 0.15, ease: easeOutSmooth },
                  }
            }
            className="group relative flex min-h-12 w-full max-w-xs items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-deposit-500 px-7 text-sm font-black tracking-wide text-white shadow-[0_6px_20px_rgba(16,185,129,0.25)] transition-[background-color,box-shadow] duration-300 hover:bg-deposit-600 hover:shadow-[0_8px_28px_rgba(16,185,129,0.4)] sm:min-h-14 sm:w-auto sm:px-10 sm:text-base"
          >
            {/* Shimmer */}
            <span
              aria-hidden="true"
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />

            <span className="relative">Начать работу</span>

            <ChevronRight className="relative h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.main>
  );
};